import '../styles/GuessesTable.css';

const ATTRIBUTE_COLUMNS = [
  { label: '族谱', keys: ['种族'] },
  { label: '发色', keys: ['发色'] },
  { label: '瞳色', keys: ['瞳色'] },
  { label: '活动范围', keys: ['活动范围'] },
  { label: '所属团体', keys: ['所属团体'] }
];

const SPLIT_REGEX = /[\/、，,；;\s]+/;
const BLOCKED_TAGS = new Set();

const splitValue = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap(item => splitValue(item));
  }
  if (typeof value !== 'string') return [];
  return value
    .split(SPLIT_REGEX)
    .map(part => part.trim())
    .filter(Boolean);
};

const getBasicInfoValues = (character, key) => {
  const profile = character?.touhouProfile;
  const raw = profile?.[key] || profile?.basic_info?.[key];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return [raw];
};

function TagChip({ label, matched = false, unknown = false }) {
  const className = [
    'attribute-token',
    matched ? 'match' : '',
    unknown ? 'unknown' : ''
  ].filter(Boolean).join(' ');
  return <span className={className}>{label}</span>;
}

const buildAnswerAttributeTokenMap = (answerCharacter) => {
  const map = new Map();
  ATTRIBUTE_COLUMNS.forEach((column) => {
    const tokens = column.keys.flatMap((key) => splitValue(getBasicInfoValues(answerCharacter, key)));
    map.set(column.label, new Set(tokens));
  });
  return map;
};

function GuessesTable({ guesses, answerCharacter, onCharacterClick = () => {} }) {
  const answerGuess = (
    Array.isArray(answerCharacter?.networkTags) && answerCharacter.networkTags.length > 0
      ? answerCharacter
      : guesses.find(g => g.isAnswer)
  ) || answerCharacter || {};

  const normalizeTags = (tags) => {
    if (!Array.isArray(tags)) return [];
    return tags.flatMap(t => {
      if (!t) return [];
      const v = typeof t === 'string' ? t : t.value;
      return splitValue(v);
    }).filter(tag => !BLOCKED_TAGS.has(tag));
  };

  const getNetTags = (character) => {
    const profileTags = normalizeTags(getBasicInfoValues(character, '萌点'));
    if (profileTags.length > 0) return profileTags;
    const networkTags = Array.isArray(character?.networkTags) ? character.networkTags : [];
    const metaTags = Array.isArray(character?.metaTags) ? character.metaTags : [];
    const combined = [...networkTags, ...metaTags];
    return normalizeTags(combined);
  };

  const pickDisplayNetTags = (netTags, matchedSet, limit = 5) => {
    if (!Array.isArray(netTags) || netTags.length === 0) return [];
    const matches = netTags.filter(tag => matchedSet.has(tag));
    if (matches.length >= limit) {
      return matches.slice(0, limit);
    }
    const remaining = netTags.filter(tag => !matchedSet.has(tag));
    const shuffled = remaining
      .map(tag => ({ tag, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(item => item.tag);
    const take = Math.max(0, limit - matches.length);
    return [...matches, ...shuffled.slice(0, take)];
  };

  const getWorkTokens = (character) => {
    const profileWorks = normalizeTags(getBasicInfoValues(character, '初登场作品'));
    if (profileWorks.length > 0) return profileWorks;
    const worksArray = Array.isArray(character?.touhouWorks)
      ? character.touhouWorks.flatMap(work => splitValue(work.value))
      : [];
    return worksArray.filter(Boolean);
  };

  const answerNetworkTags = new Set(getNetTags(answerGuess));
  const answerWorkTokens = new Set(getWorkTokens(answerGuess));
  const answerAttributeTokenMap = buildAnswerAttributeTokenMap(answerGuess);

  const buildAttributeMap = (guess) => {
    const map = {};
    (guess.touhouAttributes || []).forEach(attr => {
      map[attr.key] = attr;
    });
    return map;
  };

  const getAttributeDisplay = (attrMap, column) => {
    const tokens = column.keys.flatMap(key => {
      const attr = attrMap[key];
      if (!attr || !attr.value || attr.value === '暂无') {
        return [];
      }
      return splitValue(attr.value);
    });
    const answerTokens = answerAttributeTokenMap.get(column.label) || new Set();
    const matchedSet = new Set(tokens.filter(token => answerTokens.has(token)));
    return { tokens, matchedSet };
  };

  return (
    <div className="table-container">
      <table className="guesses-table">
        <thead>
          <tr>
            <th></th>
            <th>角色信息</th>
            {ATTRIBUTE_COLUMNS.map(column => (
              <th key={column.label}>{column.label}</th>
            ))}
            <th>相关属性</th>
            <th>初登场作品</th>
          </tr>
        </thead>
        <tbody>
          {[...guesses].slice().reverse().map((guess, guessIndex) => {
            const attrMap = buildAttributeMap(guess);
            const workTokens = getWorkTokens(guess);
            const netTags = getNetTags(guess);
            const primaryNames = getBasicInfoValues(guess, '本名');
            const primaryName = primaryNames[0] || guess.nameCn || guess.name;
            const matchedWorkTagSet = new Set(
              workTokens.filter(token => answerWorkTokens.has(token))
            );
            const matchedNetTagSet = new Set(netTags.filter(tag => answerNetworkTags.has(tag)));
            const displayNetTags = pickDisplayNetTags(netTags, matchedNetTagSet, 5);
            return (
              <tr key={guessIndex}>
                <td>
                  <img src={guess.icon} alt="character" className="character-icon" />
                </td>
                <td
                  className="character-cell"
                  onClick={() => onCharacterClick(guess)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={`character-name-container ${guess.isAnswer ? 'correct' : ''}`}>
                    <div className="character-name">{guess.name || primaryName}</div>
                    <div className="character-name-cn">{primaryName}</div>
                  </div>
                </td>
                {ATTRIBUTE_COLUMNS.map(column => {
                  const { tokens, matchedSet } = getAttributeDisplay(attrMap, column);
                  const displayTokens = tokens.length > 0 ? tokens : ['暂无'];
                  return (
                    <td key={column.label}>
                      <div className="attribute-cell">
                        {displayTokens.map((token, tokenIndex) => (
                          <TagChip
                            key={`${column.label}-${tokenIndex}-${token}`}
                            label={token}
                            matched={matchedSet.has(token)}
                            unknown={token === '暂无'}
                          />
                        ))}
                      </div>
                    </td>
                  );
                })}
                <td>
                  <div className="attribute-cell work-cell">
                    {displayNetTags.length > 0 ? (
                      displayNetTags.map((tag, idx) => (
                        <TagChip
                          key={`${tag}-${idx}`}
                          label={tag}
                          matched={matchedNetTagSet.has(tag)}
                        />
                      ))
                    ) : (
                      <TagChip label="暂无" unknown />
                    )}
                  </div>
                </td>
                <td>
                  <div className="attribute-cell work-cell">
                    {workTokens.length > 0 ? (
                      workTokens.map((work, idx) => (
                        <TagChip
                          key={`${work}-${idx}`}
                          label={work}
                          matched={matchedWorkTagSet.has(work)}
                        />
                      ))
                    ) : (
                      <TagChip label="暂无" unknown />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default GuessesTable;
