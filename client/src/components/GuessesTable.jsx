import '../styles/GuessesTable.css';
import { idToTags } from '../data/id_tags.js';

const ATTRIBUTE_COLUMNS = [
  { label: '族谱', keys: ['种族'] },
  { label: '发色', keys: ['发色'] },
  { label: '发型', keys: ['发型'] },
  { label: '瞳色', keys: ['瞳色'] },
  { label: '性情', keys: ['性格1', '性格2'] },
  { label: '身姿', keys: ['身材'] },
  { label: '足下', keys: ['足着'] }
];

const SPLIT_REGEX = /[\/、，,]+/;
const BLOCKED_TAGS = new Set(['囧仙']);

const splitValue = (value) => {
  if (typeof value !== 'string') return [];
  return value
    .split(SPLIT_REGEX)
    .map(part => part.trim())
    .filter(Boolean);
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

  const answerNetworkTags = new Set(normalizeTags(idToTags[answerGuess.id] || []));
  const answerWorkTokens = new Set(
    (answerGuess.touhouWorks || [])
      .flatMap(work => splitValue(work.value))
      .filter(Boolean)
  );
  const answerPopularity = typeof answerGuess.popularity === 'number' ? answerGuess.popularity : 0;
  const answerHighestRating = typeof answerGuess.highestRating === 'number' ? answerGuess.highestRating : 0;
  const answerEarliestAppearance = typeof answerGuess.earliestAppearance === 'number' ? answerGuess.earliestAppearance : 0;

  const buildTrend = (value, answerValue) => {
    if (value === null || value === undefined || value === '-' || answerValue === null || answerValue === undefined) {
      return { display: '未知', trend: null };
    }
    const numValue = typeof value === 'string' ? Number(value) : value;
    const numAnswer = typeof answerValue === 'string' ? Number(answerValue) : answerValue;
    if (Number.isNaN(numValue) || Number.isNaN(numAnswer)) {
      return { display: '未知', trend: null };
    }
    if (numAnswer > numValue) {
      return { display: numValue, trend: 'up' };
    }
    if (numAnswer < numValue) {
      return { display: numValue, trend: 'down' };
    }
    return { display: numValue, trend: 'equal' };
  };

  const renderMetric = (metric, extraClass = '') => {
    const arrow = metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '';
    const trendClass = metric.trend ? `trend-${metric.trend}` : '';
    return (
      <span className={`metric-value ${extraClass} ${trendClass}`}>
        {metric.display}{arrow}
      </span>
    );
  };

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
            <th>角色信息</th>
            {ATTRIBUTE_COLUMNS.map(column => (
              <th key={column.label}>{column.label}</th>
            ))}
            <th>热度对比</th>
            <th>评分对比</th>
            <th>初登年份</th>
            <th>网络标签</th>
            <th>相关作品</th>
          </tr>
        </thead>
        <tbody>
          {[...guesses].slice().reverse().map((guess, guessIndex) => {
            const attrMap = buildAttributeMap(guess);
            const workTokens = (guess.touhouWorks || [])
              .flatMap(work => splitValue(work.value))
              .filter(v => v && v !== '未知');
            const netTags = normalizeTags(idToTags[guess.id] || []);
            const popularityVal = typeof guess.popularity === 'number'
              ? guess.popularity
              : answerPopularity;
            const highestRatingVal = typeof guess.highestRating === 'number' && guess.highestRating >= 0
              ? Number(guess.highestRating.toFixed(1))
              : (typeof answerHighestRating === 'number' ? answerHighestRating : 0);
            const earliestAppearanceVal = typeof guess.earliestAppearance === 'number' && guess.earliestAppearance > 0
              ? guess.earliestAppearance
              : (typeof answerEarliestAppearance === 'number' ? answerEarliestAppearance : 0);
            const metricPopularity = buildTrend(popularityVal, answerPopularity);
            const metricHighestRating = buildTrend(highestRatingVal, answerHighestRating);
            const metricEarliest = buildTrend(earliestAppearanceVal, answerEarliestAppearance);
            const matchedWorkTagSet = new Set(
              workTokens.filter(token => answerWorkTokens.has(token))
            );
            const matchedNetTagSet = new Set(netTags.filter(tag => answerNetworkTags.has(tag)));
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
                    {guess.guessrName && (
                      <div className="character-guessr-name" style={{ fontSize: '12px', color: '#888' }}>
                        本局命名：{guess.guessrName}
                      </div>
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
                  <div className="attribute-cell metric-cell">
                    {renderMetric(metricPopularity)}
                  </div>
                </td>
                <td>
                  <div className="attribute-cell metric-cell">
                    {renderMetric(metricHighestRating, 'rating-chip')}
                  </div>
                </td>
                <td>
                  <div className="attribute-cell metric-cell">
                    {renderMetric(metricEarliest)}
                  </div>
                </td>
                <td>
                  <div className="attribute-cell work-cell">
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
