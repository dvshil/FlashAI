import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './CreateSet.css';

function CreateSet() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [inputMethod, setInputMethod] = useState('manual');
  const [file, setFile] = useState(null);
  const [manualText, setManualText] = useState('');
  const [manualCards, setManualCards] = useState([{ question: '', answer: '' }]);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!allowedTypes.includes(selectedFile.type)) {
        alert('Можно загружать только PDF, DOCX или TXT файлы.');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('Размер файла не должен превышать 10MB.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleManualCardChange = (index, field, value) => {
    const updatedCards = [...manualCards];
    updatedCards[index][field] = value;
    setManualCards(updatedCards);
  };

  const addManualCard = () => {
    setManualCards([...manualCards, { question: '', answer: '' }]);
  };

  const removeManualCard = (index) => {
    if (manualCards.length > 1) {
      const updatedCards = manualCards.filter((_, i) => i !== index);
      setManualCards(updatedCards);
    }
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      alert('Пожалуйста, введите название набора');
      return;
    }

    if (inputMethod === 'manual') {
      const emptyCards = manualCards.filter(card => !card.question.trim() || !card.answer.trim());
      if (emptyCards.length > 0) {
        alert('Пожалуйста, заполните вопрос и ответ для всех карточек');
        return;
      }
      if (manualCards.length === 0) {
        alert('Добавьте хотя бы одну карточку');
        return;
      }
      setGeneratedCards(manualCards);
      setShowPreview(true);
      return;
    }

    if (inputMethod === 'file' && !file) {
      alert('Пожалуйста, выберите файл для загрузки');
      return;
    }

    if (inputMethod === 'text' && !manualText.trim()) {
      alert('Пожалуйста, введите текст для генерации карточек');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    
    if (inputMethod === 'file') {
      formData.append('file', file);
    } else {
      formData.append('text', manualText);
    }

    try {
      const response = await api.post('/flashcards/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      
      if (response.data.success && response.data.flashcards && response.data.flashcards.length > 0) {
        setGeneratedCards(response.data.flashcards);
        setShowPreview(true);
      } else {
        alert('Не удалось сгенерировать карточки. Попробуйте другой текст или файл.');
      }
    } catch (err) {
      console.error('Ошибка генерации:', err);
      alert(err.response?.data?.error || 'Не удалось сгенерировать карточки. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSet = async () => {
    try {
      const setResponse = await api.post('/flashcards/sets', { title, description });
      const setId = setResponse.data.set.id;
      
      await api.post(`/flashcards/sets/${setId}/flashcards`, { flashcards: generatedCards });
      
      alert('Набор карточек успешно создан!');
      navigate(`/set/${setId}`);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      alert('Не удалось сохранить набор карточек. Попробуйте ещё раз.');
    }
  };

  const handleEditCard = (index) => {
    setEditingCard({ index, ...generatedCards[index] });
  };

  const handleUpdateCard = () => {
    const updatedCards = [...generatedCards];
    updatedCards[editingCard.index] = {
      question: editingCard.question,
      answer: editingCard.answer
    };
    setGeneratedCards(updatedCards);
    setEditingCard(null);
  };

  const handleDeleteCard = (index) => {
    if (window.confirm('Удалить эту карточку?')) {
      const updatedCards = generatedCards.filter((_, i) => i !== index);
      setGeneratedCards(updatedCards);
    }
  };

  const handleAddCard = () => {
    setGeneratedCards([...generatedCards, { question: 'Новый вопрос', answer: 'Новый ответ' }]);
  };

  if (showPreview) {
    return (
      <div className="create-set">
        <div className="preview-header">
          <h2>Просмотр карточек</h2>
          <p>Проверьте, отредактируйте или удалите карточки перед сохранением</p>
        </div>
        
        <div className="cards-preview">
          {generatedCards.map((card, index) => (
            <div key={index} className="preview-card">
              <div className="preview-card-header">
                <span className="card-number">Карточка {index + 1}</span>
                <div className="preview-card-badges">
                  <span className="term-badge">Термин</span>
                  <span className="def-badge">Определение</span>
                </div>
              </div>
              
              <div className="preview-card-content">
                {editingCard?.index === index ? (
                  <>
                    <div className="edit-question-area">
                      <label>Вопрос (термин)</label>
                      <textarea
                        value={editingCard.question}
                        onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
                        rows={3}
                        placeholder="Введите термин..."
                      />
                    </div>
                    <div className="edit-answer-area">
                      <label>Ответ (определение)</label>
                      <textarea
                        value={editingCard.answer}
                        onChange={(e) => setEditingCard({ ...editingCard, answer: e.target.value })}
                        rows={4}
                        placeholder="Введите определение..."
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="preview-question">
                      <div className="question-label">Вопрос</div>
                      <div className="question-text">{card.question || '—'}</div>
                    </div>
                    <div className="preview-answer">
                      <div className="answer-label">Ответ</div>
                      <div className="answer-text">{card.answer || '—'}</div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="preview-card-actions">
                {editingCard?.index === index ? (
                  <>
                    <button onClick={handleUpdateCard} className="save-edit-btn">
                      Сохранить
                    </button>
                    <button onClick={() => setEditingCard(null)} className="cancel-edit-btn">
                      Отмена
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditCard(index)} className="edit-card-btn">
                      Редактировать
                    </button>
                    <button onClick={() => handleDeleteCard(index)} className="delete-card-btn">
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="preview-actions">
          <button onClick={handleAddCard} className="add-card-btn">
            + Добавить карточку
          </button>
          <div className="action-buttons">
            <button onClick={() => setShowPreview(false)} className="back-btn">
              Назад
            </button>
            <button onClick={handleSaveSet} className="save-set-btn">
              Сохранить набор
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-set">
      <div className="create-set-header">
        <h1>Создать новый набор карточек</h1>
        <p>Создайте карточки вручную, загрузите файл или вставьте текст для AI-генерации</p>
      </div>
      
      <div className="create-set-form">
        <div className="form-group">
          <label>Название набора *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Биология Глава 1, Основы JavaScript и т.д."
          />
        </div>
        
        <div className="form-group">
          <label>Описание (необязательно)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Краткое описание этого набора карточек"
            rows={3}
          />
        </div>
        
        <div className="input-method">
          <label>Выберите способ создания:</label>
          <div className="method-buttons">
            <button
              type="button"
              className={inputMethod === 'manual' ? 'active' : ''}
              onClick={() => setInputMethod('manual')}
            >
              Создать вручную
            </button>
            <button
              type="button"
              className={inputMethod === 'file' ? 'active' : ''}
              onClick={() => setInputMethod('file')}
            >
              Загрузить файл
            </button>
            <button
              type="button"
              className={inputMethod === 'text' ? 'active' : ''}
              onClick={() => setInputMethod('text')}
            >
              Вставить текст
            </button>
          </div>
        </div>

        {inputMethod === 'manual' && (
          <div className="manual-cards">
            <label>Карточки</label>
            {manualCards.map((card, index) => (
              <div key={index} className="manual-card">
                <div className="manual-card-header">
                  <span>Карточка {index + 1}</span>
                  {manualCards.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeManualCard(index)}
                      className="remove-card-btn"
                    >
                      Удалить
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <label>Вопрос (термин)</label>
                  <textarea
                    value={card.question}
                    onChange={(e) => handleManualCardChange(index, 'question', e.target.value)}
                    rows={2}
                    placeholder="Введите термин..."
                  />
                </div>
                <div className="form-group">
                  <label>Ответ (определение)</label>
                  <textarea
                    value={card.answer}
                    onChange={(e) => handleManualCardChange(index, 'answer', e.target.value)}
                    rows={2}
                    placeholder="Введите определение..."
                  />
                </div>
              </div>
            ))}
            <button type="button" onClick={addManualCard} className="add-manual-card-btn">
              + Добавить карточку
            </button>
          </div>
        )}
        
        {inputMethod === 'file' && (
          <div className="file-upload">
            <label>Загрузить файл (PDF, DOCX или TXT)</label>
            <div className="file-dropzone">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              />
              {file && <p className="file-name">Выбран файл: {file.name}</p>}
              <p className="file-hint">Максимальный размер: 10MB | Максимум слов: 5000</p>
            </div>
          </div>
        )}
        
        {inputMethod === 'text' && (
          <div className="text-input">
            <label>Вставьте текст для генерации</label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Вставьте текст ваших заметок, статьи или учебного материала... AI сгенерирует карточки в формате 'термин - определение' на основе этого текста."
              rows={10}
            />
            <p className="text-hint">Максимум 5000 слов. Чем структурированнее текст, тем качественнее будут карточки.</p>
          </div>
        )}
        
        <button 
          onClick={handleGenerate} 
          disabled={loading}
          className="generate-btn"
        >
          {loading ? 'Генерация карточек...' : (inputMethod === 'manual' ? 'Далее' : 'Сгенерировать карточки')}
        </button>
      </div>
    </div>
  );
}

export default CreateSet;