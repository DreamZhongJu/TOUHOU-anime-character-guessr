"""
使用说明：
1. 在 get_embedding 与 get_canonical_label_for_cluster 中填入自己的远程 API 调用逻辑（如 OpenAI / 阿里云 / 讯飞等）。
2. 运行 `python normalize_labels.py`，脚本会在当前目录生成 normalized_labels.csv、cluster_summary.csv，
   并输出一个替换了“萌点”为归一化标签的新 JSON 文件：数据集/touhou_character_details_normalized.json。
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Sequence

import numpy as np
import pandas as pd
from sklearn.cluster import AgglomerativeClustering, DBSCAN, KMeans

# =========================
# 配置区：可按需修改
# =========================
BASE_DIR = Path(__file__).resolve().parent.parent  # 仓库根目录
WORK_DIR = Path(__file__).resolve().parent        # label_normalization 目录

LABEL_JSON_PATH = BASE_DIR / "数据集" / "touhou_character_details.json"
# 如果已有标签 CSV，可直接指向该路径；若不存在且提供了 JSON，脚本会自动从 JSON 导出一个 CSV（列名 label）
LABEL_CSV_PATH = WORK_DIR / "labels.csv"
EMBEDDING_CACHE_PATH = WORK_DIR / "embeddings_cache.csv"
NORMALIZED_OUTPUT_CSV = WORK_DIR / "normalized_labels.csv"
CLUSTER_SUMMARY_CSV = WORK_DIR / "cluster_summary.csv"
UPDATED_JSON_OUTPUT = BASE_DIR / "数据集" / "touhou_character_details_normalized.json"

# 聚类相关参数
CLUSTER_METHOD = "kmeans"  # 可选：kmeans / agglomerative / dbscan
N_CLUSTERS = 200  # kmeans / agglomerative 聚类簇数
DBSCAN_EPS = 0.4
DBSCAN_MIN_SAMPLES = 3
RANDOM_STATE = 42

# LLM 提示词与采样
MAX_WORDS_FOR_PROMPT = 20  # 每个簇取前 N 个词作为提示，避免 prompt 过长

# 防止抽象标签 / 兜底
ABSTRACT_STOPWORDS = {"情绪", "性格", "特点", "特征", "行为", "能力", "状态", "属性", "主题", "风格", "其他特征"}

# 手工覆盖：如 {cluster_id: "你希望的标签"}，优先于模型命名
MANUAL_OVERRIDES: Dict[int, str] = {
    # 示例：
    # 16: "随身器具",
    # 17: "灵履足饰",
    # 18: "化形之力",
    # 19: "恶作剧",
    # 20: "侍奉女仆",
    # 21: "兽化少女",
    # 22: "灵羽披风",
    # 23: "长筒足饰",
}


import os
from typing import List, Sequence
from openai import OpenAI

# ========= 全局 Client =========
# 依赖环境变量 DASHSCOPE_API_KEY
client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)


def get_embedding(text: str) -> List[float]:
    """
    调用通义百炼的 Embedding 模型，将文本转成向量。
    这里使用 text-embedding-v3（默认 1024 维），适合做语义聚类/相似度计算。

    返回值：长度固定的 float 向量（list[float]）
    """
    if text is None:
        text = ""
    text = str(text).strip()
    if not text:
        # 空字符串的话，返回一个全零向量（维度与模型一致）。
        # 也可以改成 raise 异常，看你整体流程怎么设计。
        empty_dim = 1024  # text-embedding-v3 默认维度是 1024
        return [0.0] * empty_dim

    # 调用 OpenAI 兼容接口的 embedding.create
    resp = client.embeddings.create(
        model="text-embedding-v3",   # 通义的向量模型
        input=[text],                # 这里用单条输入，返回 data[0]
        # 如果你想改维度，可以加上 dimensions=256 之类的参数
    )

    embedding = resp.data[0].embedding
    # OpenAI SDK 返回的是 list[float]，可以直接用作后续聚类
    return embedding


def build_prompt(words: Sequence[str]) -> str:
    """
    构造给 qwen3-max 的提示词，让它为一簇近义标签起一个“中层标签”。

    设计目标：
    - 聚合“同分异构体”/近义/强弱差异，而不是抽象属性类别。
    - 禁止抽象词（情绪/性格/特点/特征/行为/能力/状态/属性/主题/风格等）。
    - 用 2~4 个汉字的自然标签。
    - 如果这些词并非同一语义簇（混合类别），请改为输出多个小类标签，用“|”分隔，每个 2~4 字，不要解释。
    """
    # 去重 + 清洗
    cleaned = []
    for w in words:
        if not w:
            continue
        w = str(w).strip()
        if not w:
            continue
        cleaned.append(w)

    # 防止太长，截断一下
    cleaned = list(dict.fromkeys(cleaned))  # 去重但保持顺序
    if len(cleaned) > 20:
        cleaned = cleaned[:20]

    if not cleaned:
        cleaned = ["未知特征"]

    word_list_str = "、".join(cleaned)

    prompt = f"""你是一个“标签归一化助手”，负责为一组含义非常接近的人物特征词，生成一个合适的“中层标签”。

