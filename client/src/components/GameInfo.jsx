import '../styles/game.css';

function GameInfo({ gameEnd, guessesLeft, onRestart, finishInit, hints, useHints = [], onSurrender, imgHint = null, useImageHint = 0 }) {
  return (
    <div className="game-info">
      {gameEnd ? (
        <button className="restart-button" onClick={onRestart}>
          再抽一签
        </button>
      ) : (
        <div className="game-info-container">
          <div className="game-controls">
            <span>剩余符卡：{guessesLeft}</span>
            {onSurrender && (
              <button disabled={!finishInit} className="surrender-button" onClick={onSurrender}>
                认输奉上供品 🏳️
              </button>
            )}
          </div>
          {useHints && hints && useHints.map((val, idx) => (
            <div key={idx}>
              {guessesLeft <= val && hints[idx] && (
                <div className="hint-container">
                  <span className="hint-label">博丽提示 {idx + 1}:</span>
                  <span className="hint-text">{hints[idx]}</span>
                </div>
              )}
            </div>
          ))}
          {guessesLeft <= useImageHint && imgHint && (
            <div className="hint-container">
              <img className="hint-image" src={imgHint} style={{ height: '200px', filter: `blur(${guessesLeft}px)` }} alt="神社提示" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GameInfo;
