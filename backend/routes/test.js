const express = require('express');
const authenticateToken = require('../middleware/auth');
const { generateDistractors } = require('../services/openai');
const router = express.Router();

function generateContextualFallback(question, correctAnswer, count) {
  const fallbacks = [];
  const q = question.toLowerCase();
  const a = correctAnswer.toLowerCase();
  
  const keywords = q.match(/[а-яёa-z]{4,}/gi) || [];
  const mainKeyword = keywords.length > 0 ? keywords[0] : 'понятие';
  
  if (q.includes('что такое') || q.includes('что значит') || q.includes('что означает')) {
    fallbacks.push(`Определение, не связанное с понятием "${mainKeyword}"`);
    fallbacks.push(`Характеристика из другой области знания`);
    fallbacks.push(`Описание, противоречащее правильному определению`);
  } 
  else if (q.includes('кто') || q.includes('какой учёный') || q.includes('кто такой')) {
    fallbacks.push(`Другой учёный, внёсший вклад в смежную область`);
    fallbacks.push(`Вымышленное имя, не имеющее отношения к теме`);
    fallbacks.push(`Учёный из другого исторического периода`);
  }
  else if (q.includes('как') || q.includes('почему')) {
    fallbacks.push(`Неправильное объяснение механизма работы`);
    fallbacks.push(`Причина, не связанная с "${mainKeyword}"`);
    fallbacks.push(`Описание, путающее причину и следствие`);
  }
  else if (a.includes('это') || a.includes('—')) {
    fallbacks.push(`Определение, относящееся к другому термину`);
    fallbacks.push(`Описание, противоположное правильному`);
    fallbacks.push(`Характеристика смежного, но не тождественного понятия`);
  }
  else {
    fallbacks.push(`Неправильное определение для "${mainKeyword}"`);
    fallbacks.push(`Характеристика, не относящаяся к "${mainKeyword}"`);
    fallbacks.push(`Описание другого понятия из той же области`);
  }
  
  if (correctAnswer.length > 50 && fallbacks.length < count) {
    const words = correctAnswer.split(' ');
    if (words.length > 6) {
      const distorted = words.slice(0, 4).join(' ') + '... (неполное определение)';
      fallbacks.push(distorted);
    }
  }
  
  if (q.includes('разница') || q.includes('отличие')) {
    fallbacks.push(`Ошибочное утверждение о сходстве понятий`);
    fallbacks.push(`Неверное указание на различия`);
  }
  
  while (fallbacks.length < count) {
    fallbacks.push(`Вариант ${fallbacks.length + 1}`);
  }
  
  return fallbacks.slice(0, count);
}

router.post('/generate/:setId', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { setId } = req.params;
  const { numQuestions } = req.body;

  try {
    const flashcardsResult = await db.query(
      `SELECT f.id, f.question, f.answer FROM flashcards f
       JOIN flashcard_sets fs ON f.set_id = fs.id
       WHERE fs.id = $1 AND fs.user_id = $2`,
      [setId, userId]
    );
    
    if (flashcardsResult.rows.length === 0) {
      return res.status(404).json({ error: 'В этом наборе нет карточек', success: false });
    }
    
    const flashcards = flashcardsResult.rows;
    const numQuestionsToGenerate = Math.min(numQuestions || flashcards.length, flashcards.length);
    
    const shuffled = [...flashcards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selectedCards = shuffled.slice(0, numQuestionsToGenerate);
    
    const questions = [];
    for (const card of selectedCards) {
      const otherAnswers = flashcards
        .filter(c => c.id !== card.id)
        .map(c => c.answer);
      
      let distractors = [];
      
      if (otherAnswers.length >= 3) {
        const shuffledOthers = [...otherAnswers];
        for (let i = shuffledOthers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
        }
        distractors = shuffledOthers.slice(0, 3);
      } 
      else if (otherAnswers.length > 0 && otherAnswers.length < 3) {
        distractors = [...otherAnswers];
        try {
          const needed = 3 - distractors.length;
          const aiDistractors = await generateDistractors(card.question, card.answer, needed);
          if (aiDistractors && aiDistractors.length > 0) {
            distractors.push(...aiDistractors.slice(0, needed));
          } else {
            const fallback = generateContextualFallback(card.question, card.answer, needed);
            distractors.push(...fallback);
          }
        } catch (err) {
          console.error('Ошибка генерации дистракторов через AI:', err);
          const fallback = generateContextualFallback(card.question, card.answer, 3 - distractors.length);
          distractors.push(...fallback);
        }
      } 
      else {
        try {
          distractors = await generateDistractors(card.question, card.answer, 3);
          if (!distractors || distractors.length === 0) {
            distractors = generateContextualFallback(card.question, card.answer, 3);
          }
        } catch (err) {
          console.error('Ошибка генерации дистракторов через AI:', err);
          distractors = generateContextualFallback(card.question, card.answer, 3);
        }
      }
      
      distractors = [...new Set(distractors)];
      distractors = distractors.filter(d => d !== card.answer);
      
      while (distractors.length < 3) {
        const extraFallback = generateContextualFallback(card.question, card.answer, 1);
        distractors.push(extraFallback[0]);
      }
      
      distractors = distractors.slice(0, 3);
      
      const options = [card.answer, ...distractors];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      
      questions.push({
        id: card.id,
        question: card.question,
        correctAnswer: card.answer,
        options: options
      });
    }
    
    res.json({ questions, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось сгенерировать тест', success: false });
  }
});

router.post('/submit', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { setId, score, totalQuestions } = req.body;

  try {
    await db.query(
      'INSERT INTO test_results (user_id, set_id, score, total_questions) VALUES ($1, $2, $3, $4)',
      [userId, setId, score, totalQuestions]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось сохранить результаты теста', success: false });
  }
});

router.get('/stats/:setId', authenticateToken, async (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;
  const { setId } = req.params;

  try {
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_tests,
        AVG(score::float / total_questions * 100) as avg_score,
        MAX(score::float / total_questions * 100) as best_score
       FROM test_results
       WHERE user_id = $1 AND set_id = $2`,
      [userId, setId]
    );
    
    res.json({
      stats: {
        totalTests: parseInt(result.rows[0].total_tests),
        averageScore: parseFloat(result.rows[0].avg_score || 0).toFixed(1),
        bestScore: parseFloat(result.rows[0].best_score || 0).toFixed(1)
      },
      success: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось получить статистику тестов', success: false });
  }
});

module.exports = router;