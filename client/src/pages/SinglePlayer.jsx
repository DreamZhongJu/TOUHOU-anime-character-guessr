import { useEffect, useState, useRef } from 'react';
import { getRandomCharacter, getCharacterAppearances, generateFeedback, getCharacterDetails } from '../utils/bangumi';
import SearchBar from '../components/SearchBar';
import GuessesTable from '../components/GuessesTable';
import SettingsPopup from '../components/SettingsPopup';
import HelpPopup from '../components/HelpPopup';
import GameEndPopup from '../components/GameEndPopup';
import SocialLinks from '../components/SocialLinks';
import GameInfo from '../components/GameInfo';
import Timer from '../components/Timer';
import '../styles/game.css';
import '../styles/SinglePlayer.css';
import axios from 'axios';
import { useLocalStorage } from 'usehooks-ts';
import { enrichWithTouhouData } from '../utils/touhouDataset';
import subjectDetailsData from '../data/touhou_subjects.json';

function SinglePlayer() {
  const [guesses, setGuesses] = useState([]);
  const [guessesLeft, setGuessesLeft] = useState(10);
  const [isGuessing, setIsGuessing] = useState(false);
  const [gameEnd, setGameEnd] = useState(false);
  const [gameEndPopup, setGameEndPopup] = useState(null);
  const [answerCharacter, setAnswerCharacter] = useState(null);
  const [settingsPopup, setSettingsPopup] = useState(false);
  const [helpPopup, setHelpPopup] = useState(false);
  const [finishInit, setFinishInit] = useState(false);
  const [shouldResetTimer, setShouldResetTimer] = useState(false);
  const [hints, setHints] = useState([]);
  const [imgHint, setImgHint] = useState(null);
  const [useImageHint, setUseImageHint] = useState(0);
  const [detailCharacter, setDetailCharacter] = useState(null);
  const [gameSettings, setGameSettings] = useLocalStorage('singleplayer-game-settings', {
    startYear: new Date().getFullYear() - 10,
    endYear: new Date().getFullYear(),
    useSubjectPerYear: false,
    topNSubjects: 50,
    metaTags: ["", "", ""],
    useIndex: false,
    indexId: null,
    addedSubjects: [],
    mainCharacterOnly: true,
    characterNum: 6,
    maxAttempts: 10,
    useHints: [],
    useImageHint: 0,
    includeGame: false,
    timeLimit: null,
    subjectSearch: true,
    characterTagNum: 6,
    subjectTagNum: 6,
    commonTags: true
  });
  const [currentGameSettings, setCurrentGameSettings] = useState(gameSettings);
  const subjectNameMap = useRef(new Map(
    (subjectDetailsData?.data || subjectDetailsData || [])
      .map(entry => [Number(entry.id), entry.name_cn || entry.name || '未知'])
  )).current;

  const buildWorksHints = (character, count = 1) => {
    const ids = Array.isArray(character?.appearanceIds) && character.appearanceIds.length > 0
      ? character.appearanceIds
      : Array.isArray(character?.subjectIds)
        ? character.subjectIds
        : [];

    const names = Array.from(new Set(
      ids
        .map(id => subjectNameMap.get(Number(id)))
        .filter(name => name && !String(name).includes('漫才大赛'))
    ));

    if (names.length === 0) return [];

    const shuffled = names
      .map(name => ({ name, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(item => item.name);

    const size = Math.max(1, Math.min(count, shuffled.length));
    return shuffled.slice(0, size);
  };

  const buildAnswerCharacter = async (settings) => {
    const baseCharacter = await getRandomCharacter(settings);
    try {
      const [appearances, details] = await Promise.all([
        getCharacterAppearances(baseCharacter.id, settings),
        getCharacterDetails(baseCharacter.id)
      ]);
      const apiDisplayTags = Array.isArray(appearances?.metaTags) && appearances.metaTags.length > 0
        ? appearances.metaTags
        : Array.isArray(appearances?.networkTags)
          ? appearances.networkTags
          : Array.isArray(details?.apiCharacterTags)
            ? details.apiCharacterTags
            : [];

      return {
        ...baseCharacter,
        ...appearances,
        apiCharacterTags: apiDisplayTags,
        networkTags: Array.isArray(appearances.networkTags) ? appearances.networkTags : []
      };
    } catch (error) {
      console.error('Failed to fetch answer appearances:', error);
      return baseCharacter;
    }
  };

  useEffect(() => {
    let isMounted = true;

    axios.get(import.meta.env.VITE_SERVER_URL).then(response => {
      console.log(response.data);
    });

    const initializeGame = async () => {
      try {
        if (gameSettings.addedSubjects.length > 0) {
          await axios.post(import.meta.env.VITE_SERVER_URL + '/api/subject-added', {
            addedSubjects: gameSettings.addedSubjects
          });
        }
      } catch (error) {
        console.error('Failed to update subject count:', error);
      }
      try {
        const character = await buildAnswerCharacter(gameSettings);
        setCurrentGameSettings({ ...gameSettings });
        if (isMounted) {
          setAnswerCharacter(character);
          console.log('[DEBUG] 单人占卜结果:', character.nameCn || character.name, `(id: ${character.id})`);
          setGuessesLeft(gameSettings.maxAttempts);

          let hintTexts = [];
          if (Array.isArray(gameSettings.useHints) && gameSettings.useHints.length > 0 && character.summary) {
            const sentences = character.summary.replace('[mask]', '').replace('[/mask]', '')
              .split(/[。？！、，,「」“”"!?]/).filter(s => s.trim());
            if (sentences.length > 0) {
              const selectedIndices = new Set();
              while (selectedIndices.size < Math.min(gameSettings.useHints.length, sentences.length)) {
                selectedIndices.add(Math.floor(Math.random() * sentences.length));
              }
              hintTexts = Array.from(selectedIndices).map(i => `……${sentences[i].trim()}……`);
            }
          }
          setHints(hintTexts);
          setUseImageHint(gameSettings.useImageHint);
          setImgHint(gameSettings.useImageHint > 0 ? character.image : null);
          console.log('初始化游玩参数：', gameSettings);
          setFinishInit(true);
        }
      } catch (error) {
        console.error('Failed to initialize game:', error);
        if (isMounted) {
          alert('初始化失败，先喝口茶再刷新试试看，或在设置里清理缓存。');
        }
      }
    };

    initializeGame();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCharacterSelect = async (character) => {
    if (isGuessing || !answerCharacter) return;

    setIsGuessing(true);
    setShouldResetTimer(true);
    if (character.id === 56822 || character.id === 56823) {
      alert('巫女提示：向灵梦投币？（玩笑彩蛋）');
    }

    try {
      const [appearances, details] = await Promise.all([
        getCharacterAppearances(character.id, currentGameSettings),
        getCharacterDetails(character.id)
      ]);

      const apiDisplayTags = Array.isArray(appearances?.metaTags) && appearances.metaTags.length > 0
        ? appearances.metaTags
        : Array.isArray(appearances?.networkTags)
          ? appearances.networkTags
          : Array.isArray(details?.apiCharacterTags)
            ? details.apiCharacterTags
            : [];

      const guessData = enrichWithTouhouData({
        ...character,
        ...appearances,
        apiCharacterTags: apiDisplayTags
      });
      if (!guessData.networkTags && appearances.rawTags instanceof Map) {
        guessData.networkTags = Array.from(appearances.rawTags.keys());
      }

      const isCorrect = guessData.id === answerCharacter.id;
      const feedback = generateFeedback(guessData, answerCharacter, currentGameSettings);
      setGuessesLeft(prev => prev - 1);

      const buildGuessEntry = (isAnswerFlag) => ({
        id: guessData.id,
        icon: guessData.image,
        name: guessData.name,
        nameCn: guessData.nameCn,
        nameEn: guessData.nameEn,
        gender: guessData.gender,
        genderFeedback: guessData.gender === answerCharacter.gender ? 'yes' : 'no',
        metaTags: Array.isArray(guessData.metaTags) ? guessData.metaTags : [],
        networkTags: Array.isArray(guessData.networkTags) ? guessData.networkTags : [],
        apiCharacterTags: Array.isArray(guessData.apiCharacterTags) ? guessData.apiCharacterTags : [],
        popularity: typeof guessData.popularity === 'number' ? guessData.popularity : null,
        highestRating: typeof guessData.highestRating === 'number' ? guessData.highestRating : null,
        latestAppearance: typeof guessData.latestAppearance === 'number' ? guessData.latestAppearance : null,
        earliestAppearance: typeof guessData.earliestAppearance === 'number' ? guessData.earliestAppearance : null,
        appearances: Array.isArray(guessData.appearances) ? guessData.appearances : [],
        appearanceIds: Array.isArray(guessData.appearanceIds) ? guessData.appearanceIds : [],
        sharedMetaTags: feedback.metaTags.shared,
        sharedAppearances: feedback.shared_appearances,
        touhouAttributes: feedback.touhouAttributes,
        touhouWorks: (feedback.touhouWorks?.guess) || guessData.touhouWorks || [],
        isAnswer: isAnswerFlag
      });

      if (isCorrect) {
        setGuesses(prevGuesses => [...prevGuesses, buildGuessEntry(true)]);

        setGameEnd(true);
        alert('猜中啦！灵梦请你喝杯博丽神社的茶。');
        setGameEndPopup({
          result: 'win',
          answer: answerCharacter
        });
      } else if (guessesLeft <= 1) {
        setGuesses(prevGuesses => [...prevGuesses, buildGuessEntry(false)]);

        setGameEnd(true);
        alert('符卡耗尽，这次占卜就到此为止。');
        setGameEndPopup({
          result: 'lose',
          answer: answerCharacter
        });
      } else {
        setGuesses(prevGuesses => [...prevGuesses, buildGuessEntry(false)]);
      }
    } catch (error) {
      console.error('Error processing guess:', error);
      alert('巫女忙不过来，请稍后再试。');
    } finally {
      setIsGuessing(false);
      setShouldResetTimer(false);
    }
  };

  const handleSettingsChange = (setting, value) => {
    setGameSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleRestartWithSettings = async () => {
    setGuesses([]);
    setGuessesLeft(gameSettings.maxAttempts);
    setIsGuessing(false);
    setGameEnd(false);
    setGameEndPopup(null);
    setAnswerCharacter(null);
    setSettingsPopup(false);
    setShouldResetTimer(true);
    setFinishInit(false);
    setHints([]);

    try {
      if (gameSettings.addedSubjects.length > 0) {
        await axios.post(import.meta.env.VITE_SERVER_URL + '/api/subject-added', {
          addedSubjects: gameSettings.addedSubjects
        });
      }
    } catch (error) {
      console.error('Failed to update subject count:', error);
    }
    try {
      setCurrentGameSettings({ ...gameSettings });
      const character = await buildAnswerCharacter(gameSettings);
      setAnswerCharacter(character);
      console.log('[DEBUG] 单人占卜结果:', character.nameCn || character.name, `(id: ${character.id})`);

      let hintTexts = [];
      if (Array.isArray(gameSettings.useHints) && gameSettings.useHints.length > 0 && character.summary) {
        const sentences = character.summary.replace('[mask]', '').replace('[/mask]', '')
          .split(/[。？！、，,「」“”"!?]/).filter(s => s.trim());
        if (sentences.length > 0) {
          const selectedIndices = new Set();
          while (selectedIndices.size < Math.min(gameSettings.useHints.length, sentences.length)) {
            selectedIndices.add(Math.floor(Math.random() * sentences.length));
          }
          hintTexts = Array.from(selectedIndices).map(i => `……${sentences[i].trim()}……`);
        }
      }
      setHints(hintTexts);
      setUseImageHint(gameSettings.useImageHint);
      setImgHint(gameSettings.useImageHint > 0 ? character.image : null);
      console.log('初始化游玩参数：', gameSettings);
      setFinishInit(true);
    } catch (error) {
      console.error('Failed to initialize new game:', error);
      alert('初始化失败，先喝口茶再刷新试试看，或在设置里清理缓存。');
    }
  };

  const timeUpRef = useRef(false);

  const handleTimeUp = () => {
    if (timeUpRef.current) return;
    timeUpRef.current = true;

    setGuessesLeft(prev => {
      const newGuessesLeft = prev - 1;
      if (newGuessesLeft <= 0) {
        setGameEnd(true);
        setGameEndPopup({
          result: 'lose',
          answer: answerCharacter
        });
      }
      return newGuessesLeft;
    });
    setShouldResetTimer(true);
    setTimeout(() => {
      setShouldResetTimer(false);
      timeUpRef.current = false;
    }, 100);
  };

  const handleSurrender = () => {
    if (gameEnd) return;

    setGameEnd(true);
    setGameEndPopup({
      result: 'lose',
      answer: answerCharacter
    });
    alert('巫女放下符卡，点击查看角色真名。');
  };

  return (
    <div className="single-player-container">
      <SocialLinks
        onSettingsClick={() => setSettingsPopup(true)}
        onHelpClick={() => setHelpPopup(true)}
      />

      <div className="search-bar">
        <SearchBar
          onCharacterSelect={handleCharacterSelect}
          isGuessing={isGuessing}
          gameEnd={gameEnd}
          subjectSearch={currentGameSettings.subjectSearch}
        />
      </div>

      {currentGameSettings.timeLimit && (
        <Timer
          timeLimit={currentGameSettings.timeLimit}
          onTimeUp={handleTimeUp}
          isActive={!gameEnd && !isGuessing}
          reset={shouldResetTimer}
        />
      )}

      <GameInfo
        gameEnd={gameEnd}
        guessesLeft={guessesLeft}
        onRestart={handleRestartWithSettings}
        answerCharacter={answerCharacter}
        finishInit={finishInit}
        hints={hints}
        useImageHint={useImageHint}
        imgHint={imgHint}
        useHints={currentGameSettings.useHints}
        onSurrender={handleSurrender}
      />

      <GuessesTable
        guesses={guesses}
        answerCharacter={answerCharacter}
        onCharacterClick={(character) => setDetailCharacter(character)}
      />

      {settingsPopup && (
        <SettingsPopup
          gameSettings={gameSettings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setSettingsPopup(false)}
          onRestart={handleRestartWithSettings}
        />
      )}

      {helpPopup && (
        <HelpPopup onClose={() => setHelpPopup(false)} />
      )}

      {gameEndPopup && (
        <GameEndPopup
          result={gameEndPopup.result}
          answer={gameEndPopup.answer}
          onClose={() => setGameEndPopup(null)}
        />
      )}
      {detailCharacter && (
        <GameEndPopup
          result="detail"
          answer={detailCharacter}
          onClose={() => setDetailCharacter(null)}
        />
      )}
    </div>
  );
}

export default SinglePlayer;
