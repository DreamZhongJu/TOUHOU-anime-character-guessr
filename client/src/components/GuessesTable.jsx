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

function GuessesTable({ guesses, answerCharacter }) {
  const answerNetworkTags = Array.isArray(answerCharacter?.networkTags) ? new Set(answerCharacter.networkTags) : new Set();

  const buildAttributeMap = (guess) => {
    const map = {};
    (guess.touhouAttributes || []).forEach(attr => {
      map[attr.key] = attr;
    });
    return map;
  };

  const splitValue = (value) => {
    if (typeof value !== 'string') return [];
    return value
      .split(SPLIT_REGEX)
      .map(part => part.trim())
      .filter(Boolean);
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
    return {
      tokens,
      isMatch
    };
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
            <th>出场作品（二者中一个则变绿）</th>
          </tr>
        </thead>
        <tbody>
          {guesses.map((guess, guessIndex) => {
            const attrMap = buildAttributeMap(guess);
            const workTokens = (guess.touhouWorks || []).map(work => work.value).filter(v => v && v !== '未知');
            const netTags = Array.isArray(guess.networkTags) ? guess.networkTags.filter(Boolean) : [];
            const hasSharedNetTag = netTags.some(tag => answerNetworkTags.has(tag));
            return (
              <tr key={guessIndex}>
                <td>
                  <img src={guess.icon} alt="character" className="character-icon" />
                </td>
                <td>
                  <div className={`character-name-container ${guess.isAnswer ? 'correct' : ''}`}>
                    {guess.guessrName && (
                      <div className="character-guessr-name" style={{ fontSize: '12px', color: '#888' }}>猜测者：{guess.guessrName}</div>
                    )}
                    <div className="character-name">{guess.name}</div>
                    <div className="character-name-cn">{guess.nameCn}</div>
                  </div>
                </td>
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
                <td>
                  <div className={`attribute-cell ${hasSharedNetTag ? 'match' : ''}`}>
                    {netTags.length > 0 ? (
                      netTags.map((tag, idx) => (
                        <span key={`${tag}-${idx}`} className="attribute-token">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="attribute-token unknown">未知</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="work-info">
                    <div className="shared-work-tag">
                      <div className="attribute-cell match">
                        {workTokens.length > 0 ? (
                          workTokens.map((work, idx) => (
                            <span key={`${work}-${idx}`} className="attribute-token">
                              {work}
                            </span>
                          ))
                        ) : (
                          <span className="attribute-token unknown">未知</span>
                        )}
                      </div>
                    </div>
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
