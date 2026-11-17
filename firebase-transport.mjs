// Official, version-pinned browser SDK. Only Auth and Firestore are loaded.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, runTransaction } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import { compare, validRecord } from './sync-core.mjs';

export function firebaseTransport(config, routeId) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  auth.languageCode = 'es';
  const db = getFirestore(app);
  const stops = uid => collection(db, 'users', uid, 'routes', routeId, 'stops');
  return {
    authChanged: callback => onAuthStateChanged(auth, callback),
    login() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return signInWithPopup(auth, provider);
    },
    logout: () => signOut(auth),
    watch(uid, receive, fail) {
      return onSnapshot(stops(uid), { includeMetadataChanges: true }, snapshot => {
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        const records = {};
        snapshot.forEach(item => { records[item.id] = item.data(); });
        receive(records);
      }, fail);
    },
    async send(uid, pending) {
      const entries = Object.entries(pending);
      // A single transaction makes reset atomic and retries concurrent edits.
      return runTransaction(db, async transaction => {
        const refs = entries.map(([id]) => doc(stops(uid), id));
        const remote = await Promise.all(refs.map(reference => transaction.get(reference)));
        const result = {};
        entries.forEach(([id, record], index) => {
          const current = remote[index].exists() ? remote[index].data() : null;
          if (current && !validRecord(current)) throw new Error('invalid-remote-data');
          if (compare(record, current) > 0) {
            transaction.set(refs[index], record);
            result[id] = record;
          } else result[id] = current;
        });
        return result;
      });
    },
  };
}
