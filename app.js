(() => {
  'use strict';
  const route = window.ROUTE;
  const stops = route.stops;
  const groupCount = new Set(stops.map(stop => stop.group)).size;
  const groupLabel = route.groupLabel || 'GRUPO';
  const kitLabel = route.kitLabel || 'Kit';
  const resetNote = route.resetNote ?? ' Las 3 paradas excluidas seguirán fuera del recorrido.';
  const key = 'parada:' + route.id;
  const ids = new Set(stops.map(stop => stop.id));
  const $ = selector => document.querySelector(selector);
  const copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
  const clockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  let storageAvailable = true;
  let visited = new Set();
  let history = [];
  let filter = 'all';
  let query = '';
  let copying = false;
  let toastTimer;
  let toastUndoId = null;
  let pendingImport = null;
  const migrationTarget = window.MIGRATION_TARGET || '';

  function readState() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) { visited = new Set(); history = []; return; }
      const value = JSON.parse(raw);
      visited = new Set(Array.isArray(value.visited) ? value.visited.filter(id => ids.has(id)) : []);
      history = Array.isArray(value.history) ? value.history.filter(id => visited.has(id)) : [];
    } catch { storageAvailable = false; }
  }
  function save(changes = []) {
    try { localStorage.setItem(key, JSON.stringify({ version: 1, visited: [...visited], history })); storageAvailable = true; }
    catch { storageAvailable = false; }
    if (changes.length) window.PokeSync?.record(changes);
  }
  function progressPayload() {
    return { format: 'parada-progress', version: 1, routeId: route.id, exportedAt: new Date().toISOString(), visited: [...visited], history: [...history] };
  }
  function validateProgress(value) {
    if (!value || value.format !== 'parada-progress' || value.version !== 1 || value.routeId !== route.id) throw new Error('Este archivo pertenece a otra ruta. Abre la ruta correspondiente para recuperarlo.');
    if (!Array.isArray(value.visited) || value.visited.length > stops.length || value.visited.some(id => !Number.isInteger(id) || !ids.has(id))) throw new Error('La copia contiene paradas no válidas.');
    if (!Array.isArray(value.history) || value.history.length > stops.length || value.history.some(id => !value.visited.includes(id))) throw new Error('El historial de la copia no es válido.');
    return { visited: [...new Set(value.visited)], history: [...new Set(value.history)] };
  }
  function offerImport(value) {
    pendingImport = validateProgress(value);
    const added = pendingImport.visited.filter(id => !visited.has(id)).length;
    $('#import-summary').textContent = 'La copia contiene ' + pendingImport.visited.length + ' visitas. Se añadirán ' + added + ' a tu progreso actual.';
    $('#import-dialog').showModal();
  }
  function exportProgress() {
    const blob = new Blob([JSON.stringify(progressPayload(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (route.backupPrefix || 'parada-londres') + '-progreso-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Copia preparada con ' + visited.size + ' visitas. Guárdala en tus archivos.');
  }
  async function importFile(file) {
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error('El archivo es demasiado grande para una copia de progreso.');
      let value;
      try { value = JSON.parse(await file.text()); } catch { throw new Error('No se puede leer esta copia. Selecciona el archivo descargado desde Guardar copia.'); }
      offerImport(value);
    } catch (error) { showToast(error.message); }
    finally { $('#progress-file').value = ''; }
  }
  function receiveMigration() {
    if (!location.hash.startsWith('#progress=')) return;
    const fragment = location.hash.slice(10);
    window.history.replaceState(null, '', location.pathname + location.search);
    try {
      if (fragment.length > 10000) throw new Error('El enlace de progreso no es válido.');
      offerImport(JSON.parse(decodeURIComponent(fragment)));
    } catch (error) { showToast('No se ha importado el enlace: ' + error.message); }
  }
  const number = id => String(id).padStart(2, '0');
  const distance = meters => meters >= 1000 ? (meters / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' km' : meters + ' m';
  const duration = seconds => seconds < 60 ? seconds + ' s' : seconds % 60 ? Math.floor(seconds / 60) + ' min ' + seconds % 60 + ' s' : seconds / 60 + ' min';
  const escaped = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function quest(stop, hero = false) {
    if (!stop.mission || !stop.reward) return '';
    return '<div class="' + (hero ? 'hero-task' : 'stop-quest') + '"><p>' + escaped(stop.mission) + '</p><span>' + stop.reward.toLocaleString('es-ES') + ' Polvos Estelares</span></div>';
  }
  function coordinates(stop) {
    const [lat, lng] = stop.coords.split(',');
    return '<span>' + lat + ',</span><span>' + lng + '</span>';
  }
  function onward(stop) {
    const next = stops[stop.id];
    if (!next) return '<div class="cooldown"><span aria-hidden="true">⚑</span><div><strong>Fin de ruta</strong><small>Última parada</small></div></div>';
    return '<div class="cooldown">' + clockIcon + '<div><strong>' + duration(next.waitSeconds) + ' de espera</strong><small>→ ' + number(next.id) + ' · ' + distance(next.distanceM) + '</small></div></div>';
  }
  function showToast(message, undoId = null) {
    clearTimeout(toastTimer);
    toastUndoId = undoId;
    $('#toast-message').textContent = message;
    $('#toast-undo').hidden = undoId === null;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6500);
  }
  function renderOverview() {
    const done = visited.size;
    const next = stops.find(stop => !visited.has(stop.id));
    const percent = Math.round(done / stops.length * 100);
    $('#visited-count').textContent = done;
    $('#remaining-count').textContent = (stops.length - done) + ' pendientes';
    $('#percent').textContent = percent + '%';
    $('#progress-fill').style.width = (done / stops.length * 100) + '%';
    $('.progress-track').setAttribute('aria-valuenow', done);
    $('#all-count').textContent = stops.length;
    $('#pending-count').textContent = stops.length - done;
    $('#done-count').textContent = done;
    $('#undo-last').disabled = !history.some(id => visited.has(id));
    $('#save-status').classList.toggle('error', !storageAvailable);
    $('#save-status').textContent = storageAvailable ? (window.PokeSync?.summary || '✓ Progreso guardado en este navegador') : 'No se puede guardar aquí. El progreso se perderá al cerrar.';
    if (!next) {
      $('#next-panel').innerHTML = '<div class="done-panel"><span class="done-symbol" aria-hidden="true">✓</span><div class="eyebrow">' + stops.length + ' DE ' + stops.length + '</div><h2>Ruta completada.</h2><p>Todas las coordenadas están marcadas. Puedes volver a copiarlas o deshacer una visita en la lista.</p><button class="text-button" data-action="reset">Empezar de nuevo ↗</button></div>';
      return;
    }
    const after = stops[next.id];
    const foot = after ? '<span class="clock-line">' + clockIcon + '<span>Después: <strong>' + duration(after.waitSeconds) + '</strong> hasta la ' + number(after.id) + '</span></span><span>' + distance(after.distanceM) + ' entre paradas</span>' : '<span>Última parada de tu ruta</span><span>Fin del recorrido</span>';
    $('#next-panel').innerHTML = '<div class="next-top"><div class="eyebrow"><span class="status-dot"></span>SIGUIENTE PARADA</div><span class="group-label">' + groupLabel + ' ' + number(next.group) + ' / ' + groupCount + '</span></div><div class="hero-number">Parada ' + number(next.id) + ' <span aria-hidden="true">·</span> ' + kitLabel + ' original ' + next.originalKit + '</div><h2 class="hero-coords">' + coordinates(next) + '</h2>' + quest(next, true) + '<button class="hero-copy" data-action="copy" data-id="' + next.id + '" aria-label="Copiar coordenadas de la parada ' + next.id + ' y marcar visitada">' + copyIcon + 'Copiar coordenadas <span aria-hidden="true">↗</span></button><div class="next-footer">' + foot + '</div>' + (next.id === 1 ? '<p class="initial-note">Primer salto: comprueba la espera inicial en «Antes de empezar».</p>' : '');
  }
  function renderList() {
    const nextId = stops.find(stop => !visited.has(stop.id))?.id;
    const search = query.trim().toLowerCase();
    const filtered = stops.filter(stop => {
      if (filter === 'visited' && !visited.has(stop.id)) return false;
      if (filter === 'pending' && visited.has(stop.id)) return false;
      if (!search) return true;
      if (/^\d+$/.test(search)) return stop.id === Number(search);
      return (stop.coords + ' kit ' + stop.originalKit + ' set ' + stop.originalKit + ' grupo ' + stop.group + ' ' + (stop.mission || '') + ' ' + (stop.missionCode || '')).toLowerCase().includes(search);
    });
    $('#list-count').textContent = filtered.length;
    if (!filtered.length) {
      const title = search ? 'No hay coincidencias.' : filter === 'visited' ? 'Tu primera parada te espera.' : 'Todo marcado. Ruta completada.';
      const detail = search ? 'Prueba otro número de parada, kit o coordenadas.' : filter === 'visited' ? 'Copia unas coordenadas y aparecerán aquí tachadas.' : 'Puedes revisar las paradas desde la pestaña Todas.';
      $('#route-list').innerHTML = '<div class="empty-state"><strong>' + title + '</strong><p>' + detail + '</p></div>';
      return;
    }
    const groups = new Map();
    for (const stop of filtered) {
      if (!groups.has(stop.group)) groups.set(stop.group, []);
      groups.get(stop.group).push(stop);
    }
    $('#route-list').innerHTML = [...groups].map(([group, shown]) => {
      const members = stops.filter(stop => stop.group === group);
      const done = members.filter(stop => visited.has(stop.id)).length;
      const body = shown.map(stop => {
        const isVisited = visited.has(stop.id);
        const isNext = stop.id === nextId;
        const meta = isVisited ? '<span>Visitada</span><button class="undo-stop" data-action="undo" data-id="' + stop.id + '" aria-label="Deshacer visita de la parada ' + stop.id + '">Deshacer</button>' : '<span>' + kitLabel + ' ' + stop.originalKit + '</span>' + (isNext ? '<span class="separator">·</span><span class="next-tag">Siguiente</span>' : '');
        return '<article class="stop' + (isVisited ? ' visited' : '') + (isNext ? ' is-next' : '') + '" id="stop-' + stop.id + '" aria-label="Parada ' + stop.id + (isVisited ? ', visitada' : ', pendiente') + '"><span class="stop-number" aria-hidden="true">' + (isVisited ? '✓' : number(stop.id)) + '</span><div class="stop-main"><div class="stop-coords">' + coordinates(stop) + '</div><div class="stop-meta">' + meta + '</div></div>' + onward(stop) + '<button class="copy-button" data-action="copy" data-id="' + stop.id + '" aria-label="' + (isVisited ? 'Volver a copiar' : 'Copiar') + ' coordenadas de la parada ' + stop.id + '">' + copyIcon + (isVisited ? 'Recopiar' : 'Copiar') + '</button>' + quest(stop) + '</article>';
      }).join('');
      return '<section class="route-group" aria-label="' + groupLabel + ' ' + group + '"><div class="group-heading"><h3>' + groupLabel + ' ' + number(group) + '</h3><span>' + done + '/' + members.length + ' visitadas</span></div><div class="group-body">' + body + '</div></section>';
    }).join('');
  }
  function render() { renderOverview(); renderList(); }
  async function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch { /* Try browser fallback. */ }
    }
    const focused = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.className = 'copy-fallback';
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } finally { textarea.remove(); focused?.focus({ preventScroll: true }); }
    if (!copied) throw new Error('Clipboard unavailable');
  }
  async function copyStop(id, source) {
    if (copying) return;
    const stop = stops.find(stop => stop.id === id);
    if (!stop) return;
    const fromHero = source.classList.contains('hero-copy');
    copying = true;
    source.disabled = true;
    try {
      await writeClipboard(stop.coords);
      const wasVisited = visited.has(id);
      if (!wasVisited) { visited.add(id); history.push(id); }
      save(wasVisited ? [] : [{ id, value: true }]);
      render();
      showToast('Parada ' + number(id) + (wasVisited ? ': coordenadas copiadas de nuevo.' : ': copiada y marcada visitada.'), wasVisited ? null : id);
      const target = fromHero ? $('.hero-copy') : $('#stop-' + id + ' .copy-button');
      if (target) target.focus({ preventScroll: true });
    } catch {
      source.disabled = false;
      showToast('No se pudo copiar. Permite el portapapeles e inténtalo de nuevo. No se ha marcado.');
    } finally { copying = false; }
  }
  function undo(id) {
    if (!visited.has(id)) return;
    visited.delete(id);
    history = history.filter(value => value !== id);
    save([{ id, value: false }]); render();
    showToast('Parada ' + number(id) + ' vuelve a estar pendiente.');
    $('#stop-' + id + ' .copy-button')?.focus({ preventScroll: true });
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'copy') copyStop(Number(button.dataset.id), button);
    if (button.dataset.action === 'undo') undo(Number(button.dataset.id));
    if (button.dataset.action === 'reset') $('#reset-dialog').showModal();
  });
  $('.filters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(element => {
      const active = element.dataset.filter === filter;
      element.classList.toggle('active', active);
      element.setAttribute('aria-pressed', String(active));
    });
    renderList();
  });
  $('#search').addEventListener('input', event => { query = event.target.value; renderList(); });
  $('#undo-last').addEventListener('click', () => { const id = [...history].reverse().find(id => visited.has(id)); if (id !== undefined) undo(id); });
  $('#toast-undo').addEventListener('click', () => { if (toastUndoId !== null) undo(toastUndoId); });
  $('#toast-close').addEventListener('click', () => { $('#toast').hidden = true; clearTimeout(toastTimer); });
  $('#reset').addEventListener('click', () => $('#reset-dialog').showModal());
  $('#export-progress').addEventListener('click', exportProgress);
  $('#import-progress').addEventListener('click', () => $('#progress-file').click());
  $('#progress-file').addEventListener('change', event => importFile(event.target.files[0]));
  $('#import-dialog').addEventListener('close', () => {
    const confirmed = $('#import-dialog').returnValue === 'import';
    $('#import-dialog').returnValue = '';
    if (confirmed && pendingImport) {
      const changes = pendingImport.visited.filter(id => !visited.has(id)).map(id => ({ id, value: true }));
      for (const id of pendingImport.visited) visited.add(id);
      history = [...new Set([...history, ...pendingImport.history, ...pendingImport.visited])];
      save(changes); render();
      showToast(storageAvailable ? 'Progreso recuperado: ' + visited.size + ' paradas guardadas.' : 'Visitas recuperadas, pero este navegador no permite guardarlas. Descarga una copia.');
    }
    pendingImport = null;
  });
  if (migrationTarget) {
    $('#migration-panel').hidden = false;
    $('#migrate-progress').addEventListener('click', () => {
      location.assign(migrationTarget + '#progress=' + encodeURIComponent(JSON.stringify(progressPayload())));
    });
  }
  $('#reset-dialog').addEventListener('close', () => {
    if ($('#reset-dialog').returnValue !== 'reset') return;
    $('#reset-dialog').returnValue = '';
    visited = new Set(); history = [];
    save(stops.map(stop => ({ id: stop.id, value: false }))); render(); showToast('Progreso reiniciado. Tu ruta está lista.');
  });
  window.addEventListener('pokehub:remote', event => {
    const next = event.detail.visited.filter(id => ids.has(id));
    visited = new Set(next);
    history = [...history.filter(id => visited.has(id)), ...next.filter(id => !history.includes(id))];
    save(); render();
  });
  window.addEventListener('pokehub:sync-status', () => {
    if (storageAvailable) $('#save-status').textContent = window.PokeSync.summary;
    $('#reset-dialog p').textContent = window.PokeSync?.connected
      ? 'Se quitarán las marcas de esta ruta en todos tus dispositivos conectados.' + resetNote
      : 'Se quitarán las marcas de esta ruta en este navegador.' + resetNote;
  });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) { readState(); render(); } });
  readState();
  render();
  receiveMigration();
})();
