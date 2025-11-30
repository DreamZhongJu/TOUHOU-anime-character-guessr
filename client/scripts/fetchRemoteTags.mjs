import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://api.bgm.tv/v0';
const INPUT_JSON = path.join(__dirname, '..', 'src', 'data', 'touhouCharacters.json');
const OUTPUT_JSON = path.join(__dirname, '..', 'src', 'data', 'touhou_remote_tags.json');

const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'User-Agent': 'anime-character-guessr/fetch-remote-tags',
    Accept: 'application/json'
  },
  validateStatus: (status) => status >= 200 && status < 500
});

function normalizeName(name) {
  if (!name) return '';
  return name
    .replace(/[`'"·\\?\\s]/g, '')
    .replace(/[（）()]/g, '')
    .toLowerCase();
}

function pickCandidateNames(remote) {
  if (!remote) return [];
  const aliasBox = remote.infobox?.find((item) => item.key === '别名')?.value;
  const names = [
    remote.name,
    remote.name_cn,
    remote.displayName,
    remote.nameCN,
    remote.nameCn,
    remote.infobox?.find((item) => item.key === '简体中文名')?.value
  ].filter(Boolean);

  if (Array.isArray(aliasBox)) {
    aliasBox.forEach((alias) => {
      if (alias?.v) names.push(alias.v);
    });
  }

  return names;
}

async function readLocalNames() {
  const raw = await fs.readFile(INPUT_JSON, 'utf-8');
  const data = JSON.parse(raw);
  const seen = new Set();
  const names = [];

  data.forEach((entry) => {
    const name = (entry['角色'] || '').trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  });
  return names;
}

async function searchCharacter(name) {
  const resp = await http.post('/search/characters?limit=5&offset=0', { keyword: name });
  if (resp.status !== 200) return { match: null, candidates: [], error: `HTTP ${resp.status}` };
  const candidates = Array.isArray(resp.data?.data) ? resp.data.data : [];
  const target = normalizeName(name);
  const strictMatch = candidates.find((item) =>
    pickCandidateNames(item).some((n) => normalizeName(n) === target)
  );
  return {
    match: strictMatch || candidates[0] || null,
    candidates
  };
}

async function fetchCharacterDetails(characterId) {
  const resp = await http.get(`/characters/${characterId}`);
  if (resp.status !== 200) {
    throw new Error(`character ${characterId} -> HTTP ${resp.status}`);
  }
  const tags = Array.isArray(resp.data?.tags)
    ? resp.data.tags
        .filter((tag) => tag?.name)
        .map((tag) => ({ name: tag.name, count: typeof tag.count === 'number' ? tag.count : 1 }))
    : [];
  const nameCn = resp.data?.infobox?.find((item) => item.key === '简体中文名')?.value || null;
  return {
    name: resp.data?.name || '',
    nameCn,
    tags,
    summary: resp.data?.summary || ''
  };
}

const subjectCache = new Map();

async function fetchSubjectTags(subjectId) {
  if (subjectCache.has(subjectId)) return subjectCache.get(subjectId);
  try {
    const resp = await http.get(`/subjects/${subjectId}`);
    if (resp.status !== 200 || !resp.data) throw new Error(`HTTP ${resp.status}`);
    const tags = Array.isArray(resp.data.tags)
      ? resp.data.tags
          .filter((tag) => tag?.name)
          .map((tag) => ({ name: tag.name, count: typeof tag.count === 'number' ? tag.count : 1 }))
      : [];
    const metaTags = Array.isArray(resp.data.meta_tags)
      ? resp.data.meta_tags
          .filter(Boolean)
          .map((tag) => ({ name: tag, count: 1 }))
      : [];
    const result = { tags, metaTags };
    subjectCache.set(subjectId, result);
    return result;
  } catch (err) {
    const fallback = { tags: [], metaTags: [], error: err.message || String(err) };
    subjectCache.set(subjectId, fallback);
    return fallback;
  }
}

function mergeCounts(targetMap, tagArr, weight = 1) {
  tagArr.forEach((tag) => {
    const current = targetMap.get(tag.name) || 0;
    targetMap.set(tag.name, current + (tag.count || 1) * weight);
  });
}

function sortCounts(map) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function collectAllTags(characterId) {
  const [detailsResp, subjectsResp] = await Promise.all([
    fetchCharacterDetails(characterId),
    http.get(`/characters/${characterId}/subjects`)
  ]);

  const subjectList = Array.isArray(subjectsResp.data) ? subjectsResp.data : [];
  const subjectIds = [];
  const subjectTags = new Map();
  const metaTagCounts = new Map();

  for (const subject of subjectList) {
    const weight = subject.staff === '主角' ? 3 : 1;
    const { tags, metaTags } = await fetchSubjectTags(subject.id);
    subjectIds.push(subject.id);
    mergeCounts(subjectTags, tags, weight);
    mergeCounts(metaTagCounts, metaTags, weight);
    // 简单限流，避免请求过快
    await sleep(120);
  }

  return {
    characterTags: detailsResp.tags,
    subjectTags: sortCounts(subjectTags),
    metaTags: sortCounts(metaTagCounts),
    remoteName: detailsResp.name,
    remoteNameCn: detailsResp.nameCn,
    subjectIds
  };
}

async function main() {
  const names = await readLocalNames();
  const results = [];
  const unmatched = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    console.log(`[${i + 1}/${names.length}] 搜索 ${name} ...`);
    try {
      const { match, candidates } = await searchCharacter(name);
      if (!match) {
        unmatched.push({ name, reason: '未找到任何远程角色' });
        console.log(`  -> 未匹配`);
        continue;
      }

      const tagBundle = await collectAllTags(match.id);
      results.push({
        localName: name,
        remoteId: match.id,
        remoteName: tagBundle.remoteName || match.name || '',
        remoteNameCn: tagBundle.remoteNameCn || match.name_cn || '',
        subjectIds: tagBundle.subjectIds,
        characterTags: tagBundle.characterTags,
        subjectTags: tagBundle.subjectTags,
        metaTags: tagBundle.metaTags
      });
      console.log(`  -> 匹配 ${match.id} (${tagBundle.remoteName || match.name})，标签 ${tagBundle.characterTags.length}/${tagBundle.subjectTags.length}+${tagBundle.metaTags.length}`);
    } catch (err) {
      unmatched.push({ name, reason: err.message || String(err) });
      console.warn(`  -> 失败: ${err.message || err}`);
    }

    await sleep(200);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    total: names.length,
    matched: results.length,
    unmatched,
    data: results
  };

  await fs.writeFile(OUTPUT_JSON, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`完成，已写入 ${OUTPUT_JSON}`);
  console.log(`匹配成功 ${results.length}，未匹配 ${unmatched.length}`);
}

main().catch((err) => {
  console.error('脚本异常:', err);
  process.exit(1);
});
