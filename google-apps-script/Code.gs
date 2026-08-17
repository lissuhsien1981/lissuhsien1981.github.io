const SHEET_ID = '1bOALXfJiVJotOzz34MFrVMn6r7e45u__P-cStSS6F0U';
const SECRET = 'fitcoach-secret-2026';

// Pinned on purpose. The gemini-flash-lite-latest alias gets hot-swapped by
// Google with every Flash-Lite release, which is how the food AI kept breaking
// without anything here changing. Bump this deliberately, never implicitly.
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

// Asking for this schema back makes the model emit bare JSON, so we no longer
// depend on it choosing not to wrap the answer in a markdown fence.
const FOOD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    description: {type: 'STRING'},
    calories: {type: 'NUMBER'},
    protein: {type: 'NUMBER'},
    carbs: {type: 'NUMBER'},
    fat: {type: 'NUMBER'}
  },
  required: ['description', 'calories', 'protein', 'carbs', 'fat']
};

// ─── RUN THIS ONCE TO SET UP ALL SHEETS ───────────────────────────────────
function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const sheets = [
    {name: 'Training Plan', headers: ['Week','Day','Exercise','Sets','Reps','WeightTarget','Notes']},
    {name: 'Workout Log',   headers: ['Date','DayType','Exercise','SetNum','Weight','Reps','ExtraSet','Notes']},
    {name: 'Body Metrics',  headers: ['Date','Weight','BodyFat','Notes']},
    {name: 'Food Log',      headers: ['Date','Meal','Description','Calories','Protein','Carbs','Fat','WaterIntake']},
    {name: 'Apple Watch',   headers: ['Date','WorkoutType','Duration','Calories','AvgHR','MaxHR','SleepDuration','SleepQuality']}
  ];

  sheets.forEach(({name, headers}) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  });

  // Remove default sheet if still there
  ['Sheet1','工作表1'].forEach(n => {
    const s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  // Add sample Monday workout
  const plan = ss.getSheetByName('Training Plan');
  if (plan.getLastRow() < 2) {
    plan.getRange(2, 1, 5, 7).setValues([
      [1,'腿日','Squat 深蹲',4,8,60,'恢復期，專注技術'],
      [1,'腿日','Leg Press 腿推',4,12,100,''],
      [1,'腿日','RDL 羅馬尼亞硬舉',3,10,50,''],
      [1,'腿日','Leg Curl 腿彎舉',3,15,0,''],
      [1,'腿日','Leg Extension 腿伸展',3,15,0,'']
    ]);
  }

  Logger.log('✅ Setup complete!');
}

// ─── RUN THIS ONCE TO POPULATE WEEK 1 TRAINING PLAN ──────────────────────────
function populatePlan() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const plan = ss.getSheetByName('Training Plan');

  // Clear existing data (keep header row)
  const lastRow = plan.getLastRow();
  if (lastRow > 1) plan.getRange(2, 1, lastRow - 1, 7).clearContent();

  const rows = [
    // 腿日
    [1,'腿日','Squat 深蹲',4,8,60,'恢復期，專注技術'],
    [1,'腿日','Leg Press 腿推',4,12,100,''],
    [1,'腿日','Romanian Deadlift 羅馬尼亞硬舉',3,10,50,''],
    [1,'腿日','Leg Curl 腿彎舉',3,15,0,'輕重量，感受肌肉'],
    [1,'腿日','Leg Extension 腿伸展',3,15,0,''],
    [1,'腿日','Calf Raise 小腿提踵',4,20,0,''],

    // 胸三（胸+三頭）
    [1,'胸三','Bench Press 臥推',4,8,60,'專注胸肌收縮'],
    [1,'胸三','Incline DB Press 上斜啞鈴推',3,10,20,'每手'],
    [1,'胸三','Cable Fly 繩索夾胸',3,15,0,'頂峰收縮停頓'],
    [1,'胸三','Dips 撐體',3,10,0,'體重'],
    [1,'胸三','Tricep Pushdown 三頭下壓',3,15,0,''],
    [1,'胸三','Overhead Tricep Extension 過頭三頭伸展',3,12,0,''],

    // 背二（背+二頭）
    [1,'背二','Pull-up 引體向上',4,6,0,'體重，做到力竭'],
    [1,'背二','Barbell Row 槓鈴划船',4,8,50,''],
    [1,'背二','Lat Pulldown 高拉',3,12,60,''],
    [1,'背二','Seated Cable Row 坐姿繩索划船',3,12,50,''],
    [1,'背二','Barbell Curl 槓鈴彎舉',3,10,30,''],
    [1,'背二','Hammer Curl 錘式彎舉',3,12,14,'每手'],

    // 肩核（肩+核心）
    [1,'肩核','Overhead Press 肩推',4,8,40,'固定 40kg，不追加重'],
    [1,'肩核','Lateral Raise 側平舉',4,15,8,'每手，控制離心'],
    [1,'肩核','Front Raise 前平舉',3,12,8,'每手'],
    [1,'肩核','Face Pull 臉拉',3,15,0,'繩索，肘高於肩'],
    [1,'肩核','Plank 棒式',3,60,0,'秒，穩定核心'],
    [1,'肩核','Ab Wheel 健腹輪',3,10,0,''],

    // 有氧1（有氧輕腿）
    [1,'有氧1','Treadmill Zone2 跑步機有氧',1,45,0,'分鐘，心率 130-145 bpm'],
    [1,'有氧1','Walking Lunge 行走弓箭步',3,12,0,'每腿，體重'],
    [1,'有氧1','Hip Thrust 臀橋',3,15,40,''],
    [1,'有氧1','Step-up 登階',3,10,0,'每腿，體重'],

    // 有氧2（有氧輕上）
    [1,'有氧2','Treadmill Zone2 跑步機有氧',1,40,0,'分鐘，心率 130-145 bpm'],
    [1,'有氧2','Push-up 伏地挺身',3,15,0,'體重'],
    [1,'有氧2','DB Row 啞鈴划船',3,12,16,'每手'],
    [1,'有氧2','Face Pull 臉拉',3,15,0,''],
  ];

  plan.getRange(2, 1, rows.length, 7).setValues(rows);
  Logger.log('✅ Week 1 plan populated: ' + rows.length + ' exercises across 6 days');
}

