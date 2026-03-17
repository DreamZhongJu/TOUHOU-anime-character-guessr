import '../styles/popups.css';
import '../styles/SettingsPopup.css';
import { useState } from 'react';
import axiosCache from '../utils/cached-axios';

// ── 东方作品分组 ──────────────────────────────────────────────────────────
const WORK_GROUPS = {
  '旧作': [
    '东方灵异传', '东方封魔录', '东方梦时空', '东方幻想乡', '东方怪绮谈',
  ],
  '老三作': [
    '东方红魔乡', '东方妖妖梦', '东方永夜抄',
  ],
  '整数作': [
    '东方花映冢', '东方风神录', '东方地灵殿', '东方星莲船', '东方神灵庙',
    '东方辉针城', '东方绀珠传', '东方天空璋', '东方鬼形兽', '东方虹龙洞', '东方兽王园',
  ],
  '小数点作': [
    '东方萃梦想', '东方文花帖', '东方绯想天', '东方心绮楼', '东方凭依华',
    '东方智灵奇传', '东方深秘录', '东方刚欲异闻',
  ],
};
const ALL_WORKS = Object.values(WORK_GROUPS).flat();

function SettingsPopup({ gameSettings, onSettingsChange, onClose, onRestart, hideRestart = false }) {
  const [hintInputs, setHintInputs] = useState(() => {
    if (Array.isArray(gameSettings.useHints) && gameSettings.useHints.length > 0) {
      const arr = gameSettings.useHints.map(String);
      while (arr.length < 3) arr.push('');
      return arr;
    }
    return ['8', '5', '3'];
  });

  const handleClearCache = () => {
    axiosCache.clearCache();
    alert('缓存已清空！');
  };

  // ── 作品选择逻辑 ──────────────────────────────────────────────────────
  // selectedWorks: null/undefined = 全选, string[] = 指定
  // 注意：旧 localStorage 可能没有此字段 (undefined)，需与 null 等同处理
  const rawSelected = gameSettings.selectedWorks;
  const selected = rawSelected == null ? null : rawSelected; // null | string[]
  const isAllSelected = selected === null || selected.length === ALL_WORKS.length;

  function isWorkSelected(kw) {
    if (selected === null) return true;
    return selected.includes(kw);
  }

  function isGroupSelected(groupWorks) {
    if (selected === null) return true;
    return groupWorks.every(w => selected.includes(w));
  }

  function isGroupPartial(groupWorks) {
    if (selected === null) return false;
    const count = groupWorks.filter(w => selected.includes(w)).length;
    return count > 0 && count < groupWorks.length;
  }

  function toggleAll() {
    onSettingsChange('selectedWorks', null);
  }

  function toggleGroup(groupWorks) {
    const base = selected === null ? [...ALL_WORKS] : [...selected];
    const allOn = groupWorks.every(w => base.includes(w));
    let next;
    if (allOn) {
      next = base.filter(w => !groupWorks.includes(w));
      if (next.length === 0) return; // 不允许空选
    } else {
      next = [...new Set([...base, ...groupWorks])];
    }
    onSettingsChange('selectedWorks', next.length === ALL_WORKS.length ? null : next);
  }

  function toggleWork(kw) {
    const base = selected === null ? [...ALL_WORKS] : [...selected];
    let next;
    if (base.includes(kw)) {
      next = base.filter(w => w !== kw);
    } else {
      next = [...base, kw];
    }
    onSettingsChange('selectedWorks', next.length === ALL_WORKS.length ? null : (next.length === 0 ? null : next));
  }

  // ── 提示设置 ──────────────────────────────────────────────────────────
  const hintsOn = Array.isArray(gameSettings.useHints) && gameSettings.useHints.length > 0;

  return (
    <div className="popup-overlay">
      <div className="popup-content settings-popup-content">
        {hideRestart ? (
          <button className="popup-close multiplayer-confirm" onClick={onClose}>确认修改</button>
        ) : (
          <button className="popup-close" onClick={onClose}>×</button>
        )}

        <div className="popup-header settings-header">
          <div className="settings-title-row">
            <span className="settings-title-icon">⛩️</span>
            <h2>博麗神社·占卜设置</h2>
          </div>
        </div>

        <div className="popup-body settings-body">

          {/* ── 出题范围 ──────────────────────────────────────────── */}
          <section className="settings-section">
            <div className="section-heading">
              <span className="section-icon">🌸</span>
              <h3>出题范围</h3>
            </div>

            <div className="work-selector">
              <p className="work-selector-hint">点击分组名可整组勾选/取消，也可单独点击作品名。</p>
              {/* 全选 */}
              <label className={`work-group-toggle ${isAllSelected ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleAll}
                />
                <span>全部作品</span>
              </label>

              {Object.entries(WORK_GROUPS).map(([groupName, groupWorks]) => (
                <div key={groupName} className="work-group">
                  <label className={`work-group-toggle ${isGroupSelected(groupWorks) ? 'active' : ''} ${isGroupPartial(groupWorks) ? 'partial' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isGroupSelected(groupWorks)}
                      ref={el => { if (el) el.indeterminate = isGroupPartial(groupWorks); }}
                      onChange={() => toggleGroup(groupWorks)}
                    />
                    <span>{groupName}</span>
                    <span className="work-count">({groupWorks.filter(w => isWorkSelected(w)).length}/{groupWorks.length})</span>
                  </label>
                  <div className="work-chips">
                    {groupWorks.map(kw => (
                      <label
                        key={kw}
                        className={`work-chip ${isWorkSelected(kw) ? 'selected' : ''}`}
                        title={kw}
                      >
                        <input
                          type="checkbox"
                          checked={isWorkSelected(kw)}
                          onChange={() => toggleWork(kw)}
                        />
                        <span>{kw.replace('东方', '')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 游戏规则 ──────────────────────────────────────────── */}
          <section className="settings-section">
            <div className="section-heading">
              <span className="section-icon">📜</span>
              <h3>游戏规则</h3>
            </div>

            <div className="settings-rows">
              {/* 每局次数 */}
              <div className="settings-row">
                <label className="settings-label">每局次数</label>
                <input
                  className="settings-number"
                  type="number"
                  value={gameSettings.maxAttempts || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 10 : Math.max(1, Math.min(15, parseInt(e.target.value) || 1));
                    onSettingsChange('maxAttempts', value);
                  }}
                  min="1"
                  max="15"
                />
                <span className="settings-unit">次</span>
              </div>

              {/* 时间限制 */}
              <div className="settings-row">
                <label className="settings-label">时间限制</label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={gameSettings.timeLimit !== null && gameSettings.timeLimit !== undefined}
                    onChange={(e) => onSettingsChange('timeLimit', e.target.checked ? 60 : null)}
                  />
                  <span className="toggle-track"><span className="toggle-thumb" /></span>
                </label>
                {gameSettings.timeLimit != null && (
                  <>
                    <input
                      className="settings-number"
                      type="number"
                      min="15"
                      max="120"
                      value={gameSettings.timeLimit}
                      onChange={(e) => {
                        const value = Math.max(15, Math.min(120, parseInt(e.target.value) || 15));
                        onSettingsChange('timeLimit', value);
                      }}
                    />
                    <span className="settings-unit">秒/轮</span>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ── 提示设置 ──────────────────────────────────────────── */}
          <section className="settings-section">
            <div className="section-heading">
              <span className="section-icon">🔮</span>
              <h3>占卜提示</h3>
            </div>

            <div className="settings-rows">
              <div className="settings-row">
                <label className="settings-label">启用文字提示</label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={hintsOn}
                    onChange={e => {
                      if (e.target.checked) {
                        setHintInputs(['8', '5', '3']);
                        onSettingsChange('useHints', [8, 5, 3]);
                      } else {
                        onSettingsChange('useHints', []);
                      }
                    }}
                  />
                  <span className="toggle-track"><span className="toggle-thumb" /></span>
                </label>
              </div>

              {hintsOn && (
                <div className="settings-row hint-timing-row">
                  <label className="settings-label">出现时机（剩余次数）</label>
                  <div className="hint-inputs">
                    {[0, 1, 2].map((idx) => (
                      <input
                        key={idx}
                        className="settings-number hint-number"
                        type="number"
                        min="1"
                        max={gameSettings.maxAttempts || 10}
                        value={hintInputs[idx] || ''}
                        placeholder="—"
                        onChange={e => {
                          const newInputs = [...hintInputs];
                          let val = e.target.value;
                          if (val === '' || isNaN(Number(val)) || Number(val) < 1) {
                            newInputs[idx] = '';
                          } else {
                            val = String(Math.floor(Number(val)));
                            if (idx > 0 && newInputs[idx - 1] && Number(val) >= Number(newInputs[idx - 1])) {
                              for (let i = idx; i < 3; i++) newInputs[i] = '';
                            } else {
                              newInputs[idx] = val;
                            }
                          }
                          setHintInputs(newInputs);
                          const arr = [];
                          for (let i = 0; i < 3; i++) {
                            const n = parseInt(newInputs[i], 10);
                            if (!isNaN(n) && (i === 0 || n < arr[i - 1])) arr.push(n);
                            else break;
                          }
                          onSettingsChange('useHints', arr);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="settings-row">
                <label className="settings-label">图片提示（剩余次数为</label>
                <input
                  className="settings-number"
                  type="number"
                  min="0"
                  max="10"
                  value={gameSettings.useImageHint}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
                    onSettingsChange('useImageHint', value);
                  }}
                />
                <span className="settings-unit">时显示，0关闭）</span>
              </div>
            </div>
          </section>

        </div>

        <div className="popup-footer">
          {!hideRestart && (
            <>
              <button className="restart-button" onClick={onRestart}>
                重新开始
              </button>
              <span className="footer-hint">设置改动后点击"重新开始"生效</span>
              <button className="clear-cache-button" onClick={handleClearCache}>
                清空缓存
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPopup;
