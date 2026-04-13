// =========================================================
//  AkylFin AI — script.js
//  Хакатон FIN-FUTURE 2026
// =========================================================

// ---------------------------------------------------------
//  ПОРОГИ СТАТУСА БЮДЖЕТА (сом)
//  Меняй эти значения под нужную валюту и аудиторию
// ---------------------------------------------------------
const BUDGET_THRESHOLDS = {
  CRITICAL:  0,       // остаток <= 0               → Критический
  UNSTABLE:  5000,    // остаток > 0 и <= 5000       → Нестабильный
  NORMAL:    15000,   // остаток > 5000 и <= 15000   → Нормальный
  // остаток > 15000                                → Хороший
};

// Рекомендуемая доля накопления от остатка (30%)
const SAVING_RATE = 0.30;

// ---------------------------------------------------------
//  ПРИМЕР ДАННЫХ — меняй под нужный сценарий
// ---------------------------------------------------------
const EXAMPLE_DATA = {
  income:            50000,
  expenseFood:       12000,
  expenseTransport:   5000,
  expensePhone:       2000,
  expenseFun:         5000,
  expenseEdu:         8000,
  expenseOther:       3000,
  goalName:          'Ноутбук',
  goalCost:          150000,
};

// ---------------------------------------------------------
//  ХРАНИЛИЩЕ ТЕКУЩИХ РАСЧЁТОВ
//  Используется чат-ботом и блоком советов
// ---------------------------------------------------------
let currentFinancials = {
  income:        0,
  totalExpenses: 0,
  balance:       0,
  goalName:      '',
  goalCost:      0,
  monthsToGoal:  null,
  isCalculated:  false,
};


// =========================================================
//  УТИЛИТЫ
// =========================================================

/*
  Форматирует число как сумму в сомах: 50000 → «50 000 сом»
*/
function formatMoney(amount) {
  return amount.toLocaleString('ru-RU') + ' сом';
}

/**
 * Показывает блок ошибки с заданным текстом.
 */
function showError(message) {
  const errorBlock = document.getElementById('error-message');
  const errorText  = document.getElementById('error-text');
  errorText.textContent = message;
  errorBlock.classList.remove('hidden');
  // Через 5 секунд сообщение исчезнет само
  setTimeout(() => errorBlock.classList.add('hidden'), 5000);
}

/**
 * Скрывает блок ошибки.
 */
function hideError() {
  document.getElementById('error-message').classList.add('hidden');
}

/**
 * Считывает числовое значение из поля ввода.
 * Возвращает 0, если поле пустое; null, если значение отрицательное.
 */
function readNumber(fieldId) {
  const value = parseFloat(document.getElementById(fieldId).value);
  if (isNaN(value)) return 0;
  if (value < 0)    return null; // сигнал об ошибке
  return value;
}

/**
 * Плавно показывает элемент (убирает класс hidden + добавляет анимацию).
 */
function showElement(elementId) {
  const el = document.getElementById(elementId);
  el.classList.remove('hidden');
}

/**
 * Скрывает элемент.
 */
function hideElement(elementId) {
  document.getElementById(elementId).classList.add('hidden');
}


// =========================================================
//  ВАЛИДАЦИЯ
// =========================================================

/**
 * Проверяет все входные данные.
 * Возвращает { valid: true } или { valid: false, message: '...' }.
 */
function validateInputs() {
  const incomeRaw = document.getElementById('income').value.trim();

  // Доход обязателен
  if (incomeRaw === '') {
    return { valid: false, message: 'Введи ежемесячный доход — это обязательное поле.' };
  }

  const income = parseFloat(incomeRaw);
  if (isNaN(income) || income < 0) {
    return { valid: false, message: 'Доход должен быть положительным числом.' };
  }
  if (income === 0) {
    return { valid: false, message: 'Доход не может быть равен нулю.' };
  }

  // Все числовые поля расходов не должны быть отрицательными
  const expenseFields = [
    'expense-food', 'expense-transport', 'expense-phone',
    'expense-fun',  'expense-edu',       'expense-other',
  ];
  for (const fieldId of expenseFields) {
    const raw = document.getElementById(fieldId).value.trim();
    if (raw !== '' && parseFloat(raw) < 0) {
      return { valid: false, message: 'Расходы не могут быть отрицательными числами.' };
    }
  }

  // Стоимость цели: если название введено, то и стоимость обязательна
  const goalName = document.getElementById('goal-name').value.trim();
  const goalCostRaw = document.getElementById('goal-cost').value.trim();

  if (goalName !== '' && goalCostRaw === '') {
    return { valid: false, message: 'Ты указал название цели, но не указал её стоимость.' };
  }
  if (goalCostRaw !== '') {
    const goalCost = parseFloat(goalCostRaw);
    if (isNaN(goalCost) || goalCost <= 0) {
      return { valid: false, message: 'Стоимость цели должна быть положительным числом.' };
    }
  }

  return { valid: true };
}