// ─── RUN THIS ONCE TO APPEND WEEK 3 PPL PLAN (Jeff Nippard 動作選擇/分化邏輯，固定重量) ──
// 復健期考量：肩/膝/下背為活動角度、動作協調、穩定性問題（非結構性禁忌，非結構損傷）
// → 已有實績的動作（Squat/Barbell Row/Bench Press/OHP/Dips 全程）沿用原版，維持固定重量離心3秒控制
// → 只在真正新增/無實績的動作上選機械/繩索等軌道可控版本；下背相關的核心動作改用 Dead Bug/Pallof Press（抗旋轉，較無脊椎屈曲負荷）
// WeightTarget 全部留 0，Sam 自行填入起跑重量
function populatePlanWeek3_PPL() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const plan = ss.getSheetByName('Training Plan');

  const rows = [
    // 推A（肩部角度友善版本）
    [3,'推A','DB Overhead Press 啞鈴肩推',3,8,0,'每手，固定重量，離心3秒控制'],
    [3,'推A','Incline DB Press 上斜啞鈴推',3,8,0,'每手，肩胛穩定，避免底部過度伸展'],
    [3,'推A','Cable Fly 繩索夾胸',3,12,0,'行程可控，頂峰收縮停頓'],
    [3,'推A','Dips 撐體',3,10,0,'全程，離心3秒控制'],
    [3,'推A','Cable Tricep Pushdown 三頭下壓',3,12,0,''],
    [3,'推A','Cable Lateral Raise 繩索側平舉',3,12,0,'每邊，輕重量，控制離心'],

    // 拉A（下背友善版本）
    [3,'拉A','Barbell Row 槓鈴划船',3,8,0,'離心3秒控制，下背中立'],
    [3,'拉A','Lat Pulldown 高拉',3,10,0,'垂直路徑，肩部友善'],
    [3,'拉A','Cable Pullover 繩索背闊拉',3,12,0,'控制行程，不甩動'],
    [3,'拉A','Face Pull 臉拉',3,15,0,'肘高於肩，肩關節穩定訓練'],
    [3,'拉A','Hammer Curl 錘式彎舉',3,10,0,'每手'],
    [3,'拉A','Incline DB Curl 上斜啞鈴彎舉',3,10,0,'每手'],

    // 腿A（膝部友善版本）
    [3,'腿A','Leg Press 腿推',3,12,0,'控制深度不過度屈膝，離心3秒'],
    [3,'腿A','Leg Extension 腿伸展',3,12,0,'輕中重量，控制行程避免甩動'],
    [3,'腿A','Seated Leg Curl 坐姿腿彎舉',3,10,0,''],
    [3,'腿A','Hip Thrust 臀橋',3,12,0,'下背友善的髖伸訓練'],
    [3,'腿A','Standing Calf Raise 站姿提踵',3,12,0,''],
    [3,'腿A','Dead Bug 死蟲式',3,10,0,'每邊，脊椎中立核心穩定，取代負重捲腹'],

    // 推B
    [3,'推B','Bench Press 臥推',3,8,0,'中等重量不追極限，離心3秒'],
    [3,'推B','Low-to-High Cable Crossover 繩索下對上夾胸',3,10,0,''],
    [3,'推B','Overhead Tricep Extension 過頭三頭伸展',3,10,0,'注意肩部活動角度'],
    [3,'推B','DB Lateral Raise 21s 啞鈴側平舉21式',2,21,0,'下半程7+上半程7+全程7，輕重量'],
    [3,'推B','Egyptian Cable Lateral Raise 埃及式繩索側平舉',3,12,0,'每邊，肩部穩定加強'],

    // 拉B
    [3,'拉B','Omni-Grip Lat Pulldown 多握距高拉',3,10,0,'每組換握距'],
    [3,'拉B','Seated Cable Row 坐姿划船',3,10,0,''],
    [3,'拉B','Rope Face Pull 繩索臉拉',3,15,0,''],
    [3,'拉B','Incline DB Shrug 上斜啞鈴聳肩',3,10,0,''],
    [3,'拉B','DB Rear Delt Fly 啞鈴反向飛鳥',3,12,0,''],
    [3,'拉B','Cable Curl 繩索彎舉',3,10,0,''],

    // 腿B（下背友善版本，用 RDL 取代 Sumo Deadlift）
    [3,'腿B','Romanian Deadlift 羅馬尼亞硬舉',3,8,0,'下背友善，控制行程不衝重量'],
    [3,'腿B','Squat 深蹲',3,8,0,'離心3秒控制，深度依當天狀況調整'],
    [3,'腿B','Unilateral Hip Thrust 單腳臀橋',2,12,0,'每邊'],
    [3,'腿B','Lying Leg Curl 俯臥腿彎舉',2,10,0,''],
    [3,'腿B','Seated Calf Raise 坐姿提踵',3,12,0,''],
    [3,'腿B','Pallof Press 帕洛夫推',3,10,0,'每邊，抗旋轉核心穩定，脊椎友善'],
  ];

  plan.getRange(plan.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  Logger.log('✅ Week 3 PPL plan appended: ' + rows.length + ' exercises across 6 days');
}

