/* ============================================================
   ROOM FRONT v2 — Script page publique
   Corrections : structure contents, avatars générés, webinars modal,
   commentaires style Facebook, post types enrichis, voir toutes les actus
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONFIG
     ============================================================ */
  var BASE_URL  = 'https://xmot-l3ir-7kuj.p7.xano.io/api:vRpHgMHS';
  var SITE_URL  = 'https://www.digitools-room.com';

  var _roomId    = null;
  var _roomSlug  = '';
  var _roomData  = null;
  var _allWebinarsData = [];
  var _likedPosts      = {};
  var _registeredWebs  = {};
  var _allPostsLoaded  = false;

  /* Couleurs pour avatars générés */
  var AVATAR_STYLE = 'background:#EFF6FF;border:1.5px solid #BFDBFE;color:#2563eb;';

  function randomLetter() {
    return 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)];
  }

  /* ============================================================
     UTILS
     ============================================================ */
  function getAuth()   { return JSON.parse(localStorage.getItem('auth') || 'null'); }
  function getToken()  { var a = getAuth(); return a && a.token; }
  function isLoggedIn(){ return !!getToken(); }

  function getHeaders(withAuth) {
    var h = { 'Content-Type': 'application/json' };
    if (withAuth) { var t = getToken(); if (t) h['Authorization'] = 'Bearer ' + t; }
    return h;
  }

  function requireAuth() {
    if (isLoggedIn()) return true;
    var popup = document.querySelector('.abo-nonco-container');
    if (popup) popup.style.display = 'flex';
    return false;
  }

  function getSlugFromUrl() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    var idx   = parts.indexOf('rooms');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
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

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setHTML(id, val) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = val;
  }

  /* ============================================================
     AVATARS — toujours 4, générés si manquants
     ============================================================ */

  /**
   * Génère le HTML de N avatars depuis un tableau de followers/inscrits,
   * complète avec des avatars générés si count < target.
   * @param {Array}  items   — [{avatar_url, ...}]
   * @param {number} target  — nombre cible (4)
   * @param {string} cls     — classe CSS de l'img
   * @param {string} genCls  — classe CSS des générés
   */
  function buildAvatarStack(items, target, cls, genCls) {
    target = target || 4;
    cls    = cls    || 'rf-avatar-stack-item';
    genCls = genCls || 'rf-avatar-gen';

    var html = '';
    var shown = 0;

    /* D'abord les vrais avatars */
    (items || []).forEach(function (f) {
      if (shown >= target) return;
      if (f.avatar_url) {
        html += '<img class="' + cls + '" src="' + f.avatar_url + '" alt="" />';
        shown++;
      }
    });

    /* Compléter avec des générés */
    while (shown < target) {
      var letter = randomLetter();
      html += '<div class="' + genCls + '" style="' + AVATAR_STYLE + '">' + letter + '</div>';
      shown++;
    }

    return html;
  }

  /* Même chose mais pour les avatars de commentaires (taille standard) */
  function buildCommentAvatar(user, cls) {
    cls = cls || 'rf-comment-avatar';
    if (user && user.avatar_url) {
      return '<img class="' + cls + '" src="' + user.avatar_url + '" alt="" />';
    }
    var name   = (user && ((user.first_name || '') + (user.name || ''))) || '?';
    var letter = name[0].toUpperCase();
    return '<div class="rf-comment-avatar-gen" style="' + AVATAR_STYLE + '">' + letter + '</div>';
  }

  /* ============================================================
     INIT
     ============================================================ */
  async function init() {
    _roomSlug = getSlugFromUrl();
    if (!_roomSlug) return;

    try {
      /* Charge room_front */
      var res = await fetch(BASE_URL + '/room_front?slug=' + encodeURIComponent(_roomSlug), {
        headers: getHeaders(isLoggedIn())
      });
      _roomData = await res.json();

      if (!res.ok || !_roomData.room_details) return;

      _roomId = _roomData.room_details.id;
      _allWebinarsData = _roomData.room_webinars || [];

      /* Charge get_contents en parallèle */
      var contentsRes = await fetch(BASE_URL + '/get_contents?room_id=' + _roomId);
      var contentsData = await contentsRes.json();

      renderHero();
      renderFreelance();
      renderFeed(_roomData.room_post || []);
      renderContents(Array.isArray(contentsData) ? contentsData : []);
      renderWebinar();
      renderAbout();
      bindFollow();
      bindWebinarActions();
      bindModalWebinars();
      bindResourceTabs();

    } catch (e) {
      console.error('[RoomFront]', e);
    }
  }

  /* ============================================================
     RENDER — HERO
     ============================================================ */
  function renderHero() {
    var room      = _roomData.room_details  || {};
    var followers = _roomData.room_last_followers || [];

    setText('rf-breadcrumb-title', room.title || '—');
    setText('rf-hero-title',       room.title || '—');
    setText('rf-hero-header',      room.header || room.description || '—');
    setText('rf-followers-count',  fmt(room.followers_count) + ' membres');

    if (room.cover_url) {
      var bg = document.getElementById('rf-hero-bg');
      if (bg) { bg.src = room.cover_url; bg.style.display = 'block'; }
    }

    /* Avatars stack — toujours 4 */
    var stack = document.getElementById('rf-avatar-stack');
    if (stack) stack.innerHTML = buildAvatarStack(followers, 4, 'rf-avatar-stack-item', 'rf-avatar-gen');
  }

  /* ============================================================
     RENDER — FREELANCE
     ============================================================ */
  function renderFreelance() {
    var fl = _roomData.freelance_profile || {};

    var avatar   = document.getElementById('rf-fl-avatar');
    var fallback = document.getElementById('rf-fl-avatar-fallback');

    if (fl.profile_image_url) {
      if (avatar)   { avatar.src = fl.profile_image_url; avatar.style.display = 'block'; }
      if (fallback)   fallback.style.display = 'none';
    } else {
      if (avatar)   avatar.style.display   = 'none';
      if (fallback) {
        fallback.style.display = 'flex';
        fallback.textContent   = (fl.display_name || '?')[0].toUpperCase();
      }
    }

    setText('rf-fl-name', fl.display_name || '—');

    var domains = fl.sous_domaine_activity || [];
    setText('rf-fl-domain', domains[0] || fl.headline || '—');

    if (fl.notation && fl.nb_notation > 0) {
      var ratingEl = document.getElementById('rf-fl-rating');
      if (ratingEl) ratingEl.style.display = 'flex';
      setText('rf-fl-notation',    Number(fl.notation).toFixed(1));
      setText('rf-fl-nb-notation', '(' + fl.nb_notation + ' avis)');
    }

    var loc = [fl.ville, fl.pays].filter(Boolean).join(', ');
    if (loc) {
      var locWrap = document.getElementById('rf-fl-location');
      if (locWrap) locWrap.style.display = 'flex';
      setText('rf-fl-location-text', loc);
    }

    var aboutEl = document.getElementById('rf-fl-about');
    if (aboutEl && fl.about_text) aboutEl.innerHTML = fl.about_text;

    var tagsEl = document.getElementById('rf-fl-tags');
    if (tagsEl) {
      tagsEl.innerHTML = domains.map(function (d) {
        return '<span class="rf-tag">' + d + '</span>';
      }).join('');
    }

    var link = document.getElementById('rf-fl-profile-link');
    if (link && fl.slug) link.href = SITE_URL + '/freelances/' + fl.slug;
  }

  /* ============================================================
     RENDER — CONTENUS
     Structure : [{type:"article"|"course"|"resource", details:{...}}]
     ============================================================ */
  function renderContents(items) {
    console.log('[RoomFront] Contents reçus:', items);

    if (!Array.isArray(items) || !items.length) {
      ['rf-grid-articles','rf-grid-formations','rf-grid-ressources'].forEach(function(id){
        var el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="rf-empty-tab">Aucun contenu rattaché</div>';
      });
      return;
    }

    var articles   = items.filter(function(c){ return c.type === 'article'; });
    var formations = items.filter(function(c){ return c.type === 'course'; });
    var ressources = items.filter(function(c){ return c.type === 'resource'; });

    console.log('[RoomFront] Articles:', articles.length, 'Formations:', formations.length, 'Ressources:', ressources.length);

    renderGrid('rf-grid-articles',   articles,   'article');
    renderGrid('rf-grid-formations', formations, 'course');
    renderGrid('rf-grid-ressources', ressources, 'resource');
  }

  function renderResourceMeta(d, type) {
    var badges = '';
    if (type === 'article' && d.temps_lecture_secondes) {
      badges += '<span class="rf-resource-meta-badge">⏱ ' + Math.ceil(d.temps_lecture_secondes / 60) + ' min</span>';
    }
    if (type === 'article' && d.nb_view) {
      badges += '<span class="rf-resource-meta-badge">👁 ' + fmt(d.nb_view) + '</span>';
    }
    if (type === 'course' && d.nb_participants) {
      badges += '<span class="rf-resource-meta-badge">👥 ' + fmt(d.nb_participants) + '</span>';
    }
    if (d.average_notation > 0 && d.nb_notation > 0) {
      badges += '<span class="rf-resource-rating">★ ' + Number(d.average_notation).toFixed(1) + '</span>';
    }
    return badges ? '<div class="rf-resource-meta">' + badges + '</div>' : '';
  }

  function renderGrid(gridId, items, type) {
    var grid = document.getElementById(gridId);
    if (!grid) return;

    if (!items || !items.length) {
      grid.innerHTML = '<div class="rf-empty-tab">Aucun contenu de ce type rattaché à la room</div>';
      return;
    }

    var labels = { article: 'Article', course: 'Formation', resource: 'Ressource' };
    var icons  = { article: '📄', course: '🎓', resource: '📦' };

    grid.innerHTML = items.map(function (c) {
      var d = c.details || {};

      var title    = d.title || d.title_short || '—';
      var coverUrl = d.url_image || d.cover_url || '';

      var coverEl = coverUrl
        ? '<img class="rf-resource-cover" src="' + coverUrl + '" alt="" />'
        : '<div class="rf-resource-cover-placeholder">' + icons[type] + '</div>';

      /* Liens */
      var href = '#';
      if (type === 'article'  && d.slug) href = SITE_URL + '/articles/'    + d.slug;
      if (type === 'course'   && d.slug) href = SITE_URL + '/pages-formation/' + d.slug;
      if (type === 'resource' && d.lien_ressource) href = d.lien_ressource;

      return '<a class="rf-resource-card" href="' + href + '" target="_blank" rel="noopener">' +
        coverEl +
        '<div class="rf-resource-body">' +
          '<span class="rf-content-badge ' + type + '">' + labels[type] + '</span>' +
          '<div class="rf-resource-title">' + title + '</div>' +
          renderResourceMeta(d, type) +
        '</div>' +
      '</a>';
    }).join('');
  }

  /* ============================================================
     RENDER — FEED
     ============================================================ */
  function renderFeed(posts) {
    var feed = document.getElementById('rf-feed');
    if (!feed) return;

    var fl = _roomData.freelance_profile || {};

    if (!posts || !posts.length) {
      feed.innerHTML = '<div style="padding:24px;text-align:center;color:#9ca3af;font-size:.85rem;">Aucune actu publiée pour le moment</div>';
      return;
    }

    feed.innerHTML += posts.map(function (p) {
      return renderPost(p, fl);
    }).join('');

    /* Bouton voir toutes les actus */
    var seeAll = document.getElementById('rf-see-all-posts');
    if (seeAll && !_allPostsLoaded) seeAll.style.display = 'flex';

    bindPostInteractions(feed);
  }

  function renderPost(p, fl) {
    var d        = p.global_post_details || {};
    var likes    = p.global_post_likes   || 0;
    var comments = p.global_post_comments || [];

    /* Attachment */
    var attachment = renderPostAttachment(d);

    /* Aperçu du dernier commentaire */
    var commentPreview = '';
    if (comments.length > 0) {
      var last = comments[comments.length - 1];
      var lp   = last.parent_comment || {};
      var lu   = lp._user || {};
      var lName = ((lu.first_name || '') + ' ' + (lu.name || '')).trim() || 'Utilisateur';
      commentPreview = '<div class="rf-comments-preview" id="rf-preview-' + d.id + '">' +
        '<div class="rf-comment-preview">' +
          buildCommentAvatar(lu, 'rf-comment-avatar') +
          '<div class="rf-comment-body-wrap">' +
            '<div class="rf-comment-author-row">' +
              '<span class="rf-comment-author">' + lName + '</span>' +
              '<span class="rf-comment-time">' + timeAgo(lp.created_at) + '</span>' +
            '</div>' +
            '<div class="rf-comment-text">' + (lp.content || '') + '</div>' +
          '</div>' +
        '</div>' +
        (comments.length > 1
          ? '<button class="rf-see-comments" data-post-id="' + d.id + '">Voir les ' + comments.length + ' commentaires</button>'
          : '<button class="rf-see-comments" data-post-id="' + d.id + '">Voir le commentaire</button>'
        ) +
      '</div>';
    } else {
      commentPreview = '<button class="rf-see-comments" data-post-id="' + d.id + '" style="color:#9ca3af;">Être le premier à commenter</button>';
    }

    /* Section commentaires complète (masquée) */
    var commentsFull = renderCommentsFull(d.id, comments);

    var likedClass = _likedPosts[d.id] ? 'liked' : '';

    return '<div class="rf-post" data-post-id="' + d.id + '">' +
      '<div class="rf-post-header">' +
        (fl.profile_image_url
          ? '<img class="rf-post-avatar" src="' + fl.profile_image_url + '" alt="" />'
          : '<div class="rf-post-avatar" style="display:flex;align-items:center;justify-content:center;background:#eff6ff;font-size:.75rem;font-weight:700;color:#2563eb;">' + ((fl.display_name || '?')[0]) + '</div>'
        ) +
        '<div>' +
          '<div class="rf-post-author">' + (fl.display_name || '—') + '</div>' +
          '<div class="rf-post-role">' + ((fl.sous_domaine_activity || [])[0] || fl.headline || '') + '</div>' +
        '</div>' +
        '<span class="rf-post-time">' + timeAgo(d.created_at) + '</span>' +
      '</div>' +
      '<div class="rf-post-content">' + (d.content || '') + '</div>' +
      attachment +
      '<div class="rf-post-footer">' +
        '<button class="rf-post-action rf-like-btn ' + likedClass + '" data-post-id="' + d.id + '">' +
          '<span class="rf-like-icon">' + (_likedPosts[d.id] ? '❤️' : '🤍') + '</span> ' +
          '<span class="rf-like-count">' + fmt(likes) + '</span>' +
        '</button>' +
      '</div>' +
      commentPreview +
      commentsFull +
      renderCommentInput(d.id, '', '', '') +
      '<div class="rf-post-separator"></div>' +
    '</div>';
  }

  function renderPostAttachment(d) {
    /* Type webinar — données dans _webinars */
    if (d.post_type === 'webinar' && d._webinars) {
      var w = d._webinars;
      return '<div class="rf-post-webinar-card">' +
        '<div class="rf-post-webinar-info">' +
          '<div class="rf-post-webinar-title">' + (w.title || '—') + '</div>' +
          '<div class="rf-post-webinar-date">📅 ' + fmtDate(w.scheduled_at) + '</div>' +
          '<div class="rf-post-webinar-tool">via ' + (w.outil_webinar || '—') + '</div>' +
        '</div>' +
        '<button class="rf-post-webinar-btn rf-webinar-register-post" data-webinar-id="' + w.id + '">S\'inscrire</button>' +
      '</div>';
    }

    /* Type resource — données dans _blog_ressources */
    if (d.post_type === 'resource' && d._blog_ressources) {
      var r = d._blog_ressources;
      return '<a class="rf-post-resource-card" href="' + (r.lien_ressource || '#') + '" target="_blank" rel="noopener">' +
        '<div class="rf-post-resource-icon">📦</div>' +
        '<div class="rf-post-resource-info">' +
          '<div class="rf-post-resource-label">Ressource téléchargeable</div>' +
          '<div class="rf-post-resource-title">' + (r.title_short || r.title || '—') + '</div>' +
          '<div class="rf-post-resource-desc">' + (r.description_short || '') + '</div>' +
        '</div>' +
        '<span style="font-size:.75rem;font-weight:700;color:#374151;flex-shrink:0;">→</span>' +
      '</a>';
    }

    /* Type link (article_url ou course_url) */
    var url = d.article_url || d.course_url || '';
    if (url) {
      var domain = '';
      try { domain = new URL(url).hostname.replace('www.', ''); } catch(e){}
      return '<a class="rf-post-link" href="' + url + '" target="_blank" rel="noopener">' +
        '<div style="font-size:1.4rem;flex-shrink:0;">🔗</div>' +
        '<div class="rf-post-link-info">' +
          '<div class="rf-post-link-domain">' + domain + '</div>' +
          '<div class="rf-post-link-title">' + url.substring(0, 70) + (url.length > 70 ? '…' : '') + '</div>' +
        '</div>' +
      '</a>';
    }

    return '';
  }

  /* ---- Commentaires full (masqués, style Facebook) ---- */
  function renderCommentsFull(postId, comments) {
    if (!comments || !comments.length) {
      return '<div class="rf-comments-full" id="rf-comments-' + postId + '"></div>';
    }

    var html = comments.map(function (c) {
      var pc   = c.parent_comment || {};
      var subs = c.sous_comment   || [];
      var pu   = pc._user || {};
      var pName = ((pu.first_name || '') + ' ' + (pu.name || '')).trim() || 'Utilisateur';

      /* Sous-commentaires */
      var subsHtml = '';
      if (subs.length) {
        var subsContent = subs.map(function (s) {
          var su    = s._user || {};
          var sName = ((su.first_name || '') + ' ' + (su.name || '')).trim() || 'Utilisateur';
          var mention = s.replied_to_user_id
            ? '<span class="rf-comment-mention">@' + sName + ' </span>'
            : '';
          return '<div class="rf-comment-preview" style="margin-bottom:10px;">' +
            buildCommentAvatar(su, 'rf-comment-avatar') +
            '<div class="rf-comment-body-wrap">' +
              '<div class="rf-comment-author-row">' +
                '<span class="rf-comment-author">' + sName + '</span>' +
                '<span class="rf-comment-time">' + timeAgo(s.created_at) + '</span>' +
              '</div>' +
              '<div class="rf-comment-text">' + mention + (s.content || '') + '</div>' +
              '<div class="rf-comment-actions">' +
                /* Répondre à un sous-commentaire → parent_id = commentaire racine, response_user_id = user du sous-commentaire */
                '<button class="rf-comment-reply-btn" ' +
                  'data-post-id="' + postId + '" ' +
                  'data-parent-id="' + pc.id + '" ' +
                  'data-response-user-id="' + (su.id || '') + '" ' +
                  'data-response-user-name="' + sName + '">' +
                  'Répondre' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');

        subsHtml =
          '<button class="rf-see-comments" style="margin-left:38px;font-size:.72rem;margin-top:4px;" data-toggle-subs="rf-subs-' + pc.id + '">' +
            'Voir ' + subs.length + ' réponse' + (subs.length > 1 ? 's' : '') +
          '</button>' +
          '<div class="rf-subcomments" id="rf-subs-' + pc.id + '" style="display:none;">' +
            subsContent +
          '</div>';
      }

      return '<div class="rf-comment-preview" style="margin-bottom:14px;">' +
        buildCommentAvatar(pu, 'rf-comment-avatar') +
        '<div class="rf-comment-body-wrap">' +
          '<div class="rf-comment-author-row">' +
            '<span class="rf-comment-author">' + pName + '</span>' +
            '<span class="rf-comment-time">' + timeAgo(pc.created_at) + '</span>' +
          '</div>' +
          '<div class="rf-comment-text">' + (pc.content || '') + '</div>' +
          '<div class="rf-comment-actions">' +
            /* Répondre à commentaire racine → parent_id = id du commentaire, response_user_id vide */
            '<button class="rf-comment-reply-btn" ' +
              'data-post-id="' + postId + '" ' +
              'data-parent-id="' + pc.id + '" ' +
              'data-response-user-id="" ' +
              'data-response-user-name="">' +
              'Répondre' +
            '</button>' +
          '</div>' +
          subsHtml +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="rf-comments-full" id="rf-comments-' + postId + '">' + html + '</div>';
  }

  function renderCommentInput(postId, parentId, responseUserId, responseUserName) {
    var auth     = getAuth();
    var user     = auth && auth.user;
    var myAvatar = '';

    if (user && user.avatar_url) {
      myAvatar = '<img class="rf-my-avatar" src="' + user.avatar_url + '" alt="" />';
    } else {
      var letter = user && user.first_name
        ? user.first_name[0].toUpperCase()
        : 'U';
      myAvatar = '<div class="rf-my-avatar" style="display:flex;align-items:center;justify-content:center;' + AVATAR_STYLE + 'font-size:.7rem;font-weight:700;">' + letter + '</div>';
    }

    var placeholder = responseUserName
      ? 'Répondre à ' + responseUserName + '…'
      : 'Écrire un commentaire…';

    return '<div class="rf-comment-input-wrap" id="rf-input-wrap-' + postId + '-' + (parentId || '0') + '">' +
      myAvatar +
      '<textarea class="rf-comment-input" placeholder="' + placeholder + '" rows="1" ' +
        'id="rf-input-' + postId + '-' + (parentId || '0') + '"></textarea>' +
      '<button class="rf-comment-submit" ' +
        'data-post-id="' + postId + '" ' +
        'data-parent-id="' + (parentId || '') + '" ' +
        'data-response-user-id="' + (responseUserId || '') + '">' +
        'Envoyer' +
      '</button>' +
    '</div>';
  }

  /* ============================================================
     RENDER — WEBINAR SIDEBAR
     ============================================================ */
  function renderWebinar() {
    var webinar = _roomData.last_webinar;
    var card    = document.getElementById('rf-webinar-card');

    /* Vérification robuste — id peut être string ou number */
    if (!webinar || !webinar.id) {
      console.log('[RoomFront] Pas de webinar dans last_webinar:', webinar);
      return;
    }

    /* Afficher la card */
    if (card) { card.style.display = 'block'; card.style.removeProperty('display'); card.style.display = 'block'; }

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

    var badge = document.getElementById('rf-live-badge');
    if (badge) {
      if (upcoming) { badge.textContent = '📅 À venir'; badge.className = 'rf-live-badge upcoming'; }
      else          { badge.textContent = '🔴 LIVE';    badge.className = 'rf-live-badge live'; }
    }

    /* Avatars inscrits — toujours 4 */
    var regAvatars = document.getElementById('rf-webinar-reg-avatars');
    if (regAvatars) {
      var webFollowers = _roomData.webinars_last_followers || [];
      regAvatars.innerHTML = buildAvatarStack(webFollowers, 4, 'rf-webinar-reg-avatar', 'rf-avatar-gen-sm');
    }

    /* Bouton */
    var regBtn = document.getElementById('rf-btn-register');
    if (regBtn) {
      if (!upcoming) {
        if (webinar.replay_url) {
          regBtn.textContent = '▶ Voir le replay';
          regBtn.onclick = function () { window.open(webinar.replay_url, '_blank'); };
        } else {
          regBtn.textContent = 'Webinaire terminé';
          regBtn.disabled    = true;
          regBtn.style.cssText = 'background:#f3f4f6;color:#9ca3af;cursor:default;';
        }
      }
    }
  }

  /* ============================================================
     RENDER — À PROPOS
     ============================================================ */
  function renderAbout() {
    var room = _roomData.room_details || {};
    /* innerHTML pour respecter le HTML (rich text) */
    setHTML('rf-about-text', room.description || '—');
    setText('rf-about-created', fmtDateShort(room.created_at));
  }

  /* ============================================================
     BIND — TABS RESSOURCES
     ============================================================ */
  function bindResourceTabs() {
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

  /* ============================================================
     BIND — FOLLOW
     ============================================================ */
  function bindFollow() {
    var btn = document.getElementById('rf-btn-follow');
    if (!btn || !_roomId) return;

    btn.addEventListener('click', async function () {
      if (!requireAuth()) return;
      var following = btn.classList.contains('following');
      var endpoint  = following ? '/unfollow_room' : '/register_room_follower';
      btn.disabled  = true;

      try {
        await fetch(BASE_URL + endpoint, {
          method:  'POST',
          headers: getHeaders(true),
          body:    JSON.stringify({ room_id: _roomId })
        });

        if (!following) {
          btn.textContent = '✓ Vous suivez cette room';
          btn.classList.add('following');
        } else {
          btn.textContent = 'Rejoindre la room';
          btn.classList.remove('following');
        }
      } catch (e) { console.error('[Follow]', e); }
      finally { btn.disabled = false; }
    });
  }

  /* ============================================================
     BIND — WEBINAR
     ============================================================ */
  function bindWebinarActions() {
    var regBtn  = document.getElementById('rf-btn-register');
    var webinar = _roomData.last_webinar;
    if (!regBtn || !webinar || !webinar.id) return;
    if (webinar.scheduled_at <= Date.now()) return;

    regBtn.addEventListener('click', async function () {
      if (!requireAuth()) return;
      await toggleRegistration(webinar.id, regBtn, true);
    });
  }

  async function toggleRegistration(webinarId, btn, isSidebar) {
    var registered = _registeredWebs[webinarId];
    var endpoint   = registered ? '/unfollow_webinar' : '/register_webinar';
    if (btn) btn.disabled = true;

    try {
      await fetch(BASE_URL + endpoint, {
        method:  'POST',
        headers: getHeaders(true),
        body:    JSON.stringify({ webinar_id: webinarId })
      });
      _registeredWebs[webinarId] = !registered;

      if (btn) {
        if (_registeredWebs[webinarId]) {
          btn.textContent = '✓ Inscrit — Annuler';
          btn.classList.add('registered');
        } else {
          btn.textContent = isSidebar ? 'S\'inscrire au webinar' : 'S\'inscrire';
          btn.classList.remove('registered');
        }
      }
    } catch (e) { console.error('[Register]', e); }
    finally { if (btn) btn.disabled = false; }
  }

  /* ============================================================
     BIND — INTERACTIONS POSTS
     ============================================================ */
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
            method: 'POST', headers: getHeaders(true),
            body: JSON.stringify({ post_id: postId })
          });
          _likedPosts[postId] = !liked;
          if (_likedPosts[postId]) {
            btn.classList.add('liked');
            if (icon)  icon.textContent  = '❤️';
            if (count) count.textContent = fmt((parseInt(count.textContent) || 0) + 1);
          } else {
            btn.classList.remove('liked');
            if (icon)  icon.textContent  = '🤍';
            if (count) count.textContent = fmt(Math.max(0, (parseInt(count.textContent) || 0) - 1));
          }
        } catch(e){ console.error('[Like]', e); }
        finally { btn.disabled = false; }
      });
    });

    /* Voir tous les commentaires */
    container.querySelectorAll('.rf-see-comments').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var postId = btn.dataset.postId;
        var full   = document.getElementById('rf-comments-' + postId);
        var prev   = document.getElementById('rf-preview-' + postId);
        if (full) full.classList.toggle('open');
        if (prev) prev.style.display = full && full.classList.contains('open') ? 'none' : 'flex';
        if (full && full.classList.contains('open')) btn.style.display = 'none';
      });
    });

    /* Toggle sous-commentaires */
    container.querySelectorAll('[data-toggle-subs]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.toggleSubs;
        var el = document.getElementById(id);
        if (!el) return;
        var open = el.style.display !== 'none';
        el.style.display = open ? 'none' : 'flex';
        el.style.flexDirection = 'column';
        el.style.gap = '10px';
        btn.textContent = open
          ? btn.textContent.replace('Masquer', 'Voir')
          : btn.textContent.replace('Voir', 'Masquer');
      });
    });

    /* Inscrire depuis post webinar */
    container.querySelectorAll('.rf-webinar-register-post').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!requireAuth()) return;
        await toggleRegistration(parseInt(btn.dataset.webinarId), btn, false);
      });
    });

    /* Répondre — ouvre un mini input inline sous le commentaire (style Facebook) */
    container.querySelectorAll('.rf-comment-reply-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var postId           = btn.dataset.postId;
        var parentId         = btn.dataset.parentId         || '';
        var responseUserId   = btn.dataset.responseUserId   || '';
        var responseUserName = btn.dataset.responseUserName || '';

        /* Ouvrir la section commentaires du post */
        var full = document.getElementById('rf-comments-' + postId);
        if (full) full.classList.add('open');

        /* Afficher sous-commentaires si masqués */
        if (parentId) {
          var subs = document.getElementById('rf-subs-' + parentId);
          if (subs) { subs.style.display = 'flex'; subs.style.flexDirection = 'column'; subs.style.gap = '10px'; }
        }

        /* Supprimer l'éventuel input inline déjà ouvert */
        var existingInline = container.querySelector('.rf-inline-reply');
        if (existingInline) existingInline.remove();

        /* Créer un input inline directement sous ce bouton "Répondre" */
        var auth     = getAuth();
        var user     = auth && auth.user;
        var myAvatar = (user && user.avatar_url)
          ? '<img class="rf-my-avatar" src="' + user.avatar_url + '" alt="" style="width:26px;height:26px;" />'
          : '<div class="rf-my-avatar" style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;' + AVATAR_STYLE + 'font-size:.65rem;font-weight:700;">' + ((user && user.first_name && user.first_name[0].toUpperCase()) || 'U') + '</div>';

        var inlineWrap = document.createElement('div');
        inlineWrap.className = 'rf-inline-reply rf-comment-input-wrap';
        inlineWrap.style.marginTop = '8px';
        inlineWrap.innerHTML = myAvatar +
          '<textarea class="rf-comment-input rf-inline-textarea" ' +
            'placeholder="' + (responseUserName ? '@' + responseUserName + ' ' : '') + '" ' +
            'rows="1" style="font-size:.8rem;"></textarea>' +
          '<button class="rf-comment-submit rf-inline-submit" ' +
            'data-post-id="' + postId + '" ' +
            'data-parent-id="' + parentId + '" ' +
            'data-response-user-id="' + responseUserId + '" ' +
            'style="font-size:.75rem;padding:7px 14px;">Envoyer</button>';

        /* Insérer après le bouton Répondre (dans .rf-comment-actions) */
        var actionsDiv = btn.closest('.rf-comment-actions');
        if (actionsDiv) {
          actionsDiv.parentElement.appendChild(inlineWrap);
        }

        /* Focus + auto-resize */
        var ta = inlineWrap.querySelector('.rf-inline-textarea');
        if (ta) {
          ta.focus();
          ta.addEventListener('input', function () {
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 80) + 'px';
          });
        }

        /* Bind submit de cet input inline */
        var inlineBtn = inlineWrap.querySelector('.rf-inline-submit');
        if (inlineBtn) {
          inlineBtn.addEventListener('click', async function () {
            if (!requireAuth()) return;
            var content = ta ? ta.value.trim() : '';
            /* Ajouter @nom au début si réponse à quelqu'un */
            if (responseUserName && !content.startsWith('@')) {
              content = '@' + responseUserName + ' ' + content;
            }
            if (!content.trim()) return;
            inlineBtn.disabled = true; inlineBtn.textContent = '…';
            try {
              var body = { post_id: parseInt(postId), content: content, room_id: _roomId || 0 };
              if (parentId)       body.parent_id        = parseInt(parentId);
              if (responseUserId) body.response_user_id = parseInt(responseUserId);
              await fetch(BASE_URL + '/create_comment_post', {
                method: 'POST', headers: getHeaders(true), body: JSON.stringify(body)
              });
              inlineWrap.remove();
              toast('💬 Réponse publiée !');
            } catch(e) { console.error('[InlineReply]', e); }
            finally { inlineBtn.textContent = 'Envoyer'; inlineBtn.disabled = false; }
          });
        }
      });
    });

    /* Submit commentaire */
    container.querySelectorAll('.rf-comment-submit').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!requireAuth()) return;

        var postId         = btn.dataset.postId;
        var parentId       = btn.dataset.parentId       || '';
        var responseUserId = btn.dataset.responseUserId || '';
        var inputId        = 'rf-input-' + postId + '-0';
        var input          = document.getElementById(inputId);
        var content        = input ? input.value.trim() : '';
        if (!content) return;

        btn.disabled    = true;
        btn.textContent = '…';

        try {
          var body = { post_id: parseInt(postId), content: content, room_id: _roomId || 0 };
          if (parentId)       body.parent_id         = parseInt(parentId);
          if (responseUserId) body.response_user_id  = parseInt(responseUserId);

          await fetch(BASE_URL + '/create_comment_post', {
            method: 'POST', headers: getHeaders(true), body: JSON.stringify(body)
          });

          if (input) {
            input.value       = '';
            input.placeholder = 'Écrire un commentaire…';
            input.style.height = 'auto';
          }
          btn.dataset.parentId       = '';
          btn.dataset.responseUserId = '';
          toast('💬 Commentaire publié !');

        } catch(e) { console.error('[Comment]', e); }
        finally { btn.textContent = 'Envoyer'; btn.disabled = false; }
      });
    });

    /* Auto-resize textareas */
    container.querySelectorAll('.rf-comment-input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        inp.style.height = 'auto';
        inp.style.height = Math.min(inp.scrollHeight, 100) + 'px';
      });
    });

    /* Bouton voir toutes les actus */
    var seeAll = document.getElementById('rf-see-all-posts');
    if (seeAll && !seeAll._bound) {
      seeAll._bound = true;
      seeAll.addEventListener('click', loadAllPosts);
    }
  }

  /* ============================================================
     BIND — MODAL WEBINAIRES
     ============================================================ */
  function bindModalWebinars() {
    var openBtn  = document.getElementById('rf-btn-all-webinars');
    var closeBtn = document.getElementById('rf-modal-webinars-close');
    var overlay  = document.getElementById('rf-modal-webinars');
    var body     = document.getElementById('rf-modal-webinars-body');

    if (openBtn) {
      openBtn.addEventListener('click', async function () {
        if (overlay) overlay.classList.add('active');

        /* Appel get_webinars avec room_id */
        try {
          var res  = await fetch(BASE_URL + '/get_webinars?room_id=' + _roomId);
          var webs = await res.json();
          _allWebinarsData = Array.isArray(webs) ? webs : [];

          if (body) {
            if (!_allWebinarsData.length) {
              body.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:24px;font-size:.85rem;">Aucun webinaire</div>';
            } else {
              body.innerHTML = _allWebinarsData.map(renderWebinarListItem).join('');
              /* Bind inscriptions */
              body.querySelectorAll('.rf-btn-register-sm').forEach(function (btn) {
                btn.addEventListener('click', async function () {
                  if (!requireAuth()) return;
                  await toggleRegistration(parseInt(btn.dataset.webinarId), btn, false);
                });
              });
            }
          }
        } catch(e) {
          if (body) body.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:24px;">Erreur de chargement</div>';
          console.error('[Webinars modal]', e);
        }
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', function () { overlay && overlay.classList.remove('active'); });
    if (overlay)  overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('active'); });
  }

  function renderWebinarListItem(w) {
    var now      = Date.now();
    var upcoming = w.scheduled_at > now;
    var badge    = upcoming
      ? '<span class="rf-webinar-list-badge upcoming">🟢 À venir</span>'
      : '<span class="rf-webinar-list-badge past">⏸ Passé</span>';

    var actionBtn = '';
    if (upcoming) {
      var regClass = _registeredWebs[w.id] ? 'registered' : '';
      var regLabel = _registeredWebs[w.id] ? 'Inscrit ✓' : 'S\'inscrire';
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

  /* ============================================================
     LOAD ALL POSTS
     ============================================================ */
  async function loadAllPosts() {
    if (_allPostsLoaded) return;
    var seeAll = document.getElementById('rf-see-all-posts');
    if (seeAll) { seeAll.textContent = 'Chargement…'; seeAll.disabled = true; }

    try {
      var res  = await fetch(BASE_URL + '/get_all_actus?slug=' + encodeURIComponent(_roomSlug), {
        headers: getHeaders(isLoggedIn())
      });
      var data = await res.json();
      var posts = Array.isArray(data) ? data : [];

      _allPostsLoaded = true;
      if (seeAll) seeAll.style.display = 'none';

      if (posts.length) {
        var fl   = _roomData.freelance_profile || {};
        var feed = document.getElementById('rf-feed');
        if (feed) {
          var newHtml = posts.map(function(p){ return renderPost(p, fl); }).join('');
          feed.innerHTML += newHtml;
          bindPostInteractions(feed);
        }
      }
    } catch(e) {
      console.error('[AllPosts]', e);
      if (seeAll) { seeAll.textContent = 'Voir toutes les actus →'; seeAll.disabled = false; }
    }
  }

  /* ============================================================
     TOAST
     ============================================================ */
  function toast(msg) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111112;color:#fff;padding:10px 22px;border-radius:10px;font-family:DM Sans,sans-serif;font-size:.82rem;font-weight:500;z-index:99999;';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function(){ el.remove(); }, 3000);
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
