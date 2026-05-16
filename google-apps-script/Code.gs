const SHEET_ID = '1bOALXfJiVJotOzz34MFrVMn6r7e45u__P-cStSS6F0U';
const SECRET = 'fitcoach-secret-2026';

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
      [1,'Monday','Squat 深蹲',4,8,60,'恢復期，專注技術'],
      [1,'Monday','Leg Press 腿推',4,12,100,''],
      [1,'Monday','RDL 羅馬尼亞硬舉',3,10,50,''],
      [1,'Monday','Leg Curl 腿彎舉',3,15,0,''],
      [1,'Monday','Leg Extension 腿伸展',3,15,0,'']
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
    // Week 1 — Monday: Legs
    [1,'Monday','Squat 深蹲',4,8,60,'恢復期，專注技術'],
    [1,'Monday','Leg Press 腿推',4,12,100,''],
    [1,'Monday','Romanian Deadlift 羅馬尼亞硬舉',3,10,50,''],
    [1,'Monday','Leg Curl 腿彎舉',3,15,0,'輕重量，感受肌肉'],
    [1,'Monday','Leg Extension 腿伸展',3,15,0,''],
    [1,'Monday','Calf Raise 小腿提踵',4,20,0,''],

    // Week 1 — Tuesday: Chest + Triceps
    [1,'Tuesday','Bench Press 臥推',4,8,60,'專注胸肌收縮'],
    [1,'Tuesday','Incline DB Press 上斜啞鈴推',3,10,20,'每手'],
    [1,'Tuesday','Cable Fly 繩索夾胸',3,15,0,'頂峰收縮停頓'],
    [1,'Tuesday','Dips 撐體',3,10,0,'體重'],
    [1,'Tuesday','Tricep Pushdown 三頭下壓',3,15,0,''],
    [1,'Tuesday','Overhead Tricep Extension 過頭三頭伸展',3,12,0,''],

    // Week 1 — Wednesday: Back + Biceps
    [1,'Wednesday','Pull-up 引體向上',4,6,0,'體重，做到力竭'],
    [1,'Wednesday','Barbell Row 槓鈴划船',4,8,50,''],
    [1,'Wednesday','Lat Pulldown 高拉',3,12,60,''],
    [1,'Wednesday','Seated Cable Row 坐姿繩索划船',3,12,50,''],
    [1,'Wednesday','Barbell Curl 槓鈴彎舉',3,10,30,''],
    [1,'Wednesday','Hammer Curl 錘式彎舉',3,12,14,'每手'],

    // Week 1 — Thursday: Shoulders + Core
    [1,'Thursday','Overhead Press 肩推',4,8,40,'槓鈴或啞鈴'],
    [1,'Thursday','Lateral Raise 側平舉',4,15,8,'每手，控制離心'],
    [1,'Thursday','Front Raise 前平舉',3,12,8,'每手'],
    [1,'Thursday','Rear Delt Fly 後三角飛鳥',3,15,0,'繩索或啞鈴'],
    [1,'Thursday','Plank 棒式',3,60,0,'秒，穩定核心'],
    [1,'Thursday','Ab Wheel 健腹輪',3,10,0,''],

    // Week 1 — Friday: Cardio + Light Legs
    [1,'Friday','Treadmill Zone2 跑步機有氧',1,30,0,'分鐘，心率 130-145 bpm'],
    [1,'Friday','Walking Lunge 行走弓箭步',3,12,0,'每腿，體重'],
    [1,'Friday','Hip Thrust 臀橋',3,15,40,''],
    [1,'Friday','Step-up 登階',3,10,0,'每腿，體重'],

    // Week 1 — Saturday: Cardio + Light Upper
    [1,'Saturday','Treadmill Zone2 跑步機有氧',1,25,0,'分鐘，心率 130-145 bpm'],
    [1,'Saturday','Push-up 伏地挺身',3,15,0,'體重'],
    [1,'Saturday','DB Row 啞鈴划船',3,12,16,'每手'],
    [1,'Saturday','Face Pull 臉拉',3,15,0,''],
  ];

  plan.getRange(2, 1, rows.length, 7).setValues(rows);
  Logger.log('✅ Week 1 plan populated: ' + rows.length + ' exercises across 6 days');
}

function doGet(e) {
  if (e.parameter.token !== SECRET) return json({error: 'Unauthorized'});
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const action = e.parameter.action;
  if (action === 'getTodayWorkout') return getTodayWorkout(ss, e.parameter.day);
  if (action === 'getStats') return getStats(ss);
  if (action === 'getHistory') return getHistory(ss);
  if (action === 'getTodayFood') return getTodayFood(ss, e.parameter.date);
  return json({error: 'Unknown action'});
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.token !== SECRET) return json({error: 'Unauthorized'});
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (data.action === 'logSet') return logSet(ss, data);
  if (data.action === 'logBody') return logBody(ss, data);
  if (data.action === 'logFood') return logFood(ss, data);
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

function getTodayFood(ss, date) {
  const rows = ss.getSheetByName('Food Log').getDataRange().getValues().slice(1);
  const entries = rows
    .filter(r => String(r[0]) === date)
    .map(r => ({
      date: String(r[0]),
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

function recognizeFoodImage(data) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return json({error: 'GEMINI_API_KEY not set in Script Properties'});

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: data.mimeType || 'image/jpeg',
            data: data.imageBase64
          }
        },
        {
          text: `Analyze this food image. Return ONLY a JSON object, no markdown, no explanation:
{
  "description": "食物名稱（繁體中文）",
  "calories": <integer>,
  "protein": <number with 1 decimal>,
  "carbs": <number with 1 decimal>,
  "fat": <number with 1 decimal>
}
If multiple food items are visible, describe them all and sum the nutritional values.`
        }
      ]
    }]
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const result = JSON.parse(response.getContentText());
    if (!result.candidates || !result.candidates[0]) return json({error: 'No response from Gemini'});
    const text = result.candidates[0].content.parts[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({error: 'Could not parse food data'});
    return json(JSON.parse(match[0]));
  } catch (e) {
    return json({error: e.message});
  }
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
  const rows = ss.getSheetByName('Workout Log').getDataRange().getValues().slice(1);
  const byDate = {};
  rows.forEach(r => {
    const d = String(r[0]);
    if (!byDate[d]) byDate[d] = {date: d, dayType: r[1], exercises: []};
    if (!byDate[d].exercises.includes(r[2])) byDate[d].exercises.push(r[2]);
  });
  return json(Object.values(byDate).reverse().slice(0, 20));
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
