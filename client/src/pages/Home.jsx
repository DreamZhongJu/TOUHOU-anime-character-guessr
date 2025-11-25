import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../styles/Home.css';
import UpdateAnnouncement from '../components/UpdateAnnouncement';
import announcements from '../data/announcements';

const Home = () => {
  const [roomCount, setRoomCount] = useState(0);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    fetch(`${serverUrl}/room-count`)
      .then(response => response.json())
      .then(data => setRoomCount(data.count))
      .catch(error => console.error('Error fetching room count:', error));
  }, []);

  return (
    <div className="home-container">
      <div className="game-modes">
        <Link to="/singleplayer" className="mode-button">
          <h2>单人修行</h2>
          <small>与博丽神社的灵梦一起挑战幻想乡角色图鉴</small>
        </Link>
        <Link to="/multiplayer" className="mode-button">
          <h2>联机竞速</h2>
          <small>当前活跃结界：{roomCount}</small>
        </Link>
      </div>

      <UpdateAnnouncement
        announcements={announcements}
        defaultExpanded={false}
        initialVisibleCount={1}
      />

      <div className="home-footer">
        <p>
          <a href="https://vertikarl.github.io/anime-character-guessr-english/"> ENGLISH ver. </a>
          <br />
          东方Project 角色猜谜特别版，推荐使用桌面端浏览器畅玩。
          <br />
          本项目为二次开发版本，仅供娱乐用途，不用于商业化。
          <br />
          想快速了解玩法？可以观看
          <a href="https://www.bilibili.com/video/BV14CVRzUELs"> 介绍视频 </a>，
          灵感来源于 <a href="https://blast.tv/counter-strikle"> BLAST.tv </a> 的竞猜活动，
          数据基于 <a href="https://bgm.tv/"> Bangumi </a> 与东方友人整合。
          <br />
          特别感谢 <a href="https://space.bilibili.com/87983557">@作者</a>、
          <a href="https://github.com/trim21"> Bangumi 管理员</a>、
          以及<a href="https://github.com/kennylimz/anime-character-guessr/graphs/contributors">所有贡献者</a>的协力。
        </p>
      </div>
    </div>
  );
};

export default Home;
