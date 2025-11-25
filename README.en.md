[中文](README.md) | [English](README.en.md)

## 📖 Overview
- Touhou-themed rework of Anime Character Guessr, for entertainment only; no commercial use.
- Inspired by [BLAST.tv](https://blast.tv/counter-strike); data comes from [Bangumi](https://bgm.tv/) plus localization/enrichment from the Touhou community—big thanks to the Touhou friends who shared it.
- Best experienced on a desktop browser.

## 📦 Run

### 1) Local npm
Run in both `client` and `server`:
```bash
npm install
npm run dev
```

### 2) Docker
Create `.env` in project root:
```env
DOMAIN_NAME=http://[your IP]
MONGODB_URI=mongodb://mongo:27017/tags
CLIENT_INTERNAL_PORT=80
SERVER_INTERNAL_PORT=3000
NGINX_EXTERNAL_PORT=80
AES_SECRET=YourSuperSecretKeyChangeMe
SERVER_URL=http://[your IP]:3000
```
Start:
```bash
docker-compose up --build
```
Stop and remove:
```bash
docker-compose down
```

## 🎮 How to Play
- Search and guess the hidden character; each guess returns feedback.
- Green: correct or very close; Yellow: somewhat close.
- “↑” guess higher; “↓” guess lower.

## 🙏 Thanks
- Thanks to the Touhou community friends for providing localization and data support.
- Thanks to the original project and all contributors.
