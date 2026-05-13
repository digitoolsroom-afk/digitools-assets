/* ============================================================
   ROOM FRONT — Script page publique
   À héberger sur GitHub

   STRUCTURE :
   1. CONFIG & UTILS
   2. INIT — récupère le slug et charge les données
   3. RENDER — hero, freelance, ressources, feed, webinar, sidebar
   4. ACTIONS — follow, like, register webinar, commentaires
   5. MODAL — tous les webinaires
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     1. CONFIG & UTILS
     ============================================================ */

  var BASE_URL  = 'https://xmot-l3ir-7kuj.p7.xano.io/api:vRpHgMHS';
  var SITE_URL  = 'https://www.digitools-room.com';

  /* Données globales */
  var _roomId       = null;
  var _roomData     = null;
  var _contentsData = null;
  var _allWebinars  = [];
  var _isFollowing  = false;
  var _likedPosts   = {};      /* { postId: true } */
  var _registeredWebinars = {}; /* { webinarId: true } */
  var _freelanceSlug = '';

  /* Auth */
  function getAuth()  { return JSON.parse(localStorage.getItem('auth') || 'null'); }
  function getToken() { var a = getAuth(); return a && a.token; }
  function getUserId(){ var a = getAuth(); return a && a.user && a.user.id; }
  function isLoggedIn(){ return !!getToken(); }

  function getHeaders(withAuth) {
    var h = { 'Content-Type': 'application/json' };
    if (withAuth) { var t = getToken(); if (t) h['Authorization'] = 'Bearer ' + t; }
    return h;
  }

  /* Si pas connecté → afficher la pop-up de connexion existante */
  function requireAuth() {
    if (isLoggedIn()) return true;
    var popup = document.querySelector('.abo-nonco-container');
    if (popup) popup.style.display = 'flex';
    return false;
  }

  /* Récupère le slug depuis l'URL : /rooms/mon-slug */
  function getSlugFromUrl() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    /* /rooms/slug → parts = ['rooms', 'slug'] */
    var idx = parts.indexOf('rooms');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    /* Fallback : dernier segment */
    return parts[parts.length - 1] || '';
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

  function fmtDateShort(ts) {
    if (!ts) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(ts));
  }

  function initials(name) {
    if (!name) return '?';
    return name.split(' ').map(function(w){ return w[0]; }).join('').substring(0,2).toUpperCase();
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setHTML(id, val) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = val;
  }

  /* ============================================================
     2. INIT
     ============================================================ */

  async function init() {
    var slug = getSlugFromUrl();
    if (!slug) {
      console.error('[RoomFront] Aucun slug trouvé dans l\'URL');
      return;
    }

    /* Charge les données en parallèle (room + contenus si on a le room_id) */
    try {
      var roomRes = await fetch(BASE_URL + '/room_front?slug=' + encodeURIComponent(slug), {
        headers: getHeaders(isLoggedIn())
      });
      _roomData = await roomRes.json();

      if (!roomRes.ok || !_roomData.room_details) {
        console.error('[RoomFront] Room introuvable');
        return;
      }

      _roomId        = _roomData.room_details.id;
      _freelanceSlug = (_roomData.freelance_profile || {}).slug || '';
      _allWebinars   = _roomData.room_webinars || [];

      /* Charge les contenus rattachés en parallèle */
      var contentsRes = await fetch(BASE_URL + '/get_contents?room_id=' + _roomId, {
        headers: getHeaders(false)
      });
      _contentsData = await contentsRes.json();

      /* Render */
      renderHero();
      renderFreelance();
      renderContents();
      renderWebinar();
      renderFeed();
      renderAbout();

      /* Bind interactions */
      bindFollow();
      bindWebinarActions();
      bindModalWebinars();

    } catch (e) {
      console.error('[RoomFront] Erreur:', e);
    }
  }

  /* ============================================================
     3. RENDER
     ============================================================ */

  /* ---- Hero ---- */
  function renderHero() {
    var room = _roomData.room_details || {};
    var followers = _roomData.room_last_followers || [];

    setText('rf-breadcrumb-title', room.title || '—');
    setText('rf-hero-title',       room.title || '—');
    setText('rf-hero-header',      room.header || room.description || '—');
    setText('rf-followers-count',  fmt(room.followers_count) + ' membres');

    /* Bannière */
    if (room.cover_url) {
      var bg = document.getElementById('rf-hero-bg');
      if (bg) { bg.src = room.cover_url; bg.style.display = 'block'; }
    }

    /* Avatars followers */
    var stack = document.getElementById('rf-avatar-stack');
    if (stack) {
      stack.innerHTML = followers.map(function (f, i) {
        if (f.avatar_url) {
          return '<img class="rf-avatar-stack-item" src="' + f.avatar_url + '" alt="" style="z-index:' + (followers.length - i) + ';" />';
        }
        return '<div class="rf-avatar-fallback" style="z-index:' + (followers.length - i) + ';">👤</div>';
      }).join('');
    }
  }

  /* ---- Freelance ---- */
  function renderFreelance() {
    var fl = _roomData.freelance_profile || {};

    var avatar = document.getElementById('rf-fl-avatar');
    if (avatar && fl.profile_image_url) avatar.src = fl.profile_image_url;

    setText('rf-fl-name', fl.display_name || '—');

    /* Domaine */
    var domains = fl.sous_domaine_activity || [];
    setText('rf-fl-domain', domains[0] || fl.headline || '—');

    /* Notation */
    if (fl.notation && fl.nb_notation > 0) {
      var ratingEl = document.getElementById('rf-fl-rating');
      if (ratingEl) ratingEl.style.display = 'flex';
      setText('rf-fl-notation',    Number(fl.notation).toFixed(1));
      setText('rf-fl-nb-notation', '(' + fl.nb_notation + ' avis)');
    }

    /* Localisation */
    var loc = [fl.ville, fl.pays].filter(Boolean).join(', ');
    if (loc) {
      var locWrap = document.getElementById('rf-fl-location');
      if (locWrap) locWrap.style.display = 'flex';
      setText('rf-fl-location-text', loc);
    }

    /* À propos */
    var aboutEl = document.getElementById('rf-fl-about');
    if (aboutEl && fl.about_text) aboutEl.innerHTML = fl.about_text;

    /* Tags / domaines */
    var tagsEl = document.getElementById('rf-fl-tags');
    if (tagsEl) {
      tagsEl.innerHTML = domains.map(function (d) {
        return '<span class="rf-tag">' + d + '</span>';
      }).join('');
    }

    /* Lien fiche freelance */
    var link = document.getElementById('rf-fl-profile-link');
    if (link && fl.slug) link.href = SITE_URL + '/freelance/' + fl.slug;
  }

  /* ---- Ressources ---- */
  function renderContents() {
    var items = Array.isArray(_contentsData) ? _contentsData : (_contentsData && _contentsData.content || []);

    var articles   = items.filter(function(c){ return c.content_type === 'article'; });
    var formations = items.filter(function(c){ return c.content_type === 'course'; });
    var ressources = items.filter(function(c){ return c.content_type === 'resource'; });

    renderResourceGrid('rf-grid-articles',   articles,   'article');
    renderResourceGrid('rf-grid-formations', formations, 'course');
    renderResourceGrid('rf-grid-ressources', ressources, 'resource');

    /* Tabs */
    document.querySelectorAll('.rf-resources-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.rf-resources-tab').forEach(function(t){ t.classList.remove('active'); });
        document.querySelectorAll('.rf-resources-pane').forEach(function(p){ p.classList.remove('active'); });
        tab.classList.add('active');
        var pane = document.getElementById('rf-tab-' + tab.dataset.tab);
        if (pane) pane.classList.add('active');
      });
    });
  }

  function renderResourceGrid(gridId, items, type) {
    var grid = document.getElementById(gridId);
    if (!grid) return;

    if (!items || !items.length) {
      grid.parentElement.innerHTML = '<div class="rf-empty-tab">Aucun contenu de ce type rattaché à la room</div>';
      return;
    }

    var labels = { article: 'Article', course: 'Formation', resource: 'Ressource' };
    var icons  = { article: '📄', course: '🎓', resource: '📦' };

    grid.innerHTML = items.map(function (c) {
      var title    = c.title || c.title_short || '—';
      var coverUrl = c.url_image || c.cover_url || '';
      var coverEl  = coverUrl
        ? '<img class="rf-resource-cover" src="' + coverUrl + '" alt="" />'
        : '<div class="rf-resource-cover-placeholder">' + icons[type] + '</div>';

      /* Lien selon le type */
      var href = '#';
      if (type === 'article'   && c.slug) href = SITE_URL + '/articles/' + c.slug;
      if (type === 'course'    && c.slug) href = SITE_URL + '/formations/' + c.slug;
      if (type === 'resource'  && c.lien_ressource) href = c.lien_ressource;

      return '<a class="rf-resource-card" href="' + href + '" target="_blank" rel="noopener">' +
        coverEl +
        '<div class="rf-resource-body">' +
          '<span class="rf-content-badge ' + type + '">' + labels[type] + '</span>' +
          '<div class="rf-resource-title">' + title + '</div>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  /* ---- Webinar ---- */
  function renderWebinar() {
    var webinar = _roomData.last_webinar;
    if (!webinar || !webinar.id) {
      var card = document.getElementById('rf-webinar-card');
      if (card) card.style.display = 'none';
      return;
    }

    var now      = Date.now();
    var upcoming = webinar.scheduled_at > now;

    if (webinar.cover_img) {
      var bg = document.getElementById('rf-webinar-cover');
      if (bg) { bg.src = webinar.cover_img; bg.style.display = 'block'; }
    }

    setText('rf-webinar-title',    webinar.title || '—');
    setText('rf-webinar-date',     fmtDate(webinar.scheduled_at));
    setText('rf-webinar-duration', (webinar.duration_minutes || '—') + ' min · ' + (webinar.outil_webinar || '—'));
    setText('rf-webinar-reg-count', fmt(webinar.registrations_count) + ' inscrits');

    /* Avatars inscrits */
    var avatarsEl = document.getElementById('rf-webinar-reg-avatars');
    if (avatarsEl) {
      var regFollowers = _roomData.webinars_last_followers || [];
      avatarsEl.innerHTML = regFollowers.map(function (f) {
        return f.avatar_url
          ? '<img class="rf-webinar-reg-avatar" src="' + f.avatar_url + '" alt="" />'
          : '';
      }).join('');
    }

    /* Bouton selon état */
    var regBtn = document.getElementById('rf-btn-register');
    if (regBtn) {
      if (!upcoming) {
        /* Passé — afficher replay si dispo */
        if (webinar.replay_url) {
          regBtn.textContent = '▶ Voir le replay';
          regBtn.onclick = function () { window.open(webinar.replay_url, '_blank'); };
        } else {
          regBtn.textContent = 'Webinaire terminé';
          regBtn.disabled = true;
          regBtn.style.background = '#f3f4f6';
          regBtn.style.color = '#9ca3af';
        }
      }
      /* Le bind du bouton inscription est dans bindWebinarActions() */
    }

    /* Badge LIVE vs date */
    var liveBadge = document.querySelector('.rf-live-badge');
    if (liveBadge) {
      if (upcoming) {
        liveBadge.textContent = '📅 À venir';
        liveBadge.style.background = '#2563eb';
      }
    }
  }

  /* ---- Feed ---- */
  function renderFeed() {
    var posts = _roomData.room_post || [];
    var feed  = document.getElementById('rf-feed');
    if (!feed) return;

    if (!posts.length) {
      feed.innerHTML = '<div style="padding:24px;text-align:center;color:#9ca3af;font-size:.85rem;">Aucune actu publiée pour le moment</div>';
      return;
    }

    var fl = _roomData.freelance_profile || {};

    feed.innerHTML = posts.map(function (p) {
      return renderPost(p, fl);
    }).join('');

    /* Bouton voir toutes les actus */
    var seeAll = document.getElementById('rf-see-all-posts');
    if (seeAll && posts.length >= 3) seeAll.style.display = 'flex';

    /* Bind interactions sur chaque post */
    bindPostInteractions(feed);
  }

  function renderPost(p, fl) {
    var details  = p.global_post_details || {};
    var likes    = p.global_post_likes || 0;
    var comments = p.global_post_comments || [];

    /* Attachment selon post_type */
    var attachment = '';
    if (details.post_type === 'link' && (details.article_url || details.course_url)) {
      var url = details.article_url || details.course_url;
      var domain = '';
      try { domain = new URL(url).hostname.replace('www.', ''); } catch(e){}
      attachment = '<a class="rf-post-link" href="' + url + '" target="_blank" rel="noopener">' +
        '<div style="font-size:1.4rem;flex-shrink:0;">🔗</div>' +
        '<div class="rf-post-link-info">' +
          '<div class="rf-post-link-domain">' + domain + '</div>' +
          '<div class="rf-post-link-title">' + url.substring(0, 70) + '</div>' +
        '</div>' +
      '</a>';
    }

    if (details.post_type === 'webinar' && details.webinars_id) {
      var w = (_allWebinars || []).find(function(x){ return x.id === details.webinars_id; });
      if (w) {
        attachment = '<div class="rf-post-webinar-card">' +
          '<div>' +
            '<div class="rf-post-webinar-title">' + (w.title || '—') + '</div>' +
            '<div class="rf-post-webinar-date">📅 ' + fmtDate(w.scheduled_at) + '</div>' +
          '</div>' +
          '<button class="rf-post-webinar-btn rf-btn-register-post" data-webinar-id="' + w.id + '">S\'inscrire</button>' +
        '</div>';
      }
    }

    if (details.post_type === 'resource' && details.blog_ressources_id) {
      attachment = '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8faff;border:1.5px solid #e0e7ff;border-radius:12px;margin-bottom:12px;">' +
        '<span style="font-size:1.3rem;">📦</span>' +
        '<span style="font-size:.8rem;font-weight:600;color:#111112;">Ressource téléchargeable rattachée</span>' +
      '</div>';
    }

    /* Dernier commentaire uniquement dans le feed */
    var lastComment = '';
    if (comments.length > 0) {
      var last = comments[comments.length - 1];
      var lp   = last.parent_comment || {};
      lastComment = '<div style="margin-top:10px;padding:10px 12px;background:#f8faff;border:1px solid #e8e8e4;border-radius:10px;font-size:.78rem;color:#374151;">' +
        '<span style="font-weight:600;color:#111112;margin-right:5px;">💬</span>' +
        (lp.content || '') +
        '</div>';
    }

    var likedClass = _likedPosts[details.id] ? 'liked' : '';

    return '<div class="rf-post" data-post-id="' + details.id + '">' +
      '<div class="rf-post-header">' +
        (fl.profile_image_url
          ? '<img class="rf-post-avatar" src="' + fl.profile_image_url + '" alt="" />'
          : '<div class="rf-post-avatar" style="display:flex;align-items:center;justify-content:center;background:#eff6ff;font-size:.7rem;font-weight:700;color:#2563eb;">' + initials(fl.display_name) + '</div>'
        ) +
        '<div>' +
          '<div class="rf-post-author">' + (fl.display_name || '—') + '</div>' +
          '<div class="rf-post-role">' + ((fl.sous_domaine_activity || [])[0] || fl.headline || '') + '</div>' +
        '</div>' +
        '<span class="rf-post-time">' + timeAgo(details.created_at) + '</span>' +
      '</div>' +
      '<div class="rf-post-content">' + (details.content || '') + '</div>' +
      attachment +
      lastComment +
      '<div class="rf-post-footer" style="margin-top:12px;">' +
        '<button class="rf-post-action rf-like-btn ' + likedClass + '" data-post-id="' + details.id + '">' +
          '<span class="rf-like-icon">' + (_likedPosts[details.id] ? '❤️' : '🤍') + '</span>' +
          '<span class="rf-like-count">' + fmt(likes) + '</span>' +
        '</button>' +
        '<button class="rf-post-action rf-toggle-comments-btn" data-post-id="' + details.id + '">' +
          '💬 <span>' + fmt(comments.length) + ' commentaire' + (comments.length > 1 ? 's' : '') + '</span>' +
        '</button>' +
      '</div>' +
      renderComments(details.id, comments, fl) +
    '</div>';
  }

  function renderComments(postId, comments, fl) {
    if (!comments || !comments.length) {
      return '<div class="rf-comments" id="rf-comments-' + postId + '">' +
        renderCommentInput(postId, null) +
      '</div>';
    }

    var commentsHtml = comments.map(function (c) {
      var pc   = c.parent_comment || {};
      var subs = c.sous_comment   || [];

      /* Avatar parent */
      var pcAvatar = pc.avatar_url
        ? '<img class="rf-comment-avatar" src="' + pc.avatar_url + '" alt="" />'
        : '<div class="rf-comment-avatar-fallback">👤</div>';

      /* Sous-commentaires */
      var subsHtml = '';
      if (subs.length) {
        subsHtml = '<div class="rf-subcomments">' +
          subs.map(function (s) {
            var sAvatar = s.avatar_url
              ? '<img class="rf-comment-avatar" src="' + s.avatar_url + '" alt="" />'
              : '<div class="rf-comment-avatar-fallback">👤</div>';
            var mention = s.replied_to_user_id
              ? '<span class="rf-comment-mention">@' + (s.replied_to_name || 'utilisateur') + '</span> '
              : '';
            return '<div class="rf-comment">' +
              sAvatar +
              '<div class="rf-comment-body">' +
                '<div class="rf-comment-bubble">' +
                  '<div class="rf-comment-author">' + (s.user_name || 'Utilisateur') + '</div>' +
                  '<div class="rf-comment-text">' + mention + (s.content || '') + '</div>' +
                '</div>' +
                '<div class="rf-comment-meta">' +
                  '<span class="rf-comment-time">' + timeAgo(s.created_at) + '</span>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      }

      return '<div class="rf-comment">' +
        pcAvatar +
        '<div class="rf-comment-body">' +
          '<div class="rf-comment-bubble">' +
            '<div class="rf-comment-author">' + (pc.user_name || 'Utilisateur') + '</div>' +
            '<div class="rf-comment-text">' + (pc.content || '') + '</div>' +
          '</div>' +
          '<div class="rf-comment-meta">' +
            '<span class="rf-comment-time">' + timeAgo(pc.created_at) + '</span>' +
            '<button class="rf-comment-reply-btn" data-post-id="' + postId + '" data-parent-id="' + pc.id + '" data-user-id="' + pc.user_id + '">Répondre</button>' +
          '</div>' +
          subsHtml +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="rf-comments" id="rf-comments-' + postId + '">' +
      commentsHtml +
      renderCommentInput(postId, null) +
    '</div>';
  }

  function renderCommentInput(postId, parentId) {
    return '<div class="rf-comment-input-wrap" id="rf-input-wrap-' + postId + '">' +
      '<textarea class="rf-comment-input" placeholder="Écrire un commentaire…" rows="1" id="rf-comment-input-' + postId + '"></textarea>' +
      '<button class="rf-comment-submit" data-post-id="' + postId + '" data-parent-id="' + (parentId || '') + '">Envoyer</button>' +
    '</div>';
  }

  /* ---- Webinar sidebar ---- */
  function renderWebinarModalItem(w) {
    var now      = Date.now();
    var upcoming = w.scheduled_at > now;
    var badge    = upcoming
      ? '<span class="rf-webinar-list-badge upcoming">🟢 À venir</span>'
      : '<span class="rf-webinar-list-badge past">⏸ Passé</span>';

    var actionBtn = '';
    if (upcoming) {
      var regClass = _registeredWebinars[w.id] ? 'registered' : '';
      var regLabel = _registeredWebinars[w.id] ? 'Inscrit ✓' : 'S\'inscrire';
      actionBtn = '<button class="rf-btn-register-sm ' + regClass + '" data-webinar-id="' + w.id + '">' + regLabel + '</button>';
    } else if (w.replay_url) {
      actionBtn = '<a class="rf-replay-link" href="' + w.replay_url + '" target="_blank">▶ Replay</a>';
    }

    return '<div class="rf-webinar-list-item">' +
      badge +
      '<div class="rf-webinar-list-title">' + (w.title || '—') + '</div>' +
      '<div class="rf-webinar-list-meta">📅 ' + fmtDate(w.scheduled_at) + ' · ⏱ ' + (w.duration_minutes || '—') + ' min · ' + (w.outil_webinar || '—') + '</div>' +
      '<div class="rf-webinar-list-footer">' +
        '<span class="rf-webinar-list-reg">👥 ' + fmt(w.registrations_count) + ' inscrits</span>' +
        actionBtn +
      '</div>' +
    '</div>';
  }

  /* ---- À propos ---- */
  function renderAbout() {
    var room = _roomData.room_details || {};
    setText('rf-about-text',    room.description || '—');
    setText('rf-about-created', fmtDateShort(room.created_at));
  }

  /* ============================================================
     4. ACTIONS
     ============================================================ */

  /* ---- Follow / Unfollow room ---- */
  function bindFollow() {
    var btn = document.getElementById('rf-btn-follow');
    if (!btn || !_roomId) return;

    btn.addEventListener('click', async function () {
      if (!requireAuth()) return;

      var following = btn.classList.contains('following');
      var endpoint  = following ? '/unfollow_room' : '/register_room_follower';

      btn.disabled = true;
      try {
        await fetch(BASE_URL + endpoint, {
          method:  'POST',
          headers: getHeaders(true),
          body:    JSON.stringify({ room_id: _roomId })
        });

        _isFollowing = !following;

        if (_isFollowing) {
          btn.textContent = '✓ Vous suivez cette room';
          btn.classList.add('following');
          /* Incrémenter le compteur visuellement */
          var countEl = document.getElementById('rf-followers-count');
          if (countEl) {
            var current = parseInt((_roomData.room_details.followers_count || 0));
            countEl.textContent = fmt(current + 1) + ' membres';
          }
        } else {
          btn.textContent = 'Rejoindre la room';
          btn.classList.remove('following');
          var current2 = parseInt((_roomData.room_details.followers_count || 0));
          var countEl2 = document.getElementById('rf-followers-count');
          if (countEl2) countEl2.textContent = fmt(Math.max(0, current2 - 1)) + ' membres';
        }
      } catch (e) {
        console.error('[Follow]', e);
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---- Inscription webinar ---- */
  function bindWebinarActions() {
    var regBtn = document.getElementById('rf-btn-register');
    var webinar = _roomData.last_webinar;
    if (!regBtn || !webinar || !webinar.id) return;

    var now = Date.now();
    if (webinar.scheduled_at <= now) return; /* Passé → pas d'inscription */

    regBtn.addEventListener('click', async function () {
      if (!requireAuth()) return;
      await toggleWebinarRegistration(webinar.id, regBtn);
    });
  }

  async function toggleWebinarRegistration(webinarId, btn) {
    var registered = _registeredWebinars[webinarId];
    var endpoint   = registered ? '/unfollow_webinar' : '/register_webinar';

    if (btn) { btn.disabled = true; }
    try {
      await fetch(BASE_URL + endpoint, {
        method:  'POST',
        headers: getHeaders(true),
        body:    JSON.stringify({ webinar_id: webinarId })
      });

      _registeredWebinars[webinarId] = !registered;

      if (btn) {
        if (_registeredWebinars[webinarId]) {
          btn.textContent = '✓ Inscrit — Annuler';
          btn.classList.add('registered');
        } else {
          btn.textContent = 'S\'inscrire au webinar';
          btn.classList.remove('registered');
        }
      }
    } catch (e) {
      console.error('[Register]', e);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /* ---- Interactions posts (like, commentaires) ---- */
  function bindPostInteractions(container) {
    /* Likes */
    container.querySelectorAll('.rf-like-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!requireAuth()) return;
        var postId   = parseInt(btn.dataset.postId);
        var liked    = btn.classList.contains('liked');
        var endpoint = liked ? '/unlike_post' : '/like_post';
        var icon     = btn.querySelector('.rf-like-icon');
        var count    = btn.querySelector('.rf-like-count');

        btn.disabled = true;
        try {
          await fetch(BASE_URL + endpoint, {
            method:  'POST',
            headers: getHeaders(true),
            body:    JSON.stringify({ post_id: postId })
          });

          _likedPosts[postId] = !liked;

          if (_likedPosts[postId]) {
            btn.classList.add('liked');
            if (icon)  icon.textContent  = '❤️';
            if (count) count.textContent = fmt((parseInt(count.textContent.replace(/\s/g,'')) || 0) + 1);
          } else {
            btn.classList.remove('liked');
            if (icon)  icon.textContent  = '🤍';
            if (count) count.textContent = fmt(Math.max(0, (parseInt(count.textContent.replace(/\s/g,'')) || 0) - 1));
          }
        } catch (e) {
          console.error('[Like]', e);
        } finally {
          btn.disabled = false;
        }
      });
    });

    /* Toggle commentaires */
    container.querySelectorAll('.rf-toggle-comments-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var postId    = btn.dataset.postId;
        var commentsEl = document.getElementById('rf-comments-' + postId);
        if (commentsEl) commentsEl.classList.toggle('open');
      });
    });

    /* Boutons s'inscrire dans les posts webinar */
    container.querySelectorAll('.rf-btn-register-post').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!requireAuth()) return;
        await toggleWebinarRegistration(parseInt(btn.dataset.webinarId), btn);
      });
    });

    /* Répondre à un commentaire */
    container.querySelectorAll('.rf-comment-reply-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var postId   = btn.dataset.postId;
        var parentId = btn.dataset.parentId;
        var inputWrap = document.getElementById('rf-input-wrap-' + postId);
        if (!inputWrap) return;

        /* Mettre à jour le parent_id sur le bouton submit */
        var submit = inputWrap.querySelector('.rf-comment-submit');
        if (submit) {
          submit.dataset.parentId = parentId;
        }
        /* Focus sur l'input */
        var input = document.getElementById('rf-comment-input-' + postId);
        if (input) {
          input.focus();
          /* Ouvrir la section commentaires */
          var commentsEl = document.getElementById('rf-comments-' + postId);
          if (commentsEl) commentsEl.classList.add('open');
        }
      });
    });

    /* Submit commentaire */
    container.querySelectorAll('.rf-comment-submit').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!requireAuth()) return;

        var postId   = btn.dataset.postId;
        var parentId = btn.dataset.parentId || '';
        var input    = document.getElementById('rf-comment-input-' + postId);
        var content  = input ? input.value.trim() : '';
        if (!content) return;

        btn.disabled = true;
        btn.textContent = '…';

        try {
          var body = { post_id: parseInt(postId), content: content };
          if (parentId) body.parent_id = parseInt(parentId);

          /* Endpoint à créer — on fait le call quand il sera disponible */
          /* await fetch(BASE_URL + '/room_post_comment', {
               method: 'POST', headers: getHeaders(true), body: JSON.stringify(body)
             }); */

          /* Pour l'instant : affichage optimiste */
          if (input) input.value = '';
          btn.dataset.parentId = ''; /* Reset le parent */

          /* TODO : recharger les commentaires du post */
          showLocalToast('💬 Commentaire publié !');

        } catch (e) {
          console.error('[Comment]', e);
        } finally {
          btn.textContent = 'Envoyer';
          btn.disabled    = false;
        }
      });
    });

    /* Auto-resize textarea commentaire */
    container.querySelectorAll('.rf-comment-input').forEach(function (input) {
      input.addEventListener('input', function () {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      });
    });
  }

  /* ---- Toast local ---- */
  function showLocalToast(msg) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111112;color:#fff;padding:10px 22px;border-radius:10px;font-family:DM Sans,sans-serif;font-size:.82rem;font-weight:500;z-index:99999;animation:rf-fadein .3s ease;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3000);
  }

  /* ============================================================
     5. MODAL — Tous les webinaires
     ============================================================ */

  function bindModalWebinars() {
    var openBtn  = document.getElementById('rf-btn-all-webinars');
    var closeBtn = document.getElementById('rf-modal-webinars-close');
    var overlay  = document.getElementById('rf-modal-webinars');
    var body     = document.getElementById('rf-modal-webinars-body');

    if (openBtn) {
      openBtn.addEventListener('click', function () {
        /* Charge tous les webinaires */
        if (body) {
          body.innerHTML = _allWebinars.length
            ? _allWebinars.map(renderWebinarModalItem).join('')
            : '<div style="text-align:center;color:#9ca3af;padding:24px;font-size:.85rem;">Aucun webinaire</div>';
        }
        if (overlay) overlay.classList.add('active');
        /* Bind inscriptions dans la modal */
        if (body) {
          body.querySelectorAll('.rf-btn-register-sm').forEach(function (btn) {
            btn.addEventListener('click', async function () {
              if (!requireAuth()) return;
              await toggleWebinarRegistration(parseInt(btn.dataset.webinarId), btn);
            });
          });
        }
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', function () { overlay && overlay.classList.remove('active'); });
    if (overlay)  overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('active'); });

    /* Bouton "voir toutes les actus" → TODO quand endpoint disponible */
    var seeAll = document.getElementById('rf-see-all-posts');
    if (seeAll) {
      seeAll.addEventListener('click', function () {
        /* Quand room_posts_all sera disponible */
        showLocalToast('Fonctionnalité bientôt disponible');
      });
    }
  }

  /* ============================================================
     LANCEMENT
     ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
