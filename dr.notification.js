
(function () {
  var ENDPOINT_READ     = 'https://xmot-l3ir-7kuj.p7.xano.io/api:ShnUEMUy/notif_is_readed';
  var ENDPOINT_READ_ALL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:ShnUEMUy/all_notification_is_readed';
  var ENDPOINT_REFRESH  = 'https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data';

  function getAuth()  { try { return JSON.parse(localStorage.getItem('auth') || 'null'); } catch(e) { return null; } }
  function getToken() { var a = getAuth(); return (a && (a.token || a.authToken)) || null; }

  var _notifications = [];

  function init() {
    var auth = getAuth();
    if (!auth || !auth.token) return;

    document.querySelectorAll('[notif-container="true"]').forEach(function(el) {
      el.style.display = 'flex';
    });

    _notifications = auth.notifications || [];
    updateBadge();
    renderList();

    document.querySelectorAll('[notif-container="true"]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        openPanel();
      });
    });

    var closeBtn = document.getElementById('notif-close');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    var overlay = document.getElementById('notif-overlay');
    if (overlay) overlay.addEventListener('click', function(e) {
      if (e.target === this) closePanel();
    });

    var markAllBtn = document.getElementById('notif-mark-all');
    if (markAllBtn) markAllBtn.addEventListener('click', markAllRead);

    var backBtn = document.getElementById('notif-detail-back');
    if (backBtn) backBtn.addEventListener('click', function() {
      document.getElementById('notif-detail').classList.remove('active');
    });
  }

  function updateBadge() {
    var unreadCount = _notifications.filter(function(n) { return !n.is_read; }).length;

    document.querySelectorAll('[nb-notif-wrapper="true"]').forEach(function(el) {
      if (unreadCount > 0) {
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
      } else {
        el.style.display = 'none';
      }
    });

    document.querySelectorAll('[nb-notif-text="true"]').forEach(function(el) {
      el.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
    });
  }

  function renderList() {
    var listEl = document.getElementById('notif-list');
    if (!listEl) return;

    if (!_notifications.length) {
      listEl.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon">🔔</div>Aucune notification pour le moment</div>';
      return;
    }

    var sorted = _notifications.slice().sort(function(a, b) { return b.created_at - a.created_at; });
    listEl.innerHTML = '';

    sorted.forEach(function(notif) {
      var item = document.createElement('div');
      item.className = 'notif-item ' + (notif.is_read ? 'read' : 'unread');
      item.dataset.id = notif.id;
      item.innerHTML =
        '<div class="notif-unread-dot"></div>' +
        '<div class="notif-item-content">' +
          '<div class="notif-item-title">' + notif.title + '</div>' +
          '<div class="notif-item-time">' + formatTimeAgo(notif.created_at) + '</div>' +
        '</div>';
      item.addEventListener('click', function() { openDetail(notif); });
      listEl.appendChild(item);
    });
  }

  function openDetail(notif) {
    var titleEl = document.getElementById('notif-detail-title');
    var msgEl   = document.getElementById('notif-detail-message');
    var btn     = document.getElementById('notif-detail-btn');
    if (titleEl) titleEl.textContent = notif.title;
    if (msgEl)   msgEl.textContent   = notif.message;
    if (btn) {
      btn.href = notif.redirect_url || '#';
      btn.style.display = notif.redirect_url ? 'inline-flex' : 'none';
    }
    document.getElementById('notif-detail').classList.add('active');
    if (!notif.is_read) markRead(notif.id);
  }

  function markRead(notifId) {
    var token = getToken();
    if (!token) return;
    fetch(ENDPOINT_READ, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ notification_id: notifId })
    }).then(function() {
      var notif = _notifications.find(function(n) { return n.id === notifId; });
      if (notif) notif.is_read = true;
      updateLocalStorage();
      updateBadge();
      renderList();
    }).catch(function(e) { console.warn('[Notif] Erreur markRead:', e); });
  }

  function markAllRead() {
    var token = getToken();
    if (!token) return;
    var unread = _notifications.filter(function(n) { return !n.is_read; });
    if (!unread.length) return;
    var ids = unread.map(function(n) { return n.id; });
    fetch(ENDPOINT_READ_ALL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ notification_ids: ids })
    }).then(function() {
      _notifications.forEach(function(n) { n.is_read = true; });
      updateLocalStorage();
      updateBadge();
      renderList();
    }).catch(function(e) { console.warn('[Notif] Erreur markAllRead:', e); });
  }

  function updateLocalStorage() {
    try {
      var auth = getAuth();
      if (auth) {
        auth.notifications = _notifications;
        localStorage.setItem('auth', JSON.stringify(auth));
      }
    } catch(e) { console.warn('[Notif] Erreur localStorage:', e); }
  }

  function openPanel() {
    document.getElementById('notif-overlay').classList.add('active');
    document.getElementById('notif-detail').classList.remove('active');
  }

  function closePanel() {
    document.getElementById('notif-overlay').classList.remove('active');
    document.getElementById('notif-detail').classList.remove('active');
  }

  function formatTimeAgo(ms) {
    var diff = Date.now() - ms;
    var min  = Math.floor(diff / 60000);
    var h    = Math.floor(diff / 3600000);
    var d    = Math.floor(diff / 86400000);
    if (min < 1)  return "A l'instant";
    if (min < 60) return 'Il y a ' + min + ' min';
    if (h < 24)   return 'Il y a ' + h + 'h';
    if (d < 7)    return 'Il y a ' + d + ' jour' + (d > 1 ? 's' : '');
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(ms));
  }

  function refreshNotifs() {
    var token = getToken();
    if (!token) return;
    fetch(ENDPOINT_REFRESH, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(fresh) {
        if (!fresh) return;
        var auth = getAuth();
        if (auth) {
          auth.notifications = fresh.notifications || [];
          localStorage.setItem('auth', JSON.stringify(auth));
          _notifications = auth.notifications;
          updateBadge();
          renderList();
        }
      }).catch(function(e) { console.warn('[Notif] Erreur refresh:', e); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { init(); refreshNotifs(); });
  } else {
    init();
    refreshNotifs();
  }

})();











