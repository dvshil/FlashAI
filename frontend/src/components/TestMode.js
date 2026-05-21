import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './TestMode.css';

function TestMode() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    generateTest();
  }, [setId]);

  const generateTest = async () => {
    try {
      const response = await api.post(`/test/generate/${setId}`, { numQuestions: 10 });
      if (response.data.success) {
        setQuestions(response.data.questions);
      }
    } catch (err) {
      console.error('Error generating test:', err);
      alert('Failed to generate test. Please make sure the set has flashcards.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, selectedAnswer) => {
    setAnswers({
      ...answers,
      [questionId]: selectedAnswer
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    const unansweredCount = questions.filter(q => !answers[q.id]).length;
    if (unansweredCount > 0) {
      alert(`Поажлуйста, ответьте на все вопросы. На ${unansweredCount} вопрос(ов) не дан ответ.`);
      return;
    }

    setSubmitting(true);
    
    let correctCount = 0;
    questions.forEach(question => {
      if (answers[question.id] === question.correctAnswer) {
        correctCount++;
      }
    });
    
    const finalScore = correctCount;
    setScore(finalScore);
    
    try {
      await api.post('/test/submit', {
        setId: parseInt(setId),
        score: finalScore,
        totalQuestions: questions.length
      });
    } catch (err) {
      console.error('Error saving test results:', err);
    }
    
    setTestCompleted(true);
    setSubmitting(false);
  };

  const handleRetake = () => {
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setTestCompleted(false);
    setScore(0);
    generateTest();
  };

  if (loading) {
    return <div className="loading">Generating test...</div>;
  }

  if (testCompleted) {
    const percentage = (score / questions.length * 100).toFixed(1);
    let performanceMessage = '';
    
    if (percentage >= 90) {
      performanceMessage = 'Замечательно! Вы действительно знаток этого материала!';
    } else if (percentage >= 70) {
      performanceMessage = 'Хорошая работа! Продолжайте практиковаться чтобы освоить материал!';
    } else if (percentage >= 50) {
      performanceMessage = 'Неплохо! Повторите материал и попробуйте ещё раз пройти тест.';
    } else {
      performanceMessage = 'Продолжайте в том же духе! Вы добъётесь великолепного результата с практикой.';
    }
    
    return (
      <div className="test-results">
        <div className="results-card">
          <div className="results-header">
            <h2>Тест пройден!</h2>
          </div>
          
          <div className="score-display">
            <div className="score-circle">
              <div className="score-percentage">{percentage}%</div>
              <div className="score-detail">{score} / {questions.length}</div>
            </div>
          </div>
          
          <p className="performance-message">{performanceMessage}</p>
          
          <div className="results-details">
            <h3>Разбор вопросов</h3>
            {questions.map((question, index) => {
              const isCorrect = answers[question.id] === question.correctAnswer;
              return (
                <div key={question.id} className={`result-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="result-number">Вопрос {index + 1}</div>
                  <div className="result-question">{question.question}</div>
                  <div className="result-answers">
                    <div className="your-answer">
                      Ваш ответ: <span>{answers[question.id]}</span>
                    </div>
                    {!isCorrect && (
                      <div className="correct-answer">
                        Правильный ответ: <span>{question.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="results-buttons">
            <button onClick={handleRetake} className="retake-btn">
              Пройти тест заново
            </button>
            <button onClick={() => navigate(`/set/${setId}`)} className="back-btn">
              Вернуться к набору
            </button>
            <button onClick={() => navigate('/')} className="dashboard-btn">
              Вернуться на главный экран
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length * 100);
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="test-mode">
      <div className="test-header">
        <div className="test-progress">
          <div className="progress-info">
            <span>Вопрос {currentIndex + 1} из {questions.length}</span>
            <span>Отвечено: {answeredCount}/{questions.length}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="question-container">
        <div className="question-card">
          <div className="question-number">
            Вопрос {currentIndex + 1}
          </div>
          <div className="question-text">
            {currentQuestion.question}
          </div>
          
          <div className="options-list">
            {currentQuestion.options.map((option, idx) => (
              <label key={idx} className={`option-label ${answers[currentQuestion.id] === option ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option}
                  checked={answers[currentQuestion.id] === option}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="navigation-buttons">
        <button 
          onClick={handlePrevious} 
          disabled={currentIndex === 0}
          className="nav-btn prev-btn"
        >
          Предыдущий
        </button>
        
        {currentIndex === questions.length - 1 ? (
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="submit-btn"
          >
            {submitting ? 'Завершаю...' : 'Завершить тест'}
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="nav-btn next-btn"
          >
            Следующий
          </button>
        )}
      </div>
    </div>
  );
}

export default TestMode;