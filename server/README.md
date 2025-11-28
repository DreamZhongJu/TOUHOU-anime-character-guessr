# Server (Express)

本项目是对 Anime Character Guessr 的**二次开发东方主题版本**后端部分，基于 Express。

## 环境准备
- Node.js 18+（建议与仓库内 `package-lock.json` 对齐）
- npm
- MongoDB（本地或远程均可，需保证 `MONGODB_URI` 可访问）

## 运行
```bash
# 安装依赖
npm install

# 启动（默认 http://localhost:3000）
npm run start
```

启动前请复制 `.env.example` 为 `.env`，按需填写：
- `MONGODB_URI`：Mongo 连接串
- `CLIENT_URL` / `CLIENT_URL_EN`：前端地址
- `SERVER_URL`：本服务地址

Docker 部署可参考项目根目录的 `docker-compose.yml` 与根目录 `README.md` 中的说明。

## 路由与功能概览
- REST 接口提供标签统计、房间管理、头像兑换等功能（参见 `server.js` 和 `utils/` 下模块）。
- 默认端口 `3000`，可通过环境变量覆盖。

## 数据
- 内置 `data/character_images.json` 等静态数据。
- 需要 MongoDB 存储标签、房间等动态数据。

## 说明
- 本仓库为二次开发项目，仅供娱乐，不作商业用途。 
