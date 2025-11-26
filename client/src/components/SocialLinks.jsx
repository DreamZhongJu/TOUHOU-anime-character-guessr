import '../styles/social.css';

function SocialLinks({ onSettingsClick, onHelpClick }) {
  return (
    <div className="social-links">
      <div className="difficulty-hint">
        <span>巫女有点犯难？切换符卡吧</span>
        <div className="arrow"></div>
      </div>
      <button className="social-link settings-button" onClick={onSettingsClick}>
        <span role="img" aria-label="torii">⛩️</span>
      </button>
      <a href="/" className="social-link" title="Home">
        <i className="fas fa-home"></i>
      </a>
      <button className="social-link help-button" onClick={onHelpClick}>
        <span role="img" aria-label="spell-card">🀄</span>
      </button>
      <a href="https://bangumi.tv/user/725027" target="_blank" rel="noopener noreferrer" className="social-link">
        <img src="https://avatars.githubusercontent.com/u/7521082?s=200&v=4" alt="Bangumi" className="bangumi-icon" />
      </a>
      <a href="https://github.com/kennylimz/anime-character-guessr" target="_blank" rel="noopener noreferrer" className="social-link">
        <i className="fab fa-github"></i>
      </a>
      <a href="https://space.bilibili.com/87983557" target="_blank" rel="noopener noreferrer" className="social-link">
        <i className="fa-brands fa-bilibili"></i>
      </a>
    </div>
  );
}

export default SocialLinks; 
