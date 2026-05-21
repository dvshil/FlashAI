const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла. Разрешены только PDF, DOCX и TXT.'));
    }
  }
});

app.set('db', pool);
app.set('upload', upload);

const authRoutes = require('./routes/auth');
const flashcardRoutes = require('./routes/flashcards');
const studyRoutes = require('./routes/study');
const testRoutes = require('./routes/test');

app.use('/api/auth', authRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/test', testRoutes);

app.use((err, req, res, next) => {
  console.error('Ошибка:', err.stack);
  res.status(err.status || 500).json({ 
    error: err.message || 'Внутренняя ошибка сервера',
    success: false 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Ключ Gemini API настроен: ${process.env.GEMINI_API_KEY ? 'Да' : 'Нет'}`);
});

module.exports = { pool };
