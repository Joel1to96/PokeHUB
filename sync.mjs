import { ProgressReplica } from './sync-core.mjs';
import { firebaseConfig } from './firebase-config.mjs';

const $ = selector => document.querySelector(selector);
const route = window.ROUTE;
const ids = route.stops.map(stop => stop.id);
const legacyKey = 'parada:' + route.id;
const ownerKey = 'pokehub:sync-owner:' + route.id;
const profileKey = uid => 'pokehub:sync:' + route.id + ':' + uid;
const device = [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2, '0')).join('');
let storageOK = true;
function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { storageOK = false; return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); storageOK = true; }
  catch { storageOK = false; }
}
let owner = read(ownerKey);
if (typeof owner !== 'string') owner = null;
let replica = owner ? new ProgressReplica(ids, device, read(profileKey(owner)) || {}) : null;
let user = null, transport = null, unsubscribe = null, ready = false, sending = false;
let sdkLoading = false, loginBusy = false, error = '', generation = 0, lastSaved = null;
let retryTimer, retryDelay = 1500, subscriptionFailed = false;
const pendingCount = () => replica ? Object.keys(replica.pending).length : 0;
const localVisits = () => {
  const saved = read(legacyKey);
  return Array.isArray(saved?.visited) ? saved.visited.filter(id => ids.includes(id)) : [];
};
function mergeOtherTabs() { if (owner && replica) replica.mergeLocal(read(profileKey(owner)) || {}); }
function persist() { if (owner && replica) write(profileKey(owner), replica.serialize()); }
function publish() {
  if (!replica) return;
  const next = replica.visited;
  const current = localVisits();
  if (next.length !== current.length || next.some(id => !current.includes(id))) {
    window.dispatchEvent(new CustomEvent('pokehub:remote', { detail: { visited: next } }));
  }
}
function status() {
  let label, detail, mood = 'local';
  const pending = pendingCount();
  if (!firebaseConfig) {
    label = 'Sincronización pendiente de activar';
    detail = 'Tu progreso sigue guardándose aquí. Falta conectar el proyecto de Firebase.';
  } else if (!storageOK) {
    label = 'Este navegador no permite guardar'; mood = 'error';
    detail = 'Permite el almacenamiento para conservar la sesión y los cambios pendientes. Puedes guardar una copia abajo.';
  } else if (error) {
    label = 'Guardado aquí · conexión pendiente'; mood = 'error'; detail = error;
  } else if (!navigator.onLine) {
    label = pending ? pending + ' cambios guardados sin conexión' : 'Sin conexión · guardado aquí';
    detail = 'Los cambios pendientes se enviarán al recuperar Internet con la sesión iniciada.'; mood = 'waiting';
  } else if (loginBusy || sdkLoading) {
    label = 'Preparando la conexión…'; detail = 'Tus paradas siguen disponibles mientras conectamos.'; mood = 'waiting';
  } else if (!user) {
    label = owner ? 'Sincronización en pausa' : 'Guardado en este navegador';
    detail = owner ? 'Vuelve a conectar tu cuenta de Google para enviar y recibir los cambios pendientes.' : 'Conecta la misma cuenta de Google en el PC y en el iPhone. Se conservarán las visitas que ya tengas.';
  } else if (!ready || sending || pending) {
    label = pending ? 'Sincronizando ' + pending + (pending === 1 ? ' cambio…' : ' cambios…') : 'Recuperando tu progreso…';
    detail = user.email + ' · Guardamos aquí mientras se actualiza tu cuenta.'; mood = 'waiting';
  } else {
    label = 'Sincronizado' + (lastSaved ? ' · ' + lastSaved.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '');
    detail = user.email + ' · Conecta esta misma cuenta en el otro dispositivo.'; mood = 'synced';
  }
  $('#sync-status').textContent = label;
  $('#sync-panel').dataset.state = mood;
  $('#sync-detail').textContent = detail;
  $('#sync-connect').hidden = !!user;
  $('#sync-connect').disabled = sdkLoading || loginBusy || !firebaseConfig;
  $('#sync-connect').textContent = owner ? 'Volver a conectar' : 'Conectar con Google';
  $('#sync-disconnect').hidden = !user;
  $('#sync-retry').hidden = !error || !firebaseConfig;
  window.PokeSync.summary = user && ready && !pending && !sending && !error && navigator.onLine
    ? '✓ Progreso sincronizado en tu cuenta' : owner ? '✓ Guardado aquí · ' + label.toLowerCase() : '✓ Progreso guardado en este navegador';
  window.PokeSync.connected = !!owner;
  window.dispatchEvent(new Event('pokehub:sync-status'));
}
window.PokeSync = {
  summary: '', connected: !!owner,
  record(changes) {
    if (!replica) return;
    try {
      mergeOtherTabs(); replica.change(changes); persist(); status();
      clearTimeout(retryTimer); retryTimer = setTimeout(flush, 150);
    } catch { error = 'No se pudo guardar la sincronización. Descarga una copia de tu progreso.'; status(); }
  },
};

