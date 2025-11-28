[English](README.en.md) | [中文](README.md)

## Overview
- This is an **unofficial, Touhou-themed derivative** of Anime Character Guessr, for fun only (no commercial use).
- Inspired by [BLAST.tv](https://blast.tv/counter-strikle). Data is primarily from [Bangumi](https://bgm.tv/) plus Touhou community contributions. Special thanks to Touhou community friends for localization data.
- Desktop browsers are recommended for the best experience.

## Getting Started

### Prerequisites
- Node.js 18+ (ideally the version implied by the repo `package-lock.json`)
- npm
- MongoDB accessible by the server (local or remote)

### 1) Local (npm)
Install and run client and server separately:
```bash
cd client
npm install
npm run dev   # defaults to http://localhost:5173

# new terminal
cd ../server
npm install
npm run start # defaults to http://localhost:3000
```
If needed, copy `.env.example` to `.env` in each directory and fill in `MONGODB_URI`, `SERVER_URL`, `CLIENT_URL`, etc.

### 2) Docker
Create `.env` in the project root:
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
Stop and remove containers:
```bash
docker-compose down
```

### 3) Helper Script (optional)
- `client/scripts/checkSearchCoverage.mjs`: batch-check whether all local Touhou characters can be returned by the Bangumi search API and pass local filtering.
  ```bash
  cd client
  node scripts/checkSearchCoverage.mjs
  ```
  It prints per-character progress and summary statistics.

## Gameplay
- Search and guess the mystery character; each guess returns feedback.
- Green: correct or very close; Yellow: somewhat close.
- “↑” guess higher; “↓” guess lower.

## Acknowledgements
- Thanks to Touhou community friends for localization and data support.
- Thanks to the original project and all contributors. 
