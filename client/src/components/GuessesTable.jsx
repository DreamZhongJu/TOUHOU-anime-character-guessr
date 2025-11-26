import '../styles/GuessesTable.css';

const ATTRIBUTE_COLUMNS = [
  { label: '种族', keys: ['种族'] },
  { label: '发色', keys: ['发色'] },
  { label: '发型', keys: ['发型'] },
  { label: '瞳色', keys: ['瞳色'] },
  { label: '性格', keys: ['性格1', '性格2'] },
  { label: '身材', keys: ['身材'] },
  { label: '足着', keys: ['足着'] }
];

const SPLIT_REGEX = /[\/、，,]+/;
const BLOCKED_TAGS = new Set(['囧仙']);

// 公用拆分函数：把“剧场版/大叔・SUNRISE”这样的字符串切成多个标签
const splitValue = (value) => {
  if (typeof value !== 'string') return [];
  return value
    .split(SPLIT_REGEX)
    .map(part => part.trim())
    .filter(Boolean);
};

function GuessesTable({ guesses, answerCharacter }) {
  // 优先使用传入的答案（带真实网络标签），否则回退到猜中的那一行
  const answerGuess = (
    Array.isArray(answerCharacter?.networkTags) && answerCharacter.networkTags.length > 0
      ? answerCharacter
      : guesses.find(g => g.isAnswer)
  ) || answerCharacter || {};

  // 兼容几种可能的数据格式：['东方', '同人'] 或 [{ value: '东方' }, ...]
  const normalizeTags = (tags) => {
    if (!Array.isArray(tags)) return [];
    return tags.flatMap(t => {
      if (!t) return [];
      const v = typeof t === 'string' ? t : t.value;
      return splitValue(v);
    }).filter(tag => !BLOCKED_TAGS.has(tag));
  };

  // 答案侧网络标签集合（已拆分）
  const answerNetworkTags = new Set(normalizeTags(answerGuess.networkTags));

  // 答案出场作品集合（已拆分）
  const answerWorkTokens = new Set(
    (answerGuess.touhouWorks || [])
      .flatMap(work => splitValue(work.value))
      .filter(Boolean)
  );

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
      if (!attr || !attr.value || attr.value === '未知') {
        return [];
      }
      return splitValue(attr.value);
    });

    const isMatch = column.keys.every(key => attrMap[key]?.match);
    return { tokens, isMatch };
  };

  return (
    <div className="table-container">
      <table className="guesses-table">
        <thead>
          <tr>
            <th></th>
            <th>角色</th>
            {ATTRIBUTE_COLUMNS.map(column => (
              <th key={column.label}>{column.label}</th>
            ))}
            <th>网络标签</th>
            <th>出场作品（逐项命中变绿）</th>
          </tr>
        </thead>
        <tbody>
          {guesses.map((guess, guessIndex) => {
            const attrMap = buildAttributeMap(guess);
            const workTokens = (guess.touhouWorks || [])
              .flatMap(work => splitValue(work.value))
              .filter(v => v && v !== '未知');

            const rawNetTags = Array.isArray(guess.networkTags)
              ? guess.networkTags.filter(Boolean)
              : [];

            // 猜测角色的标签，拆成 ["东方", "同人", "OVA", ...]
            const netTags = rawNetTags
              .flatMap(tag => splitValue(tag))
              .filter(tag => !BLOCKED_TAGS.has(tag));

            // 和答案角色的标签比对，得到真正重合的集合
            const matchedNetTagSet = new Set(
              netTags.filter(tag => answerNetworkTags.has(tag))
            );

            // 出场作品逐个标签对比，命中才变色
            const matchedWorkTagSet = new Set(
              workTokens.filter(token => answerWorkTokens.has(token))
            );

            return (
              <tr key={guessIndex}>
                <td>
                  <img src={guess.icon} alt="character" className="character-icon" />
                </td>
                <td>
                  <div className={`character-name-container ${guess.isAnswer ? 'correct' : ''}`}>
                    {guess.guessrName && (
                      <div className="character-guessr-name" style={{ fontSize: '12px', color: '#888' }}>
                        猜测者：{guess.guessrName}
                      </div>
                    )}
                    <div className="character-name">{guess.name}</div>
                    <div className="character-name-cn">{guess.nameCn}</div>
                  </div>
                </td>

                {/* 属性列（保持原来整格变绿的逻辑） */}
                {ATTRIBUTE_COLUMNS.map(column => {
                  const { tokens, isMatch } = getAttributeDisplay(attrMap, column);
                  const displayTokens = tokens.length > 0 ? tokens : ['未知'];
                  return (
                    <td key={column.label}>
                      <div className={`attribute-cell ${isMatch ? 'match' : ''}`}>
                        {displayTokens.map((token, tokenIndex) => (
                          <span
                            key={`${column.label}-${tokenIndex}-${token}`}
                            className={`attribute-token ${token === '未知' ? 'unknown' : ''}`}
                          >
                            {token}
                          </span>
                        ))}
                      </div>
                    </td>
                  );
                })}

                {/* 网络标签：按单个标签变色 */}
                <td>
                  <div className="attribute-cell">
                    {netTags.length > 0 ? (
                      netTags.map((tag, idx) => (
                        <span
                          key={`${tag}-${idx}`}
                          className={`attribute-token ${matchedNetTagSet.has(tag) ? 'match' : ''}`}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="attribute-token unknown">未知</span>
                    )}
                  </div>
                </td>

                {/* 出场作品：逐个作品比对变色 */}
                <td>
                  <div className="attribute-cell work-cell">
                    {workTokens.length > 0 ? (
                      workTokens.map((work, idx) => (
                        <span
                          key={`${work}-${idx}`}
                          className={`attribute-token ${matchedWorkTagSet.has(work) ? 'match' : ''}`}
                        >
                          {work}
                        </span>
                      ))
                    ) : (
                      <span className="attribute-token unknown">未知</span>
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
