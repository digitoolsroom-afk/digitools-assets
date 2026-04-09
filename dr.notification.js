
(function () {
  const ENDPOINT_READ     = 'https://xmot-l3ir-7kuj.p7.xano.io/api:ShnUEMUy/notif_is_readed';
  const ENDPOINT_REFRESH  = 'https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data';

  const getAuth  = () => { try { return JSON.parse(localStorage.getItem('auth') || 'null'); } catch { return null; } };
  const getToken = () => { const a = getAuth(); return a?.token || a?.authToken || null; };

  let _notifications = [];
  let _panelOpen = false;

  // ── INIT ──
  function init() {
    const auth = getAuth();
    if (!auth?.token) return;

    // Afficher la cloche
    document.querySelectorAll('[notif-container="true"]').forEach(el => {
      el.style.display = 'flex';
    });

    // Récupérer les notifs depuis le localStorage
    _notifications = auth.notifications || [];
    updateBadge();
    renderList();

    // Brancher la cloche
    document.querySelectorAll('[notif-container="true"]').forEach(el => {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        togglePanel();
      });
    });

    // Fermer en cliquant à côté
    document.getElementById('notif-overlay')?.addEventListener('click', closePanel);

    // Bouton tout marquer comme lu
    document.getElementById('notif-mark-all')?.addEventListener('click', markAllRead);

    // Retour depuis le détail
    document.getElementById('notif-detail-back')?.addEventListener('click', () => {
      document.getElementById('notif-detail').classList.remove('active');
    });
  }

  // ── BADGE ──
  function updateBadge() {
    const unreadCount = _notifications.filter(n => !n.is_read).length;
    const wrappers = document.querySelectorAll('[nb-notif-wrapper="true"]');
    const texts    = document.querySelectorAll('[nb-notif-text="true"]');

    wrappers.forEach(el => {
      if (unreadCount > 0) {
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
      } else {
        el.style.display = 'none';
      }
    });

    texts.forEach(el => {
      el.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
    });
  }

  // ── RENDER LIST ──
  function renderList() {
    const listEl = document.getElementById('notif-list');
    if (!listEl) return;

    if (!_notifications.length) {
      listEl.innerHTML = `
        <div class="notif-empty">
          <div class="notif-empty-icon">🔔</div>
          Aucune notification pour le moment
        </div>`;
      return;
    }

    const sorted = [..._notifications].sort((a, b) => b.created_at - a.created_at);
    listEl.innerHTML = '';

    sorted.forEach(notif => {
      const item = document.createElement('div');
      item.className = `notif-item ${notif.is_read ? 'read' : 'unread'}`;
      item.dataset.id = notif.id;

      const timeAgo = formatTimeAgo(notif.created_at);

      item.innerHTML = `
        <div class="notif-unread-dot"></div>
        <div class="notif-item-content">
          <div class="notif-item-title">${notif.title}</div>
          <div class="notif-item-time">${timeAgo}</div>
        </div>
      `;

      item.addEventListener('click', () => openDetail(notif));
      listEl.appendChild(item);
    });
  }

  // ── OPEN DETAIL ──
  async function openDetail(notif) {
    // Afficher le détail
    document.getElementById('notif-detail-title').textContent  = notif.title;
    document.getElementById('notif-detail-message').textContent = notif.message;
    const btn = document.getElementById('notif-detail-btn');
    if (btn) {
      btn.href = notif.redirect_url || '#';
      btn.style.display = notif.redirect_url ? 'inline-flex' : 'none';
    }
    document.getElementById('notif-detail').classList.add('active');

    // Marquer comme lue si pas encore fait
    if (!notif.is_read) {
      await markRead(notif.id);
    }
  }

  // ── MARK READ (une seule) ──
  async function markRead(notifId) {
    const token = getToken();
    if (!token) return;

    try {
      await fetch(ENDPOINT_READ, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ notification_id: notifId })
      });

      // Mettre à jour localement
      const notif = _notifications.find(n => n.id === notifId);
      if (notif) notif.is_read = true;

      // Mettre à jour le localStorage
      updateLocalStorage();
      updateBadge();
      renderList();

    } catch(e) { console.warn('[Notif] Erreur markRead:', e); }
  }

  // ── MARK ALL READ ──
  async function markAllRead() {
    const token = getToken();
    if (!token) return;

    const unread = _notifications.filter(n => !n.is_read);
    if (!unread.length) return;

    // Appel séquentiel pour chaque notif non lue
    for (const notif of unread) {
      try {
        await fetch(ENDPOINT_READ, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ notification_id: notif.id })
        });
        notif.is_read = true;
      } catch(e) { console.warn('[Notif] Erreur markAllRead:', e); }
    }

    updateLocalStorage();
    updateBadge();
    renderList();
  }

  // ── UPDATE LOCALSTORAGE ──
  function updateLocalStorage() {
    try {
      const auth = getAuth();
      if (auth) {
        auth.notifications = _notifications;
        localStorage.setItem('auth', JSON.stringify(auth));
      }
    } catch(e) { console.warn('[Notif] Erreur localStorage:', e); }
  }

  // ── TOGGLE PANEL ──
  function togglePanel() {
    if (_panelOpen) closePanel();
    else openPanel();
  }

  function openPanel() {
    _panelOpen = true;
    document.getElementById('notif-panel')?.classList.add('active');
    document.getElementById('notif-overlay')?.classList.add('active');
    document.getElementById('notif-detail')?.classList.remove('active');
  }

  function closePanel() {
    _panelOpen = false;
    document.getElementById('notif-panel')?.classList.remove('active');
    document.getElementById('notif-overlay')?.classList.remove('active');
    document.getElementById('notif-detail')?.classList.remove('active');
  }

  // ── FORMAT TIME ──
  function formatTimeAgo(ms) {
    const diff = Date.now() - ms;
    const min  = Math.floor(diff / 60000);
    const h    = Math.floor(diff / 3600000);
    const d    = Math.floor(diff / 86400000);
    if (min < 1)  return "À l'instant";
    if (min < 60) return `Il y a ${min} min`;
    if (h < 24)   return `Il y a ${h}h`;
    if (d < 7)    return `Il y a ${d} jour${d > 1 ? 's' : ''}`;
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(ms));
  }

  // ── REFRESH NOTIFS depuis l'API au chargement ──
  async function refreshNotifs() {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(ENDPOINT_REFRESH, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.ok) {
        const fresh = await res.json();
        const auth = getAuth();
        if (auth) {
          auth.notifications = fresh.notifications || [];
          localStorage.setItem('auth', JSON.stringify(auth));
          _notifications = auth.notifications;
          updateBadge();
          renderList();
        }
      }
    } catch(e) { console.warn('[Notif] Erreur refresh:', e); }
  }

  // ── START ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => { init(); await refreshNotifs(); });
  } else {
    init();
    refreshNotifs();
  }

})();
