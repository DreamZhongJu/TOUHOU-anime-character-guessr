import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../styles/Home.css';

const Home = () => {
  const [roomCount, setRoomCount] = useState(0);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || '';
    fetch(`${serverUrl}/room-count`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch');
        return response.json();
      })
      .then(data => setRoomCount(data.count))
      .catch(error => console.error('Error fetching room count:', error));
  }, []);

  return (
    <div className="home-container">
      <div className="game-modes">
        <Link to="/singleplayer" className="mode-button">
          <h2>单人</h2>
          <small>独自前往博丽神社占卜，以记忆寻得神秘角色。</small>
        </Link>
        <Link to="/multiplayer" className="mode-button">
          <h2>多人</h2>
          <small>正在聚灵的符卡房间：{roomCount}</small>
        </Link>
      </div>

      <div className="home-footer">
        <p>
          <a href="https://vertikarl.github.io/anime-character-guessr-english/"> ENGLISH ver. </a>
          <br />
          东方 Project 风味的角色占卜，建议带上耳机配合夜空星河食用。<br />
          本项目基于 <a href="https://github.com/kennylimz/anime-character-guessr">Anime Character Guessr</a> 的二次开发，仅供同好娱乐与学习，请勿商业化；数据来自 Bangumi 公开 API 与同人社群，如有侵权请第一时间联系。<br />
        </p>
      </div>
    </div>
  );
};

export default Home;
