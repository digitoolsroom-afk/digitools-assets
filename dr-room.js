/* ============================================================
   ROOM BACKOFFICE — Script principal v2
   À héberger sur GitHub et charger via <script src="...">

   STRUCTURE :
   1. CONFIG & UTILS
   2. Gère la section marketing
   3. Gère le formulaire de création de room
   4. Gère le dashboard room (banner, stats, posts, webinaires, contenus, notifs)
   5. Gère le composer de posts
   6. Gère les actions (delete post, delete webinar, remove content)
   7. Gère les modales (edit room, webinar, content, edit post)
   8. Inject boutons tooltips "?"
   9. INIT — point d'entrée + appel endpoint au chargement
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     1. CONFIG & UTILS
     ============================================================ */

  var BASE_URL   = 'https://xmot-l3ir-7kuj.p7.xano.io/api:vRpHgMHS';
  var UPLOAD_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof';
  var XANO_BASE  = 'https://xmot-l3ir-7kuj.p7.xano.io';
  var ROOM_BASE  = 'https://www.digitools-room.com/rooms/';

  var _roomData = null;

  function getAuth() {
    return JSON.parse(localStorage.getItem('auth') || 'null');
  }
  function getToken() {
    var a = getAuth(); return a && a.token;
  }

  function getHeaders(withAuth) {
    var h = { 'Content-Type': 'application/json' };
    if (withAuth) { var t = getToken(); if (t) h['Authorization'] = 'Bearer ' + t; }
    return h;
  }

  /* Fixe les URL relatives Xano (/vault/...) */
  function fixUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return XANO_BASE + url;
  }

  function fmt(n) { return (n || 0).toLocaleString('fr-FR'); }

  function timeAgo(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    var m = Math.floor(diff / 60000);
    if (m < 1)  return 'À l\'instant';
    if (m < 60) return 'Il y a ' + m + 'min';
    var h = Math.floor(m / 60);
    if (h < 24) return 'Il y a ' + h + 'h';
    return 'Il y a ' + Math.floor(h / 24) + 'j';
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts));
  }

  function showToast(msg, duration) {
    var el = document.getElementById('rd-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, duration || 3000);
  }

  function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
  }

  function hideError(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('visible');
  }

  function openModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  function openConfirmModal(title, message, onConfirm) {
    var overlay = document.getElementById('rd-modal-confirm');
    if (!overlay) return;
    var t = document.getElementById('rd-confirm-title');
    var m = document.getElementById('rd-confirm-message');
    var ok  = document.getElementById('rd-confirm-ok');
    var cancel = document.getElementById('rd-confirm-cancel');
    if (t) t.textContent = title;
    if (m) m.innerHTML  = message;
    overlay.classList.add('active');
    /* Clone pour vider les anciens listeners */
    var newOk = ok.cloneNode(true);
    ok.parentNode.replaceChild(newOk, ok);
    newOk.addEventListener('click', function () {
      overlay.classList.remove('active');
      onConfirm();
    });
    if (cancel) cancel.onclick = function () { overlay.classList.remove('active'); };
    overlay.onclick = function (e) { if (e.target === overlay) overlay.classList.remove('active'); };
  }

  function openPopover(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function closePopover(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  /* ---- Bind tous les boutons de fermeture ---- */
  function bindCloseButtons() {
    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(btn.dataset.close); });
    });
    document.querySelectorAll('[data-close-popover]').forEach(function (btn) {
      btn.addEventListener('click', function () { closePopover(btn.dataset.closePopover); });
    });
    document.querySelectorAll('.rd-modal-overlay').forEach(function (o) {
      o.addEventListener('click', function (e) { if (e.target === o) o.classList.remove('active'); });
    });
    document.querySelectorAll('.rd-popover-overlay').forEach(function (o) {
      o.addEventListener('click', function (e) { if (e.target === o) o.classList.remove('active'); });
    });
  }

  /* ---- Upload image générique ---- */
  function bindUpload(inputId, hiddenId, statusId, previewId, previewWrapId) {
    var input   = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('change', async function () {
      var file = input.files[0];
      if (!file) return;

      var status  = document.getElementById(statusId);
      var hidden  = document.getElementById(hiddenId);
      var preview = previewId ? document.getElementById(previewId) : null;
      var previewWrap = previewWrapId ? document.getElementById(previewWrapId) : null;

      if (status) status.textContent = '⏳ Upload en cours…';
      if (previewWrap) previewWrap.classList.remove('visible');

      var fd = new FormData();
      fd.append('file', file);
      var headers = {};
      var t = getToken();
      if (t) headers['Authorization'] = 'Bearer ' + t;

      try {
        var res  = await fetch(UPLOAD_URL, { method: 'POST', headers: headers, body: fd });
        var data = await res.json();
        var url  = fixUrl(data.url || data.path || '');
        if (!url) throw new Error('URL manquante');

        if (hidden)  hidden.value = url;
        if (status)  status.textContent = '✅ Image chargée';
        if (preview) { preview.src = url; }
        if (previewWrap) previewWrap.classList.add('visible');
        else if (preview) { preview.classList.add('visible'); }

      } catch (e) {
        if (status) status.textContent = '❌ Erreur lors de l\'upload';
        console.error('[Upload]', e);
      }
    });
  }

  /* ============================================================
     2. GÈRE LA SECTION MARKETING
     ============================================================ */

  function showMarketing() {
    var el = document.getElementById('room-marketing');
    if (el) el.style.display = 'block';
  }

  function hideMarketing() {
    var el = document.getElementById('room-marketing');
    if (el) el.style.display = 'none';
  }

  function showDashboard(data) {
    var el = document.getElementById('room-dashboard');
    if (el) el.style.display = 'flex';

    var room  = data.room_details  || {};
    var posts = data.room_posts    || [];
    var webs  = data.room_webinars || [];
    var conts = data.room_contents || [];

    renderBanner(room);
    renderStats(room, posts, webs);
    renderPosts(posts);
    renderWebinars(webs);
    renderContents(conts);
    renderNotifs(data);
    injectTooltipButtons();
  }

  function hideDashboard() {
    var el = document.getElementById('room-dashboard');
    if (el) el.style.display = 'none';
  }

  /* ============================================================
     3. GÈRE LE FORMULAIRE DE CRÉATION DE ROOM
     ============================================================ */

  function initMarketing() {
    /* Les boutons CTA ouvrent la modal SANS cacher le marketing
       (le marketing reste visible derrière la modal) */
    ['rm-btn-create-hero', 'rm-btn-create-bottom'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', function () {
          openModal('rd-modal-create-room');
        });
      }
    });
  }

  function initCreateRoom() {
    /* Upload bannière création — ce fichier gère l'upload avec fixUrl
       Le toggle exemples + fermeture modal sont dans le script inline
       de room-create-modal.html pour éviter les doubles binds */
    bindUpload(
      'rd-create-banner-file',
      'rd-create-banner-url',
      'rd-create-banner-status',
      'rd-create-banner-preview',
      'rd-create-banner-preview-wrap'
    );

    /* Bouton créer */
    var btn = document.getElementById('rd-btn-create-room-submit');
    if (!btn) return;

    btn.addEventListener('click', async function () {
      hideError('rd-create-room-error');

      var titleEl   = document.getElementById('rd-create-room-title');
      var headerEl  = document.getElementById('rd-create-room-header');
      var descEl    = document.getElementById('rd-create-room-desc');
      var title     = titleEl  ? titleEl.value.trim()   : '';
      var header    = headerEl ? headerEl.value.trim()  : '';
      var desc      = descEl   ? descEl.innerHTML.trim() : '';
      var cover_url = (document.getElementById('rd-create-banner-url') || {}).value || '';

      /* Validation bloquante */
      if (!title) {
        showError('rd-create-room-error', '⚠️ Le titre de la room est obligatoire.');
        if (titleEl) { titleEl.style.borderColor = '#ef4444'; titleEl.focus(); }
        return;
      }
      if (!header) {
        showError('rd-create-room-error', '⚠️ L\'accroche est obligatoire.');
        if (headerEl) { headerEl.style.borderColor = '#ef4444'; headerEl.focus(); }
        return;
      }
      if (!desc || desc === '<br>') {
        showError('rd-create-room-error', '⚠️ La description est obligatoire.');
        if (descEl) { descEl.style.outline = '2px solid #ef4444'; descEl.focus(); }
        return;
      }

      btn.textContent = 'Création en cours…';
      btn.disabled    = true;

      try {
        var res = await fetch(BASE_URL + '/room_create', {
          method:  'POST',
          headers: getHeaders(true),
          body:    JSON.stringify({ title: title, description: desc, cover_url: cover_url, header: header })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erreur serveur');

        closeModal('rd-modal-create-room');
        hideMarketing();
        showToast('🎉 Votre room est en ligne !');
        await loadRoomData();

      } catch (e) {
        showError('rd-create-room-error', e.message || 'Une erreur est survenue.');
        btn.textContent = '🚀 Créer ma room';
        btn.disabled    = false;
      }
    });

    /* Reset border color au focus */
    ['rd-create-room-title', 'rd-create-room-desc'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('focus', function () { el.style.borderColor = ''; });
    });
  }

  /* ============================================================
     4. CHARGEMENT PRINCIPAL — appelé au load ET après chaque action
     ============================================================ */

  async function loadRoomData() {
    var t = getToken();
    if (!t) { showMarketing(); hideDashboard(); return; }

    try {
      var res  = await fetch(BASE_URL + '/room_my', { headers: getHeaders(true) });
      var data = await res.json();

      if (!res.ok || data.status === 'no-room' || !data.room_details) {
        showMarketing();
        hideDashboard();
        return;
      }

      _roomData = data;
      hideMarketing();
      showDashboard(data);

    } catch (e) {
      console.error('[RoomBackoffice] Erreur chargement room:', e);
      showMarketing();
      hideDashboard();
    }
  }

  /* ============================================================
     4b. RENDER BANNER
     ============================================================ */

  function renderBanner(room) {
    setText('rd-room-title',      room.title       || '—');
    setText('rd-room-desc', room.header || room.description || '—');
    setText('rd-followers-count', fmt(room.followers_count || 0));
    setText('rd-posts-count',     fmt(_roomData.room_post_count || 0));

    /* Bannière — pleine largeur */
    var cover = document.getElementById('rd-cover-img');
    if (cover) {
      if (room.cover_url) {
        cover.src              = fixUrl(room.cover_url);
        cover.style.display    = 'block';
        cover.style.width      = '100%';
        cover.style.height     = '100%';
        cover.style.objectFit  = 'cover';
        cover.style.position   = 'absolute';
        cover.style.inset      = '0';
        cover.style.opacity    = '.35';
      } else {
        cover.style.display = 'none';
      }
    }

    /* Lien "Voir ma room" */
    var linkBtn = document.getElementById('rd-btn-view-room');
    if (linkBtn && room.slug) {
      linkBtn.href = ROOM_BASE + room.slug;
    }
  }

  /* ============================================================
     4c. RENDER STATS
     ============================================================ */

  function renderStats(room, posts, webs) {
    setText('rd-stat-followers', fmt(room.followers_count || 0));
    setText('rd-stat-views',     fmt(room.views_count     || 0));
    setText('rd-stat-posts',     fmt(_roomData.room_post_count || 0));
    setText('rd-stat-webinars',  fmt(webs.length));
  }

  /* ============================================================
     4d. RENDER POSTS
     ============================================================ */

  function renderPostTypeBadge(type) {
    var map = {
      text:     { label: '📝 Texte',     bg: '#f3f4f6',  color: '#374151' },
      link:     { label: '🔗 Lien',      bg: '#eff6ff',  color: '#2563eb' },
      article:  { label: '🔗 Article',   bg: '#eff6ff',  color: '#2563eb' },
      formation:{ label: '🎓 Formation', bg: '#eff6ff',  color: '#2563eb' },
      resource: { label: '📦 Ressource', bg: '#f0fdf4',  color: '#15803d' },
      webinar:  { label: '🎓 Webinar',   bg: '#dbeafe',  color: '#1d4ed8' },
      video:    { label: '🎬 Vidéo',     bg: '#fdf4ff',  color: '#7e22ce' },
    };
    var t = map[type] || { label: type, bg: '#f3f4f6', color: '#374151' };
    return '<span style="font-size:.62rem;font-weight:700;padding:2px 8px;border-radius:20px;background:' + t.bg + ';color:' + t.color + ';flex-shrink:0;">' + t.label + '</span>';
  }

  function renderPosts(posts) {
    var list = document.getElementById('rd-posts-list');
    if (!list) return;

    if (!posts || !posts.length) {
      list.innerHTML = '<div class="rd-empty" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:100%;text-align:center;"><div class="rd-empty-icon">📭</div>Aucun post pour le moment — publiez votre première actu !</div>';
      list.style.position = 'relative';
      return;
    }
    list.style.position = '';

    /* Trier en décroissant */
    posts = posts.slice().sort(function(a, b) { return b.created_at - a.created_at; });
    list.innerHTML = posts.map(function (p) {
      /* Extrait du contenu — texte brut tronqué, nettoie les styles inline Webflow */
      var tmp = document.createElement('div');
      tmp.innerHTML = p.content || '';
      var rawText = (tmp.textContent || tmp.innerText || '').trim();
      var excerpt = rawText.length > 90 ? rawText.substring(0, 90) + '…' : rawText;

      /* Infos attachement */
      var attachInfo = '';
      var url = p.article_url || p.course_url || '';
      if (p.post_type === 'webinar' && p.webinars_id) {
        attachInfo = '<span style="font-size:.7rem;color:#6b7280;">📅 Webinaire rattaché</span>';
      } else if (p.post_type === 'resource' && p.blog_ressources_id) {
        attachInfo = '<span style="font-size:.7rem;color:#6b7280;">📦 Ressource rattachée</span>';
      } else if (url) {
        var domain = '';
        try { domain = new URL(url).hostname.replace('www.', ''); } catch(e) {}
        attachInfo = '<span style="font-size:.7rem;color:#6b7280;">🔗 ' + domain + '</span>';
      }

      return '<div class="rd-post-item" data-post-id="' + p.id + '">' +
        '<div class="rd-post-header">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            renderPostTypeBadge(p.post_type) +
            '<span style="font-size:.7rem;color:#9ca3af;">' + timeAgo(p.created_at) + '</span>' +
          '</div>' +
          '<div class="rd-post-actions">' +
            '<button class="rd-post-action-btn rd-view-post-btn" data-id="' + p.id + '" title="Voir le post">👁</button>' +
            '<button class="rd-post-action-btn rd-edit-post-btn" data-id="' + p.id + '" data-content="' + encodeURIComponent(p.content || '') + '" title="Modifier">✏️</button>' +
            '<button class="rd-post-action-btn danger rd-delete-post-btn" data-id="' + p.id + '" title="Supprimer">🗑</button>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:.85rem;color:#374151;line-height:1.5;margin:8px 0 6px;">' + (excerpt || '<em style="color:#9ca3af;">Post sans texte</em>') + '</div>' +
        (attachInfo ? '<div style="margin-bottom:6px;">' + attachInfo + '</div>' : '') +
        '<div class="rd-post-stats">' +
          '<span class="rd-post-stat">❤️ ' + fmt(p.likes_count) + '</span>' +
          '<span class="rd-post-stat">💬 ' + fmt(p.comments_count) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    /* Stocker les posts pour la modal détail */
    list._posts = posts;

    /* Bouton voir détail */
    list.querySelectorAll('.rd-view-post-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var postId = parseInt(btn.dataset.id);
        var p = (list._posts || []).find(function(x){ return x.id === postId; });
        if (!p) return;
        openPostDetailModal(p);
      });
    });

    list.querySelectorAll('.rd-edit-post-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setVal('rd-edit-post-id',      btn.dataset.id);
        setVal('rd-edit-post-content', decodeURIComponent(btn.dataset.content));
        hideError('rd-edit-post-error');
        openModal('rd-modal-edit-post');
      });
    });

    list.querySelectorAll('.rd-delete-post-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openConfirmModal('Supprimer ce post ?', 'Cette action est irréversible.', function() {
          deletePost(btn.dataset.id);
        });
      });
    });
  }

  function openPostDetailModal(p) {
    var overlay = document.getElementById('rd-modal-post-detail');
    if (!overlay) return;
    var body = document.getElementById('rd-modal-post-detail-body');
    if (body) {
      var url = p.article_url || p.course_url || '';
      var attachHtml = '';
      if (url) {
        var domain = '';
        try { domain = new URL(url).hostname.replace('www.', ''); } catch(e) {}
        attachHtml = '<a href="' + url + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f8faff;border:1px solid #e0e7ff;border-radius:10px;margin-top:12px;text-decoration:none;">' +
          '<span style="font-size:1.2rem;">🔗</span>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:.7rem;color:#9ca3af;">' + domain + '</div>' +
            '<div style="font-size:.8rem;font-weight:600;color:#111112;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + url + '</div>' +
          '</div>' +
        '</a>';
      }
      body.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">' +
          renderPostTypeBadge(p.post_type) +
          '<span style="font-size:.75rem;color:#9ca3af;">' + timeAgo(p.created_at) + '</span>' +
        '</div>' +
        '<div style="font-size:.88rem;color:#374151;line-height:1.7;">' + (p.content || '<em>Aucun texte</em>') + '</div>' +
        attachHtml +
        '<div style="display:flex;gap:14px;margin-top:16px;padding-top:14px;border-top:1px solid #f1f5f9;">' +
          '<span style="font-size:.82rem;color:#6b7280;">❤️ ' + fmt(p.likes_count) + ' like' + (p.likes_count > 1 ? 's' : '') + '</span>' +
          '<span style="font-size:.82rem;color:#6b7280;">💬 ' + fmt(p.comments_count) + ' commentaire' + (p.comments_count > 1 ? 's' : '') + '</span>' +
        '</div>';
    }
    overlay.classList.add('active');
    var closeBtn = document.getElementById('rd-modal-post-detail-close');
    if (closeBtn) closeBtn.onclick = function() { overlay.classList.remove('active'); };
    overlay.onclick = function(e) { if (e.target === overlay) overlay.classList.remove('active'); };
  }

  /* ============================================================
     4e. RENDER WEBINAIRES
     ============================================================ */

  function renderWebinars(webs) {
    var list = document.getElementById('rd-webinar-list');
    if (!list) return;

    if (!webs || !webs.length) {
      list.innerHTML = '<div class="rd-empty" style="padding:12px 0;"><div class="rd-empty-icon">🎓</div>Aucun webinaire</div>';
      return;
    }

    var now = Date.now();
    list.innerHTML = webs.map(function (w) {
      var upcoming = w.scheduled_at > now;
      var badge = upcoming
        ? '<span class="rd-webinar-badge upcoming">🟢 À venir</span>'
        : '<span class="rd-webinar-badge past">⏸ Passé</span>';

      /* Bouton replay : uniquement si passé ET pas de replay renseigné */
      var replayBtn = (!upcoming && !w.replay_url)
        ? '<button class="rd-webinar-btn rd-add-replay-btn" data-id="' + w.id + '" style="background:#eff6ff;color:#2563eb;border-color:#bfdbfe;">+ Ajouter le replay</button>'
        : '';

      /* Si replay déjà renseigné : afficher un lien */
      var replayLink = (!upcoming && w.replay_url)
        ? '<a href="' + w.replay_url + '" target="_blank" style="font-size:.7rem;color:#2563eb;text-decoration:underline;">▶ Voir le replay</a>'
        : '';

      return '<div class="rd-webinar-item">' +
        badge +
        '<div class="rd-webinar-title">' + (w.title || '—') + '</div>' +
        '<div class="rd-webinar-meta">' +
          '<span>📅 ' + fmtDate(w.scheduled_at) + '</span>' +
          '<span>⏱ ' + (w.duration_minutes || '—') + ' min · ' + (w.outi_webinar || '—') + '</span>' +
        '</div>' +
        (replayLink ? '<div style="margin-bottom:6px;">' + replayLink + '</div>' : '') +
        '<div class="rd-webinar-footer">' +
          '<span class="rd-webinar-registrations">👥 ' + fmt(w.registrations_count) + ' inscrits</span>' +
          '<div class="rd-webinar-actions">' +
            replayBtn +
            '<button class="rd-webinar-btn rd-edit-webinar-btn" data-id="' + w.id + '">✏️ Modifier</button>' +
            '<button class="rd-webinar-btn danger rd-delete-webinar-btn" data-id="' + w.id + '">🗑</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.rd-add-replay-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var w = (_roomData.room_webinars || []).find(function (x) { return String(x.id) === String(btn.dataset.id); });
        if (!w) return;
        openEditWebinar(w);
        /* Focus sur le champ replay après ouverture */
        setTimeout(function () {
          var replayField = document.getElementById('rd-webinar-replay');
          if (replayField) replayField.focus();
        }, 200);
      });
    });

    list.querySelectorAll('.rd-edit-webinar-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var w = (_roomData.room_webinars || []).find(function (x) { return String(x.id) === String(btn.dataset.id); });
        if (w) openEditWebinar(w);
      });
    });

    list.querySelectorAll('.rd-delete-webinar-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openConfirmModal('Supprimer ce webinaire ?', 'Cette action est irréversible.', function() {
          deleteWebinar(btn.dataset.id);
        });
      });
    });
  }

  /* ============================================================
     4f. RENDER CONTENUS
     ============================================================ */

  function renderContents(conts) {
    var list = document.getElementById('rd-content-list');
    if (!list) return;

    if (!conts || !conts.length) {
      list.innerHTML = '<div class="rd-empty" style="padding:8px 0;font-size:.78rem;">Aucun contenu rattaché</div>';
      return;
    }

    list.innerHTML = conts.map(function (item) {
      var type  = item.type || item.content_type || 'article';
      var det   = item.details || item;
      var name  = det.title || det.title_short || '—';
      var nameShort = name.length > 35 ? name.substring(0, 35) + '…' : name;
      /* L'id du record room_contents — peut être à la racine ou dans details */
      var contentId = item.id || det.id || '';
      var labels2 = { article: 'Article', course: 'Formation', resource: 'Ressource' };
      return '<div class="rd-content-item">' +
        '<span class="rd-content-type-badge ' + type + '">' + (labels2[type] || type) + '</span>' +
        '<span class="rd-content-name" title="' + name + '">' + nameShort + '</span>' +
        '<button class="rd-content-remove" data-id="' + contentId + '" data-name="' + nameShort + '">✕</button>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.rd-content-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openConfirmModal(
          'Retirer ce contenu ?',
          'Voulez-vous retirer <strong>' + (btn.dataset.name || 'ce contenu') + '</strong> de votre room ?',
          function () { removeContent(btn.dataset.id); }
        );
      });
    });
  }

  /* ============================================================
     4g. RENDER NOTIFS
     ============================================================ */

  function renderNotifs(data) {
    var list = document.getElementById('rd-notif-list');
    if (!list) return;

    /* Fusionner les 3 types et trier par date décroissante */
    var all = [];

    (data.notif_follower || []).forEach(function(n) {
      all.push({ type: 'follow', created_at: n.created_at, data: n });
    });
    (data.notif_webinar || []).forEach(function(n) {
      all.push({ type: 'webinar', created_at: n.created_at, data: n });
    });
    (data.notif_comment || []).forEach(function(n) {
      all.push({ type: 'comment', created_at: n.created_at, data: n });
    });

    all.sort(function(a, b) { return b.created_at - a.created_at; });

    if (!all.length) {
      list.innerHTML = '<div class="rd-empty" style="padding:12px 0;"><div class="rd-empty-icon">🔕</div>Aucune activité ces 7 derniers jours</div>';
      return;
    }

    list.innerHTML = all.map(function(n) {
      var icon, msg, detail = '';
      if (n.type === 'follow') {
        icon = '👥';
        var uFollow = n.data._user || {};
        var nameFollow = ((uFollow.first_name || '') + ' ' + (uFollow.name || '')).trim();
        msg = (nameFollow || 'Quelqu\'un') + ' suit maintenant votre room';
      } else if (n.type === 'webinar') {
        icon = '🎓';
        var uWeb = n.data._user || {};
        var nameWeb = ((uWeb.first_name || '') + ' ' + (uWeb.name || '')).trim();
        msg = (nameWeb || 'Quelqu\'un') + ' s\'est inscrit à votre webinaire';
      } else {
        icon = '💬';
        var uCom = n.data._user || {};
        var nameCom = ((uCom.first_name || '') + ' ' + (uCom.name || '')).trim();
        msg = (nameCom || 'Quelqu\'un') + ' a commenté votre post';
        if (n.data.content) {
          detail = '<div style="font-size:.7rem;color:#6b7280;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;">"' + n.data.content.substring(0, 60) + (n.data.content.length > 60 ? '…' : '') + '"</div>';
        }
      }
      return '<div class="rd-notif-item">' +
        '<div class="rd-notif-icon">' + icon + '</div>' +
        '<div class="rd-notif-text">' +
          msg + detail +
          '<div class="rd-notif-time">' + timeAgo(n.created_at) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ============================================================
     5. COMPOSER — Publier un post
     ============================================================ */

  var _currentPostType   = 'text';
  var _currentAttachId   = null;
  var _currentAttachName = null;
  var _ogData = { url: '', title: '', image: '', domain: '' };

  function initComposer() {
    /* Bind rich text toolbar buttons */
    document.querySelectorAll('.rd-rt-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cmd = btn.dataset.cmd;
        if (!cmd) return;
        document.execCommand(cmd, false, null);
        var ed = document.getElementById('rd-post-content');
        if (ed) ed.focus();
      });
    });

    document.querySelectorAll('.rd-composer-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.rd-composer-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        _currentPostType  = tab.dataset.type;
        _currentAttachId  = null;
        _currentAttachName = null;
        _ogData = { url: '', title: '', image: '', domain: '' };
        updateComposerUI();
      });
    });

    var textarea = document.getElementById('rd-post-content');
    if (textarea) {
      textarea.addEventListener('input', function () {
        setText('rd-char-count', textarea.value.length + ' / 500');
      });
    }

    var urlInput = document.getElementById('rd-url-input');
    if (urlInput) {
      var ogTimer;
      urlInput.addEventListener('input', function () {
        clearTimeout(ogTimer);
        var val = urlInput.value.trim();
        if (!val || !val.startsWith('http')) {
          document.getElementById('rd-og-preview') && document.getElementById('rd-og-preview').classList.remove('visible');
          return;
        }
        ogTimer = setTimeout(function () { fetchOG(val); }, 900);
      });
    }

    var removeOG = document.getElementById('rd-og-remove');
    if (removeOG) {
      removeOG.addEventListener('click', function () {
        _ogData = { url: '', title: '', image: '', domain: '' };
        setVal('rd-url-input', '');
        document.getElementById('rd-og-preview') && document.getElementById('rd-og-preview').classList.remove('visible');
      });
    }

    var attachSelect = document.getElementById('rd-attach-select');
    if (attachSelect) {
      attachSelect.addEventListener('change', function () {
        var opt = attachSelect.options[attachSelect.selectedIndex];
        if (!opt || !opt.value) return;
        _currentAttachId   = opt.value;
        _currentAttachName = opt.text;
        setText('rd-attach-name', _currentAttachName);
        document.getElementById('rd-attach-selected') && document.getElementById('rd-attach-selected').classList.add('visible');
      });
    }

    var clearBtn = document.getElementById('rd-attach-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        _currentAttachId = _currentAttachName = null;
        document.getElementById('rd-attach-selected') && document.getElementById('rd-attach-selected').classList.remove('visible');
        setVal('rd-attach-select', '');
      });
    }

    var publishBtn = document.getElementById('rd-btn-publish');
    if (publishBtn) publishBtn.addEventListener('click', publishPost);
  }

  function updateComposerUI() {
    var urlZone    = document.getElementById('rd-url-zone');
    var attachZone = document.getElementById('rd-attach-zone');

    if (urlZone)    urlZone.classList.remove('visible');
    if (attachZone) attachZone.classList.remove('visible');
    var sel = document.getElementById('rd-attach-selected');
    if (sel) sel.classList.remove('visible');
    var og = document.getElementById('rd-og-preview');
    if (og) og.classList.remove('visible');

    if (_currentPostType === 'link'     && urlZone)    urlZone.classList.add('visible');
    if (_currentPostType === 'video'    && urlZone)    urlZone.classList.add('visible');
    if ((_currentPostType === 'resource' || _currentPostType === 'webinar') && attachZone) {
      attachZone.classList.add('visible');
      populateAttachSelect(_currentPostType); /* async — pas besoin d'await ici */
    }
  }

  async function populateAttachSelect(type) {
    var select = document.getElementById('rd-attach-select');
    if (!select) return;
    select.innerHTML = '<option value="">⏳ Chargement…</option>';
    select.disabled = true;

    if (type === 'webinar') {
      select.innerHTML = '<option value="">— Choisir —</option>';
      select.disabled  = false;
      var items = _roomData && _roomData.room_webinars || [];
      items.forEach(function (w) {
        var o = document.createElement('option');
        o.value = w.id;
        o.textContent = w.title || 'Webinaire #' + w.id;
        select.appendChild(o);
      });
      return;
    }

    /* Pour resource (et article/course si besoin futur) : appel get_content_id */
    try {
      var res   = await fetch(BASE_URL + '/get_content_id?content_type=' + type, { headers: getHeaders(true) });
      var data  = await res.json();
      var items = Array.isArray(data) ? data : (data.content || []);

      select.innerHTML = '<option value="">— Choisir —</option>';
      select.disabled  = false;

      if (!items || !items.length) {
        select.innerHTML = '<option value="" disabled>Aucune ressource publiée</option>';
        return;
      }

      items.forEach(function (item) {
        var o = document.createElement('option');
        o.value = item.id;
        o.textContent = item.title || item.title_short || 'Ressource #' + item.id;
        select.appendChild(o);
      });
    } catch (e) {
      select.innerHTML = '<option value="" disabled>Erreur de chargement</option>';
      select.disabled  = false;
      console.error('[populateAttachSelect]', e);
    }
  }

  async function fetchOG(url) {
    try {
      var res  = await fetch('https://api.microlink.io?url=' + encodeURIComponent(url));
      var data = await res.json();
      if (data.status !== 'success') return;

      _ogData.url    = url;
      _ogData.title  = (data.data && data.data.title)                        || '';
      _ogData.image  = (data.data && data.data.image && data.data.image.url) || '';
      _ogData.domain = (data.data && data.data.publisher)                    || '';
      try { if (!_ogData.domain) _ogData.domain = new URL(url).hostname.replace('www.', ''); } catch(e){}

      setText('rd-og-title',  _ogData.title);
      setText('rd-og-domain', _ogData.domain);
      var img = document.getElementById('rd-og-img');
      if (img && _ogData.image) img.src = _ogData.image;
      var og = document.getElementById('rd-og-preview');
      if (og) og.classList.add('visible');
    } catch (e) {
      console.warn('[OG]', e);
    }
  }

  async function publishPost() {
    var rtEditor = document.getElementById('rd-post-content');
    var content = rtEditor ? rtEditor.innerHTML.trim() : '';
    /* Nettoyage : si juste <br> ou vide */ 
    if (content === '<br>' || content === '') content = '';
    if (!content.trim()) { showToast('❌ Le contenu du post est vide.'); return; }

    var btn = document.getElementById('rd-btn-publish');
    if (btn) { btn.textContent = 'Publication…'; btn.disabled = true; }

    var body = {
      content:     content.trim(),
      post_type:   _currentPostType === 'link' ? 'article' : _currentPostType,
      article_url: (_currentPostType === 'link' || _currentPostType === 'video') ? (_ogData.url || (document.getElementById('rd-url-input') || {}).value || '') : '',
      course_url:  '',
      resource_id: _currentPostType === 'resource' ? (parseInt(_currentAttachId) || null) : null,
      webinar_id:  _currentPostType === 'webinar'  ? (parseInt(_currentAttachId) || null) : null
    };

    try {
      var res = await fetch(BASE_URL + '/post_create', {
        method:  'POST',
        headers: getHeaders(true),
        body:    JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Erreur publication');

      showToast('✅ Post publié !');
      /* Reset rich text editor (innerHTML, pas value) */
      var rtEd = document.getElementById('rd-post-content');
      if (rtEd) rtEd.innerHTML = '';
      setText('rd-char-count', '0 / 500');
      _currentPostType = 'text';
      _currentAttachId = _currentAttachName = null;
      _ogData = { url: '', title: '', image: '', domain: '' };
      document.querySelectorAll('.rd-composer-tab').forEach(function (t) { t.classList.remove('active'); });
      var first = document.querySelector('.rd-composer-tab[data-type="text"]');
      if (first) first.classList.add('active');
      updateComposerUI();
      await loadRoomData();
    } catch (e) {
      showToast('❌ Erreur lors de la publication.');
    } finally {
      if (btn) { btn.textContent = 'Publier'; btn.disabled = false; }
    }
  }

  /* ============================================================
     6. ACTIONS — Delete / Remove
     ============================================================ */

  async function deletePost(postId) {
    try {
      var res = await fetch(BASE_URL + '/post_delate', {
        method: 'POST', headers: getHeaders(true),
        body: JSON.stringify({ post_id: parseInt(postId) })
      });
      if (!res.ok) throw new Error();
      showToast('🗑 Post supprimé.');
      await loadRoomData();
    } catch (e) { showToast('❌ Impossible de supprimer le post.'); }
  }

  async function deleteWebinar(webinarId) {
    try {
      var res = await fetch(BASE_URL + '/webinar_delate', {
        method: 'POST', headers: getHeaders(true),
        body: JSON.stringify({ webinar_id: parseInt(webinarId) })
      });
      if (!res.ok) throw new Error();
      showToast('🗑 Webinaire supprimé.');
      await loadRoomData();
    } catch (e) { showToast('❌ Impossible de supprimer le webinaire.'); }
  }

  async function removeContent(contentId) {
    try {
      var res = await fetch(BASE_URL + '/content_delate', {
        method: 'POST', headers: getHeaders(true),
        body: JSON.stringify({ content_id: parseInt(contentId) })
      });
      if (!res.ok) throw new Error();
      showToast('🗑 Contenu retiré.');
      await loadRoomData();
    } catch (e) { showToast('❌ Impossible de retirer ce contenu.'); }
  }

  /* ============================================================
     7. MODALES
     ============================================================ */

  /* ---- Edit post ---- */
  function initEditPost() {
    var btn = document.getElementById('rd-btn-save-post');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      hideError('rd-edit-post-error');
      var id      = (document.getElementById('rd-edit-post-id')      || {}).value || '';
      var content = (document.getElementById('rd-edit-post-content') || {}).value || '';
      if (!content.trim()) { showError('rd-edit-post-error', 'Le contenu ne peut pas être vide.'); return; }
      btn.textContent = 'Enregistrement…'; btn.disabled = true;
      try {
        var res = await fetch(BASE_URL + '/post_modify', {
          method: 'POST', headers: getHeaders(true),
          body: JSON.stringify({ post_id: parseInt(id), content: content.trim() })
        });
        if (!res.ok) throw new Error();
        closeModal('rd-modal-edit-post');
        showToast('✅ Post modifié.');
        await loadRoomData();
      } catch (e) { showError('rd-edit-post-error', 'Une erreur est survenue.'); }
      finally { btn.textContent = 'Enregistrer'; btn.disabled = false; }
    });
  }

  /* ---- Edit room ---- */
  function initEditRoom() {
    var editBtn = document.getElementById('rd-btn-edit-room');
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        if (!_roomData) return;
        var room = _roomData.room_details || {};
        setVal('rd-edit-room-title',  room.title       || '');
        setVal('rd-edit-room-header', room.header      || '');
        /* Description rich text */
        var descEd = document.getElementById('rd-edit-room-desc');
        if (descEd) descEd.innerHTML = room.description || '';
        setVal('rd-banner-url', '');
        var status  = document.getElementById('rd-banner-status');
        var preview = document.getElementById('rd-banner-preview');
        if (status)  status.textContent = '';
        if (preview) {
          preview.classList.remove('visible');
          if (room.cover_url) { preview.src = fixUrl(room.cover_url); preview.classList.add('visible'); }
        }
        hideError('rd-edit-room-error');
        openModal('rd-modal-edit-room');
      });
    }

    bindUpload('rd-banner-file', 'rd-banner-url', 'rd-banner-status', 'rd-banner-preview');

    var saveBtn = document.getElementById('rd-btn-save-room');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', async function () {
      hideError('rd-edit-room-error');
      var title    = (document.getElementById('rd-edit-room-title') || {}).value || '';
      var desc     = (document.getElementById('rd-edit-room-desc')  || {}).value || '';
      var coverUrl = (document.getElementById('rd-banner-url')      || {}).value || '';
      if (!title.trim()) { showError('rd-edit-room-error', 'Le titre est obligatoire.'); return; }
      var body = { title: title, description: desc, header: header };
      if (coverUrl) body.cover_url = coverUrl;
      saveBtn.textContent = 'Enregistrement…'; saveBtn.disabled = true;
      try {
        var res = await fetch(BASE_URL + '/room_update', {
          method: 'POST', headers: getHeaders(true), body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error();
        closeModal('rd-modal-edit-room');
        showToast('✅ Room mise à jour.');
        await loadRoomData();
      } catch (e) { showError('rd-edit-room-error', 'Une erreur est survenue.'); }
      finally { saveBtn.textContent = 'Enregistrer'; saveBtn.disabled = false; }
    });
  }

  /* ---- Webinar ---- */
  function initWebinar() {
    var addBtn = document.getElementById('rd-btn-add-webinar');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        resetWebinarForm();
        setText('rd-modal-webinar-title', '🎓 Nouveau webinaire');
        document.getElementById('rd-btn-save-webinar').textContent = 'Publier le webinaire';
        openModal('rd-modal-webinar');
      });
    }

    bindUpload('rd-webinar-cover-file', 'rd-webinar-cover-url', 'rd-webinar-cover-status', 'rd-webinar-cover-preview');

    var saveBtn = document.getElementById('rd-btn-save-webinar');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', async function () {
      hideError('rd-webinar-error');
      var id       = (document.getElementById('rd-webinar-id')        || {}).value || '';
      var title    = (document.getElementById('rd-webinar-title')     || {}).value || '';
      var desc     = (document.getElementById('rd-webinar-desc')      || {}).value || '';
      var cover    = (document.getElementById('rd-webinar-cover-url') || {}).value || '';
      var dateVal  = (document.getElementById('rd-webinar-date')      || {}).value || '';
      var duration = (document.getElementById('rd-webinar-duration')  || {}).value || '';
      var tool     = (document.getElementById('rd-webinar-tool')      || {}).value || '';
      var link     = (document.getElementById('rd-webinar-link')      || {}).value || '';
      var replay   = (document.getElementById('rd-webinar-replay')    || {}).value || '';

      if (!title.trim()) { showError('rd-webinar-error', 'Le titre est obligatoire.'); return; }
      if (!dateVal)       { showError('rd-webinar-error', 'La date est obligatoire.');  return; }
      if (!link.trim())   { showError('rd-webinar-error', 'Le lien de connexion est obligatoire.'); return; }

      var body = {
        title: title, description: desc, cover_url: cover,
        scheduled_at: new Date(dateVal).getTime(),
        duration_minutes: parseInt(duration) || 60,
        outi_webinar: tool, external_link: link, replay_url: replay
      };
      var isEdit = !!id;
      if (isEdit) body.webinar_id = parseInt(id);

      saveBtn.textContent = 'Enregistrement…'; saveBtn.disabled = true;
      try {
        var res = await fetch(BASE_URL + (isEdit ? '/webinar_update' : '/webinar_create'), {
          method: 'POST', headers: getHeaders(true), body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error();
        closeModal('rd-modal-webinar');
        showToast(isEdit ? '✅ Webinaire mis à jour.' : '✅ Webinaire créé !');
        await loadRoomData();
      } catch (e) { showError('rd-webinar-error', 'Une erreur est survenue.'); }
      finally { saveBtn.textContent = isEdit ? 'Enregistrer' : 'Publier le webinaire'; saveBtn.disabled = false; }
    });
  }

  function openEditWebinar(w) {
    resetWebinarForm();
    setText('rd-modal-webinar-title', '✏️ Modifier le webinaire');
    document.getElementById('rd-btn-save-webinar').textContent = 'Enregistrer';
    setVal('rd-webinar-id',       String(w.id));
    setVal('rd-webinar-title',    w.title         || '');
    setVal('rd-webinar-desc',     w.description   || '');
    setVal('rd-webinar-duration', String(w.duration_minutes || ''));
    setVal('rd-webinar-tool',     w.outi_webinar  || 'Google Meet');
    setVal('rd-webinar-link',     w.external_link || '');
    setVal('rd-webinar-replay',   w.replay_url    || '');
    if (w.scheduled_at) {
      var d = new Date(w.scheduled_at);
      var dt = d.getFullYear() + '-' +
               String(d.getMonth()+1).padStart(2,'0') + '-' +
               String(d.getDate()).padStart(2,'0') + 'T' +
               String(d.getHours()).padStart(2,'0') + ':' +
               String(d.getMinutes()).padStart(2,'0');
      setVal('rd-webinar-date', dt);
    }
    if (w.cover_url) {
      var prev = document.getElementById('rd-webinar-cover-preview');
      if (prev) { prev.src = fixUrl(w.cover_url); prev.classList.add('visible'); }
    }
    openModal('rd-modal-webinar');
  }

  function resetWebinarForm() {
    ['rd-webinar-id','rd-webinar-title','rd-webinar-desc','rd-webinar-cover-url',
     'rd-webinar-date','rd-webinar-duration','rd-webinar-link','rd-webinar-replay'].forEach(function (id) { setVal(id, ''); });
    var prev   = document.getElementById('rd-webinar-cover-preview');
    var status = document.getElementById('rd-webinar-cover-status');
    if (prev)   prev.classList.remove('visible');
    if (status) status.textContent = '';
    hideError('rd-webinar-error');
  }

  /* ---- Content modal ---- */
  function initContentModal() {
    var addBtn = document.getElementById('rd-btn-add-content');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        resetContentForm();
        openModal('rd-modal-content');
      });
    }

    var typeSelect = document.getElementById('rd-content-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', async function () {
        var type = typeSelect.value;
        if (type) await loadContentOptions(type);
      });
    }

    var saveBtn = document.getElementById('rd-btn-save-content');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', async function () {
      hideError('rd-content-error');
      var type      = (document.getElementById('rd-content-type')   || {}).value || '';
      var contentId = (document.getElementById('rd-content-select') || {}).value || '';
      if (!type)      { showError('rd-content-error', 'Choisissez un type de contenu.'); return; }
      if (!contentId) { showError('rd-content-error', 'Sélectionnez un contenu.'); return; }

      var body = { content_type: type };
      if (type === 'article')  body.article_id  = parseInt(contentId);
      if (type === 'course')   body.course_id   = parseInt(contentId);
      if (type === 'resource') body.resource_id = parseInt(contentId);

      saveBtn.textContent = 'Rattachement…'; saveBtn.disabled = true;
      try {
        var res  = await fetch(BASE_URL + '/content_create', {
          method: 'POST', headers: getHeaders(true), body: JSON.stringify(body)
        });
        var data = await res.json();
        if (data && data.status === 'already-posted') {
          showError('rd-content-error', 'Ce contenu est déjà rattaché à votre room.'); return;
        }
        if (!res.ok) throw new Error();
        closeModal('rd-modal-content');
        showToast('✅ Contenu rattaché.');
        await loadRoomData();
      } catch (e) { showError('rd-content-error', 'Une erreur est survenue.'); }
      finally { saveBtn.textContent = 'Rattacher'; saveBtn.disabled = false; }
    });
  }

  async function loadContentOptions(type) {
    var emptyMsg   = document.getElementById('rd-content-empty-msg');
    var selectWrap = document.getElementById('rd-content-select-wrap');
    var selectEl   = document.getElementById('rd-content-select');
    var emptyLink  = document.getElementById('rd-content-empty-link');
    var emptyLabel = document.getElementById('rd-content-empty-label');

    if (emptyMsg)   emptyMsg.style.display   = 'none';
    if (selectWrap) selectWrap.style.display  = 'none';

    var links = {
      article:  'https://www.digitools-room.com/freelance/freelance-articles',
      course:   'https://www.digitools-room.com/freelance/formations',
      resource: 'https://www.digitools-room.com/freelance/freelance-articles'
    };
    var labels = { article: 'article', course: 'formation', resource: 'ressource' };

    try {
      var res   = await fetch(BASE_URL + '/get_content_id?content_type=' + type, { headers: getHeaders(true) });
      var data  = await res.json();
      var items = Array.isArray(data) ? data : (data.content || []);

      if (!items || !items.length) {
        if (emptyLabel) emptyLabel.textContent = 'Vous n\'avez pas encore publié de ' + (labels[type] || type);
        if (emptyLink)  emptyLink.href = links[type] || '#';
        if (emptyMsg)   emptyMsg.style.display = 'block';
        return;
      }

      if (selectEl) {
        selectEl.innerHTML = '<option value="">— Sélectionner —</option>';
        items.forEach(function (item) {
          var o = document.createElement('option');
          o.value       = item.id;
          o.textContent = item.title || item.title_short || 'Contenu #' + item.id;
          selectEl.appendChild(o);
        });
      }
      if (selectWrap) selectWrap.style.display = 'block';
    } catch (e) { console.error('[ContentOptions]', e); }
  }

  function resetContentForm() {
    setVal('rd-content-type', '');
    var emptyMsg   = document.getElementById('rd-content-empty-msg');
    var selectWrap = document.getElementById('rd-content-select-wrap');
    if (emptyMsg)   emptyMsg.style.display  = 'none';
    if (selectWrap) selectWrap.style.display = 'none';
    hideError('rd-content-error');
  }

  /* ============================================================
     8. INJECT BOUTONS TOOLTIPS "?"
     ============================================================ */

  function injectTooltipButtons() {
    /* Titre + "?" dans le header du composer */
    var composerHeader = document.querySelector('.rd-composer-header');
    if (composerHeader && !document.getElementById('rd-tooltip-feed')) {
      var titleRow = document.createElement('div');
      titleRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:16px 20px 12px;';
      titleRow.innerHTML =
        '<span style="font-size:.85rem;font-weight:700;color:#111112;">Publier une actualité dans votre feed</span>' +
        '<button class="rd-tooltip-trigger" id="rd-tooltip-feed">?</button>';
      composerHeader.prepend(titleRow);
    }

    /* "?" dans le header webinaires */
    injectTooltipInCard('rd-webinar-list', 'rd-tooltip-webinars');

    /* "?" dans le header ressources */
    injectTooltipInCard('rd-content-list', 'rd-tooltip-resources');

    /* Bind tous les tooltips */
    bindTooltip('rd-tooltip-feed',      'rd-popover-feed');
    bindTooltip('rd-tooltip-webinars',  'rd-popover-webinars');
    bindTooltip('rd-tooltip-resources', 'rd-popover-resources');
  }

  function injectTooltipInCard(listId, tooltipId) {
    if (document.getElementById(tooltipId)) return;
    var listEl  = document.getElementById(listId);
    if (!listEl) return;
    var card    = listEl.closest('.rd-card');
    if (!card)  return;
    var title   = card.querySelector('.rd-card-title');
    if (!title) return;
    var btn = document.createElement('button');
    btn.className   = 'rd-tooltip-trigger';
    btn.id          = tooltipId;
    btn.textContent = '?';
    title.appendChild(btn);
  }

  function bindTooltip(triggerId, popoverId) {
    var btn = document.getElementById(triggerId);
    if (btn) btn.addEventListener('click', function () { openPopover(popoverId); });
  }

  /* ============================================================
     9. INIT — Point d'entrée
     ============================================================ */

  async function init() {
    bindCloseButtons();
    initMarketing();
    initCreateRoom();
    initComposer();
    initEditRoom();
    initWebinar();
    initContentModal();
    initEditPost();

    /* Appel endpoint au chargement de la page — toujours */
    await loadRoomData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
