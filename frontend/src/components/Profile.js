import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './Profile.css';

function Profile() {
  const [studyStats, setStudyStats] = useState(null);
  const [testStats, setTestStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState([]);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const [studyRes, setsRes] = await Promise.all([
        api.get('/study/stats'),
        api.get('/flashcards/sets')
      ]);
      
      setStudyStats(studyRes.data.stats);
      setSets(setsRes.data.sets);
      
      const testStatsPromises = setsRes.data.sets.map(set => 
        api.get(`/test/stats/${set.id}`).catch(() => ({ data: { stats: null } }))
      );
      const testStatsResults = await Promise.all(testStatsPromises);
      setTestStats(testStatsResults.map(res => res.data.stats));
      
    } catch (err) {
      console.error('Ошибка загрузки данных профиля:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка профиля...</div>;
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <h1>Мой профиль обучения</h1>
        <p>Отслеживайте свой прогресс и достижения</p>
      </div>

      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-info">
            <h3>Всего сессий</h3>
            <div className="stat-number">{studyStats?.totalStudySessions || 0}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-info">
            <h3>Процент запоминания</h3>
            <div className="stat-number">{studyStats?.recallRate || 0}%</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-info">
            <h3>Всего карточек</h3>
            <div className="stat-number">{studyStats?.totalFlashcards || 0}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-info">
            <h3>К повторению</h3>
            <div className="stat-number">{studyStats?.dueFlashcards || 0}</div>
          </div>
        </div>
      </div>

      <div className="achievements-section">
        <h2>Достижения и прогресс</h2>
        <div className="achievements-grid">
          {studyStats?.totalStudySessions >= 10 && (
            <div className="achievement unlocked">
              <div className="achievement-name">Усердный ученик</div>
              <div className="achievement-desc">10+ сессий изучения завершено</div>
            </div>
          )}
          {studyStats?.recallRate >= 80 && (
            <div className="achievement unlocked">
              <div className="achievement-name">Мастер памяти</div>
              <div className="achievement-desc">80%+ процент запоминания</div>
            </div>
          )}
          {studyStats?.totalFlashcards >= 50 && (
            <div className="achievement unlocked">
              <div className="achievement-name">Искатель знаний</div>
              <div className="achievement-desc">50+ карточек создано</div>
            </div>
          )}
          {sets.length >= 5 && (
            <div className="achievement unlocked">
              <div className="achievement-name">Коллекционер наборов</div>
              <div className="achievement-desc">5+ наборов карточек создано</div>
            </div>
          )}
        </div>
      </div>

      <div className="set-progress-section">
        <h2>Успеваемость по наборам</h2>
        <div className="set-progress-list">
          {sets.map((set, index) => {
            const stats = testStats[index];
            return (
              <div key={set.id} className="set-progress-card">
                <h3>{set.title}</h3>
                {stats && stats.totalTests > 0 ? (
                  <div className="progress-details">
                    <div className="progress-item">
                      <span>Пройдено тестов:</span>
                      <strong>{stats.totalTests}</strong>
                    </div>
                    <div className="progress-item">
                      <span>Средний балл:</span>
                      <strong>{stats.averageScore}%</strong>
                    </div>
                    <div className="progress-item">
                      <span>Лучший результат:</span>
                      <strong>{stats.bestScore}%</strong>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${stats.averageScore}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <p className="no-tests">Тесты по этому набору ещё не пройдены</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Profile;