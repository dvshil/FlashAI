import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './FlashcardSet.css';

function FlashcardSet() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const [set, setSet] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState(null);
  const [addingCard, setAddingCard] = useState(false);
  const [newCard, setNewCard] = useState({ question: '', answer: '' });

  useEffect(() => {
    fetchSetData();
  }, [setId]);

  const fetchSetData = async () => {
    try {
      const [setRes, cardsRes] = await Promise.all([
        api.get('/flashcards/sets'),
        api.get(`/flashcards/sets/${setId}/flashcards`)
      ]);
      
      const currentSet = setRes.data.sets.find(s => s.id === parseInt(setId));
      setSet(currentSet);
      setFlashcards(cardsRes.data.flashcards);
    } catch (err) {
      console.error('Ошибка загрузки данных набора:', err);
      alert('Не удалось загрузить набор карточек');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCard = async () => {
    try {
      await api.put(`/flashcards/flashcards/${editingCard.id}`, {
        question: editingCard.question,
        answer: editingCard.answer
      });
      
      setFlashcards(flashcards.map(card => 
        card.id === editingCard.id ? editingCard : card
      ));
      setEditingCard(null);
      alert('Карточка успешно обновлена!');
    } catch (err) {
      console.error('Ошибка обновления:', err);
      alert('Не удалось обновить карточку');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (window.confirm('Вы уверены, что хотите удалить эту карточку?')) {
      try {
        await api.delete(`/flashcards/flashcards/${cardId}`);
        setFlashcards(flashcards.filter(card => card.id !== cardId));
        alert('Карточка успешно удалена!');
      } catch (err) {
        console.error('Ошибка удаления:', err);
        alert('Не удалось удалить карточку');
      }
    }
  };

  const handleAddCard = async () => {
    if (!newCard.question.trim() || !newCard.answer.trim()) {
      alert('Пожалуйста, заполните и вопрос, и ответ');
      return;
    }

    try {
      const tempCard = { ...newCard, id: Date.now(), set_id: parseInt(setId) };
      const updatedCards = [...flashcards, tempCard];
      setFlashcards(updatedCards);
      
      await api.post(`/flashcards/sets/${setId}/flashcards`, { 
        flashcards: [newCard] 
      });
      
      setAddingCard(false);
      setNewCard({ question: '', answer: '' });
      await fetchSetData();
      alert('Карточка успешно добавлена!');
    } catch (err) {
      console.error('Ошибка добавления карточки:', err);
      alert('Не удалось добавить карточку');
      await fetchSetData();
    }
  };

  const handleDeleteSet = async () => {
    if (window.confirm('Удалить весь набор карточек? Это действие нельзя отменить.')) {
      try {
        await api.delete(`/flashcards/sets/${setId}`);
        navigate('/');
        alert('Набор успешно удалён!');
      } catch (err) {
        console.error('Ошибка удаления набора:', err);
        alert('Не удалось удалить набор');
      }
    }
  };

  if (loading) {
    return <div className="loading">Загрузка набора карточек...</div>;
  }

  if (!set) {
    return <div className="error">Набор карточек не найден</div>;
  }

  return (
    <div className="flashcard-set">
      <div className="set-header">
        <div>
          <h1>{set.title}</h1>
          {set.description && <p className="set-description">{set.description}</p>}
        </div>
        <div className="set-actions-header">
          <button onClick={() => navigate(`/study/${setId}`)} className="study-btn">
            Режим изучения
          </button>
          <button onClick={() => navigate(`/test/${setId}`)} className="test-btn">
            Пройти тест
          </button>
          <button onClick={handleDeleteSet} className="delete-set-btn">
            Удалить набор
          </button>
        </div>
      </div>

      <div className="cards-section">
        <div className="cards-header">
          <h2>Карточки ({flashcards.length})</h2>
          <button onClick={() => setAddingCard(true)} className="add-card-btn">
            + Добавить карточку
          </button>
        </div>

        {addingCard && (
          <div className="add-card-form">
            <h3>Добавить новую карточку</h3>
            <div className="form-group">
              <label>Вопрос</label>
              <textarea
                value={newCard.question}
                onChange={(e) => setNewCard({ ...newCard, question: e.target.value })}
                rows={3}
                placeholder="Введите вопрос..."
              />
            </div>
            <div className="form-group">
              <label>Ответ</label>
              <textarea
                value={newCard.answer}
                onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
                rows={3}
                placeholder="Введите ответ..."
              />
            </div>
            <div className="form-buttons">
              <button onClick={handleAddCard} className="save-card-btn">Сохранить</button>
              <button onClick={() => setAddingCard(false)} className="cancel-card-btn">Отмена</button>
            </div>
          </div>
        )}

        <div className="cards-list">
          {flashcards.length === 0 ? (
            <div className="empty-cards">
              <p>В этом наборе пока нет карточек.</p>
              <button onClick={() => setAddingCard(true)}>Создать первую карточку</button>
            </div>
          ) : (
            flashcards.map((card, index) => (
              <div key={card.id} className="card-item">
                {editingCard?.id === card.id ? (
                  <div className="edit-card-form">
                    <div className="form-group">
                      <label>Вопрос</label>
                      <textarea
                        value={editingCard.question}
                        onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="form-group">
                      <label>Ответ</label>
                      <textarea
                        value={editingCard.answer}
                        onChange={(e) => setEditingCard({ ...editingCard, answer: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="form-buttons">
                      <button onClick={handleUpdateCard} className="save-card-btn">Сохранить</button>
                      <button onClick={() => setEditingCard(null)} className="cancel-card-btn">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card-number">#{index + 1}</div>
                    <div className="card-question">
                      <strong>В:</strong> {card.question}
                    </div>
                    <div className="card-answer">
                      <strong>О:</strong> {card.answer}
                    </div>
                    <div className="card-buttons">
                      <button onClick={() => setEditingCard(card)} className="edit-btn">
                        Редактировать
                      </button>
                      <button onClick={() => handleDeleteCard(card.id)} className="delete-btn">
                        Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default FlashcardSet;