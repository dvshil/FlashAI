const express = require('express');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

function calculateSM2(quality, easeFactor, repetitions, intervalDays) {
  let newEaseFactor = easeFactor;
  let newRepetitions = repetitions;
  let newIntervalDays = intervalDays;
  
  if (quality >= 3) {
    if (repetitions === 0) {
      newIntervalDays = 1;
    } else if (repetitions === 1) {
      newIntervalDays = 6;
    } else {
      newIntervalDays = Math.round(intervalDays * easeFactor);
    }
    newRepetitions++;
    
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;
  } else {
    newRepetitions = 0;
    newIntervalDays = 0;
    newEaseFactor = easeFactor - 0.2;
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;
  }
  
  return { easeFactor: newEaseFactor, repetitions: newRepetitions, intervalDays: newIntervalDays };
}

router.get('/due/:setId', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { setId } = req.params;

  try {
    const result = await db.query(
      `SELECT f.* FROM flashcards f
       JOIN flashcard_sets fs ON f.set_id = fs.id
       WHERE fs.id = $1 AND fs.user_id = $2
         AND (f.next_review <= CURRENT_DATE OR f.next_review IS NULL)
       ORDER BY f.ease_factor ASC, f.next_review ASC NULLS FIRST, f.id ASC`,
      [setId, userId]
    );
    
    res.json({ flashcards: result.rows, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось получить карточки', success: false });
  }
});

router.post('/review', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { flashcardId, quality } = req.body;

  if (quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'Значение должно быть между 0 и 5', success: false });
  }

  try {
    const flashcardResult = await db.query(
      `SELECT f.* FROM flashcards f
       JOIN flashcard_sets fs ON f.set_id = fs.id
       WHERE f.id = $1 AND fs.user_id = $2`,
      [flashcardId, userId]
    );
    
    if (flashcardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Карточка не найдена', success: false });
    }
    
    const flashcard = flashcardResult.rows[0];

    const { easeFactor, repetitions, intervalDays } = calculateSM2(
      quality,
      flashcard.ease_factor,
      flashcard.repetitions,
      flashcard.interval_days
    );
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);

    await db.query(
      `UPDATE flashcards 
       SET ease_factor = $1, repetitions = $2, interval_days = $3, next_review = $4
       WHERE id = $5`,
      [easeFactor, repetitions, intervalDays, nextReview, flashcardId]
    );

    await db.query(
      'INSERT INTO study_sessions (flashcard_id, user_id, quality) VALUES ($1, $2, $3)',
      [flashcardId, userId, quality]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось сделать запись', success: false });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;

  try {
    const totalResult = await db.query(
      `SELECT COUNT(*) as total FROM flashcards f
       JOIN flashcard_sets fs ON f.set_id = fs.id
       WHERE fs.user_id = $1`,
      [userId]
    );
    
    const dueResult = await db.query(
      `SELECT COUNT(*) as due FROM flashcards f
       JOIN flashcard_sets fs ON f.set_id = fs.id
       WHERE fs.user_id = $1
       AND (f.next_review <= CURRENT_DATE OR f.next_review IS NULL)`,
      [userId]
    );
    
    const sessionsResult = await db.query(
      'SELECT COUNT(*) as total_sessions FROM study_sessions WHERE user_id = $1',
      [userId]
    );
    
    const recallResult = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN quality >= 3 THEN 1 ELSE 0 END) as successful
       FROM study_sessions WHERE user_id = $1`,
      [userId]
    );
    
    const recallRate = recallResult.rows[0].total > 0 
      ? (recallResult.rows[0].successful / recallResult.rows[0].total * 100).toFixed(1)
      : 0;
    
    res.json({
      stats: {
        totalFlashcards: parseInt(totalResult.rows[0].total),
        dueFlashcards: parseInt(dueResult.rows[0].due),
        totalStudySessions: parseInt(sessionsResult.rows[0].total_sessions),
        recallRate: parseFloat(recallRate)
      },
      success: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось получить статистику', success: false });
  }
});

module.exports = router;