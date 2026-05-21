import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import CreateSet from './components/CreateSet';
import FlashcardSet from './components/FlashcardSet';
import StudyMode from './components/StudyMode';
import TestMode from './components/TestMode';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setIsAuthenticated(true);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <Router>
      <div className="app">
        {isAuthenticated && <Navigation user={user} onLogout={handleLogout} />}
        <div className="content">
          <Routes>
            <Route path="/login" element={
              !isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />
            } />
            <Route path="/register" element={
              !isAuthenticated ? <Register onRegister={handleLogin} /> : <Navigate to="/" />
            } />
            <Route path="/" element={
              isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
            } />
            <Route path="/profile" element={
              isAuthenticated ? <Profile /> : <Navigate to="/login" />
            } />
            <Route path="/create" element={
              isAuthenticated ? <CreateSet /> : <Navigate to="/login" />
            } />
            <Route path="/set/:setId" element={
              isAuthenticated ? <FlashcardSet /> : <Navigate to="/login" />
            } />
            <Route path="/study/:setId" element={
              isAuthenticated ? <StudyMode /> : <Navigate to="/login" />
            } />
            <Route path="/test/:setId" element={
              isAuthenticated ? <TestMode /> : <Navigate to="/login" />
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;