// =========================================================
//  ОСНОВНОЙ РАСЧЁТ
// =========================================================

/**
 * Считывает данные из формы и возвращает объект с результатами.
 */
function calculateFinancials() {
  const income = parseFloat(document.getElementById('income').value) || 0;

  const food      = parseFloat(document.getElementById('expense-food').value)      || 0;
  const transport = parseFloat(document.getElementById('expense-transport').value) || 0;
  const phone     = parseFloat(document.getElementById('expense-phone').value)     || 0;
  const fun       = parseFloat(document.getElementById('expense-fun').value)       || 0;
  const edu       = parseFloat(document.getElementById('expense-edu').value)       || 0;
  const other     = parseFloat(document.getElementById('expense-other').value)     || 0;

  const goalName = document.getElementById('goal-name').value.trim();
  const goalCost = parseFloat(document.getElementById('goal-cost').value) || 0;

  // Суммируем расходы
  const totalExpenses = food + transport + phone + fun + edu + other;

  // Остаток
  const balance = income - totalExpenses;

  // Рекомендуемое накопление в месяц (30% от остатка, если остаток > 0)
  const recommendedSaving = balance > 0 ? Math.round(balance * SAVING_RATE) : 0;

  // Месяцев до цели
  let monthsToGoal = null;
  if (goalCost > 0 && balance > 0) {
    monthsToGoal = Math.ceil(goalCost / recommendedSaving);
  }

  return {
    income,
    totalExpenses,
    balance,
    recommendedSaving,
    goalName,
    goalCost,
    monthsToGoal,
  };
}

/**
 * Определяет статус бюджета по остатку.
 * Возвращает объект { key, label, icon }.
 */
function getBudgetStatus(balance) {
  if (balance <= BUDGET_THRESHOLDS.CRITICAL) {
    return { key: 'critical',  label: 'Критический',  icon: '🔴' };
  }
  if (balance <= BUDGET_THRESHOLDS.UNSTABLE) {
    return { key: 'unstable',  label: 'Нестабильный', icon: '🟡' };
  }
  if (balance <= BUDGET_THRESHOLDS.NORMAL) {
    return { key: 'normal',    label: 'Нормальный',   icon: '🔵' };
  }
  return     { key: 'good',    label: 'Хороший',      icon: '🟢' };
}


// =========================================================
//  ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА
// =========================================================

/**
 * Вставляет результаты расчёта в DOM.
 */
function renderResult(data) {
  const { income, totalExpenses, balance, recommendedSaving, goalName, goalCost, monthsToGoal } = data;
  const status = getBudgetStatus(balance);

  // Скрываем пустой экран, показываем результаты
  hideElement('result-empty');
  showElement('result-content');

  // Основные цифры
  document.getElementById('res-income').textContent   = formatMoney(income);
  document.getElementById('res-expenses').textContent = formatMoney(totalExpenses);

  const balanceEl = document.getElementById('res-balance');
  balanceEl.textContent = formatMoney(balance);
  balanceEl.className = 'result-item__value';
  if (balance < 0) balanceEl.classList.add('result-item__value--negative');

  document.getElementById('res-saving').textContent =
    balance > 0 ? formatMoney(recommendedSaving) : 'Накопление недоступно';

  // Блок цели
  if (goalName || goalCost > 0) {
    document.getElementById('res-goal-name').textContent = goalName || '—';

    if (monthsToGoal !== null) {
      const years  = Math.floor(monthsToGoal / 12);
      const months = monthsToGoal % 12;
      let monthLabel = `${monthsToGoal} мес.`;
      if (years > 0) {
        monthLabel = `${years} г. ${months > 0 ? months + ' мес.' : ''}`;
      }
      document.getElementById('res-goal-months').textContent = monthLabel;
    } else {
      document.getElementById('res-goal-months').textContent =
        balance <= 0 ? 'Цель недостижима сейчас' : 'Укажи стоимость цели';
    }
  } else {
    document.getElementById('res-goal-name').textContent   = 'Не указана';
    document.getElementById('res-goal-months').textContent = '—';
  }

  // Статус бюджета
  const badge = document.getElementById('status-badge');
  badge.className = `status-badge status-badge--${status.key}`;
  document.getElementById('status-icon').textContent = status.icon;
  document.getElementById('status-text').textContent = `Статус: ${status.label}`;
}


