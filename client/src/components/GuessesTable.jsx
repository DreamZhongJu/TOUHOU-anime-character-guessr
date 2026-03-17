import '../styles/GuessesTable.css';
import { enrichWithTouhouData } from '../utils/touhouDataset';

// ─── 族谱规范化 ────────────────────────────────────────────────────────────────
// 只是修饰词，不是种族名称
const RACE_QUALIFIERS = new Set(['女高中生','自称','实际','表','里']);

function normalizeRace(rawValues) {
  const found = new Set();
  for (const raw of (rawValues || [])) {
    // 去除脚注引用 [3] 等
    const str = String(raw).replace(/\[\d+\]/g, '');
    // 按分隔符拆分多种族：|、/、→、with
    const segments = str.split(/[|\/]|with|→/).map(s => s.trim()).filter(Boolean);
    for (const seg of segments) {
      // 继续按 ）结尾拆分复合结构，如"仙人（自称）鬼（实际）"
      const parts = seg.split(/(?<=[）)])/).map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        // 括号前的主体词，去掉尾部不确定符号
        const baseMatch = part.match(/^([^（(]+)/);
        const base = baseMatch ? baseMatch[1].trim().replace(/[？?]+$/, '') : '';
        if (base) found.add(base);
        // 括号内的修饰词（跳过纯修饰语）
        const subMatch = part.match(/[（(]([^）)]+)[）)]/);
        if (subMatch) {
          const sub = subMatch[1].trim().replace(/[？?]+$/, '');
          if (sub && !RACE_QUALIFIERS.has(sub) && !/^[？?可能]/.test(sub)) {
            found.add(sub);
          }
        }
      }
    }
  }
  return [...found].filter(Boolean);
}

// ─── 结构化属性列 ──────────────────────────────────────────────────────────────
const ATTRIBUTE_COLUMNS = [
  { label: '族谱',    keys: ['种族'],    normalize: normalizeRace },
  { label: '发色',    keys: ['发色'] },
  { label: '瞳色',    keys: ['瞳色'] },
  { label: '活动范围', keys: ['活动范围'], normalize: normalizeActivityRange },
  { label: '所属团体', keys: ['所属团体'] },
];

const SPLIT_REGEX = /[\/、，,；;\s]+/;

function splitValue(value) {
  if (Array.isArray(value)) return value.flatMap(splitValue);
  if (typeof value !== 'string') return [];
  return value.split(SPLIT_REGEX).map(s => s.trim()).filter(Boolean);
}

