const STORAGE_KEY = 'aaroh-interactive-timetable-v3';
const HISTORY_KEY = 'aaroh-preparation-history-v1';
const CLOUD_QUEUE_KEY = 'aaroh-cloud-sync-queue-v1';
const DAY_KEY = new Date().toISOString().slice(0, 10);
const STATUS = { NOT_STARTED: 'NOT STARTED', RUNNING: 'RUNNING', PAUSED: 'PAUSED', COMPLETED: 'COMPLETED' };
const TIMER_PERSIST_INTERVAL_MS = 5000;

const baseRows = [
  ['6:00 – 6:15 AM', 'WAKE UP', 'Gratitude & Plan Your Day', 'Positive Start', '☀️', 'normal'],
  ['6:15 – 6:45 AM', 'EXERCISE / YOGA / WALK', 'Stay Fit, Stay Sharp', 'Physical & Mental Fitness', '🏃', 'normal'],
  ['6:45 – 7:15 AM', 'FRESHEN UP', 'Personal Care', 'Refresh & Rejuvenate', '🚿', 'normal'],
  ['7:15 – 7:45 AM', 'BREAKFAST', 'Eat Healthy, Think Better', 'Nutrition & Energy', '🥗', 'normal'],
  ['7:45 – 10:15 AM', 'ELECTRICAL ENGINEERING (THEORY)', 'Core Subject – ESE / MPSC / SSC JE / RRB JE', 'Concept Building', '📖', 'red'],
  ['10:15 – 10:30 AM', 'SHORT BREAK', 'Tea / Break', 'Relax & Re-energize', '☕', 'normal'],
  ['10:30 – 1:00 PM', 'ELECTRICAL ENGINEERING (NUMERICALS)', 'Numericals + Problem Solving', 'Practice & Accuracy', '🧮', 'red'],
  ['1:00 – 2:00 PM', 'LUNCH & REST', 'Good Food, Good Mood', 'Recharge Yourself', '🍽️', 'normal'],
  ['2:00 – 4:00 PM', 'PYQs & MCQs PRACTICE', 'ESE / SSC JE / RRB JE', 'Exam Familiarity', '📝', 'red'],
  ['4:00 – 4:30 PM', 'TEA BREAK', 'Short Break, Fresh Mind', 'Relax', '☕', 'normal'],
  ['4:30 – 5:30 PM', 'QUANTITATIVE APTITUDE', 'SSC / Railways / CGL', 'Speed & Accuracy', 'Σ', 'blue'],
  ['5:30 – 6:30 PM', 'REASONING ABILITY', 'SSC / Railways / CGL', 'Logical Thinking', '🧠', 'purple'],
  ['6:30 – 7:30 PM', 'GENERAL STUDIES & CURRENT AFFAIRS', 'Polity, History, Geography, Economy, Science, CA', 'Awareness & Knowledge', '🌐', 'green'],
  ['7:30 – 8:15 PM', 'DINNER & FAMILY TIME', 'Take a Break, Stay Connected', 'Relax & Refresh', '👨‍👩‍👧', 'normal'],
  ['8:15 – 9:15 PM', 'ENGLISH', 'Grammar, Vocabulary, RC', 'CGL / SSC / All Exams', 'ABC', 'blue'],
  ['9:15 – 10:00 PM', 'REVISION & MOCK ANALYSIS', 'Mock Test / Error Analysis / Short Notes', 'Improve & Stay Ahead', '🎯', 'purple'],
  ['10:00 – 10:15 PM', 'SLEEP PREPARATION', 'Good Sleep, Better Tomorrow', '7 – 8 Hours Sleep', '🌙', 'normal'],
];

const checklistItems = ['Exercise', 'Breakfast', 'Wake before 6', 'Revision', 'Theory', 'Numericals', 'PYQ', 'Sleep before 10'];
const rotationItems = ['Mon  Network Theory + Engineering Maths', 'Tue  Electrical Machines', 'Wed  Power Systems', 'Thu  Control Systems', 'Fri  Power Electronics', 'Sat  Electronics (Analog + Digital)', 'Sun  Full Length Mock Test + Revision'];
const quotes = [
  ['The harder you work for something, the greater you’ll feel when you achieve it.', 'mountain'],
  ['Don’t stop when you’re tired. Stop when you’re done.', 'sunrise'],
  ['Discipline today, success tomorrow.', 'hourglass'],
  ['Small daily improvements are the key to stunning results.', 'summit'],
  ['Your future is created by what you do today, not tomorrow.', 'lamp'],
];

