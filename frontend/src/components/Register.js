import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './Register.css';

function Register({ onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', { email, password });
      if (response.data.success) {
        onRegister(response.data.token, response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Создать аккаунт</h2>
        <p className="subtitle">Начните своё обучение сегодня</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email адрес</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Введите ваш email"
            />
          </div>
          
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Придумайте пароль (мин. 6 символов)"
            />
          </div>
          
          <div className="form-group">
            <label>Подтвердите пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Подтвердите пароль"
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
          </button>
        </form>
        
        <div className="auth-links">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;