import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import '../styles/Home.css';

// 数据集中的热门东方同人曲（按播放量筛选）
const TOUHOU_SONGS = [
  { id: 687506, name: 'Bad Apple!! feat. nomico' },
  { id: 730846, name: 'Mountain Journey' },
  { id: 730859, name: 'Lupinus' },
  { id: 737966, name: 'Samsara' },
  { id: 687111, name: 'Spring Comes Along' },
  { id: 729183, name: 'il mare -prologue-' },
  { id: 729836, name: 'Endless Pain' },
  { id: 609617, name: 'White Lotus... (Piano)' },
  { id: 651915, name: 'snow-white' },
  { id: 687077, name: 'Against, Perfect Cherry Blossom.' },
  { id: 690298, name: 'Nocturne' },
  { id: 716275, name: 'Idealized Romance' },
  { id: 720325, name: 'Blue Tears Night' },
  { id: 729450, name: 'LOG' },
  { id: 687468, name: 'For Your Pieces' },
];

const Home = () => {
  const [roomCount, setRoomCount] = useState(0);

  // 每次打开页面随机一首曲子
  const song = useMemo(
    () => TOUHOU_SONGS[Math.floor(Math.random() * TOUHOU_SONGS.length)],
    []
  );

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || '';
    fetch(`${serverUrl}/room-count`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch');
        return response.json();
      })
      .then(data => setRoomCount(data.count))
      .catch(() => {});
  }, []);

  return (
    <div className="home-container">
      {/* 装饰花瓣 */}
      <div className="petal petal-1">❋</div>
      <div className="petal petal-2">✿</div>
      <div className="petal petal-3">❀</div>
      <div className="petal petal-4">✾</div>
      <div className="petal petal-5">❋</div>

      {/* ── 主标题区 ───────────────────────────────────── */}
      <header className="home-hero">
        <div className="spell-card-frame">
          <div className="spell-card-inner">
            <div className="hero-eyebrow">✦ 幻想乡角色占卜 ✦</div>
            <h1 className="hero-title">
              <span className="title-char east">东</span>
              <span className="title-char">方</span>
              <span className="title-char">猜</span>
              <span className="title-char">猜</span>
              <span className="title-char呗">呗</span>
            </h1>
            <p className="hero-subtitle">
              搜索角色·比对属性·以记忆寻得神秘术士
            </p>
          </div>
        </div>
      </header>

      {/* ── 模式选择 ───────────────────────────────────── */}
      <nav className="game-modes">
        <Link to="/singleplayer" className="mode-card">
          <div className="mode-card-deco">⛩</div>
          <h2>单人占卜</h2>
          <p>独自前往博丽神社，<br />以记忆与直觉寻得神秘角色。</p>
          <span className="mode-card-cta">开始 →</span>
        </Link>
        <Link to="/multiplayer" className="mode-card mode-card-multi">
          <div className="mode-card-deco">🀄</div>
          <h2>多人对战</h2>
          <p>与同好共同占卜，<br />看谁先找到答案。</p>
          <span className="mode-card-cta">
            {roomCount > 0 ? `${roomCount} 间符卡房间等候中 →` : '创建房间 →'}
          </span>
        </Link>
      </nav>

      {/* ── 关于 / 故事 ────────────────────────────────── */}
      <section className="home-about">
        <div className="about-header">
          <span className="about-icon">📖</span>
          <h3>关于本作</h3>
        </div>
        <div className="about-body">
          <p>
            这是一个东方 Project 主题的角色猜猜游戏——输入角色名，
            系统会比对<strong>族谱、发色、瞳色、活动范围、萌点属性</strong>等维度给出反馈，
            逐步缩小范围，直到锁定那位神秘的幻想乡居民。
          </p>
          <p>
            灵感源自 <a href="https://blast.tv/counter-strikle" target="_blank" rel="noopener noreferrer">BLAST.tv · counter-strikle</a>，
            数据来自 <a href="https://bgm.tv" target="_blank" rel="noopener noreferrer">Bangumi 公开 API</a> 及东方同好社区补充，
            推荐配合东方原声带食用。🎵
          </p>
          <div className="about-divider" />
          <p className="about-credit">
            本项目基于&nbsp;
            <a href="https://github.com/kennylimz/anime-character-guessr" target="_blank" rel="noopener noreferrer">
              kennylimz / anime-character-guessr
            </a>
            &nbsp;的二次开发，原版为通用动漫角色猜猜游戏；
            本 fork 将其改造为东方专属版本，替换了全套数据集与游戏逻辑。
            <br />
            仅供同好娱乐与学习，不用于商业化；如有侵权请第一时间联系。
          </p>
        </div>
      </section>

      {/* ── 页脚 ───────────────────────────────────────── */}
      <footer className="home-footer">
        <span>建议使用桌面浏览器 · 推荐宽屏游玩</span>
        <span className="footer-dot">·</span>
        <a href="https://vertikarl.github.io/anime-character-guessr-english/" target="_blank" rel="noopener noreferrer">
          English ver.
        </a>
      </footer>

      {/* ── 右侧：网易云音乐播放器 ───────────────────────── */}
      <aside className="home-music-panel">
        <div className="music-panel-label">
          <span className="music-panel-icon">🎵</span>
          <div className="music-panel-info">
            <span className="music-panel-title">{song.name}</span>
            <span className="music-panel-sub">东方同人 BGM · 随机推荐</span>
          </div>
        </div>
        <div className="music-panel-embed">
          <iframe
            key={song.id}
            title={`${song.name} — 网易云音乐`}
            src={`https://music.163.com/outchain/player?type=2&id=${song.id}&auto=0&height=108`}
            width="360"
            height="108"
            allow="autoplay"
          />
        </div>
      </aside>

      {/* ── 左侧：幻想乡小知识 ─────────────────────────── */}
      <aside className="home-side-deco">
        <div className="side-deco-header">
          <span>📊</span>
          <span className="side-deco-title">数据集概览</span>
        </div>
        <div className="side-deco-stats">
          <div className="side-stat">
            <span className="side-stat-label">收录角色</span>
            <span className="side-stat-value">143+</span>
          </div>
          <div className="side-stat-bar"><div className="side-stat-fill" style={{width:'72%'}} /></div>
          <div className="side-stat">
            <span className="side-stat-label">覆盖作品</span>
            <span className="side-stat-value">27 部</span>
          </div>
          <div className="side-stat-bar"><div className="side-stat-fill" style={{width:'55%'}} /></div>
          <div className="side-stat">
            <span className="side-stat-label">萌点标签</span>
            <span className="side-stat-value">400+</span>
          </div>
          <div className="side-stat-bar"><div className="side-stat-fill" style={{width:'88%'}} /></div>
          <div className="side-stat">
            <span className="side-stat-label">数据来源</span>
            <span className="side-stat-value">萌娘百科</span>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Home;
