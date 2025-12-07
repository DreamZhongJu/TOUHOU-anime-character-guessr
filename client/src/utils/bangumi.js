import { idToTags } from '../data/id_tags.js';
import { subjectsWithExtraTags } from '../data/extra_tag_subjects.js';
import touhouCharacters from '../data/touhouCharacters.json';
import touhouRemoteTags from '../data/touhou_remote_tags.json';
import characterSubjectsData from '../data/touhou_character_subjects.json';
import characterPersonsData from '../data/touhou_character_persons.json';
import subjectDetailsData from '../data/touhou_subjects.json';
import characterImages from '../data/character_images.json';
import characterSummaries from '../data/touhou_character_summaries.json';
import {
  ATTRIBUTE_DEFINITIONS,
  getSharedWorks,
  enrichWithTouhouData,
  getAllProfiles,
  normalizeName as normalizeDatasetName,
  findTouhouProfileByName
} from './touhouDataset.js';

const TOUHOU_NAME_KEY = '角色';
const LOCAL_CHARACTERS = Array.isArray(touhouRemoteTags?.data) ? touhouRemoteTags.data : [];
const LOCAL_PROFILES = getAllProfiles();
const LOCAL_PROFILE_LIST = LOCAL_PROFILES.map((profile, idx) => ({ id: idx + 1, profile }));
const LOCAL_PROFILE_ID_MAP = new Map(LOCAL_PROFILE_LIST.map((item) => [item.id, item.profile]));
const PROFILE_ID_BY_PROFILE = new Map(LOCAL_PROFILE_LIST.map((item) => [item.profile, item.id]));
const SUBJECT_DETAIL_MAP = new Map((subjectDetailsData?.data || []).map((entry) => [Number(entry.id), entry]));
const CHARACTER_SUBJECT_MAP = new Map(
  (characterSubjectsData?.data || []).map((entry) => [Number(entry.characterId), entry.subjects || []])
);
const CHARACTER_PERSONS_MAP = new Map(
  (characterPersonsData?.data || []).map((entry) => [Number(entry.characterId), entry.persons || []])
);
const CHARACTER_IMAGE_MAP = new Map((characterImages || []).map((entry) => [Number(entry.id), entry]));
let SUBJECT_TO_CHARACTER_MAP = null;
const SUMMARY_MAP = new Map(
  Object.entries((characterSummaries && characterSummaries.data) || {}).map(([id, summary]) => [
    Number(id),
    summary || ''
  ])
);