const schedule = document.getElementById('schedule');
let state = loadState();
let lastTick = Date.now();
let lastTimerPersistAt = 0;

function makeSession(row, id) {
  const start = parseClock(row[0].split('–')[0]);
  const end = parseClock(row[0].split('–')[1] || row[0]);
  const duration = Math.max(0, end - start) * 60;
  return { id, time: row[0], activity: row[1], focus: row[2], benefit: row[3], icon: row[4], color: row[5], start, end, plannedSeconds: duration, remainingSeconds: duration, status: STATUS.NOT_STARTED, actualSeconds: 0, pauseSeconds: 0, extraSeconds: 0, notes: '', originalTime: row[0] };
}

function loadState() {
  const fresh = { day: DAY_KEY, activeId: null, sessions: baseRows.map(makeSession), pending: [], checklist: {}, heatmap: {}, frozenSummary: null, reports: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.day === DAY_KEY) return { ...fresh, ...saved, sessions: saved.sessions || fresh.sessions };
    if (saved?.pending?.length) fresh.pending = saved.pending;
  } catch { /* ignore corrupt local storage */ }
  return fresh;
}

function saveState({ syncCloud = true } = {}) {
  const analytics = buildAnalytics();
  state.analytics = analytics.today;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  persistHistory(analytics);
  if (syncCloud) enqueueCloudSync(analytics);
}

function saveTimerProgress(now = Date.now()) {
  if (now - lastTimerPersistAt < TIMER_PERSIST_INTERVAL_MS) return;
  lastTimerPersistAt = now;
  saveState({ syncCloud: false });
}

function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || { firstStudyDay: null, firstCompletedSession: null, days: {}, reports: [], emailHistory: [] }; }
  catch { return { firstStudyDay: null, firstCompletedSession: null, days: {}, reports: [], emailHistory: [] }; }
}