function doGet(e) {
  if (e.parameter.token !== SECRET) return json({error: 'Unauthorized'});
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const action = e.parameter.action;
  if (action === 'getTodayWorkout') return getTodayWorkout(ss, e.parameter.day);
  if (action === 'getStats') return getStats(ss);
  if (action === 'getHistory') return getHistory(ss);
  if (action === 'getTodayFood') return getTodayFood(ss, e.parameter.date);
  if (action === 'getExerciseLog') return getExerciseLog(ss, e.parameter.exercise, e.parameter.limit);
  return json({error: 'Unknown action'});
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.token !== SECRET) return json({error: 'Unauthorized'});
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (data.action === 'logSet') return logSet(ss, data);
  if (data.action === 'logBody') return logBody(ss, data);
  if (data.action === 'logFood') return logFood(ss, data);
  if (data.action === 'logWatch') return logWatch(ss, data);
  if (data.action === 'analyzeFood') return analyzeFood(data);
  if (data.action === 'recognizeFoodImage') return recognizeFoodImage(data);
  return json({error: 'Unknown action'});
}

function getTodayWorkout(ss, day) {
  const rows = ss.getSheetByName('Training Plan').getDataRange().getValues().slice(1);
  const exercises = rows
    .filter(r => r[1] === day)
    .map(r => ({exercise: r[2], sets: r[3], reps: r[4], weightTarget: r[5], notes: r[6]}));
  return json(exercises);
}

