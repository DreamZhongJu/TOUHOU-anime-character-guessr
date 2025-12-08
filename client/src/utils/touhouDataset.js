import characterDetails from '../../../数据集/touhou_character_details_normalized.json';
import characterList from '../../../数据集/touhou_characters.json';

const ATTRIBUTE_DEFINITIONS = [
  { key: '种族', label: '族谱' },
  { key: '发色', label: '发色' },
  { key: '瞳色', label: '瞳色' },
  { key: '活动范围', label: '活动范围' },
  { key: '所属团体', label: '所属团体' }
];

const TAG_KEYS = ['萌点'];
const WORK_DEFINITIONS = [{ key: '初登场作品', label: '初登场作品' }];

const touhouMap = new Map();
const profileSet = new Set();

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function normalizeName(name) {
  if (!name) return '';
  return name
    .replace(/[`'\"·\\?\s]/g, '')
    .replace(/[（）()]/g, '')
    .toLowerCase();
}

function normalizeProfile(entry) {
  const basicInfo = entry?.basic_info || {};
  const profile = {
    ...entry,
    ...basicInfo,
    basic_info: basicInfo,
    primaryName: toArray(basicInfo['本名'])[0] || entry.name || '',
    translatedName: toArray(basicInfo['译名'])[0] || '',
    aliases: []
  };

  const aliasPool = [
    entry.name,
    ...toArray(basicInfo['本名']),
    ...toArray(basicInfo['译名']),
    ...toArray(basicInfo['别名'])
  ].filter(Boolean);

  profile.aliases = Array.from(new Set(aliasPool));
  return profile;
}

function registerProfile(entry) {
  const profile = normalizeProfile(entry);
  const names = new Set([
    profile.name,
    profile.primaryName,
    profile.translatedName,
    ...profile.aliases
  ]);

  names.forEach(name => {
    const normalized = normalizeName(name);
    if (normalized && !touhouMap.has(normalized)) {
      touhouMap.set(normalized, profile);
    }
  });
  profileSet.add(profile);
}

characterDetails.forEach(registerProfile);
characterList.forEach(registerProfile);

function findTouhouProfileByName(name) {
  const normalized = normalizeName(name);
  if (!normalized) {
    return null;
  }
  return touhouMap.get(normalized) || null;
}

function findTouhouProfileByCharacter(character) {
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
    const profile = findTouhouProfileByName(cand);
    if (profile) {
      return profile;
    }
  }
  return null;
}

function buildTouhouTags(profile) {
  if (!profile) return [];
  return TAG_KEYS
    .flatMap(key => toArray(profile[key] || profile?.basic_info?.[key]))
    .filter(Boolean);
}

function getTouhouAttributes(profile) {
  return ATTRIBUTE_DEFINITIONS.map(def => ({
    key: def.key,
    label: def.label,
    value: profile ? toArray(profile[def.key] || profile?.basic_info?.[def.key]) : []
  }));
}

function getTouhouWorks(profile) {
  return WORK_DEFINITIONS.map(def => ({
    key: def.key,
    label: def.label,
    value: profile ? toArray(profile[def.key] || profile?.basic_info?.[def.key]) : []
  }));
}

function getAllProfiles() {
  return Array.from(profileSet);
}

function getSharedWorks(guessProfile, answerProfile) {
  if (!guessProfile || !answerProfile) {
    return {
      first: '',
      count: 0,
      list: []
    };
  }

  const allGuessWorks = WORK_DEFINITIONS
    .flatMap(def => toArray(guessProfile[def.key] || guessProfile?.basic_info?.[def.key]))
    .filter(Boolean);
  const allAnswerWorks = WORK_DEFINITIONS
    .flatMap(def => toArray(answerProfile[def.key] || answerProfile?.basic_info?.[def.key]))
    .filter(Boolean);

  const sharedWorks = allGuessWorks.filter(work => allAnswerWorks.includes(work));

  return {
    first: sharedWorks[0] || '',
    count: sharedWorks.length,
    list: sharedWorks
  };
}

function enrichWithTouhouData(character) {
  const profile = character?.touhouProfile || findTouhouProfileByCharacter(character);
  return {
    ...character,
    touhouProfile: profile,
    touhouAttributes: getTouhouAttributes(profile),
    touhouWorks: getTouhouWorks(profile),
    metaTags: buildTouhouTags(profile)
  };
}

export {
  ATTRIBUTE_DEFINITIONS,
  WORK_DEFINITIONS,
  findTouhouProfileByCharacter,
  findTouhouProfileByName,
  buildTouhouTags,
  getTouhouAttributes,
  getTouhouWorks,
  getSharedWorks,
  getAllProfiles,
  normalizeName,
  enrichWithTouhouData
};
