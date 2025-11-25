[中文](README.md) | [English](README.en.md)

## 📖 简介
- 东方主题的二次开发版 Anime Character Guessr，仅供娱乐使用，不用于商业化。
- 灵感来源 [BLAST.tv](https://blast.tv/counter-strikle)，数据基于 [Bangumi](https://bgm.tv/) 以及东方社区的补充，本地化数据特别感谢东方群友提供。
- 推荐使用桌面端浏览器游玩。

## 📦 运行

### 1) 本地 npm
分别在 `client` 和 `server` 目录执行：
```bash
npm install
npm run dev
```

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
一键启动：
```bash
docker-compose up --build
```
停止并删除容器：
```bash
docker-compose down
```

## 🎮 游戏玩法
- 搜索并猜测神秘角色，每次猜测后会获得反馈提示。
- 绿色：正确或非常接近；黄色：有些接近。
- “↑” 往高猜；“↓” 往低猜。

## 🙏 鸣谢
- 感谢东方群友提供的本地化与数据支持。
- 感谢原项目及所有贡献者的工作。 