function logSet(ss, data) {
  ss.getSheetByName('Workout Log').appendRow([
    data.date, data.dayType, data.exercise,
    data.setNum, data.weight, data.reps,
    data.extraSet || false, data.notes || ''
  ]);
  return json({success: true});
}

function logBody(ss, data) {
  ss.getSheetByName('Body Metrics').appendRow([
    data.date, data.weight, data.bodyFat || '', data.notes || ''
  ]);
  return json({success: true});
}

function logFood(ss, data) {
  ss.getSheetByName('Food Log').appendRow([
    data.date, data.meal, data.description,
    data.calories || '', data.protein || '',
    data.carbs || '', data.fat || '', data.waterIntake || ''
  ]);
  return json({success: true});
}

function logWatch(ss, data) {
  ss.getSheetByName('Apple Watch').appendRow([
    data.date, data.workoutType || '', Number(data.duration) || '',
    Number(data.calories) || '', Number(data.avgHR) || '', Number(data.maxHR) || '',
    Number(data.sleepDuration) || '', data.sleepQuality || ''
  ]);
  return json({success: true});
}

function getTodayFood(ss, date) {
  const tz = Session.getScriptTimeZone();
  const rows = ss.getSheetByName('Food Log').getDataRange().getValues().slice(1);
  const entries = rows
    .filter(r => {
      const d = r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : String(r[0]).slice(0, 10);
      return d === date;
    })
    .map(r => ({
      date: date,
      meal: r[1],
      description: r[2],
      calories: r[3],
      protein: r[4],
      carbs: r[5],
      fat: r[6],
      waterIntake: r[7]
    }));
  return json(entries);
}

// Every error path below says what actually went wrong. The old code collapsed
// four different failures into "無法解析辨識結果", so each outage started from
// zero and got guessed at instead of diagnosed.
function callGemini(parts) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return {error: 'GEMINI_API_KEY 未設定（Script Properties）'};

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{parts: parts}],
    generationConfig: {responseMimeType: 'application/json', responseSchema: FOOD_SCHEMA}
  };

  let response;
  try {
    response = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });
  } catch (e) {
    return {error: '無法連線 Gemini：' + e.message};
  }

  const httpCode = response.getResponseCode();
  const body = response.getContentText();
  if (httpCode === 429) return {error: 'Gemini 用量已達上限，請稍後再試'};
  if (httpCode !== 200) return {error: `Gemini HTTP ${httpCode}（${GEMINI_MODEL}）：${body.slice(0, 200)}`};

  let result;
  try {
    result = JSON.parse(body);
  } catch (e) {
    return {error: 'Gemini 回應不是 JSON：' + body.slice(0, 200)};
  }

  const candidate = result.candidates && result.candidates[0];
  if (!candidate) {
    const blocked = result.promptFeedback && result.promptFeedback.blockReason;
    return {error: blocked ? '請求被安全機制擋下：' + blocked : 'Gemini 未回傳任何結果'};
  }

  const text = extractText(candidate);
  const parsed = parseFoodJson(text);
  if (!parsed) {
    return {error: `無法解析回應（finishReason: ${candidate.finishReason}）：${text.slice(0, 160)}`};
  }
  return parsed;
}

// 3.x models can return reasoning parts alongside the answer, and the answer is
// not guaranteed to sit at parts[0] — join every non-thought part instead.
function extractText(candidate) {
  const parts = (candidate.content && candidate.content.parts) || [];
  return parts
    .filter(p => !p.thought && typeof p.text === 'string')
    .map(p => p.text)
    .join('')
    .trim();
}

// responseSchema should make this a plain JSON.parse, but keep the fence strip
// and brace scan as a net in case a future model ignores the schema.
function parseFoodJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
}