function getProfileValue(character, key) {
  const profile = character?.touhouProfile;
  const raw = profile?.[key] ?? profile?.basic_info?.[key];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

// ─── 活动范围规范化 ────────────────────────────────────────────────────────────
// 已知的地点关键词（按长度降序，避免短词先被截取）
const KNOWN_LOCATIONS = [
  '幻想乡全域', '幻想乡全境',
  '博丽神社', '守矢神社', '红魔馆', '魔法森林', '妖怪之山',
  '人类村落', '命莲寺', '永远亭', '地灵殿', '迷途竹林',
  '太阳花田', '彼岸', '旧地狱', '旧都', '月之都', '畜生界',
  '后户之国', '香霖堂', '辉针城', '雾之湖', '玄武之泽',
  '三途河', '梦境世界', '风神之湖', '魔界', '冥界',
  '地狱', '外界', '幻想乡',
];

function normalizeActivityRange(rawValues) {
  if (!rawValues || rawValues.length === 0) return [];
  const combined = rawValues.join('');
  const isAllDomain =
    combined.includes('幻想乡全域') || combined.includes('幻想乡全境');

  const found = new Set();
  if (isAllDomain) {
    found.add('幻想乡全域');
    // 仍然提取其他并存的具体地点（如"红魔馆幻想乡全域"→红魔馆+全域）
    for (const loc of KNOWN_LOCATIONS) {
      if (loc === '幻想乡全域' || loc === '幻想乡全境' || loc === '幻想乡') continue;
      if (combined.includes(loc)) found.add(loc);
    }
  } else {
    for (const loc of KNOWN_LOCATIONS) {
      if (combined.includes(loc)) found.add(loc);
    }
    // 兜底：原始 split
    if (found.size === 0) {
      splitValue(combined).forEach(t => found.add(t));
    }
  }
  return [...found];
}

// 活动范围匹配：幻想乡全域 ↔ 任何含幻想乡的地点
function activityMatches(token, answerSet) {
  if (answerSet.has(token)) return true;
  if (token === '幻想乡全域') {
    return [...answerSet].some(t => t.includes('幻想乡'));
  }
  if (answerSet.has('幻想乡全域')) {
    return token.includes('幻想乡');
  }
  return false;
}

// ─── 萌点分类 ──────────────────────────────────────────────────────────────────
const APPEARANCE_TAGS = new Set([
  '发型','单马尾','双马尾发','刘海','黑长直','黑长直发','鬓发样式',
  '白发红眼','发色异色','发型装饰','遮眼发','发饰','螺旋结构',
  '长裙类服','裙装类型','服装类型','服饰特征','服饰配件','和服','传统服饰',
  '荷叶边服','水手服','泡泡袖','灯笼袖','连体服饰','女仆',
  '帽子','帽子类型','宽檐帽','斗笠','丝带','头冠饰','手部配饰','眼镜',
  '首饰','配饰','胸部配饰','面部装饰','蝴蝶结','翅膀披风',
  '玛丽珍鞋','靴子','鞋类','有袜无鞋','裸足','袜子类型','白丝','绝对领域',
  '巨乳','贫乳','幼态','嘴型小巧','肤色','异色瞳','虎牙','锯齿牙',
  '兽耳','兽尾','尾巴','角','翅膀类型','异形耳朵','耳部特征',
  '露肤穿搭','萝莉','御姐',
]);
const PERSONALITY_TAGS = new Set([
  '腹黑','元气','纯真温柔','天然呆','天然萌','诚恳踏实','笨拙','笨手笨脚',
  '傲娇','懒散','健忘','学霸','博学','中二','搞事','嗜杀','好斗','贪财',
  '坏笑','孤僻','大和抚子','卖萌','病娇','可萝可御','贵妇','宅人',
  '大胃王','吃货','无节操','负面特质','负面行为','嫉妒','眼神呆滞',
  '鲁莽冒失','表里不一','表情冷漠','NEET','威严','高岭之花','正直',
  '忠诚贤惠','利己主义','电波','支配倾向','妄想倾向','情绪波动','狂躁',
  '胆怯','防御姿态','病弱','吐槽役','吸烟','酒豪','存在感低','脸盲',
  '说话习惯','特殊第一','主仆控',
]);
const IDENTITY_TAGS = new Set([
  '少女','亡灵系','不死特性','妖怪','妖邪','天狗','兽娘','兽人',
  '外星生物','人偶形象','职业身份','守卫人员','宗教人士','武士','音乐人',
  '领导者','黑帮首领','寻宝者','侦探','神祇','路人','破戒僧人','农妇',
  '人鱼','僵尸','公主','姐姐系','母性','妈妈','人妻','亲分','旅行',
  '木系能力','元素能力','变身能力','发明创造','怪力','食人','地壳操控',
  '毒系能力','性别伪装','昆虫',
  '刀类武器','辅助工具','扇子','三叉戟','棍棒类道','伞具','吊桶','武器',
  '工具','试管','餐具','乐器','书籍相关','扫帚','魔法杖','符箓',
  '中国风','中国人','别名','礼仪行为','自残行为',
]);

const MOE_CATEGORIES = [
  { label: '外观',    tagSet: APPEARANCE_TAGS,  colorClass: 'cat-appearance' },
  { label: '性格',    tagSet: PERSONALITY_TAGS, colorClass: 'cat-personality' },
  { label: '身份·能力', tagSet: IDENTITY_TAGS,  colorClass: 'cat-identity' },
];

// ─── 提取萌点（去重）──────────────────────────────────────────────────────────
function getMoeTags(character) {
  const profileTags = getProfileValue(character, '萌点');
  if (profileTags.length > 0) return [...new Set(profileTags.flatMap(splitValue))];
  const raw = [
    ...(Array.isArray(character?.networkTags) ? character.networkTags : []),
    ...(Array.isArray(character?.metaTags)    ? character.metaTags    : []),
  ];
  const seen = new Set();
  const result = [];
  for (const t of raw) {
    const v = typeof t === 'string' ? t : t?.value;
    if (!v) continue;
    for (const part of splitValue(v)) {
      if (!seen.has(part)) { seen.add(part); result.push(part); }
    }
  }
  return result;
}

function getWorkTags(character) {
  const profileWorks = getProfileValue(character, '初登场作品');
  if (profileWorks.length > 0) return [...new Set(profileWorks.flatMap(splitValue))];
  const works = Array.isArray(character?.touhouWorks)
    ? character.touhouWorks.flatMap(w => splitValue(w.value)) : [];
  return [...new Set(works)];
}

// ─── 构建答案属性 token 集合 ──────────────────────────────────────────────────
function buildAnswerAttrMap(answerCharacter) {
  const map = new Map();
  ATTRIBUTE_COLUMNS.forEach(col => {
    const rawVals = col.keys.flatMap(k => getProfileValue(answerCharacter, k));
    const tokens = col.normalize
      ? col.normalize(rawVals)
      : rawVals.flatMap(splitValue);
    map.set(col.label, new Set(tokens));
  });
  return map;
}

// ─── 子组件 ──────────────────────────────────────────────────────────────────
function TagChip({ label, matched = false, unknown = false }) {
  const cls = ['attribute-token', matched && 'match', unknown && 'unknown']
    .filter(Boolean).join(' ');
  return <span className={cls}>{label}</span>;
}

function MatchBadge({ matched, total }) {
  if (total === 0) return null;
  return (
    <span className={`match-badge ${matched > 0 ? 'has-match' : ''}`}>
      {matched}/{total}
    </span>
  );
}

function RoundBadge({ round }) {
  return <span className="round-badge">第 {round} 猜</span>;
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────
function GuessesTable({ guesses, answerCharacter, onCharacterClick = () => {} }) {
  const rawAnswer = (() => {
    if (Array.isArray(answerCharacter?.networkTags) && answerCharacter.networkTags.length > 0)
      return answerCharacter;
    return guesses.find(g => g.isAnswer) || answerCharacter || {};
  })();
  const answer = rawAnswer?.touhouProfile ? rawAnswer : enrichWithTouhouData(rawAnswer);

  const answerAttrMap  = buildAnswerAttrMap(answer);
  const answerMoeTags  = new Set(getMoeTags(answer));
  const answerWorkTags = new Set(getWorkTags(answer));
  const answerCatSets  = MOE_CATEGORIES.map(({ tagSet }) =>
    new Set([...answerMoeTags].filter(t => tagSet.has(t)))
  );

  const total = guesses.length;

  return (
    <div className="table-container">
      <table className="guesses-table">
        <thead>
          <tr>
            <th className="col-round"></th>
            <th className="col-icon"></th>
            <th className="col-name">角色信息</th>
            {ATTRIBUTE_COLUMNS.map(col => (
              <th key={col.label} className="col-attr">{col.label}</th>
            ))}
            {MOE_CATEGORIES.map(cat => (
              <th key={cat.label} className={`col-moe ${cat.colorClass}`}>{cat.label}</th>
            ))}
            <th className="col-work">初登场作品</th>
          </tr>
        </thead>

        <tbody>
          {[...guesses].reverse().map((guess, gi) => {
            const round = total - gi;
            const enriched = guess.touhouProfile ? guess : enrichWithTouhouData(guess);
            const attrMap = {};
            (enriched.touhouAttributes || []).forEach(a => { attrMap[a.key] = a; });
            const moeTags  = getMoeTags(enriched);
            const workTags = getWorkTags(enriched);
            const primaryName = getProfileValue(enriched, '本名')[0]
              || enriched.nameCn || enriched.name || '';
            // 用 gi 作动画延迟（最新猜的 gi=0 不延迟，旧的 gi 大则跳过动画）
            const isNewest = gi === 0;

            return (
              <tr
                key={guess.id + '-' + gi}
                className={[
                  guess.isAnswer ? 'row-correct' : '',
                  isNewest ? 'row-enter' : '',
                ].filter(Boolean).join(' ')}
              >
                {/* 轮次 */}
                <td className="col-round">
                  <RoundBadge round={round} />
                </td>

                {/* 头像 */}
                <td className="col-icon">
                  <img
                    src={guess.icon}
                    alt={guess.name || primaryName}
                    className="character-icon"
                    onError={e => { e.currentTarget.src = (import.meta.env.BASE_URL || '/') + 'assets/icon.jpg'; }}
                  />
                </td>

                {/* 角色名 */}
                <td className="col-name" onClick={() => onCharacterClick(guess)}>
                  <div className={`character-name-container ${guess.isAnswer ? 'correct' : ''}`}>
                    <div className="character-name">{guess.name || primaryName}</div>
                    <div className="character-name-cn">{primaryName}</div>
                  </div>
                </td>

                {/* 结构化属性列 */}
                {ATTRIBUTE_COLUMNS.map(col => {
                  const rawVals = col.keys.flatMap(k => {
                    const attr = attrMap[k];
                    if (!attr?.value || attr.value === '暂无') return [];
                    return Array.isArray(attr.value) ? attr.value : [attr.value];
                  });
                  const tokens = col.normalize
                    ? col.normalize(rawVals)
                    : rawVals.flatMap(splitValue);
                  const answerSet = answerAttrMap.get(col.label) || new Set();
                  const isActivity = col.label === '活动范围';
                  const matchFn = isActivity
                    ? t => activityMatches(t, answerSet)
                    : t => answerSet.has(t);
                  const display = tokens.length > 0 ? tokens : ['暂无'];
                  return (
                    <td key={col.label} className="col-attr">
                      <div className="attribute-cell">
                        {display.map((t, i) => (
                          <TagChip key={i} label={t}
                            matched={t !== '暂无' && matchFn(t)}
                            unknown={t === '暂无'} />
                        ))}
                      </div>
                    </td>
                  );
                })}

                {/* 萌点分类列 */}
                {MOE_CATEGORIES.map(({ label, tagSet }, ci) => {
                  const catTags = moeTags.filter(t => tagSet.has(t));
                  const answerCatSet = answerCatSets[ci];
                  const matchedSet = new Set(catTags.filter(t => answerCatSet.has(t)));
                  return (
                    <td key={label} className="col-moe">
                      <div className="attribute-cell moe-cell">
                        <MatchBadge matched={matchedSet.size} total={catTags.length} />
                        {catTags.length > 0 ? catTags.map((t, i) => (
                          <TagChip key={i} label={t} matched={matchedSet.has(t)} />
                        )) : (
                          <TagChip label="暂无" unknown />
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* 初登场作品 */}
                <td className="col-work">
                  <div className="attribute-cell">
                    {workTags.length > 0 ? workTags.map((t, i) => (
                      <TagChip key={i} label={t} matched={answerWorkTags.has(t)} />
                    )) : (
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