function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .replace(/[`'\"·\\?\\s]/g, '')
    .replace(/[（）()]/g, '')
    .toLowerCase();
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}

function getProfileById(profileId) {
  return LOCAL_PROFILE_ID_MAP.get(Number(profileId)) || null;
}

function getProfileId(profile) {
  return PROFILE_ID_BY_PROFILE.get(profile) || null;
}

function mapProfileToCharacter(profile) {
  const pid = getProfileId(profile);
  if (!pid) return null;
  return buildCharacterFromProfile(profile, pid);
}

function findProfileEntryByName(name) {
  const profile = findTouhouProfileByName(name);
  if (!profile) return null;
  const id = getProfileId(profile);
  if (!id) return null;
  return { id, profile };
}

function buildCharacterFromProfile(profile, id) {
  const primaryName = toArray(profile?.basic_info?.['本名'] || profile?.primaryName || profile?.name)[0] || profile?.name || '未知';
  const translatedName = toArray(profile?.basic_info?.['译名'] || profile?.translatedName)[0] || primaryName;
  const image = profile?.image || profile?.avatar || '';
  const metaTags = toArray(profile?.basic_info?.['萌点'] || profile?.['萌点']);
  return {
    id: Number(id),
    name: profile?.name || primaryName,
    nameCn: translatedName || profile?.nameCn || profile?.name,
    nameEn: profile?.name || primaryName,
    gender: '?',
    image,
    imageGrid: image,
    summary: '',
    appearances: [],
    appearanceIds: [],
    latestAppearance: -1,
    earliestAppearance: -1,
    highestRating: -1,
    popularity: 0,
    rawTags: new Map(),
    animeVAs: [],
    metaTags,
    touhouProfile: profile
  };
}

function buildSubjectCharacterMap() {
  const map = new Map();
  LOCAL_CHARACTERS.forEach((entry) => {
    const charId = Number(entry.remoteId);
    const subjects = CHARACTER_SUBJECT_MAP.get(charId) || [];
    subjects.forEach((subject) => {
      const sid = Number(subject.id);
      if (!map.has(sid)) {
        map.set(sid, []);
      }
      const img = getCharacterImageRecord(charId).grid;
      map.get(sid).push({
        id: charId,
        name: entry.remoteName || entry.remoteNameCn || entry.localName || '',
        relation: subject.staff || '配角',
        images: { grid: img }
      });
    });
  });
  return map;
}

function getSubjectCharacterMap() {
  if (!SUBJECT_TO_CHARACTER_MAP) {
    SUBJECT_TO_CHARACTER_MAP = buildSubjectCharacterMap();
  }
  return SUBJECT_TO_CHARACTER_MAP;
}

function getLocalCharacterEntry(id) {
  return LOCAL_CHARACTERS.find((entry) => Number(entry.remoteId) === Number(id)) || null;
}

function getCharacterImageRecord(id) {
  const img = CHARACTER_IMAGE_MAP.get(Number(id));
  const grid = img?.image_grid?.[0];
  const medium = img?.image_medium?.[0];
  return {
    grid: grid || medium || `/assets/touhou_characters/${id}.jpg`,
    medium: medium || grid || `/assets/touhou_characters/${id}.jpg`
  };
}

function getSubjectYear(detail) {
  const date = detail?.date;
  if (!date) return null;
  const year = parseInt(String(date).split('-')[0], 10);
  return Number.isFinite(year) ? year : null;
}

function getRandomTouhouEntry() {
  if (!Array.isArray(touhouCharacters) || touhouCharacters.length === 0) return null;
  return touhouCharacters[Math.floor(Math.random() * touhouCharacters.length)];
}

async function searchCharacterByKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') return null;
  const normalized = normalizeName(keyword);
  const candidate = LOCAL_PROFILE_LIST.find(({ profile }) => {
    const names = [
      profile.name,
      profile.primaryName,
      profile.translatedName,
      ...(profile.aliases || [])
    ];
    return names.some((n) => normalizeDatasetName(n) === normalized || normalizeName(n) === normalized);
  });
  if (!candidate) return null;
  return mapProfileToCharacter(candidate.profile);
}

function buildCharacterFromEntry(entry) {
  if (!entry) return null;
  const id = Number(entry.remoteId);
  const metaTags = Array.isArray(entry.metaTags)
    ? entry.metaTags.map((tag) => tag.name || tag).filter(Boolean)
    : [];

  return {
    id,
    name: entry.remoteName || entry.localName || '未知',
    nameCn: entry.remoteNameCn || entry.remoteName || entry.localName || '未知',
    nameEn: entry.remoteName || entry.localName || '未知',
    gender: '?',
    image: getCharacterImageRecord(id).medium,
    imageGrid: getCharacterImageRecord(id).grid,
    summary: SUMMARY_MAP.get(id) || '',
    appearances: [],
    appearanceIds: [],
    latestAppearance: -1,
    earliestAppearance: -1,
    highestRating: -1,
    popularity: 0,
    rawTags: new Map(),
    animeVAs: [],
    metaTags: idToTags[id] || metaTags
  };
}

async function getSubjectDetails(subjectId) {
  const detail = SUBJECT_DETAIL_MAP.get(Number(subjectId));
  if (!detail) {
    return null;
  }
  const year = getSubjectYear(detail);
  const tags = Array.isArray(detail.tags)
    ? detail.tags
        .filter((tag) => !String(tag.name || '').includes('20'))
        .map((tag) => ({ [tag.name]: tag.count }))
    : [];
  return {
    name: detail.name_cn || detail.name,
    year,
    tags,
    raw_tags: detail.tags || [],
    meta_tags: detail.meta_tags || [],
    rating: detail.rating?.score || 0,
    rating_count: detail.rating?.total || 0
  };
}

async function getCharacterAppearances(characterId, gameSettings = {}) {
  const profile = getProfileById(characterId);
  if (profile) {
    const networkTags = toArray(profile?.basic_info?.['萌点'] || profile?.['萌点']);
    const works = toArray(profile?.basic_info?.['初登场作品'] || profile?.['初登场作品']);
    return {
      appearances: [],
      appearanceIds: [],
      latestAppearance: -1,
      earliestAppearance: -1,
      highestRating: -1,
      rawTags: new Map(),
      metaTags: [],
      networkTags,
      animeVAs: [],
      touhouWorks: works.map((w, idx) => ({ key: `work-${idx}`, label: '初登场作品', value: w }))
    };
  }
  const subjects = CHARACTER_SUBJECT_MAP.get(Number(characterId)) || [];
  const persons = CHARACTER_PERSONS_MAP.get(Number(characterId)) || [];
  const settings = {
    includeGame: false,
    metaTags: [],
    commonTags: true,
    subjectTagNum: 6,
    characterTagNum: 6,
    ...gameSettings
  };

  if (!subjects.length) {
    return {
      appearances: [],
      appearanceIds: [],
      latestAppearance: -1,
      earliestAppearance: -1,
      highestRating: 0,
      rawTags: new Map(),
      metaTags: [],
      networkTags: [],
      animeVAs: []
    };
  }

  const isMainOrSupport = (appearance) => {
    if (!appearance || !appearance.staff) return true;
    return appearance.staff === '主角' || appearance.staff === '配角';
  };

  let filteredAppearances;
  if (settings.includeGame) {
    filteredAppearances = subjects.filter(
      (appearance) =>
        isMainOrSupport(appearance) &&
        (appearance.type === 2 || appearance.type === 4)
    );
  } else {
    filteredAppearances = subjects.filter(
      (appearance) =>
        isMainOrSupport(appearance) &&
        (appearance.type === 2 || subjectsWithExtraTags.has(appearance.id))
    );
    if (filteredAppearances.length === 0) {
      filteredAppearances = subjects.filter(
        (appearance) =>
          isMainOrSupport(appearance) && appearance.type === 4
      );
    }
  }

  // 若因 staff 编码缺失导致仍为空，直接使用所有作品
  if (filteredAppearances.length === 0) {
    filteredAppearances = subjects;
  }

  if (filteredAppearances.length === 0) {
    return {
      appearances: [],
      appearanceIds: [],
      latestAppearance: -1,
      earliestAppearance: -1,
      highestRating: -1,
      rawTags: new Map(),
      metaTags: [],
      networkTags: [],
      animeVAs: []
    };
  }

  let latestAppearance = -1;
  let earliestAppearance = -1;
  let highestRating = -1;
  const sourceTagMap = new Map([
    ['GAL', '游戏'],
    ['轻小说改', '小说'],
    ['轻改', '小说'],
    ['原创动画', '原创'],
    ['网文', '小说'],
    ['漫改', '漫画'],
    ['漫画改编', '漫画'],
    ['游戏改编', '游戏'],
    ['小说改编', '小说']
  ]);
  const sourceTagSet = new Set(['原创', '游戏', '小说', '漫画']);
  const regionTagSet = new Set([
    '日本',
    '欧美',
    '美国',
    '中国',
    '法国',
    '韩国',
    '英国',
    '俄罗斯',
    '中国香港',
    '苏联',
    '捷克',
    '中国台湾',
    '马来西亚'
  ]);
  const sourceTagCounts = new Map();
  const regionTags = new Set();
  const tagCounts = new Map();
  const metaTagCounts = new Map();
  const allMetaTags = new Set();
  const rawTags = new Map();
  const networkTagsSet = new Set();

  const appearances = await Promise.all(
    filteredAppearances.map(async (appearance) => {
      try {
        const stuffFactor = appearance.staff === '涓昏' ? 3 : 1;
        const details = await getSubjectDetails(appearance.id);
        if (!details || details.year === null) return null;

    if (!settings.metaTags.filter((tag) => tag !== '').every((tag) => details.meta_tags.includes(tag))) {
      return null;
    }

        if (latestAppearance === -1 || details.year > latestAppearance) {
          latestAppearance = details.year;
        }
        if (earliestAppearance === -1 || details.year < earliestAppearance) {
          earliestAppearance = details.year;
        }
        if (details.rating > highestRating) {
          highestRating = details.rating;
        }

        if (settings.commonTags) {
          details.raw_tags.forEach((tag) => {
            if (sourceTagSet.has(tag.name)) {
              sourceTagCounts.set(tag.name, (sourceTagCounts.get(tag.name) || 0) + stuffFactor * tag.count);
            } else if (sourceTagMap.has(tag.name)) {
              const mappedTag = sourceTagMap.get(tag.name);
              sourceTagCounts.set(mappedTag, (sourceTagCounts.get(mappedTag) || 0) + stuffFactor * tag.count);
            } else {
              rawTags.set(tag.name, (rawTags.get(tag.name) || 0) + stuffFactor * tag.count);
              networkTagsSet.add(tag.name);
            }
          });
        } else {
          details.meta_tags.forEach((tag) => {
            if (sourceTagSet.has(tag)) {
              return;
            } else if (regionTagSet.has(tag)) {
              regionTags.add(tag);
            } else {
              metaTagCounts.set(tag, (metaTagCounts.get(tag) || 0) + (tagCounts.get(tag) || stuffFactor));
              networkTagsSet.add(tag);
            }
          });

          details.tags.forEach((tagObj) => {
            const [[name, count]] = Object.entries(tagObj);
            if (sourceTagSet.has(name)) {
              sourceTagCounts.set(name, (sourceTagCounts.get(name) || 0) + count * stuffFactor);
            } else if (regionTagSet.has(name)) {
              regionTags.add(name);
            } else if (sourceTagMap.has(name)) {
              const mappedTag = sourceTagMap.get(name);
              sourceTagCounts.set(mappedTag, (sourceTagCounts.get(mappedTag) || 0) + count * stuffFactor);
            } else if (regionTags.has(name)) {
              return;
            } else {
              tagCounts.set(name, (tagCounts.get(name) || 0) + count * stuffFactor);
              networkTagsSet.add(name);
            }
          });
        }

        return {
          id: appearance.id,
          name: details.name,
          rating_count: details.rating_count
        };
      } catch (error) {
        console.error(`Failed to get details for subject ${appearance.id}:`, error);
        return null;
      }
    })
  );

  let sortedRawTags;
  let sortedSourceTags;
  let sortedTags;
  let sortedMetaTags;
  let networkTags = [];
  if (settings.commonTags) {
    sortedSourceTags = Array.from(sourceTagCounts.entries())
      .map(([name, count]) => ({ [name]: count }))
      .sort((a, b) => Object.values(b)[0] - Object.values(a)[0]);
    if (sortedSourceTags.length > 0) {
      const topSourceTag = Object.entries(sortedSourceTags[0])[0];
      rawTags.set(topSourceTag[0], (rawTags.get(topSourceTag[0]) || 0) + topSourceTag[1]);
    }
    const sortedEntries = [...rawTags.entries()]
      .filter((entry) => !entry[0].includes('20'))
      .sort((a, b) => b[1] - a[1]);
    const maxCount = sortedEntries.length > 0 ? sortedEntries[0][1] : 0;
    const threshold = maxCount * 0.1;
    let cutoffIndex = sortedEntries.findIndex((entry) => entry[1] < threshold);
    sortedRawTags = new Map(sortedEntries.slice(0, Math.max(cutoffIndex, settings.subjectTagNum)));
    networkTags = Array.from(sortedRawTags.keys());
  } else {
    sortedSourceTags = Array.from(sourceTagCounts.entries())
      .map(([name, count]) => ({ [name]: count }))
      .sort((a, b) => Object.values(b)[0] - Object.values(a)[0]);

    sortedTags = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ [name]: count }))
      .sort((a, b) => Object.values(b)[0] - Object.values(a)[0]);

    sortedMetaTags = Array.from(metaTagCounts.entries())
      .map(([name, count]) => ({ [name]: count }))
      .sort((a, b) => Object.values(b)[0] - Object.values(a)[0]);

    if (sortedSourceTags.length > 0) {
      allMetaTags.add(Object.keys(sortedSourceTags[0])[0]);
    }
    for (const tagObj of sortedMetaTags) {
      if (allMetaTags.size >= settings.subjectTagNum) break;
      allMetaTags.add(Object.keys(tagObj)[0]);
    }
    for (const tagObj of sortedTags) {
      if (allMetaTags.size >= settings.subjectTagNum) break;
      allMetaTags.add(Object.keys(tagObj)[0]);
    }
    if (idToTags && idToTags[characterId]) {
      idToTags[characterId]
        .slice(0, Math.min(settings.characterTagNum, idToTags[characterId].length))
        .forEach((tag) => allMetaTags.add(tag));
    }
    regionTags.forEach((tag) => allMetaTags.add(tag));
    networkTags = Array.from(networkTagsSet);
  }

  const appearanceNames = [];
  const appearanceIds = [];

  appearances
    .filter((appearance) => appearance !== null)
    .sort((a, b) => b.rating_count - a.rating_count)
    .forEach((appearance) => {
      appearanceNames.push(appearance.name);
      appearanceIds.push(appearance.id);
    });

  const animeVAs = new Set();
  const vaList = persons.filter((person) => person.subject_type === 2 || person.subject_type === 4);
  vaList.forEach((person) => {
    allMetaTags.add(`${person.name}`);
    animeVAs.add(person.name);
  });

  return {
    appearances: appearanceNames,
    appearanceIds: appearanceIds,
    latestAppearance,
    earliestAppearance,
    highestRating,
    rawTags: sortedRawTags || new Map(),
    animeVAs: Array.from(animeVAs),
    metaTags: Array.from(allMetaTags),
    networkTags
  };
}

async function getCharacterDetails(characterId) {
  const profile = getProfileById(characterId);
  if (profile) {
    return mapProfileToCharacter(profile);
  }
  const entry = getLocalCharacterEntry(characterId);
  if (!entry) {
    throw new Error('本地未找到角色 ' + characterId);
  }

  const apiCharacterTags = Array.isArray(entry.characterTags)
    ? entry.characterTags.map((tag) => tag.name).filter(Boolean)
    : [];

  const popularity = (() => {
    const img = CHARACTER_IMAGE_MAP.get(Number(characterId));
    if (img?.collects) return img.collects;
    const subjects = CHARACTER_SUBJECT_MAP.get(Number(characterId)) || [];
    let maxCount = 0;
    subjects.forEach((subject) => {
      const detail = SUBJECT_DETAIL_MAP.get(Number(subject.id));
      const ratingCount = detail?.rating?.total;
      if (typeof ratingCount === 'number' && ratingCount > maxCount) {
        maxCount = ratingCount;
      }
    });
    return maxCount;
  })();

  const imgRec = getCharacterImageRecord(characterId);
  const summary = SUMMARY_MAP.get(Number(characterId)) || '';

  return {
    name: entry.remoteName || entry.localName || '',
    nameCn: entry.remoteNameCn || entry.remoteName || entry.localName || '',
    nameEn: entry.remoteName || entry.localName || '',
    gender: '?',
    image: imgRec.medium,
    imageGrid: imgRec.grid,
    summary,
    popularity,
    apiCharacterTags
  };
}

async function getCharactersBySubjectId(subjectId) {
  return getSubjectCharacterMap().get(Number(subjectId)) || [];
}

function filterBySettings(entry, gameSettings = {}) {
  const charId = Number(entry.remoteId);
  const subjects = CHARACTER_SUBJECT_MAP.get(charId) || [];
  if (subjects.length === 0) return false;
  const details = subjects
    .map((s) => SUBJECT_DETAIL_MAP.get(Number(s.id)))
    .filter(Boolean)
    .filter((detail) => {
      if (!gameSettings.includeGame) {
        return detail.type === 2 || subjectsWithExtraTags.has(detail.id);
      }
      return true;
    });
  if (details.length === 0) return false;

  const years = details.map(getSubjectYear).filter((y) => y !== null);
  if (years.length === 0) return false;
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  if (gameSettings.startYear && maxYear < gameSettings.startYear) return false;
  if (gameSettings.endYear && minYear > gameSettings.endYear) return false;

  const requiredMetaTags = (gameSettings.metaTags || []).filter((tag) => tag);
  if (requiredMetaTags.length > 0) {
    const unionMeta = new Set();
    details.forEach((detail) => {
      (detail.meta_tags || []).forEach((tag) => unionMeta.add(tag));
    });
    const missing = requiredMetaTags.some((tag) => !unionMeta.has(tag));
    if (missing) return false;
  }
  return true;
}

async function getRandomCharacter(gameSettings = {}) {
  if (LOCAL_PROFILE_LIST.length > 0) {
    const entry = LOCAL_PROFILE_LIST[Math.floor(Math.random() * LOCAL_PROFILE_LIST.length)];
    const base = mapProfileToCharacter(entry.profile);
    return enrichWithTouhouData(base);
  }

  const candidates = LOCAL_CHARACTERS.filter((entry) => filterBySettings(entry, gameSettings));

  if (candidates.length === 0) {
    throw new Error('本地数据未包含满足筛选条件的角色，或相关索引/搜索结果未被爬取');
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const entry = candidates[Math.floor(Math.random() * candidates.length)];
      const base = buildCharacterFromEntry(entry);
      if (base) {
        return enrichWithTouhouData(base);
      }
    } catch (err) {
      console.warn(`本地随机角色尝试 ${attempt + 1} 失败:`, err);
    }
  }

  throw new Error('本地随机角色选择失败');
}

async function designateCharacter(characterId, gameSettings = {}) {
  const profile = getProfileById(characterId);
  if (profile) {
    const base = mapProfileToCharacter(profile);
    return enrichWithTouhouData(base);
  }

  const base = buildCharacterFromEntry(getLocalCharacterEntry(characterId));
  if (!base) {
    throw new Error(`本地未找到角色${characterId}`);
  }
  const [details, appearances] = await Promise.all([
    getCharacterDetails(characterId),
    getCharacterAppearances(characterId, gameSettings || {})
  ]);
  return enrichWithTouhouData({
    id: Number(characterId),
    ...details,
    ...appearances
  });
}

function searchCharacters(keyword, limit = 10, offset = 0) {
  if (!keyword || typeof keyword !== 'string') {
    return { results: [], hasMore: false };
  }
  const normalized = normalizeName(keyword);
  const matched = LOCAL_PROFILE_LIST.filter(({ profile }) => {
    const names = [
      profile.name,
      profile.primaryName,
      profile.translatedName,
      ...(profile.aliases || [])
    ];
    return names.some((n) => normalizeDatasetName(n).includes(normalized) || normalizeName(n).includes(normalized));
  }).map(({ profile }) => {
    const base = mapProfileToCharacter(profile);
    if (!base) return null;
    return {
      ...base,
      image: base.image || base.imageGrid || '',
      popularity: 0
    };
  });

  const deduped = [];
  const seen = new Set();
  matched.forEach((entry) => {
    if (!entry) return;
    const key = normalizeName(entry.name || entry.nameCn) || String(entry.id);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(entry);
    }
  });

  const results = deduped.slice(offset, offset + limit);
  const hasMore = offset + limit < deduped.length;
  return { results, hasMore };
}

async function getIndexInfo() {
  throw new Error('本地未抓取 index 数据，无法使用索引');
}

async function searchSubjects(keyword) {
  if (!keyword || typeof keyword !== 'string') return [];
  const normalized = normalizeName(keyword);
  const matched = (subjectDetailsData?.data || []).filter((subject) => {
    return (
      normalizeName(subject.name).includes(normalized) ||
      normalizeName(subject.name_cn).includes(normalized)
    );
  });

  return matched.map((subject) => ({
    id: subject.id,
    name: subject.name,
    name_cn: subject.name_cn,
    image: subject.images?.grid || subject.images?.medium || '',
    date: subject.date,
    type: subject.type === 2 ? '动画' : '游戏'
  }));
}

function normalizeAttributeTokens(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((v) => normalizeAttributeTokens(v));
  }
  return String(value)
    .split(/[\/、，,；;\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function getProfileAttributeValues(profile, key) {
  if (!profile) return [];
  const raw = profile[key] || profile?.basic_info?.[key];
  return normalizeAttributeTokens(raw);
}

function generateFeedback(guess, answerCharacter) {
  const result = {};
  const guessProfile = guess.touhouProfile || null;
  const answerProfile = answerCharacter.touhouProfile || null;

  const attributeFeedback = ATTRIBUTE_DEFINITIONS.map((def) => {
    const guessValues = getProfileAttributeValues(guessProfile, def.key);
    const answerValues = getProfileAttributeValues(answerProfile, def.key);
    const hasMatch =
      guessValues.length > 0 &&
      answerValues.length > 0 &&
      guessValues.some((val) => answerValues.includes(val));
    return {
      key: def.key,
      label: def.label,
      value: guessValues.length > 0 ? guessValues : ['未知'],
      match: hasMatch
    };
  });

  result.touhouAttributes = attributeFeedback;

  const sharedAttributeTags = attributeFeedback
    .filter((attr) => attr.match && Array.isArray(attr.value))
    .flatMap((attr) => attr.value.map((val) => `${attr.label}:${val}`));

  result.metaTags = {
    guess: Array.isArray(guess.metaTags) ? guess.metaTags : [],
    shared: sharedAttributeTags
  };

  result.shared_appearances = getSharedWorks(guessProfile, answerProfile);
  result.touhouWorks = {
    guess: guess.touhouWorks || [],
    answer: answerCharacter.touhouWorks || []
  };

  return result;
}
export {
  getRandomCharacter,
  designateCharacter,
  getCharacterAppearances,
  getCharactersBySubjectId,
  getCharacterDetails,
  generateFeedback,
  getIndexInfo,
  searchSubjects,
  searchCharacters,
  searchCharacterByKeyword
};






