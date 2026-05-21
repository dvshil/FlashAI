import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Dashboard.css';

function Dashboard() {
  const [sets, setSets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [setsRes, statsRes] = await Promise.all([
        api.get('/flashcards/sets'),
        api.get('/study/stats')
      ]);
      
      setSets(setsRes.data.sets);
      setStats(statsRes.data.stats);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSet = async (setId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот набор? Это действие нельзя отменить.')) {
      try {
        await api.delete(`/flashcards/sets/${setId}`);
        setSets(sets.filter(set => set.id !== setId));
      } catch (err) {
        console.error('Ошибка удаления набора:', err);
        alert('Не удалось удалить набор');
      }
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="dashboard">
      <div className="stats-section">
        <div className="stat-card">
          <h3>Всего карточек</h3>
          <div className="stat-value">{stats?.totalFlashcards || 0}</div>
        </div>
        <div className="stat-card">
          <h3>К повторению</h3>
          <div className="stat-value">{stats?.dueFlashcards || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Сессий изучения</h3>
          <div className="stat-value">{stats?.totalStudySessions || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Процент запоминания</h3>
          <div className="stat-value">{stats?.recallRate || 0}%</div>
        </div>
      </div>

      <div className="sets-header">
        <h2>Мои наборы карточек</h2>
        <button onClick={() => navigate('/create')} className="create-button">
          + Создать новый набор
        </button>
      </div>

      {sets.length === 0 ? (
        <div className="empty-state">
          <p>У вас пока нет ни одного набора карточек.</p>
          <button onClick={() => navigate('/create')}>Создать первый набор</button>
        </div>
      ) : (
        <div className="sets-grid">
          {sets.map(set => (
            <div key={set.id} className="set-card">
              <h3>{set.title}</h3>
              {set.description && <p>{set.description}</p>}
              <div className="set-actions">
                <button onClick={() => navigate(`/set/${set.id}`)}>Просмотреть карточки</button>
                <button onClick={() => navigate(`/study/${set.id}`)}>Изучать</button>
                <button onClick={() => navigate(`/test/${set.id}`)}>Пройти тест</button>
                <button onClick={() => deleteSet(set.id)} className="delete-btn">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;