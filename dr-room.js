/* ============================================================
   ROOM BACKOFFICE — Script principal
   À héberger sur GitHub et charger via <script src="...">
   
   STRUCTURE :
   1. CONFIG & UTILS
   2. Gère la section marketing (boutons créer room → formulaire)
   3. Gère le formulaire de création de room
   4. Gère le dashboard room (posts, webinaires, contenus, notifs)
   5. Gère les modales (edit room, webinar, content, post)
   6. INIT — point d'entrée
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     1. CONFIG & UTILS
     ============================================================ */

  var BASE_URL   = 'https://xmot-l3ir-7kuj.p7.xano.io/api:vRpHgMHS';
  var UPLOAD_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof';

  var auth  = JSON.parse(localStorage.getItem('auth') || 'null');
  var token = auth && auth.token;

  // Données globales de la room (peuplées au chargement)
  var _roomData = null;

  function getHeaders(withAuth) {
    var h = { 'Content-Type': 'application/json' };
    if (withAuth && token) h['Authorization'] = 'Bearer ' + token;
    return h;
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
    var d = Math.floor(h / 24);
    return 'Il y a ' + d + 'j';
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

  // Bind tous les boutons data-close
  function bindCloseButtons() {
    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeModal(btn.dataset.close);
      });
    });
    // Fermer en cliquant sur l'overlay
    document.querySelectorAll('.rd-modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });
  }

  /* ============================================================
     UPLOAD IMAGE (utilisé partout)
     ============================================================ */

  /**
   * Gère l'upload d'une image via l'endpoint upload-proof
   * @param {string} inputId   - id de l'input file
   * @param {string} hiddenId  - id de l'input hidden qui stocke l'url
   * @param {string} statusId  - id du <p> de statut
   * @param {string} previewId - id de l'<img> de preview (optionnel)
   */
  function bindUpload(inputId, hiddenId, statusId, previewId) {
    var input   = document.getElementById(inputId);
    var hidden  = document.getElementById(hiddenId);
    var status  = document.getElementById(statusId);
    var preview = previewId ? document.getElementById(previewId) : null;
    if (!input) return;

    input.addEventListener('change', async function () {
      var file = input.files[0];
      if (!file) return;
      status.textContent = 'Upload en cours…';
      var fd = new FormData();
      fd.append('file', file);
      try {
        var res = await fetch(UPLOAD_URL, { method: 'POST', body: fd });
        var data = await res.json();
        var url = data.url || (data.path && data.path) || '';
        if (!url) throw new Error('URL manquante');
        hidden.value = url;
        status.textContent = '✅ Image chargée';
        if (preview) {
          preview.src = url;
          preview.classList.add('visible');
        }
      } catch (e) {
        status.textContent = '❌ Erreur lors de l\'upload';
        console.error(e);
      }
    });
  }

  /* ============================================================
     2. GÈRE LA SECTION MARKETING
     Affiche #room-marketing si status === "no-room"
     Les boutons "Créer ma room" ouvrent le formulaire de création
     ============================================================ */

  function showMarketing() {
    var el = document.getElementById('room-marketing');
    if (el) el.style.display = 'block';
  }

  function hideMarketing() {
    var el = document.getElementById('room-marketing');
    if (el) el.style.display = 'none';
  }

  function initMarketing() {
    // Les deux boutons CTA de la section marketing ouvrent la modal de création
    ['rm-btn-create-hero', 'rm-btn-create-bottom'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', function () {
          hideMarketing();
          openModal('rd-modal-create-room');
        });
      }
    });
  }

  /* ============================================================
     3. GÈRE LE FORMULAIRE DE CRÉATION DE ROOM
     Modal #rd-modal-create-room (définie dans room-create-form.html)
     ============================================================ */

  function initCreateRoom() {
    // Upload bannière création
    bindUpload(
      'rd-create-banner-file',
      'rd-create-banner-url',
      'rd-create-banner-status',
      'rd-create-banner-preview'
    );

    var btn = document.getElementById('rd-btn-create-room-submit');
    if (!btn) return;

    btn.addEventListener('click', async function () {
      hideError('rd-create-room-error');

      var title      = (document.getElementById('rd-create-room-title')       || {}).value || '';
      var desc       = (document.getElementById('rd-create-room-desc')        || {}).value || '';
      var cover_url  = (document.getElementById('rd-create-banner-url')       || {}).value || '';

      if (!title.trim()) {
        showError('rd-create-room-error', 'Le titre est obligatoire.');
        return;
      }

      btn.textContent = 'Création en cours…';
      btn.disabled    = true;

      try {
        var res = await fetch(BASE_URL + '/room_create', {
          method:  'POST',
          headers: getHeaders(true),
          body:    JSON.stringify({ title: title, description: desc, cover_url: cover_url })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erreur');

        closeModal('rd-modal-create-room');
        showToast('🎉 Votre room est en ligne !');
        // Recharger les données
        await loadRoomData();

      } catch (e) {
        showError('rd-create-room-error', e.message || 'Une erreur est survenue.');
        btn.textContent = 'Créer ma room';
        btn.disabled    = false;
      }
    });
  }

  /* ============================================================
     4. GÈRE LE DASHBOARD ROOM
     ============================================================ */

  // ---- Chargement principal ----

  async function loadRoomData() {
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
    }
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
    renderNotifs(data.notifications || []);

    // Lien "Voir ma room"
    var linkBtn = document.getElementById('rd-btn-view-room');
    if (linkBtn && room.slug) {
      linkBtn.href = 'https://www.digitools-room.com/rooms/' + room.slug;
    }
  }

  function hideDashboard() {
    var el = document.getElementById('room-dashboard');
    if (el) el.style.display = 'none';
  }

  // ---- Banner ----

  function renderBanner(room) {
    setText('rd-room-title',    room.title       || '—');
    setText('rd-room-desc',     room.description || '—');
    setText('rd-followers-count', fmt(room.followers_count));
    setText('rd-posts-count',   fmt(_roomData.room_post_count || 0));

    var cover = document.getElementById('rd-cover-img');
    if (cover && room.cover_url) {
      cover.src = room.cover_url;
      cover.style.display = 'block';
    }
  }

  // ---- Stats ----

  function renderStats(room, posts, webs) {
    setText('rd-stat-followers', fmt(room.followers_count || 0));
    setText('rd-stat-views',     fmt(room.views_count     || 0));
    setText('rd-stat-posts',     fmt(_roomData.room_post_count || 0));
    setText('rd-stat-webinars',  fmt(webs.length));
  }

  // ---- Posts ----

  function renderPosts(posts) {
    var list = document.getElementById('rd-posts-list');
    if (!list) return;

    if (!posts || !posts.length) {
      list.innerHTML = '<div class="rd-empty"><div class="rd-empty-icon">📭</div>Aucun post pour le moment. Publiez votre première actu !</div>';
      return;
    }

    list.innerHTML = posts.map(function (p) {
      var attach = '';

      if (p.article_url || p.course_url) {
        var url = p.article_url || p.course_url;
        try {
          var domain = new URL(url).hostname.replace('www.', '');
          attach = '<a class="rd-post-attachment" href="' + url + '" target="_blank" rel="noopener">' +
            '<div class="rd-og-img" style="background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-size:1rem;">🔗</div>' +
            '<span class="rd-post-attach-title">' + url + '</span>' +
            '<span class="rd-post-attach-domain">' + domain + '</span>' +
            '</a>';
        } catch(e) {}
      }

      return '<div class="rd-post-item" data-post-id="' + p.id + '">' +
        '<div class="rd-post-header">' +
          '<div class="rd-post-meta">' + timeAgo(p.created_at) + '</div>' +
          '<div class="rd-post-actions">' +
            '<button class="rd-post-action-btn rd-edit-post-btn" data-id="' + p.id + '" data-content="' + encodeURIComponent(p.content || '') + '">✏️</button>' +
            '<button class="rd-post-action-btn danger rd-delete-post-btn" data-id="' + p.id + '">🗑</button>' +
          '</div>' +
        '</div>' +
        '<div class="rd-post-content">' + (p.content || '') + '</div>' +
        attach +
        '<div class="rd-post-stats">' +
          '<span class="rd-post-stat">❤️ ' + fmt(p.likes_count) + '</span>' +
          '<span class="rd-post-stat">💬 ' + fmt(p.comments_count) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    // Bind edit / delete
    list.querySelectorAll('.rd-edit-post-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.getElementById('rd-edit-post-id').value      = btn.dataset.id;
        document.getElementById('rd-edit-post-content').value = decodeURIComponent(btn.dataset.content);
        hideError('rd-edit-post-error');
        openModal('rd-modal-edit-post');
      });
    });

    list.querySelectorAll('.rd-delete-post-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer ce post ?')) return;
        deletePost(btn.dataset.id);
      });
    });
  }

  // ---- Webinaires ----

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
      var badge    = upcoming
        ? '<span class="rd-webinar-badge upcoming">🟢 À venir</span>'
        : '<span class="rd-webinar-badge past">⏸ Passé</span>';

      var replayBtn = !upcoming && !w.replay_url
        ? '<button class="rd-webinar-btn rd-edit-webinar-btn" data-id="' + w.id + '">+ Replay</button>'
        : '';

      return '<div class="rd-webinar-item" data-webinar-id="' + w.id + '">' +
        badge +
        '<div class="rd-webinar-title">' + (w.title || '—') + '</div>' +
        '<div class="rd-webinar-meta">' +
          '<span>📅 ' + fmtDate(w.scheduled_at) + '</span>' +
          '<span>⏱ ' + (w.duration_minutes || '—') + ' min</span>' +
          '<span>🔧 ' + (w.outi_webinar || '—') + '</span>' +
        '</div>' +
        '<div class="rd-webinar-footer">' +
          '<span class="rd-webinar-registrations">👥 ' + fmt(w.registrations_count) + ' inscrits</span>' +
          '<div class="rd-webinar-actions">' +
            replayBtn +
            '<button class="rd-webinar-btn rd-edit-webinar-btn" data-id="' + w.id + '">✏️</button>' +
            '<button class="rd-webinar-btn danger rd-delete-webinar-btn" data-id="' + w.id + '">🗑</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    // Bind edit webinar
    list.querySelectorAll('.rd-edit-webinar-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id;
        var w  = (_roomData.room_webinars || []).find(function (x) { return String(x.id) === String(id); });
        if (w) openEditWebinar(w);
      });
    });

    // Bind delete webinar
    list.querySelectorAll('.rd-delete-webinar-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer ce webinaire ?')) return;
        deleteWebinar(btn.dataset.id);
      });
    });
  }

  // ---- Contenus ----

  function renderContents(conts) {
    var list = document.getElementById('rd-content-list');
    if (!list) return;

    if (!conts || !conts.length) {
      list.innerHTML = '<div class="rd-empty" style="padding:8px 0;font-size:.78rem;">Aucun contenu rattaché</div>';
      return;
    }

    list.innerHTML = conts.map(function (c) {
      var typeLabel = c.content_type === 'article'  ? 'Article'    :
                      c.content_type === 'course'   ? 'Formation'  : 'Ressource';
      var name = c.title || c.title_short || c.name || '—';

      return '<div class="rd-content-item">' +
        '<span class="rd-content-type-badge ' + c.content_type + '">' + typeLabel + '</span>' +
        '<span class="rd-content-name">' + name + '</span>' +
        '<button class="rd-content-remove" data-id="' + c.id + '">✕</button>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.rd-content-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Retirer ce contenu de la room ?')) return;
        removeContent(btn.dataset.id);
      });
    });
  }

  // ---- Notifs ----

  function renderNotifs(notifs) {
    var list = document.getElementById('rd-notif-list');
    if (!list) return;

    if (!notifs || !notifs.length) {
      list.innerHTML = '<div class="rd-empty" style="padding:12px 0;"><div class="rd-empty-icon">🔕</div>Aucune activité récente</div>';
      return;
    }

    list.innerHTML = notifs.map(function (n) {
      var icon = n.type === 'follow'    ? '👥' :
                 n.type === 'like'      ? '❤️' :
                 n.type === 'comment'   ? '💬' :
                 n.type === 'webinar'   ? '🎓' : '🔔';

      return '<div class="rd-notif-item">' +
        '<div class="rd-notif-icon">' + icon + '</div>' +
        '<div class="rd-notif-text">' +
          (n.message || '—') +
          '<div class="rd-notif-time">' + timeAgo(n.created_at) + '</div>' +
        '</div>' +
        (n.unread ? '<div class="rd-notif-dot"></div>' : '') +
      '</div>';
    }).join('');
  }

  /* ============================================================
     5. COMPOSER — Publier un post
     ============================================================ */

  var _currentPostType = 'text';
  var _currentAttachId = null;
  var _currentAttachName = null;
  var _ogData = { url: '', title: '', image: '', domain: '' };

  function initComposer() {
    // Tabs
    document.querySelectorAll('.rd-composer-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.rd-composer-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        _currentPostType = tab.dataset.type;
        _currentAttachId = null;
        _currentAttachName = null;
        _ogData = { url: '', title: '', image: '', domain: '' };
        updateComposerUI();
      });
    });

    // Compteur caractères
    var textarea = document.getElementById('rd-post-content');
    if (textarea) {
      textarea.addEventListener('input', function () {
        var count = textarea.value.length;
        setText('rd-char-count', count + ' / 500');
      });
    }

    // URL input → fetch OG
    var urlInput = document.getElementById('rd-url-input');
    if (urlInput) {
      var ogTimer;
      urlInput.addEventListener('input', function () {
        clearTimeout(ogTimer);
        var val = urlInput.value.trim();
        if (!val || !val.startsWith('http')) return;
        ogTimer = setTimeout(function () { fetchOG(val); }, 800);
      });
    }

    // Remove OG
    var removeOG = document.getElementById('rd-og-remove');
    if (removeOG) {
      removeOG.addEventListener('click', function () {
        _ogData = { url: '', title: '', image: '', domain: '' };
        document.getElementById('rd-url-input').value = '';
        document.getElementById('rd-og-preview').classList.remove('visible');
      });
    }

    // Select attachement (ressource ou webinar)
    var attachSelect = document.getElementById('rd-attach-select');
    if (attachSelect) {
      attachSelect.addEventListener('change', function () {
        var opt = attachSelect.options[attachSelect.selectedIndex];
        if (!opt || !opt.value) return;
        _currentAttachId   = opt.value;
        _currentAttachName = opt.text;
        setText('rd-attach-name', _currentAttachName);
        document.getElementById('rd-attach-selected').classList.add('visible');
      });
    }

    // Clear attachement
    var clearBtn = document.getElementById('rd-attach-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        _currentAttachId   = null;
        _currentAttachName = null;
        document.getElementById('rd-attach-selected').classList.remove('visible');
        document.getElementById('rd-attach-select').value = '';
      });
    }

    // Bouton publier
    var publishBtn = document.getElementById('rd-btn-publish');
    if (publishBtn) {
      publishBtn.addEventListener('click', publishPost);
    }
  }

  function updateComposerUI() {
    var urlZone    = document.getElementById('rd-url-zone');
    var attachZone = document.getElementById('rd-attach-zone');
    var select     = document.getElementById('rd-attach-select');

    urlZone    && urlZone.classList.remove('visible');
    attachZone && attachZone.classList.remove('visible');
    document.getElementById('rd-attach-selected') && document.getElementById('rd-attach-selected').classList.remove('visible');
    document.getElementById('rd-og-preview')       && document.getElementById('rd-og-preview').classList.remove('visible');

    if (_currentPostType === 'link') {
      urlZone && urlZone.classList.add('visible');
    }

    if (_currentPostType === 'resource' || _currentPostType === 'webinar') {
      attachZone && attachZone.classList.add('visible');
      populateAttachSelect(_currentPostType);
    }
  }

  function populateAttachSelect(type) {
    var select = document.getElementById('rd-attach-select');
    if (!select || !_roomData) return;
    select.innerHTML = '<option value="">— Choisir —</option>';

    var items = [];
    if (type === 'resource') {
      items = (_roomData.room_contents || []).filter(function (c) { return c.content_type === 'resource'; });
      items.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value   = c.id;
        opt.textContent = c.title_short || c.name || 'Ressource #' + c.id;
        select.appendChild(opt);
      });
    } else if (type === 'webinar') {
      items = _roomData.room_webinars || [];
      items.forEach(function (w) {
        var opt = document.createElement('option');
        opt.value   = w.id;
        opt.textContent = w.title || 'Webinaire #' + w.id;
        select.appendChild(opt);
      });
    }
  }

  async function fetchOG(url) {
    try {
      // Microlink.io — gratuit jusqu'à 50req/jour, pas besoin d'endpoint Xano
      var res  = await fetch('https://api.microlink.io?url=' + encodeURIComponent(url));
      var data = await res.json();
      if (data.status !== 'success') return;

      _ogData.url    = url;
      _ogData.title  = (data.data && data.data.title)                          || '';
      _ogData.image  = (data.data && data.data.image && data.data.image.url)   || '';
      _ogData.domain = (data.data && data.data.publisher)                      || new URL(url).hostname.replace('www.', '');

      setText('rd-og-title',  _ogData.title);
      setText('rd-og-domain', _ogData.domain);
      var img = document.getElementById('rd-og-img');
      if (img && _ogData.image) img.src = _ogData.image;

      document.getElementById('rd-og-preview').classList.add('visible');
    } catch (e) {
      console.warn('[OG] Impossible de récupérer les infos:', e);
    }
  }

  async function publishPost() {
    var content = (document.getElementById('rd-post-content') || {}).value || '';
    if (!content.trim()) {
      showToast('❌ Le contenu du post est vide.');
      return;
    }

    var btn = document.getElementById('rd-btn-publish');
    if (btn) { btn.textContent = 'Publication…'; btn.disabled = true; }

    var body = {
      content:      content.trim(),
      post_type:    _currentPostType,
      article_url:  (_currentPostType === 'link' ? _ogData.url : ''),
      course_url:   '',
      resource_id:  (_currentPostType === 'resource' ? parseInt(_currentAttachId) : null),
      webinar_id:   (_currentPostType === 'webinar'  ? parseInt(_currentAttachId) : null)
    };

    try {
      var res = await fetch(BASE_URL + '/post_create', {
        method:  'POST',
        headers: getHeaders(true),
        body:    JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Erreur publication');

      showToast('✅ Post publié !');
      // Reset composer
      document.getElementById('rd-post-content').value = '';
      _currentPostType  = 'text';
      _currentAttachId  = null;
      _currentAttachName = null;
      _ogData = { url: '', title: '', image: '', domain: '' };
      document.querySelectorAll('.rd-composer-tab').forEach(function (t) { t.classList.remove('active'); });
      var firstTab = document.querySelector('.rd-composer-tab[data-type="text"]');
      if (firstTab) firstTab.classList.add('active');
      updateComposerUI();

      // Recharger
      await loadRoomData();

    } catch (e) {
      showToast('❌ Erreur lors de la publication.');
      console.error(e);
    } finally {
      if (btn) { btn.textContent = 'Publier'; btn.disabled = false; }
    }
  }

  /* ============================================================
     ACTIONS — Posts
     ============================================================ */

  async function deletePost(postId) {
    try {
      var res = await fetch(BASE_URL + '/post_delate', {
        method:  'POST',
        headers: getHeaders(true),
        body:    JSON.stringify({ post_id: parseInt(postId) })
      });
      if (!res.ok) throw new Error('Erreur suppression');
      showToast('🗑 Post supprimé.');
      await loadRoomData();
    } catch (e) {
      showToast('❌ Impossible de supprimer le post.');
    }
  }

  /* ============================================================
     MODAL — Modifier un post
     ============================================================ */

  function initEditPost() {
    var btn = document.getElementById('rd-btn-save-post');
    if (!btn) return;

    btn.addEventListener('click', async function () {
      hideError('rd-edit-post-error');
      var id      = (document.getElementById('rd-edit-post-id')      || {}).value || '';
      var content = (document.getElementById('rd-edit-post-content') || {}).value || '';

      if (!content.trim()) {
        showError('rd-edit-post-error', 'Le contenu ne peut pas être vide.');
        return;
      }

      btn.textContent = 'Enregistrement…';
      btn.disabled    = true;

      try {
        var res = await fetch(BASE_URL + '/post_modify', {
          method:  'POST',
          headers: getHeaders(true),
          body:    JSON.stringify({ post_id: parseInt(id), content: content.trim() })
        });
        if (!res.ok) throw new Error('Erreur');

        closeModal('rd-modal-edit-post');
        showToast('✅ Post modifié.');
        await loadRoomData();
      } catch (e) {
        showError('rd-edit-post-error', 'Une erreur est survenue.');
      } finally {
        btn.textContent = 'Enregistrer';
        btn.disabled    = false;
      }
    });
  }

  /* ============================================================
     MODAL — Modifier la room
     ============================================================ */

  function initEditRoom() {
    // Ouvrir la modal et pré-remplir les champs
    var editBtn = document.getElementById('rd-btn-edit-room');
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        if (!_roomData) return;
        var room = _roomData.room_details || {};
        setVal('rd-edit-room-title', room.title       || '');
        setVal('rd-edit-room-desc',  room.description || '');
        // Reset bannière
        var hidden  = document.getElementById('rd-banner-url');
        var preview = document.getElementById('rd-banner-preview');
        var status  = document.getElementById('rd-banner-status');
        if (hidden)  hidden.value = '';
        if (status)  status.textContent = '';
        if (preview) {
          preview.classList.remove('visible');
          if (room.cover_url) { preview.src = room.cover_url; preview.classList.add('visible'); }
        }
        hideError('rd-edit-room-error');
        openModal('rd-modal-edit-room');
      });
    }

    // Upload bannière
    bindUpload('rd-banner-file', 'rd-banner-url', 'rd-banner-status', 'rd-banner-preview');

    // Sauvegarder
    var saveBtn = document.getElementById('rd-btn-save-room');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async function () {
      hideError('rd-edit-room-error');
      var title     = (document.getElementById('rd-edit-room-title') || {}).value || '';
      var desc      = (document.getElementById('rd-edit-room-desc')  || {}).value || '';
      var coverUrl  = (document.getElementById('rd-banner-url')      || {}).value || '';

      if (!title.trim()) {
        showError('rd-edit-room-error', 'Le titre est obligatoire.');
        return;
      }

      var body = { title: title, description: desc };
      if (coverUrl) body.cover_url = coverUrl;

      saveBtn.textContent = 'Enregistrement…';
      saveBtn.disabled    = true;

      try {
        var res = await fetch(BASE_URL + '/room_update', {
          method:  'POST',
          headers: getHeaders(true),
          body:    JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Erreur');

        closeModal('rd-modal-edit-room');
        showToast('✅ Room mise à jour.');
        await loadRoomData();
      } catch (e) {
        showError('rd-edit-room-error', 'Une erreur est survenue.');
      } finally {
        saveBtn.textContent = 'Enregistrer';
        saveBtn.disabled    = false;
      }
    });
  }

  /* ============================================================
     MODAL — Webinaire (créer + modifier)
     ============================================================ */

  function initWebinar() {
    // Ouvrir modal création
    var addBtn = document.getElementById('rd-btn-add-webinar');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        resetWebinarForm();
        setText('rd-modal-webinar-title', '🎓 Nouveau webinaire');
        document.getElementById('rd-btn-save-webinar').textContent = 'Publier le webinaire';
        openModal('rd-modal-webinar');
      });
    }

    // Upload cover webinaire
    bindUpload('rd-webinar-cover-file', 'rd-webinar-cover-url', 'rd-webinar-cover-status', 'rd-webinar-cover-preview');

    // Sauvegarder webinaire
    var saveBtn = document.getElementById('rd-btn-save-webinar');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async function () {
      hideError('rd-webinar-error');

      var id          = (document.getElementById('rd-webinar-id')       || {}).value || '';
      var title       = (document.getElementById('rd-webinar-title')    || {}).value || '';
      var desc        = (document.getElementById('rd-webinar-desc')     || {}).value || '';
      var cover_url   = (document.getElementById('rd-webinar-cover-url')|| {}).value || '';
      var dateVal     = (document.getElementById('rd-webinar-date')     || {}).value || '';
      var duration    = (document.getElementById('rd-webinar-duration') || {}).value || '';
      var tool        = (document.getElementById('rd-webinar-tool')     || {}).value || '';
      var link        = (document.getElementById('rd-webinar-link')     || {}).value || '';
      var replay      = (document.getElementById('rd-webinar-replay')   || {}).value || '';

      if (!title.trim()) { showError('rd-webinar-error', 'Le titre est obligatoire.'); return; }
      if (!dateVal)       { showError('rd-webinar-error', 'La date est obligatoire.');  return; }
      if (!link.trim())   { showError('rd-webinar-error', 'Le lien de connexion est obligatoire.'); return; }

      var body = {
        title:            title,
        description:      desc,
        cover_url:        cover_url,
        scheduled_at:     new Date(dateVal).getTime(),
        duration_minutes: parseInt(duration) || 60,
        outi_webinar:     tool,
        external_link:    link,
        replay_url:       replay
      };

      var isEdit = !!id;
      if (isEdit) body.webinar_id = parseInt(id);

      saveBtn.textContent = 'Enregistrement…';
      saveBtn.disabled    = true;

      var endpoint = isEdit ? '/webinar_update' : '/webinar_create';

      try {
        var res = await fetch(BASE_URL + endpoint, {
          method:  'POST',
          headers: getHeaders(true),
          body:    JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Erreur');

        closeModal('rd-modal-webinar');
        showToast(isEdit ? '✅ Webinaire mis à jour.' : '✅ Webinaire créé !');
        await loadRoomData();
      } catch (e) {
        showError('rd-webinar-error', 'Une erreur est survenue.');
      } finally {
        saveBtn.textContent = isEdit ? 'Enregistrer' : 'Publier le webinaire';
        saveBtn.disabled    = false;
      }
    });
  }

  function openEditWebinar(w) {
    resetWebinarForm();
    setText('rd-modal-webinar-title', '✏️ Modifier le webinaire');
    document.getElementById('rd-btn-save-webinar').textContent = 'Enregistrer';

    setVal('rd-webinar-id',       String(w.id));
    setVal('rd-webinar-title',    w.title            || '');
    setVal('rd-webinar-desc',     w.description      || '');
    setVal('rd-webinar-duration', String(w.duration_minutes || ''));
    setVal('rd-webinar-tool',     w.outi_webinar     || 'Google Meet');
    setVal('rd-webinar-link',     w.external_link    || '');
    setVal('rd-webinar-replay',   w.replay_url       || '');

    // Date
    if (w.scheduled_at) {
      var d  = new Date(w.scheduled_at);
      var dt = d.getFullYear() + '-' +
               String(d.getMonth()+1).padStart(2,'0') + '-' +
               String(d.getDate()).padStart(2,'0') + 'T' +
               String(d.getHours()).padStart(2,'0') + ':' +
               String(d.getMinutes()).padStart(2,'0');
      setVal('rd-webinar-date', dt);
    }

    if (w.cover_url) {
      var prev = document.getElementById('rd-webinar-cover-preview');
      if (prev) { prev.src = w.cover_url; prev.classList.add('visible'); }
    }

    openModal('rd-modal-webinar');
  }

  function resetWebinarForm() {
    ['rd-webinar-id','rd-webinar-title','rd-webinar-desc','rd-webinar-cover-url',
     'rd-webinar-date','rd-webinar-duration','rd-webinar-link','rd-webinar-replay'].forEach(function (id) {
      setVal(id, '');
    });
    var prev = document.getElementById('rd-webinar-cover-preview');
    if (prev) prev.classList.remove('visible');
    var status = document.getElementById('rd-webinar-cover-status');
    if (status) status.textContent = '';
    hideError('rd-webinar-error');
  }

  async function deleteWebinar(webinarId) {
    try {
      var res = await fetch(BASE_URL + '/webinar_delate', {
        method:  'POST',
        headers: getHeaders(true),
        body:    JSON.stringify({ webinar_id: parseInt(webinarId) })
      });
      if (!res.ok) throw new Error('Erreur suppression');
      showToast('🗑 Webinaire supprimé.');
      await loadRoomData();
    } catch (e) {
      showToast('❌ Impossible de supprimer le webinaire.');
    }
  }

  /* ============================================================
     MODAL — Rattacher du contenu
     ============================================================ */

  function initContentModal() {
    var addBtn = document.getElementById('rd-btn-add-content');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        resetContentForm();
        openModal('rd-modal-content');
      });
    }

    // Changement de type → charge la liste
    var typeSelect = document.getElementById('rd-content-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', async function () {
        var type = typeSelect.value;
        if (!type) return;
        await loadContentOptions(type);
      });
    }

    // Sauvegarder
    var saveBtn = document.getElementById('rd-btn-save-content');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async function () {
      hideError('rd-content-error');

      var type       = (document.getElementById('rd-content-type')   || {}).value || '';
      var contentSel = document.getElementById('rd-content-select');
      var contentId  = contentSel ? contentSel.value : '';

      if (!type)      { showError('rd-content-error', 'Choisissez un type de contenu.'); return; }
      if (!contentId) { showError('rd-content-error', 'Sélectionnez un contenu.'); return; }

      var body = { content_type: type };
      if (type === 'article')  body.article_id  = parseInt(contentId);
      if (type === 'course')   body.course_id   = parseInt(contentId);
      if (type === 'resource') body.resource_id = parseInt(contentId);

      saveBtn.textContent = 'Rattachement…';
      saveBtn.disabled    = true;

      try {
        var res = await fetch(BASE_URL + '/content_create', {
          method:  'POST',
          headers: getHeaders(true),
          body:    JSON.stringify(body)
        });
        var data = await res.json();

        if (data && data.status === 'already-posted') {
          showError('rd-content-error', 'Ce contenu est déjà rattaché à votre room.');
          return;
        }
        if (!res.ok) throw new Error('Erreur');

        closeModal('rd-modal-content');
        showToast('✅ Contenu rattaché à la room.');
        await loadRoomData();
      } catch (e) {
        showError('rd-content-error', 'Une erreur est survenue.');
      } finally {
        saveBtn.textContent = 'Rattacher';
        saveBtn.disabled    = false;
      }
    });
  }

  async function loadContentOptions(type) {
    var emptyMsg    = document.getElementById('rd-content-empty-msg');
    var selectWrap  = document.getElementById('rd-content-select-wrap');
    var selectEl    = document.getElementById('rd-content-select');
    var emptyLabel  = document.getElementById('rd-content-empty-label');
    var emptyLink   = document.getElementById('rd-content-empty-link');

    if (emptyMsg)   emptyMsg.style.display   = 'none';
    if (selectWrap) selectWrap.style.display  = 'none';

    var labels = {
      article:  'article',
      course:   'formation',
      resource: 'ressource'
    };
    var links = {
      article:  'https://www.digitools-room.com/freelance/freelance-articles',
      course:   'https://www.digitools-room.com/freelance/formations',
      resource: 'https://www.digitools-room.com/freelance/freelance-articles'
    };

    try {
      var res  = await fetch(BASE_URL + '/get_content_id?content_type=' + type, { headers: getHeaders(true) });
      var data = await res.json();
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
          var opt = document.createElement('option');
          opt.value       = item.id;
          opt.textContent = item.title || item.title_short || 'Contenu #' + item.id;
          selectEl.appendChild(opt);
        });
      }

      if (selectWrap) selectWrap.style.display = 'block';

    } catch (e) {
      console.error('[ContentModal] Erreur chargement options:', e);
    }
  }

  function resetContentForm() {
    setVal('rd-content-type', '');
    var emptyMsg   = document.getElementById('rd-content-empty-msg');
    var selectWrap = document.getElementById('rd-content-select-wrap');
    if (emptyMsg)   emptyMsg.style.display  = 'none';
    if (selectWrap) selectWrap.style.display = 'none';
    hideError('rd-content-error');
  }

  async function removeContent(contentId) {
    try {
      var res = await fetch(BASE_URL + '/content_delate', {
        method:  'POST',
        headers: getHeaders(true),
        body:    JSON.stringify({ content_id: parseInt(contentId) })
      });
      if (!res.ok) throw new Error('Erreur suppression');
      showToast('🗑 Contenu retiré.');
      await loadRoomData();
    } catch (e) {
      showToast('❌ Impossible de retirer ce contenu.');
    }
  }

  /* ============================================================
     MODAL — Créer la room (formulaire complet)
     Note : cette modal doit être ajoutée dans le HTML via Webflow
     Elle utilise les IDs rd-modal-create-room, rd-create-room-title, etc.
     ============================================================ */

  /* ============================================================
     6. HELPERS DOM
     ============================================================ */

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  /* ============================================================
     7. INIT — Point d'entrée
     ============================================================ */

  async function init() {
    if (!token) {
      // Pas connecté → on affiche juste le marketing
      showMarketing();
      return;
    }

    bindCloseButtons();
    initMarketing();
    initCreateRoom();
    initComposer();
    initEditRoom();
    initWebinar();
    initContentModal();
    initEditPost();

    await loadRoomData();
  }

  // Lancer après le DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
