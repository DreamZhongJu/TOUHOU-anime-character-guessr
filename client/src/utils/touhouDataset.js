import touhouCharacters from '../data/touhouCharacters.json';

const ATTRIBUTE_DEFINITIONS = [
  { key: '种族', label: '种族' },
  { key: '发色', label: '发色' },
  { key: '发型', label: '发型' },
  { key: '瞳色', label: '瞳色' },
  { key: '性格1', label: '性格1' },
  { key: '性格2', label: '性格2' },
  { key: '身材', label: '身材' },
  { key: '足着', label: '足着' }
];

const TAG_KEYS = ['性格1', '性格2', '身材', '足着', '出场作品1', '出场作品2'];

const WORK_DEFINITIONS = [
  { key: '出场作品1', label: '初登场' },
  { key: '出场作品2', label: '代表作' }
];

const touhouMap = new Map();

touhouCharacters.forEach(entry => {
  const normalized = normalizeName(entry['角色']);
  if (normalized && !touhouMap.has(normalized)) {
    touhouMap.set(normalized, entry);
  }
});

function normalizeName(name) {
  return name
    ? name
        .replace(/[`'"·•・．\.\s]/g, '')
        .replace(/[（）()]/g, '')
        .toLowerCase()
    : '';
}

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
    .map(key => (profile[key] ? `${key}：${profile[key]}` : null))
    .filter(Boolean);
}

function getTouhouAttributes(profile) {
  return ATTRIBUTE_DEFINITIONS.map(def => ({
    key: def.key,
    label: def.label,
    value: profile ? profile[def.key] || '未知' : '未知'
  }));
}

function getTouhouWorks(profile) {
  return WORK_DEFINITIONS.map(def => ({
    key: def.key,
    label: def.label,
    value: profile ? profile[def.key] || '未知' : '未知'
  }));
}

function getSharedWorks(guessProfile, answerProfile) {
  if (!guessProfile || !answerProfile) {
    return {
      first: '',
      count: 0
    };
  }

  const allGuessWorks = WORK_DEFINITIONS
    .map(def => guessProfile[def.key])
    .filter(Boolean);
  const allAnswerWorks = WORK_DEFINITIONS
    .map(def => answerProfile[def.key])
    .filter(Boolean);

  const sharedWorks = allGuessWorks.filter(work => allAnswerWorks.includes(work));

  return {
    first: sharedWorks[0] || '',
    count: sharedWorks.length
  };
}

function enrichWithTouhouData(character) {
  const profile = findTouhouProfileByCharacter(character);
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
  buildTouhouTags,
  getTouhouAttributes,
  getTouhouWorks,
  getSharedWorks,
  enrichWithTouhouData
};
