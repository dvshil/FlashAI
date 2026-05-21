const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const db = req.app.get('db');

  if (!email || !password) {
    return res.status(400).json({ error: 'Требуется указать адрес электронной почты и пароль', success: false });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен содержать не менее 6 символов', success: false });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    
    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { id: result.rows[0].id, email: result.rows[0].email },
      success: true 
    });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Почта уже используется', success: false });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Не удалось выполнить регистрацию', success: false });
    }
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = req.app.get('db');

  if (!email || !password) {
    return res.status(400).json({ error: 'Требуется указать адрес электронной почты и пароль', success: false });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверные данные', success: false });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Неверные данные', success: false });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { id: user.id, email: user.email },
      success: true 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось выполнить вход', success: false });
  }
});

module.exports = router;
