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

function GuessesTable({ guesses }) {
  const buildAttributeMap = (guess) => {
    const map = {};
    (guess.touhouAttributes || []).forEach(attr => {
      map[attr.label] = attr;
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
            <th>名字</th>
            {ATTRIBUTE_COLUMNS.map(column => (
              <th key={column.label}>{column.label}</th>
            ))}
            <th>共同作品</th>
          </tr>
        </thead>
        <tbody>
          {guesses.map((guess, guessIndex) => {
            const attrMap = buildAttributeMap(guess);
            return (
              <tr key={guessIndex}>
                <td>
                  <img src={guess.icon} alt="character" className="character-icon" />
                </td>
                <td>
                  <div className={`character-name-container ${guess.isAnswer ? 'correct' : ''}`}>
                    {guess.guessrName && (
                      <div className="character-guessr-name" style={{ fontSize: '12px', color: '#888' }}>来自：{guess.guessrName}</div>
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
                  <div className="work-info">
                    {guess.sharedAppearances && guess.sharedAppearances.count > 0 && (
                      <div className="shared-work-tag">
                        <div className="attribute-cell match">
                          <span className="attribute-token">
                            {guess.sharedAppearances.first}
                            {guess.sharedAppearances.count > 1 && ` +${guess.sharedAppearances.count - 1}`}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="work-list">
                      {(guess.touhouWorks || []).map(work => (
                        <div key={work.key} className="work-entry">
                          {work.label}：{work.value || '未知'}
                        </div>
                      ))}
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