// =========================================================
//  ГЕНЕРАЦИЯ AI-СОВЕТА
// =========================================================

/**
 * Генерирует текст совета и список конкретных рекомендаций
 * на основе финансовых данных.
 */
function generateAdvice(data) {
  const { income, totalExpenses, balance, recommendedSaving, goalName, goalCost, monthsToGoal } = data;
  const expenseRatio = income > 0 ? totalExpenses / income : 1; // доля расходов от дохода

  let mainText = '';
  const tips   = [];

  // --- Главный текст в зависимости от ситуации ---
  if (balance <= 0) {
    mainText = `⚠️ Твои расходы превышают доход на ${formatMoney(Math.abs(balance))}. 
      Это серьёзная ситуация: в таком режиме невозможно накопить и легко залезть в долги. 
      Нужно срочно пересмотреть бюджет.`;
  } else if (expenseRatio > 0.85) {
    mainText = `Ты тратишь ${Math.round(expenseRatio * 100)}% своего дохода — это очень высокая нагрузка. 
      Остаток ${formatMoney(balance)} почти не оставляет пространства для накопления. 
      Постарайся найти статьи расходов, которые можно сократить.`;
  } else if (expenseRatio > 0.65) {
    mainText = `Ты тратишь ${Math.round(expenseRatio * 100)}% дохода. Ситуация рабочая, но нестабильная. 
      Остаток ${formatMoney(balance)} — небольшой буфер. 
      Если оптимизировать хотя бы одну статью расходов, накопление пойдёт значительно быстрее.`;
  } else {
    mainText = `Отличная финансовая дисциплина! Ты тратишь только ${Math.round(expenseRatio * 100)}% дохода, 
      и у тебя остаётся ${formatMoney(balance)} каждый месяц. 
      Рекомендую откладывать ${formatMoney(recommendedSaving)} в месяц — это 30% от остатка.`;
  }

  // Дополняем текст советом про цель
  if (goalName && goalCost > 0) {
    if (balance <= 0) {
      mainText += ` Накопить на «${goalName}» в текущей ситуации не получится — сначала нужно выровнять бюджет.`;
    } else if (monthsToGoal !== null && monthsToGoal <= 3) {
      mainText += ` Цель «${goalName}» за ${formatMoney(goalCost)} очень близко — всего ${monthsToGoal} мес. при откладывании ${formatMoney(recommendedSaving)}/мес. Ты почти у цели! 🎉`;
    } else if (monthsToGoal !== null && monthsToGoal <= 12) {
      mainText += ` На «${goalName}» за ${formatMoney(goalCost)} ты накопишь примерно за ${monthsToGoal} мес. — реальная и достижимая цель!`;
    } else if (monthsToGoal !== null) {
      mainText += ` До «${goalName}» (${formatMoney(goalCost)}) ещё ${monthsToGoal} мес. Рассмотри возможность увеличить доход или сократить расходы, чтобы ускорить накопление.`;
    }
  }

  // --- Конкретные советы-чипы ---
  const fun   = parseFloat(document.getElementById('expense-fun').value)   || 0;
  const food  = parseFloat(document.getElementById('expense-food').value)  || 0;
  const other = parseFloat(document.getElementById('expense-other').value) || 0;

  if (fun > income * 0.15) {
    tips.push({ icon: '🎮', text: `Расходы на развлечения (${formatMoney(fun)}) составляют больше 15% дохода. Попробуй сократить на 20–30% — бесплатные активности тоже дают радость.` });
  }

  if (food > income * 0.30) {
    tips.push({ icon: '🍔', text: `Еда (${formatMoney(food)}) занимает больше 30% дохода. Готовка дома вместо кафе может сэкономить до 30–40% этих расходов.` });
  }

  if (other > income * 0.10) {
    tips.push({ icon: '📦', text: `Категория «Другое» (${formatMoney(other)}) достаточно большая. Запиши, на что именно уходят эти деньги — возможно, часть расходов можно убрать.` });
  }

  if (balance > 0 && recommendedSaving > 0) {
    tips.push({ icon: '🏦', text: `Автоматически откладывай ${formatMoney(recommendedSaving)} в день зарплаты. Деньги, которые ты не видишь — деньги, которые ты не тратишь.` });
  }

  if (balance > income * 0.25) {
    tips.push({ icon: '📈', text: `У тебя хороший остаток. Рассмотри депозит или накопительный счёт — даже 8–12% годовых заметно ускорят накопление на цель.` });
  }

  if (balance <= 0) {
    tips.push({ icon: '🛑', text: `Первый шаг — найти хотя бы одну статью расходов, которую можно уменьшить. Даже экономия 1 000–2 000 ₸ в месяц — уже движение вперёд.` });
    tips.push({ icon: '💡', text: `Подумай о дополнительном источнике дохода: подработка, фриланс, продажа ненужных вещей.` });
  }

  // Если советов нет — добавим один общий
  if (tips.length === 0) {
    tips.push({ icon: '✅', text: 'Твой бюджет выглядит сбалансированно. Продолжай в том же духе и придерживайся плана накопления!' });
  }

  return { mainText, tips };
}

