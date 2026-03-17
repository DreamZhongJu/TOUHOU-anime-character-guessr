import '../styles/social.css';
import { useNavigate } from 'react-router-dom';

function SocialLinks({ onSettingsClick, onHelpClick }) {
  const navigate = useNavigate();
  return (
    <div className="social-links">
      <button className="social-link home-button" onClick={() => navigate('/')} title="返回主页">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
          <polyline points="9 21 9 12 15 12 15 21"/>
        </svg>
      </button>
      <button className="social-link settings-button" onClick={onSettingsClick} title="设置">
        <span role="img" aria-label="torii">⛩️</span>
      </button>
      <button className="social-link help-button" onClick={onHelpClick} title="帮助">
        <span role="img" aria-label="spell-card">🀄</span>
      </button>
    </div>
  );
}

export default SocialLinks;
