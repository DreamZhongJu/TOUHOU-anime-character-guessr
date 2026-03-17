[中文](README.md) | [English](README.en.md)

## 📖 简介

本项目基于 [kennylimz/anime-character-guessr](https://github.com/kennylimz/anime-character-guessr) 的二次开发东方主题版本，仅供娱乐和学习，不用于商业化。如有侵权请第一时间联系告知。

- 数据来自 **萌娘百科** 标签体系及 **Bangumi 公开 API**（https://bgm.tv），感谢东方同好社区的补充与校对。
- 灵感来源 [BLAST.tv · counter-strikle](https://blast.tv/counter-strikle)。
- 推荐使用**桌面端宽屏浏览器**游玩。

---

## ✨ 主要特性

- 🎮 **单人占卜 / 多人对战** 两种模式
- 🌸 **出题范围筛选**：可按旧作 / 老三作（红妖永）/ 整数作 / 小数点作分组，也可单独勾选每一部作品
- 🔮 **文字提示 & 图片提示**：可自定义提示出现时机
- 🎵 **随机 BGM**：首页随机推荐东方同人曲（数据来自网易云音乐热门歌单）
- 📊 数据集覆盖 **143+ 角色 · 27 部作品 · 400+ 萌点标签**

---

## 🏁 如何运行

### 前置条件
- Node.js 18+（建议与仓库内 `package-lock.json` 对齐的版本）
- 已安装 npm
- 服务器需要可用的 MongoDB（本地或远程均可）

### 1) 本地 npm

分别进入 `client` 与 `server` 目录安装依赖并运行：

```bash
cd client
npm install
npm run dev   # 默认 http://localhost:5173

# 新开一个终端窗口
cd ../server
npm install
npm run start # 默认 http://localhost:3000
```

如需自定义配置，请复制各目录的 `.env.example` 为 `.env`，按需填写 `MONGODB_URI`、`SERVER_URL`、`CLIENT_URL` 等。

### 2) Docker

在项目根目录新建 `.env`：

```env
DOMAIN_NAME=http://[你的 IP]
MONGODB_URI=mongodb://mongo:27017/tags
CLIENT_INTERNAL_PORT=80
SERVER_INTERNAL_PORT=3000
NGINX_EXTERNAL_PORT=80
AES_SECRET=YourSuperSecretKeyChangeMe
SERVER_URL=http://[你的 IP]:3000
```

启动：
```bash
docker-compose up --build
```

停止并删除容器：
```bash
docker-compose down
```

### 3) 辅助脚本（可选）

- `client/scripts/checkSearchCoverage.mjs`：批量测试本地东方角色是否能从 Bangumi 搜索 API 返回并通过本地过滤逻辑。运行：
  ```bash
  cd client
  node scripts/checkSearchCoverage.mjs
  ```
  执行过程实时打印每个角色的结果，并输出统计汇总。

---

## 🎮 游戏玩法

1. 在搜索框中输入并选择你猜测的角色
2. 系统按多个维度（族谱、发色、瞳色、活动范围、萌点等）与答案对比并给出反馈
3. **绿色** = 完全匹配；**黄色** = 部分接近；箭头 ↑ / ↓ 表示答案在该维度更高 / 更低
4. 在次数耗尽前猜中即为胜利，可在设置中调整每局次数与提示时机

---

## 🙏 鸣谢

- 感谢 [kennylimz](https://github.com/kennylimz) 的原版项目框架
- 感谢东方同好群友提供的本地化数据与校对支持
- 数据集标签体系基于萌娘百科东方 Project 角色条目