function analyzeFood(data) {
  if (!data.text) return json({error: '沒有收到食物描述'});
  return json(callGemini([{
    text: `分析以下食物的營養素（台灣食物請給予準確估計）：\n"${data.text}"\ndescription 用繁體中文寫食物名稱。若有多種食物，加總所有數值。不確定時給合理估計值。`
  }]));
}

function recognizeFoodImage(data) {
  if (!data.imageBase64) return json({error: '沒有收到圖片'});
  return json(callGemini([
    {inlineData: {mimeType: data.mimeType || 'image/jpeg', data: data.imageBase64}},
    {text: '辨識這張圖片中的食物並估計營養素。description 用繁體中文寫食物名稱。若有多種食物，全部列出並加總數值。'}
  ]));
}

function getStats(ss) {
  const bodyRows = ss.getSheetByName('Body Metrics').getDataRange().getValues().slice(1).slice(-30);
  const logRows = ss.getSheetByName('Workout Log').getDataRange().getValues().slice(1);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekDays = new Set(
    logRows.filter(r => new Date(r[0]) >= weekStart).map(r => String(r[0]))
  );
  const watchRows = ss.getSheetByName('Apple Watch').getDataRange().getValues().slice(1).slice(-7);
  const avgHR = watchRows.length
    ? Math.round(watchRows.reduce((s, r) => s + (r[4] || 0), 0) / watchRows.length)
    : null;
  return json({
    bodyMetrics: bodyRows.map(r => ({date: String(r[0]), weight: r[1]})),
    weeklyWorkouts: thisWeekDays.size,
    totalWorkouts: new Set(logRows.map(r => String(r[0]))).size,
    avgHR
  });
}

function getHistory(ss) {
  const tz = Session.getScriptTimeZone();
  const rows = ss.getSheetByName('Workout Log').getDataRange().getValues().slice(1);
  const byDate = {};
  rows.forEach(r => {
    const d = r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : String(r[0]).slice(0, 10);
    if (!byDate[d]) byDate[d] = {date: d, dayType: r[1], exercises: []};
    if (!byDate[d].exercises.includes(r[2])) byDate[d].exercises.push(r[2]);
  });
  return json(Object.values(byDate).reverse().slice(0, 20));
}

// Every set ever logged sits in Workout Log, but nothing read it back — getHistory
// returns exercise names only, so neither the app nor a coaching review could see
// the load. Deciding to add weight or hold is exactly a question about load, which
// made it unanswerable from the outside.
//
// With `exercise` set, returns that movement's recent sessions (what the log screen
// needs to show last time's numbers). Without it, returns the same slice for every
// movement, which is small enough to review a whole block at once.
function getExerciseLog(ss, exercise, limit) {
  const tz = Session.getScriptTimeZone();
  const rows = ss.getSheetByName('Workout Log').getDataRange().getValues().slice(1);
  const wanted = String(exercise || '').trim();
  const perExercise = Number(limit) > 0 ? Number(limit) : 3;

  const sessions = {};
  rows.forEach(r => {
    const name = String(r[2] || '').trim();
    if (!name) return;
    if (wanted && name !== wanted) return;
    const date = r[0] instanceof Date
      ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd')
      : String(r[0]).slice(0, 10);
    const key = date + '|' + name;
    if (!sessions[key]) sessions[key] = {date: date, exercise: name, dayType: r[1], sets: []};
    sessions[key].sets.push({
      setNum: Number(r[3]) || 0,
      weight: Number(r[4]) || 0,
      reps: Number(r[5]) || 0,
      extraSet: r[6] === true || String(r[6]).toUpperCase() === 'TRUE',
      notes: String(r[7] || '')
    });
  });

  // Newest first, then keep only the most recent `perExercise` sessions of each
  // movement — an untrimmed log would grow past what a phone on gym wifi should
  // be pulling to answer "what did I lift last time".
  const all = Object.values(sessions)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const kept = [];
  const seen = {};
  all.forEach(s => {
    seen[s.exercise] = (seen[s.exercise] || 0) + 1;
    if (seen[s.exercise] <= perExercise) {
      s.sets.sort((a, b) => a.setNum - b.setNum);
      kept.push(s);
    }
  });
  return json(kept);
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
