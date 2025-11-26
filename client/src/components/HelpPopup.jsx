import '../styles/popups.css';

function HelpPopup({ onClose }) {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <button className="popup-close" onClick={onClose}><i className="fas fa-xmark"></i></button>
        <div className="popup-header">
          <h2>巫女小抄</h2>
        </div>
        <div className="popup-body">
          <div className="help-content">
            <div className="help-text">
              在幻想乡档案里搜寻一位神秘角色。输入名字或作品即可召唤线索。<br />
              每次占卜后会显示角色信息对比：绿色为命中，淡黄代表略有交集。<br />
              ↑ 提示数值应该更高；↓ 提示数值应该更低；〜 表示旗鼓相当。<br />
              有奇怪的灵异反馈？欢迎去B站或 GitHub 留言，巫女会及时驱邪。<br />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpPopup;
