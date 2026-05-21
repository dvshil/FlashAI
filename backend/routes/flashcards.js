const express = require('express');
const authenticateToken = require('../middleware/auth');
const { extractTextFromBuffer } = require('../services/fileParser');
const { generateFlashcards } = require('../services/openai');
const router = express.Router();

router.get('/sets', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;

  try {
    const result = await db.query(
      'SELECT * FROM flashcard_sets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ sets: result.rows, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось получить наборы данных', success: false });
  }
});

router.post('/sets', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Введите название', success: false });
  }

  try {
    const result = await db.query(
      'INSERT INTO flashcard_sets (user_id, title, description) VALUES ($1, $2, $3) RETURNING *',
      [userId, title, description || '']
    );
    res.json({ set: result.rows[0], success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось создать набор', success: false });
  }
});

router.post('/generate', authenticateToken, async (req, res) => {
  const upload = req.app.get('upload');
  
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message, success: false });
    }

    const { text: manualText } = req.body;
    let extractedText = '';

    try {
      if (req.file) {
        console.log('Processing file:', req.file.originalname, 'Type:', req.file.mimetype, 'Size:', req.file.size);
        extractedText = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
        console.log('Extracted text length:', extractedText.length);
      } else if (manualText && manualText.trim()) {
        extractedText = manualText;
        console.log('Processing manual text, length:', extractedText.length);
      } else {
        return res.status(400).json({ error: 'Материалы не предоставлены. Пожалуйста, загрузите файл или введите текст.', success: false });
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ error: 'Не удалось извлечь текст из предоставленного содержимого. Пожалуйста, проверьте свой файл', success: false });
      }

      const wordCount = extractedText.split(/\s+/).length;
      if (wordCount > 5000) {
        return res.status(400).json({ error: `Объём текста превышает 5000 слов (${wordCount} слов). Пожалуйста, используйте более короткий текст.`, success: false });
      }

      console.log('Generating flashcards...');
      const flashcards = await generateFlashcards(extractedText);
      
      if (!flashcards || flashcards.length === 0) {
        return res.status(500).json({ error: 'Не удалось сгенерировать карточки. Пожалуйста, повторите попытку с другим содержанием.', success: false });
      }
      
      console.log(`Generated ${flashcards.length} flashcards`);
      res.json({ flashcards, success: true });
      
    } catch (error) {
      console.error('Generation error:', error);
      res.status(500).json({ 
        error: error.message || 'Не удалось сгенерировать карточки. Пожалуйста, попробуйте снова.', 
        success: false,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
});

router.post('/sets/:setId/flashcards', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { setId } = req.params;
  const { flashcards } = req.body;

  if (!flashcards || !Array.isArray(flashcards)) {
    return res.status(400).json({ error: 'Неверные данные карточек', success: false });
  }

  try {
    const setCheck = await db.query(
      'SELECT id FROM flashcard_sets WHERE id = $1 AND user_id = $2',
      [setId, userId]
    );
    
    if (setCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Набор не найден', success: false });
    }

    for (const card of flashcards) {
      await db.query(
        'INSERT INTO flashcards (set_id, question, answer) VALUES ($1, $2, $3)',
        [setId, card.question, card.answer]
      );
    }

    const result = await db.query(
      'SELECT * FROM flashcards WHERE set_id = $1 ORDER BY created_at ASC',
      [setId]
    );

    res.json({ flashcards: result.rows, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось сохранить карточки', success: false });
  }
});

router.get('/sets/:setId/flashcards', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { setId } = req.params;

  try {
    const setCheck = await db.query(
      'SELECT id FROM flashcard_sets WHERE id = $1 AND user_id = $2',
      [setId, userId]
    );
    
    if (setCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Набор не найден', success: false });
    }

    const result = await db.query(
      'SELECT * FROM flashcards WHERE set_id = $1 ORDER BY created_at ASC',
      [setId]
    );

    res.json({ flashcards: result.rows, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось извлечь карточки', success: false });
  }
});

router.put('/flashcards/:cardId', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { cardId } = req.params;
  const { question, answer } = req.body;

  try {
    const cardCheck = await db.query(
      `SELECT f.id FROM flashcards f 
       JOIN flashcard_sets fs ON f.set_id = fs.id 
       WHERE f.id = $1 AND fs.user_id = $2`,
      [cardId, userId]
    );
    
    if (cardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Карточки не найдены', success: false });
    }

    await db.query(
      'UPDATE flashcards SET question = $1, answer = $2 WHERE id = $3',
      [question, answer, cardId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось обновить карточки', success: false });
  }
});

router.delete('/flashcards/:cardId', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { cardId } = req.params;

  try {
    const cardCheck = await db.query(
      `SELECT f.id FROM flashcards f 
       JOIN flashcard_sets fs ON f.set_id = fs.id 
       WHERE f.id = $1 AND fs.user_id = $2`,
      [cardId, userId]
    );
    
    if (cardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Карточка не найдена', success: false });
    }

    await db.query('DELETE FROM flashcards WHERE id = $1', [cardId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось удалить карточку', success: false });
  }
});

router.delete('/sets/:setId', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { setId } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM flashcard_sets WHERE id = $1 AND user_id = $2 RETURNING id',
      [setId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Набор не найден', success: false });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось удалить набор', success: false });
  }
});

module.exports = router;