async function flush() {
  if (!user || !ready || sending || !navigator.onLine || !pendingCount()) { status(); return; }
  const session = generation, uid = user.uid;
  mergeOtherTabs();
  const batch = structuredClone(replica.pending);
  if (!Object.keys(batch).length) return;
  sending = true; status();
  try {
    const remote = await transport.send(uid, batch);
    if (session !== generation) return;
    mergeOtherTabs(); replica.receive(remote); persist(); publish();
    lastSaved = new Date(); error = ''; retryDelay = 1500;
  } catch (reason) {
    if (session !== generation) return;
    error = reason?.code === 'permission-denied'
      ? 'Firebase no permite guardar. Tus cambios siguen aquí; vuelve a conectar tu cuenta o reintenta.'
      : 'No se pudo conectar. Tus cambios están guardados aquí y volveremos a intentarlo.';
    retryDelay = Math.min(retryDelay * 2, 60000);
  } finally {
    if (session === generation) {
      sending = false; status();
      if (pendingCount()) { clearTimeout(retryTimer); retryTimer = setTimeout(flush, error ? retryDelay : 100); }
    }
  }
}
function watch() {
  unsubscribe?.(); ready = false; subscriptionFailed = false;
  if (!user) { status(); return; }
  const session = generation;
  unsubscribe = transport.watch(user.uid, remote => {
    if (session !== generation) return;
    mergeOtherTabs(); replica.receive(remote); persist(); publish();
    ready = true; error = ''; lastSaved = new Date(); status(); flush();
  }, () => {
    if (session !== generation) return;
    ready = false; subscriptionFailed = true;
    error = 'No se pudo leer tu progreso en Firebase. Se conserva lo guardado aquí. Pulsa Reintentar.'; status();
  });
  status();
}
async function loadFirebase() {
  if (sdkLoading || transport || !firebaseConfig) { status(); return; }
  sdkLoading = true; error = ''; status();
  try {
    const { firebaseTransport } = await import('./firebase-transport.mjs');
    transport = firebaseTransport(firebaseConfig, route.id);
    transport.authChanged(nextUser => {
      generation++; unsubscribe?.(); unsubscribe = null; sending = false; ready = false;
      clearTimeout(retryTimer); user = nextUser; loginBusy = false; error = '';
      if (!user) { status(); return; }
      if (owner !== user.uid || !replica) {
        const visits = localVisits();
        const previousOwner = owner;
        owner = user.uid;
        const saved = read(profileKey(owner));
        replica = new ProgressReplica(ids, device, saved || {});
        if (!saved && (!previousOwner || previousOwner === owner)) replica.seed(visits);
        write(ownerKey, owner); persist(); publish();
      }
      watch();
    });
  } catch {
    error = 'No se pudo cargar Firebase. Comprueba la conexión y pulsa Reintentar; tus paradas siguen guardadas aquí.';
  } finally { sdkLoading = false; status(); }
}
$('#sync-connect').addEventListener('click', () => {
  if (!transport) { loadFirebase(); return; }
  // Invoke immediately in the click gesture so Safari can open the sign-in window.
  loginBusy = true; error = ''; status();
  transport.login().catch(reason => {
    loginBusy = false;
    error = reason?.code === 'auth/popup-blocked' ? 'Permite ventanas emergentes para PokeHUB y vuelve a conectar.'
      : reason?.code === 'auth/popup-closed-by-user' || reason?.code === 'auth/cancelled-popup-request' ? ''
      : 'No se pudo iniciar sesión. Vuelve a intentarlo con tu cuenta de Google.';
    status();
  });
});
$('#sync-retry').addEventListener('click', () => {
  error = ''; retryDelay = 1500;
  if (!transport) loadFirebase();
  else if (user && (subscriptionFailed || !ready)) watch();
  else flush();
});
$('#sync-disconnect').addEventListener('click', () => {
  $('#sync-pending-warning').textContent = pendingCount()
    ? 'Quedan ' + pendingCount() + ' cambios guardados aquí. Se enviarán cuando vuelvas a conectar esta cuenta.'
    : 'No hay cambios pendientes de enviar.';
  $('#sync-logout-dialog').showModal();
});
$('#sync-logout-dialog').addEventListener('close', async () => {
  const confirmed = $('#sync-logout-dialog').returnValue === 'logout';
  $('#sync-logout-dialog').returnValue = '';
  if (confirmed) {
    try { await transport.logout(); }
    catch { error = 'No se pudo cerrar la sesión. Inténtalo de nuevo.'; status(); }
  }
});
window.addEventListener('storage', event => {
  if (owner && event.key === profileKey(owner)) { mergeOtherTabs(); publish(); status(); flush(); }
});
window.addEventListener('online', () => { error = ''; if (!transport) loadFirebase(); else { if (subscriptionFailed && user) watch(); flush(); } });
window.addEventListener('offline', status);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (subscriptionFailed && user) watch(); flush(); } });
// Local code is available even when the CDN or Firebase cannot be reached.
if (replica) publish();
status(); loadFirebase();