/**
 * Вставляет сгенерированный совет в DOM.
 */
function renderAdvice(data) {
  const { mainText, tips } = generateAdvice(data);

  hideElement('advice-empty');
  showElement('advice-content');

  document.getElementById('advice-text').textContent = mainText;

  const tipsContainer = document.getElementById('advice-tips');
  tipsContainer.innerHTML = '';
  tips.forEach(tip => {
    const tipEl = document.createElement('div');
    tipEl.className = 'advice-tip';
    tipEl.innerHTML = `
      <span class="advice-tip__icon">${tip.icon}</span>
      <span>${tip.text}</span>
    `;
    tipsContainer.appendChild(tipEl);
  });
}


// =========================================================
//  ЧАТ-БОТ
// =========================================================

/**
 * Добавляет сообщение в чат-бокс.
 * type: 'user' | 'bot'
 */
function appendChatMessage(text, type) {
  const chatBox = document.getElementById('chat-box');

  const messageEl = document.createElement('div');
  messageEl.className = `chat-message chat-message--${type}`;

  const avatar = type === 'bot' ? '🤖' : '👤';
  messageEl.innerHTML = `
    <span class="chat-avatar">${avatar}</span>
    <div class="chat-bubble">${text}</div>
  `;

  chatBox.appendChild(messageEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Анализирует вопрос пользователя и возвращает ответ.
 * Всё работает локально, без интернета.
 */
function getBotAnswer(question) {
  const q = question.toLowerCase().trim();
  const fin = currentFinancials;

  // Если расчёт ещё не производился
  if (!fin.isCalculated) {
    return 'Сначала введи свои данные и нажми «Рассчитать» — тогда я смогу дать тебе персональный ответ.';
  }

  // --- Блоки распознавания вопросов ---

  // Накопить быстрее
  if (q.includes('накопить быстрее') || q.includes('быстро накопить') || q.includes('ускорить накопление')) {
    if (fin.balance <= 0) {
      return `Сейчас расходы превышают доход на ${formatMoney(Math.abs(fin.balance))}. Быстрее накопить не получится — сначала нужно выйти в плюс. Попробуй сократить необязательные расходы (развлечения, другое).`;
    }
    const faster = Math.round(fin.balance * 0.5);
    return `Если откладывать не 30%, а 50% от остатка (${formatMoney(faster)}/мес.), срок до цели сократится почти вдвое. Также можно найти подработку: даже 5 000–10 000 ₸ дополнительного дохода заметно ускорят накопление.`;
  }

  // Мало денег
  if (q.includes('мало денег') || q.includes('почему мало') || q.includes('не хватает')) {
    const ratio = fin.income > 0 ? Math.round((fin.totalExpenses / fin.income) * 100) : 100;
    return `Ты тратишь ${ratio}% дохода. ${ratio > 80 ? 'Это очень высокая нагрузка.' : 'Запас есть, но небольшой.'} Посмотри на расходы по категориям: обычно "утечку" находят в развлечениях и категории "другое".`;
  }

  // Накопить на цель
  if (q.includes('накопить на цель') || q.includes('смогу накопить') || q.includes('достигну цели') || q.includes('смогу ли')) {
    if (!fin.goalName && fin.goalCost === 0) {
      return 'Ты не указал финансовую цель. Введи её в форму — и я скажу, реально ли накопить.';
    }
    if (fin.balance <= 0) {
      return `На цель «${fin.goalName || 'твою цель'}» сейчас накопить не получается — расходы превышают доход. Нужно сначала выровнять бюджет.`;
    }
    if (fin.monthsToGoal !== null) {
      return `Да! На «${fin.goalName}» за ${formatMoney(fin.goalCost)} ты накопишь примерно за ${fin.monthsToGoal} мес., если откладывать по ${formatMoney(Math.round(fin.balance * SAVING_RATE))}/мес. Это реально!`;
    }
    return 'Укажи стоимость цели в форме — тогда я точно скажу, когда ты её достигнешь.';
  }

  // Сократить расходы
  if (q.includes('сократить расходы') || q.includes('уменьшить расходы') || q.includes('экономить')) {
    const fun   = parseFloat(document.getElementById('expense-fun').value)   || 0;
    const food  = parseFloat(document.getElementById('expense-food').value)  || 0;
    const other = parseFloat(document.getElementById('expense-other').value) || 0;

    let advice = 'Вот что могу посоветовать: ';
    const suggestions = [];
    if (fun > 0)   suggestions.push(`сократи развлечения (сейчас ${formatMoney(fun)}) хотя бы на 20%`);
    if (food > 0)  suggestions.push(`готовь дома — еда (${formatMoney(food)}) обойдётся дешевле`);
    if (other > 0) suggestions.push(`разберись, куда уходят деньги в категории "Другое" (${formatMoney(other)})`);

    if (suggestions.length === 0) {
      return 'Расходы у тебя небольшие — молодец! Дальше можно думать об увеличении дохода.';
    }
    return advice + suggestions.join('; ') + '.';
  }

  // Расходы больше дохода
  if (q.includes('расходы больше') || q.includes('дефицит') || q.includes('трачу больше') || q.includes('больше дохода')) {
    if (fin.balance > 0) {
      return `У тебя доход больше расходов — остаток ${formatMoney(fin.balance)}. Ситуация нормальная! Если ощущение "денег не хватает" всё равно есть — значит, трата происходит незаметно. Попробуй вести дневник расходов несколько дней.`;
    }
    return `Да, сейчас дефицит: ${formatMoney(Math.abs(fin.balance))}. Два шага: 1) найди категорию с самым большим расходом и сократи на 15–20%; 2) подумай о любом дополнительном заработке. Даже маленькие изменения через месяц дадут результат.`;
  }

  // Что такое бюджет / как планировать
  if (q.includes('что такое бюджет') || q.includes('как планировать') || q.includes('с чего начать')) {
    return 'Бюджет — это план: сколько денег приходит и куда они уходят. Начни просто: запиши все расходы за неделю. Ты удивишься, куда уходят деньги. Потом раздели расходы на "важные" и "необязательные" — и сократи вторые на 20%.';
  }

  // Поздравление / хорошая ситуация
  if (q.includes('всё хорошо') || q.includes('у меня хороший бюджет') || q.includes('молодец')) {
    return fin.balance > BUDGET_THRESHOLDS.NORMAL
      ? `Да, твой бюджет выглядит хорошо! Остаток ${formatMoney(fin.balance)} — это солидная подушка. Следующий шаг — заставить деньги работать: депозит, накопительный счёт или инвестиции.`
      : 'Ты на правильном пути! Продолжай следить за расходами и придерживайся плана накопления.';
  }

  // Привет / начало разговора
  if (q.includes('привет') || q.includes('здравствуй') || q.includes('hi') || q.includes('hello')) {
    return 'Привет! 👋 Я AkylFin AI. Задай мне вопрос о своём бюджете, накоплениях или расходах — постараюсь помочь!';
  }

  // Спасибо
  if (q.includes('спасибо') || q.includes('благодарю') || q.includes('thanks')) {
    return 'Пожалуйста! 😊 Если появятся ещё вопросы — спрашивай. Удачи с финансами!';
  }

  // Вопрос не распознан
  return `Хороший вопрос! Я пока понимаю вопросы о накоплениях, расходах, цели и бюджете. Попробуй переформулировать или нажми на одну из подсказок ниже.`;
}


// =========================================================
//  ОБРАБОТЧИКИ КНОПОК
// =========================================================

/**
 * Кнопка «Рассчитать»
 */
function handleCalculate() {
  hideError();

  // Валидация
  const validation = validateInputs();
  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  // Расчёт
  const data = calculateFinancials();

  // Сохраняем в глобальное хранилище для чат-бота
  currentFinancials = {
    income:        data.income,
    totalExpenses: data.totalExpenses,
    balance:       data.balance,
    goalName:      data.goalName,
    goalCost:      data.goalCost,
    monthsToGoal:  data.monthsToGoal,
    isCalculated:  true,
  };

  // Отображаем результат и совет
  renderResult(data);
  renderAdvice(data);
}

/**
 * Кнопка «Показать совет AI»
 */
function handleShowAdvice() {
  if (!currentFinancials.isCalculated) {
    // Сначала запускаем расчёт
    handleCalculate();
    return;
  }
  const data = calculateFinancials();
  renderAdvice(data);
}

/**
 * Кнопка «Заполнить пример»
 */
function handleFillExample() {
  document.getElementById('income').value            = EXAMPLE_DATA.income;
  document.getElementById('expense-food').value      = EXAMPLE_DATA.expenseFood;
  document.getElementById('expense-transport').value = EXAMPLE_DATA.expenseTransport;
  document.getElementById('expense-phone').value     = EXAMPLE_DATA.expensePhone;
  document.getElementById('expense-fun').value       = EXAMPLE_DATA.expenseFun;
  document.getElementById('expense-edu').value       = EXAMPLE_DATA.expenseEdu;
  document.getElementById('expense-other').value     = EXAMPLE_DATA.expenseOther;
  document.getElementById('goal-name').value         = EXAMPLE_DATA.goalName;
  document.getElementById('goal-cost').value         = EXAMPLE_DATA.goalCost;

  hideError();
  // Автоматически считаем после подстановки
  handleCalculate();
}

/**
 * Кнопка «Очистить»
 */
function handleClear() {
  // Очищаем все поля формы
  const fieldIds = [
    'income', 'expense-food', 'expense-transport',
    'expense-phone', 'expense-fun', 'expense-edu',
    'expense-other', 'goal-name', 'goal-cost',
  ];
  fieldIds.forEach(id => { document.getElementById(id).value = ''; });

  // Сбрасываем хранилище
  currentFinancials = {
    income: 0, totalExpenses: 0, balance: 0,
    goalName: '', goalCost: 0, monthsToGoal: null,
    isCalculated: false,
  };

  // Возвращаем пустые экраны
  hideElement('result-content');
  showElement('result-empty');
  hideElement('advice-content');
  showElement('advice-empty');
  hideError();

  // Сбрасываем чат до начального состояния
  document.getElementById('chat-box').innerHTML = `
    <div class="chat-message chat-message--bot">
      <span class="chat-avatar">🤖</span>
      <div class="chat-bubble">
        Привет! Я AkylFin AI. Введи свои данные и задай мне вопрос о финансах. 
        Например: <em>«Как накопить быстрее?»</em> или <em>«Что делать если расходы больше дохода?»</em>
      </div>
    </div>
  `;
  document.getElementById('chat-input').value = '';
}

/**
 * Кнопка «Спросить» в чате
 */
function handleChatSend() {
  const inputEl = document.getElementById('chat-input');
  const question = inputEl.value.trim();

  if (!question) return;

  // Добавляем вопрос пользователя
  appendChatMessage(question, 'user');
  inputEl.value = '';

  // Небольшая задержка для имитации "думает"
  setTimeout(() => {
    const answer = getBotAnswer(question);
    appendChatMessage(answer, 'bot');
  }, 350);
}

/**
 * Нажатие Enter в поле чата
 */
function handleChatKeydown(event) {
  if (event.key === 'Enter') {
    handleChatSend();
  }
}

/**
 * Чипы-подсказки
 */
function askSuggestion(question) {
  document.getElementById('chat-input').value = question;
  handleChatSend();
}
