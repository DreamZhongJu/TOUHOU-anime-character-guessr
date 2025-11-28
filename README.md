[中文](README.md) | [English](README.en.md)

## 📖 简介
- 本项目是对 Anime Character Guessr 的**二次开发东方主题版本**，仅供娱乐使用，不用于商业化。
- 灵感来源 [BLAST.tv](https://blast.tv/counter-strikle)，数据基于 [Bangumi](https://bgm.tv/) 及东方社区补充，本地化数据特别感谢东方群友提供。
- 推荐使用桌面端浏览器游玩。

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

## 🎮 游戏玩法
- 搜索并猜测神秘角色，每次猜测后会获得反馈提示。
- 绿色：正确或非常接近；黄色：有些接近。
- “↑” 往高猜；“↓” 往低猜。

## 🙏 鸣谢
- 感谢东方群友提供的本地化与数据支持。
- 感谢原项目及所有贡献者的工作。 
