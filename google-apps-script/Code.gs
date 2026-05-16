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

function doGet(e) {
  if (e.parameter.token !== SECRET) return json({error: 'Unauthorized'});
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const action = e.parameter.action;
  if (action === 'getTodayWorkout') return getTodayWorkout(ss, e.parameter.day);
  if (action === 'getStats') return getStats(ss);
  if (action === 'getHistory') return getHistory(ss);
  return json({error: 'Unknown action'});
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.token !== SECRET) return json({error: 'Unauthorized'});
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (data.action === 'logSet') return logSet(ss, data);
  if (data.action === 'logBody') return logBody(ss, data);
  if (data.action === 'logFood') return logFood(ss, data);
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
