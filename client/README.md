# Client (React + Vite)

本项目是对 Anime Character Guessr 的**二次开发东方主题版本**前端部分，使用 React + Vite。

## 环境准备
- Node.js 18+（建议与仓库内 `package-lock.json` 对齐）
- npm

## 运行与构建
```bash
# 安装依赖
npm install

# 开发调试（默认 http://localhost:5173）
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

如需自定义配置，请复制 `.env.example` 为 `.env`，按需填写 `VITE_SERVER_URL` 等变量。

## 测试/辅助脚本
- `scripts/checkSearchCoverage.mjs`：批量验证本地东方角色是否能从 Bangumi 搜索 API 返回，并通过本地过滤逻辑。运行：
  ```bash
  node scripts/checkSearchCoverage.mjs
  ```
  - 实时输出 `[进度] 角色名 -> 成功/远程无结果/被本地过滤/失败`。
  - 结束时汇总远程无结果、被过滤、请求失败的条目。

## 说明
- 前端会对搜索结果与本地数据集（`id_tags` 与 Touhou 数据）取交集，只展示本地收录的角色。
- 本仓库为二次开发项目，仅供娱乐，不作商业用途。 
