(function () {
  const queueKey = 'aaroh-cloud-sync-queue-v1';
  let appPromise;

  function firebaseConfig() {
    return window.AAROH_FIREBASE_CONFIG || null;
  }

  async function app() {
    if (!firebaseConfig()) return null;
    if (!appPromise) {
      appPromise = Promise.all([
        import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'),
        import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      ]).then(async ([firebase, firestore, auth]) => {
        const firebaseApp = firebase.initializeApp(firebaseConfig());
        const authClient = auth.getAuth(firebaseApp);
        if (!authClient.currentUser) await auth.signInAnonymously(authClient);
        return { db: firestore.getFirestore(firebaseApp), firestore, authClient };
      });
    }
    return appPromise;
  }

  async function syncDay(day, analytics) {
    const client = await app();
    if (!client) return false;
    const user = client.authClient.currentUser;
    if (!user) return false;
    const base = client.firestore.doc(client.db, 'users', user.uid, 'dailyAnalytics', day);
    await client.firestore.setDoc(base, { ...analytics.today, updatedAt: new Date().toISOString() }, { merge: true });
    await client.firestore.setDoc(client.firestore.doc(client.db, 'users', user.uid, 'weeklyAnalytics', day.slice(0, 10)), { ...analytics.weekly, updatedAt: new Date().toISOString() }, { merge: true });
    await client.firestore.setDoc(client.firestore.doc(client.db, 'users', user.uid, 'monthlyAnalytics', day.slice(0, 7)), { ...analytics.monthly, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  }

  async function flushQueue() {
    if (!navigator.onLine) return;
    const queued = JSON.parse(localStorage.getItem(queueKey) || '[]');
    const remaining = [];
    for (const item of queued) {
      try { await syncDay(item.day, { today: item.payload, weekly: {}, monthly: {} }); }
      catch { remaining.push(item); }
    }
    localStorage.setItem(queueKey, JSON.stringify(remaining));
  }

  window.AarohCloudSync = { syncDay, flushQueue };
  window.addEventListener('online', flushQueue);
  flushQueue();
}());
