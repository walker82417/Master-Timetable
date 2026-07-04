const promises = ['Plan Your Work', 'Work Your Plan', 'Stay Consistent', 'Success is Inevitable'];
const exams = ['UPSC ESE (ELECTRICAL)', 'MPSC', 'SSC JE', 'RRB JE', 'SSC CGL', 'RAILWAYS & OTHER GOVT. EXAMS'];

const scheduleRows = [
  ['6:00 – 6:15 AM', 'WAKE UP', 'Gratitude & Plan Your Day', 'Positive Start', '☀️', 'standard'],
  ['6:15 – 6:45 AM', 'EXERCISE / YOGA / WALK', 'Stay Fit, Stay Sharp', 'Physical & Mental Fitness', '🏃', 'standard'],
  ['6:45 – 7:15 AM', 'FRESHEN UP', 'Personal Care', 'Refresh & Rejuvenate', '🚿', 'standard'],
  ['7:15 – 7:45 AM', 'BREAKFAST', 'Eat Healthy, Think Better', 'Nutrition & Energy', '🥗', 'standard'],
  ['7:45 – 10:15 AM', 'ELECTRICAL ENGINEERING (THEORY)', 'Core Subject – ESE / MPSC / SSC JE / RRB JE', 'Concept Building', '📖', 'technical'],
  ['10:15 – 10:30 AM', 'SHORT BREAK', 'Tea / Break', 'Relax & Re-energize', '☕', 'standard'],
  ['10:30 – 1:00 PM', 'ELECTRICAL ENGINEERING (NUMERICALS)', 'Numericals + Problem Solving', 'Practice & Accuracy', '▦', 'technical'],
  ['1:00 – 2:00 PM', 'LUNCH & REST', 'Good Food, Good Mood', 'Recharge Yourself', '🍽️', 'standard'],
  ['2:00 – 4:00 PM', 'PYQs & MCQs PRACTICE', 'ESE / SSC JE / RRB JE', 'Exam Familiarity', '📝', 'technical'],
  ['4:00 – 4:30 PM', 'TEA BREAK', 'Short Break, Fresh Mind', 'Relax', '☕', 'standard'],
  ['4:30 – 5:30 PM', 'QUANTITATIVE APTITUDE', 'SSC / Railways / CGL', 'Speed & Accuracy', 'Σ', 'aptitude'],
  ['5:30 – 6:30 PM', 'REASONING ABILITY', 'SSC / Railways / CGL', 'Logical Thinking', '🧠', 'reasoning'],
  ['6:30 – 7:30 PM', 'GENERAL STUDIES & CURRENT AFFAIRS', 'Polity, History, Geography, Economy, Science, CA', 'Awareness & Knowledge', '🌐', 'gs'],
  ['7:30 – 8:15 PM', 'DINNER & FAMILY TIME', 'Take a Break, Stay Connected', 'Relax & Refresh', '👨‍👩‍👧', 'standard'],
  ['8:15 – 9:15 PM', 'ENGLISH', 'Grammar, Vocabulary, RC', 'CGL / SSC / All Exams', '🔤', 'english'],
  ['9:15 – 10:00 PM', 'REVISION & MOCK ANALYSIS', 'Mock Test / Error Analysis / Short Notes', 'Improve & Stay Ahead', '🎯', 'revision'],
  ['10:00 PM', 'SLEEP', 'Good Sleep, Better Tomorrow', '7 – 8 Hours Sleep', '🌙', 'standard'],
];

const coverage = ['UPSC ESE (Electrical)', 'MPSC Engineering Services', 'SSC JE', 'RRB JE / SSE', 'SSC CGL / CHSL / MTS', 'SSC GD', 'Railways NTPC / Group D & Other Govt. Exams'];
const distribution = [
  ['technical', 'TECHNICAL', '(Electrical Engg.)'],
  ['aptitude', 'APTITUDE', '(Quant + Reasoning)'],
  ['gs', 'GS + ENGLISH', '(Current Affairs, GK, English)'],
];
const rotation = [
  ['Mon', 'Network Theory + Engineering Maths'],
  ['Tue', 'Electrical Machines'],
  ['Wed', 'Power Systems'],
  ['Thu', 'Control Systems'],
  ['Fri', 'Power Electronics'],
  ['Sat', 'Electronics (Analog + Digital)'],
  ['Sun', 'Full Length Mock Test + Revision'],
];
const rules = ['Be Consistent', 'Follow the Plan', 'Avoid Distractions', 'Revise Regularly', 'Take Mock Tests', 'Analyze & Improve', 'Believe in Yourself'];
const quotes = [
  ['The harder you work for something, the greater you’ll feel when you achieve it.', 'mountain'],
  ['Don’t stop when you’re tired. Stop when you’re done.', 'sunrise'],
  ['Discipline today, success tomorrow.', 'hourglass'],
  ['Small daily improvements are the key to stunning results.', 'summit'],
  ['Your future is created by what you do today, not tomorrow.', 'lamp'],
];

function renderList(target, items, icon) {
  document.getElementById(target).innerHTML = items.map(item => `<li><span>${icon}</span>${item}</li>`).join('');
}

function renderHeader() {
  renderList('promise-list', promises, '✓');
  document.getElementById('exam-strip').innerHTML = exams.map((exam, index) => `<span class="exam-${index}">${exam}</span>`).join('<b>|</b>');
}

function renderSchedule() {
  document.getElementById('schedule').innerHTML = scheduleRows.map(row => `<tr class="${row[5]}">
    <td>${row[0]}</td>
    <td>${row[1]}</td>
    <td>${row[2]}</td>
    <td>${row[3]}</td>
    <td class="icon-cell">${row[4]}</td>
  </tr>`).join('');
}

function renderBottomPanels() {
  renderList('exam-coverage', coverage, '✓');
  document.getElementById('distribution-legend').innerHTML = distribution.map(([type, title, detail]) => `<li><span class="swatch ${type}"></span><b>${title}</b><small>${detail}</small></li>`).join('');
  document.getElementById('weekly-rotation').innerHTML = rotation.map(([day, subject]) => `<p><strong>${day}</strong><span>${subject}</span></p>`).join('');
  renderList('golden-rules', rules, '★');
}

function renderQuotes() {
  document.getElementById('quotes').innerHTML = quotes.map(([text, theme]) => `<article class="quote-card ${theme}"><span class="open-quote">“</span><p>${text}</p><span class="close-quote">”</span></article>`).join('');
}

renderHeader();
renderSchedule();
renderBottomPanels();
renderQuotes();
