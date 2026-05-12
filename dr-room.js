/* ============================================================
   PATCH room-backoffice.js
   À intégrer dans le fichier principal sur GitHub
   
   Corrections apportées :
   1. Fix cover_url Xano (/vault → URL complète)
   2. Fix validation création room (titre + description bloquants)
   3. La section marketing reste visible derrière la modal
   4. Ajout des boutons "?" (tooltips) dans les card headers
   ============================================================ */

/* 
   REMPLACER la fonction renderBanner par celle-ci :
   (corrige le /vault → URL complète)
*/
function renderBanner(room) {
  var XANO_BASE = 'https://xmot-l3ir-7kuj.p7.xano.io';

  setText('rd-room-title',      room.title       || '—');
  setText('rd-room-desc',       room.description || '—');
  setText('rd-followers-count', fmt(room.followers_count || 0));
  setText('rd-posts-count',     fmt(_roomData.room_post_count || 0));

  var cover = document.getElementById('rd-cover-img');
  if (cover && room.cover_url) {
    var url = room.cover_url;
    // Xano retourne parfois une URL relative /vault/...
    if (url && url.startsWith('/')) url = XANO_BASE + url;
    cover.src = url;
    cover.style.display = 'block';
  }
}

/*
   REMPLACER la fonction initCreateRoom par celle-ci :
   (validation bloquante titre + description + ne cache pas le marketing)
*/
function initCreateRoom() {
  bindUpload(
    'rd-create-banner-file',
    'rd-create-banner-url',
    'rd-create-banner-status',
    'rd-create-banner-preview'
  );

  // Les boutons de la section marketing ouvrent la modal
  // SANS cacher le marketing (il reste visible derrière)
  ['rm-btn-create-hero', 'rm-btn-create-bottom'].forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', function () {
        // On n'appelle plus hideMarketing() ici
        openModal('rd-modal-create-room');
      });
    }
  });

  var btn = document.getElementById('rd-btn-create-room-submit');
  if (!btn) return;

  btn.addEventListener('click', async function () {
    hideError('rd-create-room-error');

    var titleEl = document.getElementById('rd-create-room-title');
    var descEl  = document.getElementById('rd-create-room-desc');
    var title   = titleEl ? titleEl.value.trim() : '';
    var desc    = descEl  ? descEl.value.trim()  : '';
    var cover_url = (document.getElementById('rd-create-banner-url') || {}).value || '';

    // Validation bloquante
    if (!title) {
      showError('rd-create-room-error', 'Le titre de la room est obligatoire.');
      if (titleEl) titleEl.focus();
      return;
    }
    if (!desc) {
      showError('rd-create-room-error', 'La description est obligatoire.');
      if (descEl) descEl.focus();
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
      // Maintenant on cache le marketing (room créée avec succès)
      hideMarketing();
      showToast('🎉 Votre room est en ligne !');
      await loadRoomData();

    } catch (e) {
      showError('rd-create-room-error', e.message || 'Une erreur est survenue.');
      btn.textContent = '🚀 Créer ma room';
      btn.disabled    = false;
    }
  });
}

/*
   REMPLACER la fonction renderStats par celle-ci :
   (ajoute les boutons tooltip "?" dans les card headers du dashboard)
   À appeler une seule fois après showDashboard()
*/
function injectTooltipButtons() {
  // Header du composer → ajouter le titre + bouton "?"
  var composerHeader = document.querySelector('.rd-post-composer .rd-composer-header');
  if (composerHeader && !document.getElementById('rd-tooltip-feed')) {
    var titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:16px 20px 0;';
    titleRow.innerHTML =
      '<span style="font-size:.82rem;font-weight:700;color:#111112;">Publier une actualité dans votre feed</span>' +
      '<button class="rd-tooltip-trigger" id="rd-tooltip-feed" title="Comment fonctionne le feed ?">?</button>';
    composerHeader.prepend(titleRow);
  }

  // Header webinaires
  var webinarHeader = document.querySelector('#rd-webinar-list')
    && document.querySelector('#rd-webinar-list').closest('.rd-card')
    && document.querySelector('#rd-webinar-list').closest('.rd-card').querySelector('.rd-card-title');
  if (webinarHeader && !document.getElementById('rd-tooltip-webinars')) {
    var wBtn = document.createElement('button');
    wBtn.className = 'rd-tooltip-trigger';
    wBtn.id        = 'rd-tooltip-webinars';
    wBtn.title     = 'Pourquoi créer des webinaires ?';
    wBtn.textContent = '?';
    webinarHeader.appendChild(wBtn);
  }

  // Header ressources
  var contentHeader = document.querySelector('#rd-content-list')
    && document.querySelector('#rd-content-list').closest('.rd-card')
    && document.querySelector('#rd-content-list').closest('.rd-card').querySelector('.rd-card-title');
  if (contentHeader && !document.getElementById('rd-tooltip-resources')) {
    var rBtn = document.createElement('button');
    rBtn.className = 'rd-tooltip-trigger';
    rBtn.id        = 'rd-tooltip-resources';
    rBtn.title     = 'Comment fonctionnent les ressources ?';
    rBtn.textContent = '?';
    contentHeader.appendChild(rBtn);
  }

  // Re-bind les tooltips (ils peuvent ne pas exister encore au moment du init)
  var tooltipFeed      = document.getElementById('rd-tooltip-feed');
  var tooltipResources = document.getElementById('rd-tooltip-resources');
  var tooltipWebinars  = document.getElementById('rd-tooltip-webinars');

  function openPopover(id) { var el = document.getElementById(id); if (el) el.classList.add('active'); }

  if (tooltipFeed)      tooltipFeed.addEventListener('click',      function () { openPopover('rd-popover-feed'); });
  if (tooltipResources) tooltipResources.addEventListener('click', function () { openPopover('rd-popover-resources'); });
  if (tooltipWebinars)  tooltipWebinars.addEventListener('click',  function () { openPopover('rd-popover-webinars'); });
}

/*
   AJOUTER cet appel dans showDashboard(), après renderContents(conts) :
   
   injectTooltipButtons();
*/
