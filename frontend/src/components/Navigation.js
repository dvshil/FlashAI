import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navigation.css';

function Navigation({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="logo">
          FlashAI
        </Link>
        
        <div className="nav-links">
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/create" className="nav-link">Создать набор</Link>
        </div>
        
        <div className="user-menu">
          <span className="username">{user?.email}</span>
          <button onClick={() => navigate('/profile')} className="profile-btn">
            Профиль
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Выйти
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;