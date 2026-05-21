const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ОШИБКА: GEMINI_API_KEY не задан в файле .env');
  console.error('Добавьте GEMINI_API_KEY=ваш_ключ в файл .env');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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

async function generateDistractors(question, correctAnswer, neededCount = 3) {
  try {
    if (!GEMINI_API_KEY) {
      console.log('Нет API ключа, используем запасной вариант');
      return generateContextualFallback(question, correctAnswer, neededCount);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Для вопроса "${question}" и правильного ответа "${correctAnswer}" создай ${neededCount} правдоподобных НЕПРАВИЛЬНЫХ варианта ответа.

Требования:
1. Дистракторы должны быть связаны с темой вопроса
2. Они должны быть правдоподобными (чтобы студент мог их выбрать, если не знает материал)
3. Не должны быть слишком глупыми или очевидно неправильными
4. Не должны совпадать с правильным ответом
5. Каждый дистрактор - короткое предложение или фраза (максимум 15 слов)

Верни ТОЛЬКО JSON массив из ${neededCount} строк, например: ["дистрактор 1", "дистрактор 2", "дистрактор 3"]`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      let distractors = JSON.parse(jsonMatch[0]);
      if (Array.isArray(distractors)) {
        distractors = distractors.slice(0, neededCount);
        distractors = distractors.filter(d => d && d.trim().length > 5);
        
        if (distractors.length >= neededCount) {
          return distractors;
        }
        
        if (distractors.length > 0 && distractors.length < neededCount) {
          const remaining = neededCount - distractors.length;
          const fallback = generateContextualFallback(question, correctAnswer, remaining);
          distractors.push(...fallback);
          return distractors;
        }
      }
    }
    
    return generateContextualFallback(question, correctAnswer, neededCount);
    
  } catch (error) {
    console.error('Ошибка генерации дистракторов:', error);
    return generateContextualFallback(question, correctAnswer, neededCount);
  }
}

async function generateFlashcards(text) {
  console.log('Генерация карточек из текста длиной:', text.length);
  
  if (!text || text.trim().length === 0) {
    return [];
  }

  try {
    if (!GEMINI_API_KEY) {
      console.log('Нет API ключа, используем Regex');
      return extractTermsByRegex(text);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Извлеки из текста все пары "термин - определение".

ТЕКСТ:
${text.substring(0, 10000)}

ВАЖНОЕ ПРАВИЛО:
- ВОПРОС должен быть ПОЛНЫМ термином или фразой, как она написана в тексте
- ОТВЕТ должен быть ПОЛНЫМ определением, как оно написано в тексте
- НЕ ОБРЕЗАЙ И НЕ УКОРАЧИВАЙ текст
- Сохраняй оригинальное написание и пунктуацию

Пример правильного извлечения:
Если в тексте написано "ПЕРЕМЕННАЯ в программировании называется именованной областью памяти"
То question = "ПЕРЕМЕННАЯ в программировании"
А answer = "именованная область памяти, которая хранит значение определённого типа"

Верни ТОЛЬКО JSON массив.
Формат: [{"question": "полный термин", "answer": "полное определение"}, ...]

НЕ ПИШИ НИЧЕГО, КРОМЕ JSON!`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    let jsonMatch = response.match(/\[[\s\S]*\]/);
    let flashcards = [];
    
    if (jsonMatch) {
      try {
        flashcards = JSON.parse(jsonMatch[0]);
        console.log(`API вернул ${flashcards.length} карточек`);
      } catch(e) {
        console.log('Не удалось разобрать JSON:', e);
        flashcards = [];
      }
    }
    
    if (!flashcards || flashcards.length === 0) {
      console.log('API ничего не вернул, используем Regex');
      flashcards = extractTermsByRegex(text);
    }
    
    flashcards = flashcards.filter(card => {
      if (!card) return false;
      const q = card.question?.trim();
      const a = card.answer?.trim();
      return q && q.length > 0 && a && a.length > 0;
    });
    
    const seen = new Set();
    flashcards = flashcards.filter(card => {
      const key = card.question.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`Итог: ${flashcards.length} карточек`);
    return flashcards;
    
  } catch (error) {
    console.error('Ошибка API:', error);
    return extractTermsByRegex(text);
  }
}

//выражения для поиска определений в тексте для работы без API
function extractTermsByRegex(text) {
  console.log('Запуск извлечения через Regex...');
  const flashcards = [];
  
  const patterns = [
    {
      regex: /([^.!?]{5,80}?)\s*[-–—]\s*это\s+([^.!?]+[.!?]+)/gi,
      termGroup: 1,
      defGroup: 2
    },
    {
      regex: /([^.!?]{5,80}?)\s*называется\s+([^.!?]+[.!?]+)/gi,
      termGroup: 1,
      defGroup: 2
    },
    {
      regex: /([^.!?]{5,80}?)\s*означает\s+([^.!?]+[.!?]+)/gi,
      termGroup: 1,
      defGroup: 2
    },
    {
      regex: /Под\s+([^.!?]{5,80}?)\s*понимается\s+([^.!?]+[.!?]+)/gi,
      termGroup: 1,
      defGroup: 2
    },
    {
      regex: /([^.!?]{5,80}?)\s*—\s+([^.!?]+[.!?]+)/gi,
      termGroup: 1,
      defGroup: 2
    },
    {
      regex: /([^.!?]{5,80}?)\s*-\s+([^.!?]+[.!?]+)/gi,
      termGroup: 1,
      defGroup: 2
    },
    {
      regex: /([^.!?]{5,80}?)\s*является\s+([^.!?]+[.!?]+)/gi,
      termGroup: 1,
      defGroup: 2
    },
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      let term = match[pattern.termGroup].trim();
      let definition = match[pattern.defGroup].trim();
      
      term = term.replace(/^[^\wа-яё]+/i, '').replace(/[^\w\sа-яё\-–—]/gi, '').trim();
      definition = definition.replace(/^[^\wа-яё]+/i, '').trim();
      
      if (term.length > 0 && definition.length > 0) {
        const key = term.toLowerCase();
        if (!flashcards.some(f => f.question.toLowerCase() === key)) {
          flashcards.push({
            question: term,
            answer: definition
          });
        }
      }
    }
  }
  
  if (flashcards.length === 0) {
    console.log('Ни один паттерн не сработал, извлекаем предложения с ключевыми словами');
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const keywords = ['это', '—', '-', 'называется', 'является', 'представляет собой', 'означает', 'понимается'];
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 30) continue;
      
      for (const keyword of keywords) {
        const idx = trimmed.indexOf(keyword);
        if (idx > 5 && idx < 100) {
          let term = trimmed.substring(0, idx).trim();
          let definition = trimmed.substring(idx + keyword.length).trim();
          
          term = term.replace(/^[^\wа-яё]+/i, '').replace(/[,;:]/g, '').trim();
          definition = definition.replace(/^[^\wа-яё]+/i, '').trim();
          
          if (term.length > 2 && definition.length > 10) {
            flashcards.push({ question: term, answer: definition });
            break;
          }
        }
      }
      
      if (flashcards.length >= 50) break;
    }
  }
  
  console.log(`Regex извлёк ${flashcards.length} карточек`);
  return flashcards;
}

module.exports = { generateFlashcards, generateDistractors };
