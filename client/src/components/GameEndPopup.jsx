import '../styles/popups.css';
import subaruIcon from '/assets/subaru.jpg';
import { useState } from 'react';
import TagContributionPopup from './TagContributionPopup';
import { idToTags } from '../data/id_tags';
import { getCharacterImageByCharacter } from '../utils/bangumi';

function GameEndPopup({ result, answer, onClose }) {
  const [showTagPopup, setShowTagPopup] = useState(false);

  const headerText = (() => {
    if (result === 'win') return '🎉 占卜成功，灵梦对你点头认可！';
    if (result === 'detail') return '角色详情';
    return '😢 符卡耗尽，下次再来吧';
  })();

  const imageSrc = getCharacterImageByCharacter(answer);

  if (showTagPopup) {
    return (
      <TagContributionPopup
        character={answer}
        onClose={() => {
          setShowTagPopup(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <button className="popup-close" onClick={onClose}><i className="fas fa-xmark"></i></button>
        <div className="popup-header">
          <h2>{headerText}</h2>
        </div>
        <div className="popup-body">
          <div className="answer-character">
            <img
              src={imageSrc}
              alt={answer.name}
              className="answer-character-image"
            />
            <div className="answer-character-info">
              <div className="character-name-container">
                <a
                  href={`https://bgm.tv/character/${answer.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="character-link"
                >
                  <div className="answer-character-name">{answer.name}</div>
                  <div className="answer-character-name-cn">{answer.nameCn}</div>
                </a>
                <div className="button-container">
                  <button
                    className="contribute-tag-btn"
                    onClick={() => setShowTagPopup(true)}
                  >
                    贡献标签
                  </button>
                  <img src={subaruIcon} alt="" className="button-icon" />
                </div>
              </div>

              {answer.appearances && answer.appearances.length > 0 && (
                <div className="answer-appearances">
                  <h3>登场过的幻想作品：</h3>
                  <ul className="appearances-list">
                    {answer.appearances.slice(0, 3).map((appearance, index) => (
                      <li key={index}>{appearance}</li>
                    ))}
                    {answer.appearances.length > 3 && (
                      <li>……共 {answer.appearances.length} 部作品</li>
                    )}
                  </ul>
                </div>
              )}

              {idToTags[answer.id] && idToTags[answer.id].length > 0 && (
                <div className="answer-tags">
                  <h3>角色符卡标签：</h3>
                  <div className="tags-container">
                    {idToTags[answer.id].map((tag, index) => (
                      <span key={index} className="character-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {answer.summary && (
                <div className="answer-summary">
                  <h3>角色小传：</h3>
                  <div className="summary-content">{answer.summary}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameEndPopup;