现在给你一组中文词语，它们都在描述人物的具体特点（情绪、性格、能力、外貌、行为习惯等），语义非常接近，只是程度、修饰或表达略有不同。

【这组词语】：
{word_list_str}

请按以下规则输出：
1. 仅在它们确实属于同一语义簇（近义/同分异构/强弱差异）时，合并成 1 个标签。
2. 标签必须具体，禁止使用“情绪”“性格”“特点”“特征”“行为”“能力”“状态”“属性”“主题”“风格”等抽象词。
3. 标签用 2～4 个中文汉字，并保持与原词的类别一致（情绪用情绪词，性格用性格词，外貌用外貌词，能力用能力词）。
4. 如果这些词并非同一语义簇（混合了不同类别），请输出多个小类标签，用“|”分隔，每个 2～4 个汉字，不要解释。
5. 只输出标签，不要附加说明或标点。"""

    return prompt


def get_canonical_label_for_cluster(words: Sequence[str]) -> str:
    """
    调用通义千问 qwen3-max，根据该簇若干近义词生成一个“中层语义标签”。

    输入：这一簇中的若干词语（Sequence[str]）
    输出：2~4 个汉字的标签（尽量符合 build_prompt 中的约束）
    """
    prompt = build_prompt(words)

    completion = client.chat.completions.create(
        model="qwen3-max",
        messages=[
            {
                "role": "system",
                "content": "你是一个严谨的标签归一化助手，只输出要求的标签，不输出其他内容。"
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=16,      # 足够容纳 2~4 个字
        temperature=0.2,    # 稍微收紧，避免乱发挥
        top_p=0.9,
    )

    raw = completion.choices[0].message.content or ""
    label = raw.strip()

    # 保险一点：只取第一行，并去掉空格和常见标点
    label = label.splitlines()[0].strip()
    # 去掉中文/英文标点
    for ch in ["：", ":", "。", "，", "、", "（", "）", "(", ")", "；", ";", "【", "】", "[", "]", "“", "”", "\"", "'"]:
        label = label.replace(ch, "")

    # 判断是否给出了拆分类别（用 | 分隔）
    if "|" in label:
        label = label.split("|")[0].strip()

    # 防止抽象词或空值：若命中抽象词或为空，回退到簇内代表词（最短词）
    def pick_representative(ws: Sequence[str]) -> str:
        cleaned = [w.strip() for w in ws if isinstance(w, str) and w.strip()]
        if not cleaned:
            return "其他特征"
        return sorted(cleaned, key=lambda x: (len(x), x))[0]

    if not label or label in ABSTRACT_STOPWORDS:
        label = pick_representative(words)

    # 可选的长度裁剪，避免过长
    if len(label) > 4:
        label = label[:4]

    return label



# =========================
# 数据加载与导出
# =========================
def extract_labels_from_json(json_path: str) -> pd.DataFrame:
    """
    从角色详情 JSON 中提取“萌点”标签，并输出 DataFrame，列名为 label。
    """
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    labels: List[str] = []
    for item in data:
        basic = item.get("basic_info", {})
        moe_list = basic.get("萌点", []) or []
        for tag in moe_list:
            if isinstance(tag, str):
                labels.append(tag.strip())

    df = pd.DataFrame({"label": labels})
    return df.dropna().reset_index(drop=True)


def ensure_label_csv(csv_path: Path, json_path: Path) -> None:
    """
    优先从 CSV 读取；若 CSV 不存在且提供了 JSON，则从 JSON 导出 CSV，方便后续用 pandas.read_csv 加载。
    """
    if csv_path.exists():
        return
    if not json_path.exists():
        raise FileNotFoundError(f"标签 CSV 和 JSON 均不存在，无法继续。缺少：{csv_path} / {json_path}")

    df = extract_labels_from_json(str(json_path))
    df.to_csv(str(csv_path), index=False, encoding="utf-8")
    print(f"[info] 已从 JSON 导出标签至 {csv_path}，列名为 label。")


def load_labels(csv_path: Path) -> pd.DataFrame:
    """
    使用 pandas.read_csv 读取标签列表，列名需包含 label。
    """
    df = pd.read_csv(str(csv_path))
    if "label" not in df.columns:
        raise ValueError("输入 CSV 必须包含名为 'label' 的列。")
    df["label"] = df["label"].astype(str).str.strip()
    return df.dropna(subset=["label"]).reset_index(drop=True)


# =========================
# Embedding 缓存
# =========================
def load_embedding_cache(cache_path: Path) -> Dict[str, List[float]]:
    if not cache_path.exists():
        return {}

    df = pd.read_csv(str(cache_path))
    cache: Dict[str, List[float]] = {}
    for _, row in df.iterrows():
        try:
            cache[row["label"]] = json.loads(row["embedding"])
        except Exception:
            continue
    return cache


def save_embedding_cache(cache: Dict[str, List[float]], cache_path: Path) -> None:
    rows = [{"label": k, "embedding": json.dumps(v, ensure_ascii=False)} for k, v in cache.items()]
    pd.DataFrame(rows).to_csv(str(cache_path), index=False, encoding="utf-8")
    print(f"[info] Embedding 缓存已写入 {cache_path}，共 {len(rows)} 条。")


def compute_embeddings(labels: List[str], cache_path: Path) -> Dict[str, List[float]]:
    """
    为所有唯一标签获取向量，带缓存，避免重复请求。
    """
    cache = load_embedding_cache(cache_path)
    missing = [lbl for lbl in labels if lbl not in cache]
    if missing:
        print(f"[info] 需要新计算的标签数：{len(missing)}")
    for text in missing:
        cache[text] = get_embedding(text)
    save_embedding_cache(cache, cache_path)
    return cache


# =========================
# 聚类
# =========================
def cluster_vectors(vectors: np.ndarray) -> np.ndarray:
    """
    根据配置选择聚类算法，返回每个向量的 cluster_id。
    """
    if CLUSTER_METHOD == "kmeans":
        model = KMeans(n_clusters=N_CLUSTERS, n_init=10, random_state=RANDOM_STATE)
        labels = model.fit_predict(vectors)
    elif CLUSTER_METHOD == "agglomerative":
        model = AgglomerativeClustering(n_clusters=N_CLUSTERS)
        labels = model.fit_predict(vectors)
    elif CLUSTER_METHOD == "dbscan":
        model = DBSCAN(eps=DBSCAN_EPS, min_samples=DBSCAN_MIN_SAMPLES)
        labels = model.fit_predict(vectors)
    else:
        raise ValueError(f"未知聚类方法：{CLUSTER_METHOD}")
    return labels


def group_labels_by_cluster(labels: List[str], cluster_ids: np.ndarray) -> Dict[int, List[str]]:
    grouped: Dict[int, List[str]] = {}
    for lbl, cid in zip(labels, cluster_ids):
        grouped.setdefault(int(cid), []).append(lbl)
    return grouped


def canonicalize_clusters(grouped: Dict[int, List[str]]) -> Dict[int, str]:
    """
    为每个簇调用一次 LLM，生成 canonical label。
    """
    canonical: Dict[int, str] = {}
    for cid, words in sorted(grouped.items(), key=lambda x: x[0]):
        if cid in MANUAL_OVERRIDES:
            canonical[cid] = MANUAL_OVERRIDES[cid]
            continue
        top_words = words[:MAX_WORDS_FOR_PROMPT]
        canonical[cid] = get_canonical_label_for_cluster(top_words)
    return canonical


# =========================
# 结果保存
# =========================
def save_normalized_labels(
    labels: List[str], cluster_ids: np.ndarray, canonical: Dict[int, str], output_path: Path
) -> None:
    rows = []
    for lbl, cid in zip(labels, cluster_ids):
        rows.append({"label": lbl, "canonical_label": canonical.get(int(cid), lbl), "cluster_id": int(cid)})
    pd.DataFrame(rows).to_csv(str(output_path), index=False, encoding="utf-8")
    print(f"[info] 归一化映射已写入 {output_path}，共 {len(rows)} 条。")


def save_cluster_summary(grouped: Dict[int, List[str]], canonical: Dict[int, str], output_path: Path) -> None:
    rows = []
    for cid, words in sorted(grouped.items(), key=lambda x: x[0]):
        rows.append(
            {
                "cluster_id": cid,
                "canonical_label": canonical.get(cid, ""),
                "members": "、".join(words),
            }
        )
    pd.DataFrame(rows).to_csv(str(output_path), index=False, encoding="utf-8")
    print(f"[info] 聚类摘要已写入 {output_path}，簇数：{len(rows)}。")


def apply_mapping_to_json(
    json_path: Path, output_path: Path, mapping: Dict[str, str], default_keep_original: bool = True
) -> None:
    """
    将归一化标签回填到 JSON 的“萌点”字段，写入新文件。
    default_keep_original: 若某标签缺少映射，则保留原词。
    """
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        basic = item.get("basic_info", {})
        moe_list = basic.get("萌点", []) or []
        normalized = []
        for tag in moe_list:
            if not isinstance(tag, str):
                continue
            mapped = mapping.get(tag.strip())
            if mapped is None and default_keep_original:
                mapped = tag.strip()
            if mapped:
                normalized.append(mapped)
        # 去重且保持顺序
        seen = set()
        deduped = []
        for x in normalized:
            if x not in seen:
                seen.add(x)
                deduped.append(x)
        basic["萌点"] = deduped
        item["basic_info"] = basic

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[info] 已生成带归一化萌点的 JSON：{output_path}")


# =========================
# 主流程
# =========================
def main() -> None:
    ensure_label_csv(LABEL_CSV_PATH, LABEL_JSON_PATH)
    df = load_labels(LABEL_CSV_PATH)

    unique_labels = sorted(set(df["label"].tolist()))
    print(f"[info] 唯一标签数：{len(unique_labels)}")

    embedding_cache = compute_embeddings(unique_labels, EMBEDDING_CACHE_PATH)
    vectors = np.array([embedding_cache[lbl] for lbl in unique_labels], dtype=float)

    cluster_ids = cluster_vectors(vectors)
    grouped = group_labels_by_cluster(unique_labels, cluster_ids)
    canonical = canonicalize_clusters(grouped)

    save_normalized_labels(unique_labels, cluster_ids, canonical, NORMALIZED_OUTPUT_CSV)
    save_cluster_summary(grouped, canonical, CLUSTER_SUMMARY_CSV)

    # 回填到 JSON，生成新的文件，不覆盖原始数据
    mapping = {lbl: canonical.get(int(cid), lbl) for lbl, cid in zip(unique_labels, cluster_ids)}
    apply_mapping_to_json(LABEL_JSON_PATH, UPDATED_JSON_OUTPUT, mapping)


if __name__ == "__main__":
    main()