function persistHistory(analytics) {
  const history = readHistory();
  if (analytics.today.actualStudySeconds > 0 && !history.firstStudyDay) history.firstStudyDay = DAY_KEY;
  const firstDone = state.sessions.find(s => s.status === STATUS.COMPLETED);
  if (firstDone && !history.firstCompletedSession) history.firstCompletedSession = { day: DAY_KEY, activity: firstDone.activity, completedAt: firstDone.completedAt };
  history.days[DAY_KEY] = { ...analytics.today, sessions: state.sessions.map(sessionSnapshot), pending: state.pending.map(sessionSnapshot), checklist: state.checklist, notes: state.sessions.filter(s => s.notes).map(s => ({ activity: s.activity, notes: s.notes })) };
  history.lifetime = analytics.lifetime;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function enqueueCloudSync(analytics) {
  const item = { type: 'study-day', day: DAY_KEY, createdAt: new Date().toISOString(), payload: analytics.today };
  try {
    const queue = JSON.parse(localStorage.getItem(CLOUD_QUEUE_KEY)) || [];
    queue.push(item);
    localStorage.setItem(CLOUD_QUEUE_KEY, JSON.stringify(queue.slice(-100)));
    if (window.AarohCloudSync) window.AarohCloudSync.syncDay(DAY_KEY, analytics).catch(() => {});
  } catch { /* local queue is best-effort for offline cloud sync */ }
}

function sessionSnapshot(s) { return { id: s.id, activity: s.activity, focus: s.focus, originalTime: s.originalTime, plannedSeconds: s.plannedSeconds, actualSeconds: s.actualSeconds, pauseSeconds: s.pauseSeconds, extraSeconds: s.extraSeconds, remainingSeconds: s.remainingSeconds, status: s.status, notes: s.notes || '', completedAt: s.completedAt || null }; }
function parseClock(text) { const m = text?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = +m[1]; if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12; if (m[3].toUpperCase() === 'AM' && h === 12) h = 0; return h * 60 + +m[2]; }
function fmt(sec) { sec = Math.max(0, Math.round(sec)); const h = String(Math.floor(sec / 3600)).padStart(2, '0'); const m = String(Math.floor(sec % 3600 / 60)).padStart(2, '0'); const s = String(sec % 60).padStart(2, '0'); return `${h}:${m}:${s}`; }
function hours(sec) { return (sec / 3600).toFixed(1); }
function activeByClock() { const mins = new Date().getHours() * 60 + new Date().getMinutes(); return state.sessions.find(s => mins >= s.start && mins < s.end); }
function currentSession() { return state.sessions.find(s => s.id === state.activeId); }
function studySessions() { return state.sessions.filter(s => s.plannedSeconds > 0); }

function render({ persist = true, syncCloud = true } = {}) {
  schedule.innerHTML = state.sessions.map(s => `<tr data-id="${s.id}" class="${s.color} ${s.status.toLowerCase().replaceAll(' ', '-')} ${activeByClock()?.id === s.id ? 'auto-current' : ''}">
    <td>${s.time}<small>${fmt(s.remainingSeconds)}</small></td><td>${s.activity}</td><td>${s.focus}</td><td>${s.benefit}<button class="note" data-act="note">Notes</button></td><td class="actions">${buttons(s)}</td>
  </tr>`).join('');
  document.getElementById('quotes').innerHTML = quotes.map(q => `<div class="quote ${q[1]}"><span>“</span><p>${q[0]}</p><b>”</b></div>`).join('');
  renderChecklist(); renderRotation(); renderStats();
  if (persist) saveState({ syncCloud });
}

function buttons(s) {
  if (s.status === STATUS.COMPLETED) return '<span class="locked">✓</span>';
  if (s.status === STATUS.RUNNING) return '<button data-act="pause">⏸ PAUSE</button><button data-act="extend">➕ EXTEND</button><button data-act="complete">✓ COMPLETE</button>';
  if (s.status === STATUS.PAUSED) return '<button data-act="resume">▶ RESUME</button><button data-act="complete">✓ COMPLETE</button>';
  return '<button data-act="start">▶ START</button>';
}

function renderChecklist() { document.getElementById('checklist').innerHTML = checklistItems.map(item => `<li><label><input type="checkbox" data-check="${item}" ${state.checklist[item] ? 'checked' : ''}> ${item}</label></li>`).join(''); }
function renderRotation() { const day = new Date().getDay(); document.getElementById('rotation').innerHTML = rotationItems.map((r, i) => `<p class="${(i + 1) % 7 === day ? 'today-rotation' : ''} ${progressPct() > 70 ? 'rot-done' : 'rot-pending'}">${r}</p>`).join(''); const studied = actualSeconds(); state.heatmap[DAY_KEY] = studied; document.getElementById('heatmap').innerHTML = Array.from({ length: 14 }, (_, i) => `<i class="h${Math.min(3, Math.floor((i === 13 ? studied : 0) / 3600))}"></i>`).join(''); }
function actualSeconds() { return state.sessions.reduce((sum, s) => sum + s.actualSeconds, 0); }
function plannedSeconds() { return studySessions().reduce((sum, s) => sum + s.plannedSeconds + s.extraSeconds, 0); }
function progressPct() { return Math.round(state.sessions.filter(s => s.status === STATUS.COMPLETED).length / state.sessions.length * 100); }

function buildAnalytics() {
  const history = readHistory();
  const today = buildDayAnalytics(DAY_KEY, state.sessions, state.pending);
  const completedDays = { ...history.days, [DAY_KEY]: today };
  const allDays = Object.values(completedDays);
  const currentMonth = DAY_KEY.slice(0, 7);
  const weekDays = lastNDays(7).map(day => completedDays[day]).filter(Boolean);
  const monthDays = Object.entries(completedDays).filter(([day]) => day.startsWith(currentMonth)).map(([, value]) => value);
  const weekly = aggregatePeriod(weekDays, 'week');
  const monthly = aggregatePeriod(monthDays, 'month');
  const lifetime = aggregatePeriod(allDays, 'lifetime');
  lifetime.firstStudyDay = history.firstStudyDay || (today.actualStudySeconds > 0 ? DAY_KEY : null);
  lifetime.firstCompletedSession = history.firstCompletedSession;
  lifetime.totalStudyDays = allDays.filter(d => d.actualStudySeconds > 0).length;
  lifetime.longestStudyDay = allDays.reduce((best, day) => day.actualStudySeconds > (best?.actualStudySeconds || 0) ? day : best, null);
  const subjects = buildSubjectAnalytics(allDays);
  return { today, weekly, monthly, lifetime, subjects, insights: buildInsights(allDays, subjects) };
}

function buildDayAnalytics(day, sessions, pending) {
  const complete = sessions.filter(s => s.status === STATUS.COMPLETED);
  const studied = sessions.filter(s => s.actualSeconds > 0);
  const missed = sessions.filter(s => s.status !== STATUS.COMPLETED && s.end < new Date().getHours() * 60 + new Date().getMinutes());
  const longest = studied.reduce((best, s) => s.actualSeconds > (best?.actualSeconds || 0) ? s : best, null);
  const shortest = studied.reduce((best, s) => s.actualSeconds && s.actualSeconds < (best?.actualSeconds || Infinity) ? s : best, null);
  return {
    day,
    plannedStudySeconds: plannedSeconds(),
    actualStudySeconds: actualSeconds(),
    completedSessions: complete.length,
    pendingSessions: sessions.filter(s => s.status !== STATUS.COMPLETED).length + pending.length,
    missedSessions: missed.length,
    currentActiveSession: currentSession()?.activity || null,
    longestSession: longest ? { activity: longest.activity, seconds: longest.actualSeconds } : null,
    shortestSession: shortest ? { activity: shortest.activity, seconds: shortest.actualSeconds } : null,
    totalBreakSeconds: sessions.filter(s => /BREAK|LUNCH|DINNER|FRESHEN|SLEEP|WAKE|EXERCISE/.test(s.activity)).reduce((sum, s) => sum + s.actualSeconds + s.pauseSeconds, 0),
    extraStudySeconds: sessions.reduce((sum, s) => sum + s.extraSeconds, 0),
    completionPercentage: progressPct(),
    subjectDistribution: distributionFromSessions(sessions),
    notes: sessions.filter(s => s.notes).map(s => `${s.activity}: ${s.notes}`),
  };
}

function lastNDays(count) { return Array.from({ length: count }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (count - 1 - i)); return d.toISOString().slice(0, 10); }); }
function aggregatePeriod(days, label) {
  const total = days.reduce((sum, d) => sum + (d.actualStudySeconds || 0), 0);
  const sessions = days.reduce((sum, d) => sum + (d.completedSessions || 0) + (d.pendingSessions || 0), 0);
  const completed = days.reduce((sum, d) => sum + (d.completedSessions || 0), 0);
  const missed = days.reduce((sum, d) => sum + (d.missedSessions || 0), 0);
  const studiedDays = days.filter(d => d.actualStudySeconds > 0);
  const most = studiedDays.reduce((best, d) => d.actualStudySeconds > (best?.actualStudySeconds || 0) ? d : best, null);
  const least = studiedDays.reduce((best, d) => d.actualStudySeconds < (best?.actualStudySeconds || Infinity) ? d : best, null);
  return { label, totalStudySeconds: total, averageDailySeconds: days.length ? total / days.length : 0, mostProductiveDay: most?.day || null, leastProductiveDay: least?.day || null, totalSessions: sessions, completedSessions: completed, missedSessions: missed, averageSessionSeconds: completed ? total / completed : 0, completionPercentage: sessions ? Math.round(completed / sessions * 100) : 0, currentStreak: calculateStreak(days), longestStreak: calculateLongestStreak(days), subjectDistribution: mergeDistributions(days) };
}
function calculateStreak(days) { let streak = 0; [...days].reverse().some(day => day.actualStudySeconds > 0 ? (streak++, false) : true); return streak; }
function calculateLongestStreak(days) { let best = 0, current = 0; days.forEach(day => { current = day.actualStudySeconds > 0 ? current + 1 : 0; best = Math.max(best, current); }); return best; }
function distributionFromSessions(sessions) { return sessions.reduce((acc, s) => { const key = subjectName(s.activity); acc[key] = (acc[key] || 0) + s.actualSeconds; return acc; }, {}); }
function mergeDistributions(days) { return days.reduce((acc, day) => { Object.entries(day.subjectDistribution || {}).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; }); return acc; }, {}); }
function subjectName(activity) { if (/THEORY/.test(activity)) return 'Electrical Theory'; if (/NUMERICAL/.test(activity)) return 'Electrical Numericals'; if (/PYQ|REVISION/.test(activity)) return 'Revision'; if (/REASONING/.test(activity)) return 'Reasoning'; if (/APTITUDE/.test(activity)) return 'Quantitative Aptitude'; if (/CURRENT|GENERAL/.test(activity)) return 'Current Affairs'; if (/ENGLISH/.test(activity)) return 'English'; return activity; }
function buildSubjectAnalytics(days) { const subjects = {}; days.forEach(day => (day.sessions || []).forEach(s => { const name = subjectName(s.activity); const item = subjects[name] || { totalSeconds: 0, completedSessions: 0, pendingSessions: 0, extraSeconds: 0, revisionCount: 0, totalSessions: 0 }; item.totalSessions += 1; item.totalSeconds += s.actualSeconds || 0; item.extraSeconds += s.extraSeconds || 0; if (s.status === STATUS.COMPLETED) item.completedSessions += 1; else item.pendingSessions += 1; if (/REVISION|PYQ/.test(s.activity)) item.revisionCount += 1; subjects[name] = item; })); Object.values(subjects).forEach(s => { s.averageSessionSeconds = s.completedSessions ? s.totalSeconds / s.completedSessions : 0; s.completionPercentage = s.totalSessions ? Math.round(s.completedSessions / s.totalSessions * 100) : 0; }); return subjects; }
function buildInsights(days, subjects) { const insights = []; Object.entries(subjects).forEach(([name, subject]) => { if (subject.extraSeconds >= 1800) insights.push(`You extended ${name} by ${fmt(subject.extraSeconds)} in recorded sessions.`); if (subject.pendingSessions >= 3) insights.push(`${name} has ${subject.pendingSessions} pending recorded sessions.`); }); const best = days.reduce((b, d) => d.actualStudySeconds > (b?.actualStudySeconds || 0) ? d : b, null); if (best) insights.push(`Your strongest recorded day is ${best.day} with ${hours(best.actualStudySeconds)}h studied.`); return insights.slice(0, 3); }


