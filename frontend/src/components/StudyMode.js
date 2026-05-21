import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './StudyMode.css';

function StudyMode() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState([]);
  const [allFlashcards, setAllFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [studiedCount, setStudiedCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isRatingConfirmed, setIsRatingConfirmed] = useState(false);
  const [mode, setMode] = useState('study');

  useEffect(() => {
    if (mode === 'study') {
      fetchDueFlashcards();
    } else {
      fetchAllFlashcards();
    }
  }, [setId, mode]);

  const fetchAllFlashcards = async () => {
    try {
      const response = await api.get(`/flashcards/sets/${setId}/flashcards`);
      if (response.data.success) {
        setAllFlashcards(response.data.flashcards);
        setCurrentIndex(0);
        setIsFlipped(false);
        if (response.data.flashcards.length === 0) {
          alert('В этом наборе нет карточек');
          navigate(`/set/${setId}`);
        }
      }
    } catch (err) {
      console.error('Error fetching all flashcards:', err);
      alert('Failed to load flashcards');
    } finally {
      setLoading(false);
    }
  };

  const fetchDueFlashcards = async () => {
    try {
      const response = await api.get(`/study/due/${setId}`);
      if (response.data.success) {
        setFlashcards(response.data.flashcards);
        setCurrentIndex(0);
        setStudiedCount(0);
        setIsFlipped(false);
        setSelectedRating(null);
        setIsRatingConfirmed(false);
        
        if (response.data.flashcards.length === 0) {
          setSessionComplete(true);
        }
      }
    } catch (err) {
      console.error('Error fetching due flashcards:', err);
      alert('Failed to load study session');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = () => {
    if (mode === 'browse' || (!selectedRating && !isRatingConfirmed)) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleNextCard = () => {
    if (mode === 'browse') {
      if (currentIndex + 1 < allFlashcards.length) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      }
    }
  };

  const handlePrevCard = () => {
    if (mode === 'browse') {
      if (currentIndex - 1 >= 0) {
        setCurrentIndex(currentIndex - 1);
        setIsFlipped(false);
      }
    }
  };

  const handleQualityRating = async (rating) => {
    const currentCard = flashcards[currentIndex];
    
    try {
      await api.post('/study/review', {
        flashcardId: currentCard.id,
        quality: rating
      });
      
      setStudiedCount(prev => prev + 1);
      setIsRatingConfirmed(true);
      
      setTimeout(() => {
        const nextIndex = currentIndex + 1;
        
        if (nextIndex >= flashcards.length) {
          checkAndFinishSession();
        } else {
          setCurrentIndex(nextIndex);
          setIsFlipped(false);
          setSelectedRating(null);
          setIsRatingConfirmed(false);
        }
      }, 800);
    } catch (err) {
      console.error('Error recording review:', err);
      alert('Failed to record your response');
      setIsRatingConfirmed(false);
    }
  };
  
  const checkAndFinishSession = async () => {
    try {
      const response = await api.get(`/study/due/${setId}`);
      if (response.data.success) {
        if (response.data.flashcards.length === 0) {
          setSessionComplete(true);
        } else {
          setFlashcards(response.data.flashcards);
          setCurrentIndex(0);
          setStudiedCount(0);
          setIsFlipped(false);
          setSelectedRating(null);
          setIsRatingConfirmed(false);
        }
      }
    } catch (err) {
      console.error('Error checking for more cards:', err);
      setSessionComplete(true);
    }
  };

  const getRatingDescription = (rating) => {
    switch(rating) {
      case 0: return 'Не запомнил(а)';
      case 1: return 'Неправильно, но вспомнил(а) после ответа';
      case 2: return 'Неправильно, но легко вспомнил(а) после ответа';
      case 3: return 'Сложно, но в итоге правильно';
      case 4: return 'Правильно, но с колебаниями';
      case 5: return 'Идеально, без колебаний';
      default: return '';
    }
  };

  const switchToStudyMode = () => {
    setMode('study');
    setLoading(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedRating(null);
    setIsRatingConfirmed(false);
    setSessionComplete(false);
  };

  const switchToBrowseMode = () => {
    setMode('browse');
    setLoading(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (mode === 'browse') {
    const currentCard = allFlashcards[currentIndex];
    
    if (!currentCard) {
      return <div className="loading">Загрузка карточек...</div>;
    }
    
    return (
      <div className="study-mode">
        <div className="mode-switcher">
          <button 
            className={`mode-btn ${mode === 'study' ? 'active' : ''}`}
            onClick={switchToStudyMode}
          >
            Режим повторения
          </button>
          <button 
            className={`mode-btn ${mode === 'browse' ? 'active' : ''}`}
            onClick={switchToBrowseMode}
          >
            Режим просмотра
          </button>
        </div>

        <div className="study-header">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((currentIndex + 1) / allFlashcards.length) * 100}%` }}></div>
          </div>
          <div className="study-info">
            <span>Карточка {currentIndex + 1} из {allFlashcards.length}</span>
            <span>Режим просмотра</span>
          </div>
        </div>

        <div className="flashcard-container">
          <div 
            className={`flashcard ${isFlipped ? 'flipped' : ''}`}
            onClick={handleCardClick}
          >
            <div className="flashcard-front">
              <div className="card-content-wrapper">
                <h3>Вопрос</h3>
                <p>{currentCard.question}</p>
                <div className="flip-hint">нажмите на карточку, чтобы перевернуть</div>
              </div>
            </div>
            <div className="flashcard-back">
              <div className="card-content-wrapper">
                <h3>Ответ</h3>
                <p>{currentCard.answer}</p>
                <div className="flip-hint">нажмите на карточку, чтобы перевернуть обратно</div>
              </div>
            </div>
          </div>
        </div>

        <div className="browse-navigation">
          <button 
            onClick={handlePrevCard} 
            disabled={currentIndex === 0}
            className="nav-btn"
          >
            ← Предыдущая
          </button>
          <button 
            onClick={handleNextCard} 
            disabled={currentIndex + 1 >= allFlashcards.length}
            className="nav-btn"
          >
            Следующая →
          </button>
        </div>

        <div className="browse-info">
          <button onClick={() => navigate(`/set/${setId}`)} className="back-to-set-btn">
            Вернуться к набору
          </button>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="study-complete">
        <div className="complete-card">
          <h2>Отличная работа!</h2>
          <p>Вы повторили все карточки, которые были запланированы на сегодня.</p>
          <div className="complete-stats">
            <div className="stat">
              <div className="stat-label">Повторено карточек</div>
              <div className="stat-value">{studiedCount}</div>
            </div>
          </div>
          <div className="mode-switcher" style={{ marginBottom: '20px' }}>
            <button onClick={switchToBrowseMode} className="mode-btn">
              Посмотреть все карточки
            </button>
          </div>
          <div className="complete-buttons">
            <button onClick={() => navigate(`/set/${setId}`)} className="back-btn">
              Вернуться к набору
            </button>
            <button onClick={() => navigate('/')} className="home-btn">
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="no-cards">
        <div className="no-cards-card">
          <p>В этом наборе нет карточек для повторения!</p>
          <button onClick={switchToBrowseMode} className="mode-btn">
            Посмотреть все карточки
          </button>
          <button onClick={() => navigate(`/set/${setId}`)}>Вернуться к набору</button>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex / flashcards.length) * 100).toFixed(1);

  return (
    <div className="study-mode">
      <div className="mode-switcher">
        <button 
          className={`mode-btn ${mode === 'study' ? 'active' : ''}`}
          onClick={switchToStudyMode}
        >
          Режим повторения
        </button>
        <button 
          className={`mode-btn ${mode === 'browse' ? 'active' : ''}`}
          onClick={switchToBrowseMode}
        >
          Режим просмотра
        </button>
      </div>

      <div className="study-header">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="study-info">
          <span>Карточка {currentIndex + 1} из {flashcards.length}</span>
          <span>Повторено за сессию: {studiedCount}</span>
        </div>
      </div>

      <div className="flashcard-container">
        <div 
          className={`flashcard ${isFlipped ? 'flipped' : ''}`}
          onClick={handleCardClick}
        >
          <div className="flashcard-front">
            <div className="card-content-wrapper">
              <h3>Вопрос</h3>
              <p>{currentCard.question}</p>
              <div className="flip-hint">нажмите на карточку, чтобы перевернуть</div>
            </div>
          </div>
          <div className="flashcard-back">
            <div className="card-content-wrapper">
              <h3>Ответ</h3>
              <p>{currentCard.answer}</p>
              <div className="flip-hint">нажмите на карточку, чтобы перевернуть обратно</div>
            </div>
          </div>
        </div>
      </div>

      {isFlipped && !selectedRating && !isRatingConfirmed && (
        <div className="rating-section">
          <h3>Насколько хорошо вы запомнили эту карточку?</h3>
          <div className="rating-buttons">
            {[0, 1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => setSelectedRating(rating)}
                className={`rating-btn rating-${rating}`}
              >
                <div className="rating-value">{rating}</div>
                <div className="rating-desc">{getRatingDescription(rating)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedRating !== null && !isRatingConfirmed && (
        <div className="confirm-rating">
          <p>Вы оценили карточку как: <strong>{getRatingDescription(selectedRating)}</strong></p>
          <button onClick={() => handleQualityRating(selectedRating)} className="confirm-btn">
            Подтвердить
          </button>
          <button onClick={() => setSelectedRating(null)} className="cancel-btn">
            Изменить оценку
          </button>
        </div>
      )}
      
      {isRatingConfirmed && (
        <div className="confirm-rating">
          <p>✓ Оценка сохранена! Переход к следующей карточке...</p>
        </div>
      )}
    </div>
  );
}

export default StudyMode;