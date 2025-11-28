import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { idToTags } from '../src/data/id_tags.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_BASE = 'https://api.bgm.tv/v0/search/characters';
const http = axios.create({
  headers: {
    'User-Agent': 'anime-character-guessr-check/1.0 (https://example.com)',
    Accept: 'application/json'
  },
  validateStatus: (status) => status >= 200 && status < 500 // 捕获 4xx 以便记录
});
let touhouMap = null;

function normalizeName(name) {
  if (!name) return '';
  return name
    .replace(/[`'\"··\\?\\s]/g, '')
    .replace(/[（）()]/g, '')
    .toLowerCase();
}

async function buildTouhouMap() {
  if (touhouMap) return touhouMap;
  const jsonPath = path.join(__dirname, '..', 'src', 'data', 'touhouCharacters.json');
  const raw = await fs.readFile(jsonPath, 'utf-8');
  const data = JSON.parse(raw);
  touhouMap = new Map();
  data.forEach(entry => {
    const normalized = normalizeName(entry['角色']);
    if (normalized && !touhouMap.has(normalized)) {
      touhouMap.set(normalized, entry);
    }
  });
  return touhouMap;
}

async function loadTouhouNames() {
  const map = await buildTouhouMap();
  return Array.from(map.values())
    .map(entry => (entry['角色'] || '').trim())
    .filter(Boolean);
}

async function findTouhouProfileByCharacter(character) {
  const map = await buildTouhouMap();
  if (!character) return null;
  const candidates = [
    character.nameCn,
    character.name_cn,
    character.cnName,
    character.nameCN,
    character.name,
    character.nameEn,
    character.displayName
  ].filter(Boolean);
  for (const cand of candidates) {
    const normalized = normalizeName(cand);
    if (normalized && map.has(normalized)) {
      return map.get(normalized);
    }
  }
  return null;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function isInLocalDataset(character) {
  if (!character) return false;
  if (idToTags[character.id]) return true;
  const profile = await findTouhouProfileByCharacter(character);
  return !!profile;
}

async function searchOnce(name) {
  try {
    const response = await http.post(`${API_BASE}?limit=1&offset=0`, { keyword: name });
    if (response.status !== 200) {
      return { error: `HTTP ${response.status}` };
    }
    const apiResults = Array.isArray(response?.data?.data) ? response.data.data : [];
    const mapped = apiResults.map(character => ({
      id: character.id,
      name: character.name,
      nameCn: character.infobox?.find(item => item.key === '简体中文名')?.value || character.name,
      nameEn: (() => {
        const aliases = character.infobox?.find(item => item.key === '别名')?.value;
        if (aliases && Array.isArray(aliases)) {
          const englishName = aliases.find(alias => alias.k === '英文名');
          if (englishName) return englishName.v;
          const romaji = aliases.find(alias => alias.k === '罗马名');
          if (romaji) return romaji.v;
        }
        return character.name;
      })(),
      gender: character.gender || '?'
    }));
    const filtered = [];
    for (const ch of mapped) {
      if (await isInLocalDataset(ch)) {
        filtered.push(ch);
      }
    }
    return { apiResults: mapped, filtered };
  } catch (error) {
    return { error };
  }
}

async function main() {
  const names = await loadTouhouNames();
  const missingRemote = [];
  const filteredOut = [];
  const failed = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const { apiResults, filtered, error } = await searchOnce(name);

    if (error) {
      failed.push({ name, error: error.message || String(error) });
      console.log(`[${i + 1}/${names.length}] ${name} -> 失败 (${error.message || error})`);
    } else if (!apiResults || apiResults.length === 0) {
      missingRemote.push(name);
      console.log(`[${i + 1}/${names.length}] ${name} -> 远程无结果`);
    } else if (filtered.length === 0) {
      filteredOut.push({ name, candidateIds: apiResults.map(r => r.id) });
      console.log(`[${i + 1}/${names.length}] ${name} -> 有结果但被本地过滤`);
    } else {
      console.log(`[${i + 1}/${names.length}] ${name} -> 成功`);
    }

    // 简单限流，避免请求过快
    await sleep(150);
  }

  console.log('检查完成');
  console.log('本地角色总数:', names.length);
  console.log('远程无结果:', missingRemote.length);
  console.log(missingRemote);
  console.log('API有结果但被本地过滤掉:', filteredOut.length);
  console.log(filteredOut.slice(0, 50)); // 只打印前 50 条以免过长
  if (failed.length > 0) {
    console.log('请求失败条目:', failed.length);
    console.log(failed);
  }
}

main().catch(err => {
  console.error('脚本异常:', err);
  process.exit(1);
});