function renderStats() {
  const active = currentSession(); const next = state.sessions.find(s => s.status !== STATUS.COMPLETED && s.id !== active?.id);
  document.getElementById('panel-subject').textContent = active?.activity || activeByClock()?.activity || 'No Active Session';
  document.getElementById('panel-timer').textContent = active ? fmt(active.remainingSeconds) : '00:00:00';
  document.getElementById('panel-status').textContent = active?.status || 'NOT STARTED';
  document.getElementById('panel-next').textContent = next ? next.activity : '--';
  document.getElementById('session-panel').className = `session-panel ${(active?.status || '').toLowerCase().replaceAll(' ', '-')}`;
  const analytics = buildAnalytics();
  const pct = progressPct(); document.getElementById('current-session').textContent = active?.activity || activeByClock()?.activity || 'No Active Session';
  document.getElementById('clock').textContent = new Date().toLocaleTimeString(); document.getElementById('progress').textContent = `${pct}%`; document.getElementById('meter').value = pct; document.getElementById('today').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' });
  const technical = state.sessions.filter(s => /ELECTRICAL|PYQ|REVISION/.test(s.activity)).reduce((a, s) => a + s.actualSeconds, 0); const aptitude = state.sessions.filter(s => /APTITUDE|REASONING/.test(s.activity)).reduce((a, s) => a + s.actualSeconds, 0); const gs = Math.max(1, actualSeconds() - technical - aptitude); const total = Math.max(1, actualSeconds());
  document.getElementById('pie').style.background = `conic-gradient(#0057b8 0 ${technical / total * 100}%,#38a800 0 ${(technical + aptitude) / total * 100}%,#ff4b00 0 100%)`;
  document.getElementById('legend').innerHTML = `<b>${Math.round(technical / total * 100)}% TECHNICAL</b><b>${Math.round(aptitude / total * 100)}% APTITUDE</b><b>${Math.round(gs / total * 100)}% GS + ENGLISH</b>`;
  document.getElementById('missions').innerHTML = state.pending.slice(-3).map(p => `<p><b>${p.activity}</b><br><small>${p.originalTime} • ${fmt(p.remainingSeconds)}</small><button data-pending="${p.id}">Start</button></p>`).join('') || '<p>No pending missions.</p>';
  const done = state.sessions.filter(s => s.status === STATUS.COMPLETED).length; const avg = done ? actualSeconds() / done : 0;
  const longest = analytics.today.longestSession ? `${analytics.today.longestSession.activity} ${fmt(analytics.today.longestSession.seconds)}` : 'None';
  const insight = analytics.insights[0] || 'Study data will create insights after real sessions.';
  document.getElementById('summary').innerHTML = `Planned ${hours(plannedSeconds())}h • Actual ${hours(actualSeconds())}h<br>Done ${done} • Pending ${analytics.today.pendingSessions} • Missed ${analytics.today.missedSessions}<br>Extra ${fmt(analytics.today.extraStudySeconds)} • Break ${fmt(analytics.today.totalBreakSeconds)}<br>Week ${hours(analytics.weekly.totalStudySeconds)}h • Streak ${analytics.weekly.currentStreak}/${analytics.weekly.longestStreak}<br>Month ${hours(analytics.monthly.totalStudySeconds)}h • Life ${hours(analytics.lifetime.totalStudySeconds)}h<br><small>${longest}</small><br><em>${insight}</em>`;
}

