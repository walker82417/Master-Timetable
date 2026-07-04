const admin = require('firebase-admin');
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

admin.initializeApp();
const db = admin.firestore();
const recipient = { email: 'rohandoiphode1@gmail.com', name: 'Officer Rohan' };

function transport() {
  const cfg = functions.config().smtp || {};
  if (!cfg.host || !cfg.user || !cfg.pass) throw new Error('SMTP config is required for actual email delivery.');
  return nodemailer.createTransport({ host: cfg.host, port: Number(cfg.port || 587), secure: cfg.secure === 'true', auth: { user: cfg.user, pass: cfg.pass } });
}

function subjectFor(kind) {
  if (kind === 'weekly') return 'Officer Rohan • Weekly Mission Report';
  if (kind === 'monthly') return 'Officer Rohan • Monthly Mission Report';
  return 'Officer Rohan • Daily Mission Report';
}

function htmlReport(kind, analytics) {
  const date = new Date().toLocaleDateString('en-IN', { dateStyle: 'full', timeZone: 'Asia/Kolkata' });
  return `<!doctype html><html><body style="margin:0;background:#071342;color:#fff;font-family:Arial,sans-serif"><main style="max-width:720px;margin:auto;padding:24px"><h1 style="color:#ffd83d">AAROH Mission Control</h1><p>Dear Officer Rohan,</p><p>Today's mission has been completed.</p><section style="background:#0d1d55;border-radius:12px;padding:18px"><h2>${kind.toUpperCase()} Report • ${date}</h2><p><b>Study Hours:</b> ${((analytics.actualStudySeconds || analytics.totalStudySeconds || 0)/3600).toFixed(1)}h</p><p><b>Completed Sessions:</b> ${analytics.completedSessions || 0}</p><p><b>Pending Missions:</b> ${analytics.pendingSessions || 0}</p><p><b>Completion:</b> ${analytics.completionPercentage || 0}%</p><p><b>Current Streak:</b> ${analytics.currentStreak || 0}</p></section><p style="color:#ffd83d">Tomorrow's first session: Wake Up and Plan Your Day.</p><p>Until tomorrow,<br>Mission Control</p></main></body></html>`;
}

function monthlyPdf(analytics) {
  return new Promise(resolve => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(24).text('Officer Rohan Monthly Mission Report');
    doc.moveDown().fontSize(14).text(`Monthly Study Hours: ${((analytics.totalStudySeconds || 0) / 3600).toFixed(1)}h`);
    doc.text(`Completion: ${analytics.completionPercentage || 0}%`);
    doc.text(`Completed Sessions: ${analytics.completedSessions || 0}`);
    doc.text(`Longest Streak: ${analytics.longestStreak || 0}`);
    doc.moveDown().text('Recommendations are based only on recorded study data inside Firestore.');
    doc.end();
  });
}

async function sendReport(kind, analytics) {
  const attachments = [];
  if (kind === 'monthly') attachments.push({ filename: `Officer_Rohan_Report_${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).replace(' ', '_')}.pdf`, content: await monthlyPdf(analytics) });
  const info = await transport().sendMail({ from: functions.config().smtp.from || functions.config().smtp.user, to: `${recipient.name} <${recipient.email}>`, subject: subjectFor(kind), html: htmlReport(kind, analytics), attachments });
  await db.collection('mailHistory').add({ kind, recipient, messageId: info.messageId, sentAt: admin.firestore.FieldValue.serverTimestamp(), analytics });
  return info.messageId;
}

exports.sendDailyMissionReport = functions.pubsub.schedule('15 22 * * *').timeZone('Asia/Kolkata').onRun(async () => {
  const snap = await db.collectionGroup('dailyAnalytics').where('day', '==', new Date().toISOString().slice(0, 10)).get();
  await Promise.all(snap.docs.map(doc => sendReport('daily', doc.data())));
});

exports.sendWeeklyMissionReport = functions.pubsub.schedule('20 22 * * 0').timeZone('Asia/Kolkata').onRun(async () => {
  const snap = await db.collectionGroup('weeklyAnalytics').get();
  await Promise.all(snap.docs.map(doc => sendReport('weekly', doc.data())));
});

exports.sendMonthlyMissionReport = functions.pubsub.schedule('25 22 28-31 * *').timeZone('Asia/Kolkata').onRun(async () => {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.getDate() !== 1) return null;
  const snap = await db.collectionGroup('monthlyAnalytics').get();
  await Promise.all(snap.docs.map(doc => sendReport('monthly', doc.data())));
});