(function () {
  var ENDPOINT_GET      = 'https://xmot-l3ir-7kuj.p7.xano.io/api:sfoT-uEe/get_notification';
  var ENDPOINT_READ     = 'https://xmot-l3ir-7kuj.p7.xano.io/api:ShnUEMUy/notif_is_readed';
  var ENDPOINT_READ_ALL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:ShnUEMUy/all_notification_is_readed';

  function getToken() {
    try {
      var auth = JSON.parse(localStorage.getItem('auth') || 'null');
      return (auth && (auth.token || auth.authToken)) || localStorage.getItem('adminAuthToken') || null;
    } catch(e) { return null; }
  }

  var _notifications = [];

  function updateBadge() {
    var unreadCount = _notifications.filter(function(n) { return !n.is_read; }).length;

    document.querySelectorAll('[admin-nb-notif-wrapper="true"]').forEach(function(el) {
      el.style.display = unreadCount > 0 ? 'flex' : 'none';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
    });

    document.querySelectorAll('[admin-nb-notif-text="true"]').forEach(function(el) {
      el.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
    });
  }

  function renderList() {
    var listEl = document.getElementById('admin-notif-list');
    if (!listEl) return;

    if (!_notifications.length) {
      listEl.innerHTML = '<div class="admin-notif-empty"><div class="admin-notif-empty-icon">🔔</div>Aucune notification pour le moment</div>';
      return;
    }

    var sorted = _notifications.slice().sort(function(a, b) { return b.created_at - a.created_at; });
    listEl.innerHTML = '';

    sorted.forEach(function(notif) {
      var item = document.createElement('div');
      item.className = 'admin-notif-item ' + (notif.is_read ? 'read' : 'unread');
      item.dataset.id = notif.id;
      item.innerHTML =
        '<div class="admin-notif-dot"></div>' +
        '<div class="admin-notif-item-content">' +
          '<div class="admin-notif-item-title">' + notif.title + '</div>' +
          '<div class="admin-notif-item-time">' + formatTimeAgo(notif.created_at) + '</div>' +
        '</div>';
      item.addEventListener('click', function() { openDetail(notif); });
      listEl.appendChild(item);
    });
  }

  function openDetail(notif) {
    document.getElementById('admin-notif-detail-title').textContent   = notif.title;
    document.getElementById('admin-notif-detail-message').textContent = notif.message;
    var btn = document.getElementById('admin-notif-detail-btn');
    if (btn) {
      btn.href = notif.redirect_url || '#';
      btn.style.display = notif.redirect_url ? 'inline-flex' : 'none';
    }
    document.getElementById('admin-notif-detail').classList.add('active');
    if (!notif.is_read) markRead(notif.id);
  }

  function markRead(notifId) {
    var token = getToken();
    if (!token) return;
    fetch(ENDPOINT_READ, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ notification_id: notifId })
    }).then(function() {
      var notif = _notifications.find(function(n) { return n.id === notifId; });
      if (notif) notif.is_read = true;
      updateBadge();
      renderList();
    }).catch(function(e) { console.warn('[AdminNotif] Erreur markRead:', e); });
  }

  function markAllRead() {
    var token = getToken();
    if (!token) return;
    var unread = _notifications.filter(function(n) { return !n.is_read; });
    if (!unread.length) return;
    var ids = unread.map(function(n) { return n.id; });
    fetch(ENDPOINT_READ_ALL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ notification_ids: ids })
    }).then(function() {
      _notifications.forEach(function(n) { n.is_read = true; });
      updateBadge();
      renderList();
    }).catch(function(e) { console.warn('[AdminNotif] Erreur markAllRead:', e); });
  }

  function openPanel() {
    document.getElementById('admin-notif-overlay').classList.add('active');
    document.getElementById('admin-notif-detail').classList.remove('active');
  }

  function closePanel() {
    document.getElementById('admin-notif-overlay').classList.remove('active');
    document.getElementById('admin-notif-detail').classList.remove('active');
  }

  function formatTimeAgo(ms) {
    var diff = Date.now() - ms;
    var min  = Math.floor(diff / 60000);
    var h    = Math.floor(diff / 3600000);
    var d    = Math.floor(diff / 86400000);
    if (min < 1)  return "A l'instant";
    if (min < 60) return 'Il y a ' + min + ' min';
    if (h < 24)   return 'Il y a ' + h + 'h';
    if (d < 7)    return 'Il y a ' + d + ' jour' + (d > 1 ? 's' : '');
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(ms));
  }

  function loadNotifications() {
    var token = getToken();
    if (!token) return;
    fetch(ENDPOINT_GET, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(res) { return res.ok ? res.json() : []; })
    .then(function(data) {
      _notifications = Array.isArray(data) ? data : [];
      updateBadge();
      renderList();
    })
    .catch(function(e) { console.warn('[AdminNotif] Erreur chargement:', e); });
  }

  function init() {
    // Brancher la cloche
    document.querySelectorAll('[admin-notif-container="true"]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        openPanel();
      });
    });

    // Fermer
    document.getElementById('admin-notif-close')?.addEventListener('click', closePanel);
    document.getElementById('admin-notif-overlay')?.addEventListener('click', function(e) {
      if (e.target === this) closePanel();
    });

    // Tout marquer comme lu
    document.getElementById('admin-notif-mark-all')?.addEventListener('click', markAllRead);

    // Retour depuis le détail
    document.getElementById('admin-notif-detail-back')?.addEventListener('click', function() {
      document.getElementById('admin-notif-detail').classList.remove('active');
    });

    // Charger les notifs
    loadNotifications();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();