schedule.addEventListener('click', e => { const tr = e.target.closest('tr'); const s = state.sessions.find(x => x.id === +tr?.dataset.id); if (!s) return; const act = e.target.dataset.act; if (act === 'start') startSession(s); if (act === 'pause') pauseSession(s); if (act === 'resume') startSession(s); if (act === 'complete') completeSession(s); if (act === 'extend') extendSession(s); if (act === 'note') addNote(s); render(); });
document.body.addEventListener('change', e => { if (e.target.dataset.check) { state.checklist[e.target.dataset.check] = e.target.checked; render(); } });
document.getElementById('switch-subject').addEventListener('click', () => { const select = document.getElementById('switch-list'); select.innerHTML = state.sessions.filter(s => s.status !== STATUS.COMPLETED).map(s => `<option value="${s.id}">${s.activity}</option>`).join(''); document.getElementById('switch-dialog').showModal(); });
document.getElementById('switch-dialog').addEventListener('close', e => { if (e.target.returnValue === 'switch') { const chosen = state.sessions.find(s => s.id === +document.getElementById('switch-list').value); const active = currentSession() || activeByClock(); if (active && active.id !== chosen?.id) movePending(active); if (chosen) startSession(chosen); render(); } });

function startSession(s) { state.sessions.forEach(x => { if (x.status === STATUS.RUNNING) x.status = STATUS.PAUSED; }); s.status = STATUS.RUNNING; state.activeId = s.id; }
function pauseSession(s) { s.status = STATUS.PAUSED; state.activeId = null; }
function completeSession(s) { s.status = STATUS.COMPLETED; s.remainingSeconds = 0; state.activeId = null; s.completedAt = new Date().toISOString(); }
function movePending(s) { if (s.status !== STATUS.COMPLETED && !state.pending.some(p => p.id === s.id)) state.pending.push({ ...s, status: STATUS.NOT_STARTED }); }
function extendSession(s) { const dialog = document.getElementById('extend-dialog'); dialog.showModal(); dialog.onclose = () => { let min = dialog.returnValue === 'custom' ? Number(prompt('Custom minutes', '20')) : Number(dialog.returnValue); if (min > 0) { s.remainingSeconds += min * 60; s.extraSeconds += min * 60; state.sessions.filter(x => x.start > s.start).forEach(x => { x.start += min; x.end += min; }); render(); } }; }
function addNote(s) { const note = prompt('Quick notes (max 5 lines): mistakes, formula, revision reminder', s.notes || ''); if (note !== null) s.notes = note.split('\n').slice(0, 5).join('\n'); }

