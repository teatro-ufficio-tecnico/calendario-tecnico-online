/* Calendario Ufficio Tecnico - apertura notifiche, versione 2. */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function notificationURL(data = {}) {
  const base = new URL('./', self.registration.scope);
  let target;
  try { target = new URL(data.url || base.href, base); }
  catch { target = new URL(base.href); }
  if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) target = new URL(base.href);
  if (data.evento !== undefined && data.evento !== null && String(data.evento)) {
    target.searchParams.set('evento', String(data.evento));
  }
  return target;
}

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  if (!data || typeof data !== 'object') data = {};
  const target = notificationURL(data);
  event.waitUntil(self.registration.showNotification(data.title || 'Calendario Ufficio Tecnico', {
    body: data.body || 'Il calendario è stato aggiornato.',
    tag: data.tag || 'calendar-update',
    icon: new URL('./calendar-icon-192.png', self.registration.scope).href,
    data: { url: target.href }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = notificationURL(event.notification.data || {});
  // Una nuova navigazione ricarica i dati e riesegue l'apertura di ?evento=ID.
  target.searchParams.set('_notifica', String(Date.now()));
  event.waitUntil((async () => {
    let windows = [];
    try { windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); }
    catch (error) { console.warn('Elenco finestre non disponibile', error); }
    const scope = new URL(self.registration.scope);
    const eligible = windows.filter(client => {
      try {
        const url = new URL(client.url);
        return url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
      } catch { return false; }
    }).sort((a,b) => Number(b.focused) - Number(a.focused));

    for (const client of eligible) {
      // Il fallimento del focus non deve impedire la navigazione.
      try { if ('focus' in client) await client.focus(); }
      catch (error) { console.warn('Focus non disponibile', error); }
      try {
        if ('navigate' in client) {
          const navigated = await client.navigate(target.href);
          if (navigated) {
            try { await navigated.focus(); } catch {}
            return;
          }
        }
      } catch (error) { console.warn('Navigazione finestra non riuscita', error); }
    }
    // Se non c'è una finestra utilizzabile, oppure navigate fallisce, aprine una.
    const opened = await self.clients.openWindow(target.href);
    if (opened) { try { await opened.focus(); } catch {} }
  })());
});