function tick() {
  const now = Date.now();
  const delta = Math.floor((now - lastTick) / 1000);
  lastTick = now;
  const active = currentSession();
  let changed = false;
  if (active?.status === STATUS.RUNNING && delta > 0) {
    active.actualSeconds += delta;
    active.remainingSeconds = Math.max(0, active.remainingSeconds - delta);
    changed = true;
    if (active.remainingSeconds === 0) completeSession(active);
  }
  state.sessions.filter(s => s.status === STATUS.PAUSED).forEach(s => { s.pauseSeconds += delta; changed = true; });
  if (new Date().getHours() === 22 && new Date().getMinutes() >= 15 && !state.frozenSummary) {
    freezeDailyReport();
    changed = false;
  }
  if (changed) saveTimerProgress(now);
  render({ persist: false });
}

function freezeDailyReport() {
  const analytics = buildAnalytics();
  state.frozenSummary = { at: new Date().toISOString(), analytics: analytics.today, emailRequired: true, recipient: 'rohandoiphode1@gmail.com', recipientName: 'Officer Rohan', subject: 'Officer Rohan • Daily Mission Report' };
  state.reports.push(state.frozenSummary);
  saveState();
}

window.addEventListener('pagehide', () => saveState({ syncCloud: false }));
window.addEventListener('beforeunload', () => saveState({ syncCloud: false }));

render({ syncCloud: false }); setInterval(tick, 1000);
