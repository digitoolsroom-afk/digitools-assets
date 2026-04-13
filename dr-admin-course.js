// ============================================================
// BACKOFFICE FORMATIONS
// ============================================================

(function () {

  const API_BASE         = 'https://xmot-l3ir-7kuj.p7.xano.io/api:sfoT-uEe';
  const ALL_COURSES_URL  = API_BASE + '/admin_get_all_courses';
  const PENDING_URL      = API_BASE + '/admin_get_pending_courses';
  const CHANGES_URL      = API_BASE + '/admin_get_pending_changes';
  const EARNINGS_URL     = API_BASE + '/get_earnings';
  const UPDATE_EARNING_URL = API_BASE + '/update_earning_status';
  const VALIDATE_COURSE  = API_BASE + '/admin_validate_course';
  const VALIDATE_CHANGE  = API_BASE + '/admin_validate_change';
  const MODIFY_COURSE_URL= 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/modify_course';

  const getToken = () => localStorage.getItem('adminAuthToken') || null;

  let _allCourses     = [];
  let _pendingCourses = [];
  let _changes        = [];
  let _earnings       = { pending: [], completed: [] };
  let _currentCourse  = null;
  let _currentChange  = null;

  // ============================================================
  // TOAST
  // ============================================================
  function showToast(msg, duration) {
    duration = duration || 3000;
    const t = document.getElementById('bo-toast');
    if (!t) return;
    if (t._timer) clearTimeout(t._timer);
    t.textContent = msg;
    t.style.opacity = '0'; void t.offsetHeight; t.style.opacity = '1';
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, duration);
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function statusLabel(status) {
    const map = {
      published:          { text: '✅ Publié',          cls: 'bo-status-published' },
      pending_validation: { text: '⏳ En attente',       cls: 'bo-status-pending_validation' },
      draft:              { text: '📝 Brouillon',        cls: 'bo-status-draft' },
      rejected:           { text: '✕ Rejeté',            cls: 'bo-status-rejected' },
    };
    return map[status] || { text: status, cls: 'bo-status-draft' };
  }

  function earningStatusLabel(status) {
    const map = {
      pending:    { text: '⏳ En attente',  cls: 'bo-earning-pending' },
      paid:       { text: '✅ Payé',         cls: 'bo-earning-paid' },
      suspicious: { text: '⚠️ Suspect',     cls: 'bo-earning-suspicious' },
      cancelled:  { text: '❌ Annulé',       cls: 'bo-earning-cancelled' },
    };
    return map[status] || { text: status, cls: 'bo-earning-pending' };
  }

  function changeTypeLabel(type) {
    const map = {
      delete_module:  { text: '🗑 Suppression module',   cls: 'bo-type-delete' },
      delete_chapter: { text: '🗑 Suppression chapitre', cls: 'bo-type-delete' },
      add_module:     { text: '➕ Ajout module',          cls: 'bo-type-add' },
      add_chapter:    { text: '➕ Ajout chapitre',        cls: 'bo-type-add' },
      replace_video:  { text: '🎬 Remplacement vidéo',   cls: 'bo-type-replace' },
    };
    return map[type] || { text: type, cls: 'bo-type-replace' };
  }

  function formatDate(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateTime(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function euros(cents) {
    return ((cents || 0) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  function secToDisplay(sec) {
    if (!sec) return '—';
    const m = Math.floor(sec / 60), s = sec % 60;
    return s ? `${m}m ${s}s` : `${m} min`;
  }

  function buildVimeoPlayer(uri) {
    const id = (uri || '').replace('/videos/', '');
    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`;
    iframe.className = 'bo-vimeo-player';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    return iframe;
  }

  // ============================================================
  // TABS
  // ============================================================
  function initTabs() {
    document.querySelectorAll('.bo-tab').forEach(tab => {
      tab.onclick = function () {
        document.querySelectorAll('.bo-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.bo-pane').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('bo-pane-' + this.dataset.tab)?.classList.add('active');
      };
    });
  }

  function updateBadges() {
    const pendingCount  = _pendingCourses.filter(c => c.status === 'pending_validation').length;
    const changesCount  = _changes.length;
    const earningsCount = (_earnings.pending || []).length;

    const pb = document.getElementById('bo-badge-pending');
    const cb = document.getElementById('bo-badge-changes');
    const eb = document.getElementById('bo-badge-earnings');
    if (pb) { pb.textContent = pendingCount;  pb.dataset.count = pendingCount; }
    if (cb) { cb.textContent = changesCount;  cb.dataset.count = changesCount; }
    if (eb) { eb.textContent = earningsCount; eb.dataset.count = earningsCount; }
  }

  // ============================================================
  // CHARGEMENT DONNÉES
  // ============================================================
  async function loadAll() {
    const token = getToken();
    const headers = { 'Authorization': 'Bearer ' + token };

    try {
      const [allRes, pendingRes, changesRes, earningsRes] = await Promise.all([
        fetch(ALL_COURSES_URL,  { headers }),
        fetch(PENDING_URL,      { headers }),
        fetch(CHANGES_URL,      { headers }),
        fetch(EARNINGS_URL,     { headers }),
      ]);

      if (allRes.ok)     _allCourses     = await allRes.json();
      if (pendingRes.ok) _pendingCourses = await pendingRes.json();
      if (changesRes.ok) _changes        = await changesRes.json();
      if (earningsRes.ok) _earnings      = await earningsRes.json();

      renderTableAll();
      renderPendingList();
      renderChangesList();
      renderEarnings();
      updateBadges();

    } catch(e) {
      console.error('[BO] loadAll failed:', e);
      showToast('❌ Erreur chargement données', 5000);
    }
  }

  // ============================================================
  // ONGLET TOUS LES COURS — TABLE
  // ============================================================
  function renderTableAll(filter) {
    const tbody  = document.getElementById('bo-tbody-all');
    if (!tbody) return;

    let courses = [..._allCourses].filter(c => c.status === 'published');

    const search = (document.getElementById('bo-search-all')?.value || '').toLowerCase();
    if (search) courses = courses.filter(c =>
      (c.title || '').toLowerCase().includes(search) ||
      (c._freelancer_profile?.display_name || '').toLowerCase().includes(search)
    );

    if (courses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="bo-loading">Aucun cours trouvé</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    courses.forEach(course => {
      const freelancer = course._freelancer_profile || {};
      const status     = statusLabel(course.status);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="bo-course-cell">
            <img class="bo-course-icon" src="${course.icon_cours_url || ''}" alt="" onerror="this.style.display='none'" />
            <div>
              <div class="bo-course-name">${course.title || '—'}</div>
              <div class="bo-course-theme">${course.theme || ''}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="bo-freelancer-cell">
            <img class="bo-freelancer-avatar" src="${freelancer.profile_image_url || ''}" alt="" onerror="this.style.display='none'" />
            <span class="bo-freelancer-name">${freelancer.display_name || '—'}</span>
          </div>
        </td>
        <td>${course.price_cents ? (course.price_cents / 100) + ' €' : '—'}</td>
        <td><span class="bo-status-badge ${status.cls}">${status.text}</span></td>
        <td>${formatDate(course.created_at)}</td>
        <td style="text-align:right;">
          <button class="bo-btn bo-btn-secondary" style="padding:6px 14px;font-size:.78rem;">Voir →</button>
        </td>
      `;
      tr.addEventListener('click', () => openCoursePanel(course));
      tbody.appendChild(tr);
    });
  }

  // ============================================================
  // ONGLET EN ATTENTE
  // ============================================================
  function renderPendingList() {
    const pendingEl = document.getElementById('bo-list-pending-validation');
    const draftEl   = document.getElementById('bo-list-draft');
    if (!pendingEl || !draftEl) return;

    const pendingList = _pendingCourses.filter(c => c.status === 'pending_validation');
    const draftList   = _pendingCourses.filter(c => c.status === 'draft');

    renderCourseCards(pendingEl, pendingList, 'Aucune formation en attente de validation 🎉');
    renderCourseCards(draftEl,   draftList,   'Aucun brouillon en cours');
  }

  function renderCourseCards(container, courses, emptyMsg) {
    container.innerHTML = '';
    if (!courses.length) {
      container.innerHTML = `<div class="bo-empty">${emptyMsg}</div>`;
      return;
    }
    courses.forEach(course => {
      const freelancer = course._freelancer_profile || {};
      const status     = statusLabel(course.status);
      const card = document.createElement('div');
      card.className = 'bo-pending-card';
      card.innerHTML = `
        <img class="bo-pending-card-icon" src="${course.icon_cours_url || ''}" alt="" onerror="this.style.display='none'" />
        <div class="bo-pending-card-info">
          <div class="bo-pending-card-title">${course.title || '—'}</div>
          <div class="bo-pending-card-meta">
            <span>👤 ${freelancer.display_name || '—'}</span>
            <span>💰 ${course.price_cents ? (course.price_cents / 100) + ' €' : '—'}</span>
            <span>📅 ${formatDate(course.created_at)}</span>
          </div>
        </div>
        <span class="bo-status-badge ${status.cls}">${status.text}</span>
      `;
      card.addEventListener('click', () => openCoursePanel(course));
      container.appendChild(card);
    });
  }

  // ============================================================
  // ONGLET DEMANDES DE MODIFS
  // ============================================================
  function renderChangesList() {
    const container = document.getElementById('bo-list-changes');
    if (!container) return;

    let changes = [..._changes];

    const typeFilter = document.getElementById('bo-filter-change-type')?.value;
    if (typeFilter) changes = changes.filter(c => c.change_type === typeFilter);

    if (!changes.length) {
      container.innerHTML = '<div class="bo-empty">Aucune demande en attente 🎉</div>';
      return;
    }

    const byCourse = {};
    changes.forEach(change => {
      const courseId = change.courses_id || change._courses?.id;
      if (!byCourse[courseId]) {
        byCourse[courseId] = { course: change._courses || {}, freelancer: change._freelancer_profile || {}, changes: [] };
      }
      byCourse[courseId].changes.push(change);
    });

    container.innerHTML = '';
    Object.values(byCourse).forEach(group => {
      const { course, freelancer, changes: groupChanges } = group;
      const card = document.createElement('div');
      card.className = 'bo-change-card';
      card.style.cssText = 'cursor:pointer;';

      const typeCounts = {};
      groupChanges.forEach(c => { typeCounts[c.change_type] = (typeCounts[c.change_type] || 0) + 1; });
      const typeSummary = Object.entries(typeCounts).map(([type, count]) => {
        const info = changeTypeLabel(type);
        return `<span class="bo-change-type-badge ${info.cls}" style="font-size:.68rem;padding:3px 8px;">${info.text}${count > 1 ? ' ×' + count : ''}</span>`;
      }).join('');

      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:14px;width:100%;">
          <img style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#f3f4f6;border:1px solid #e5e7eb;" src="${course.icon_cours_url || ''}" alt="" onerror="this.style.display='none'" />
          <div style="flex:1;min-width:0;">
            <div style="font-size:.9rem;font-weight:700;color:#111112;margin-bottom:4px;">${course.title || '—'}</div>
            <div style="font-size:.75rem;color:#6b7280;margin-bottom:6px;">👤 ${freelancer.display_name || '—'} · ${groupChanges.length} demande${groupChanges.length > 1 ? 's' : ''} en attente</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">${typeSummary}</div>
          </div>
          <div style="font-size:.8rem;color:#2563eb;font-weight:600;white-space:nowrap;">Voir les détails →</div>
        </div>
      `;
      card.addEventListener('click', () => openChangesGroupPanel(course, freelancer, groupChanges));
      container.appendChild(card);
    });
  }

  // ============================================================
  // ONGLET PAIEMENTS
  // ============================================================
  function renderEarnings() {
    renderEarningsTab('pending');
    renderEarningsTab('completed');
  }

  function renderEarningsTab(type) {
    const container = document.getElementById('bo-earnings-' + type);
    if (!container) return;

    const list = _earnings[type] || [];

    if (!list.length) {
      container.innerHTML = `<div class="bo-empty">${type === 'pending' ? 'Aucun paiement en attente 🎉' : 'Aucun paiement traité'}</div>`;
      return;
    }

    container.innerHTML = '';
    list.forEach(earning => {
      const statusInfo = earningStatusLabel(earning.status);
      const card = document.createElement('div');
      card.className = 'bo-earning-card';
      card.id = 'earning-card-' + earning.id;

      const actionsHTML = type === 'pending' ? `
        <div class="bo-earning-actions">
          <button class="bo-btn bo-btn-success bo-earning-btn" data-id="${earning.id}" data-action="paid"       style="font-size:.75rem;padding:6px 14px;">✅ Valider</button>
          <button class="bo-btn bo-earning-btn bo-earning-btn-suspicious" data-id="${earning.id}" data-action="suspicious" style="font-size:.75rem;padding:6px 14px;">⚠️ Suspect</button>
          <button class="bo-btn bo-btn-danger  bo-earning-btn" data-id="${earning.id}" data-action="cancelled"  style="font-size:.75rem;padding:6px 14px;">❌ Annuler</button>
        </div>
      ` : '';

      card.innerHTML = `
        <div class="bo-earning-card-main">
          <div class="bo-earning-info">
            <div class="bo-earning-amount">${euros(earning.amount_cents)}</div>
            <div class="bo-earning-meta">
              <span>🎓 Cours #${earning.courses_id}</span>
              <span>👤 Freelance #${earning.freelancer_profile_id}</span>
              <span>🕐 ${formatDateTime(earning.triggered_at)}</span>
              ${earning.paid_at ? `<span>✅ Payé le ${formatDate(earning.paid_at)}</span>` : ''}
            </div>
            ${earning.fraud_flags ? `<div class="bo-earning-fraud">🚨 Flags fraude : ${earning.fraud_flags}</div>` : ''}
          </div>
          <span class="bo-earning-status-badge ${statusInfo.cls}">${statusInfo.text}</span>
        </div>
        ${actionsHTML}
      `;

      container.appendChild(card);
    });

    // Listeners boutons action
    container.querySelectorAll('.bo-earning-btn').forEach(btn => {
      btn.addEventListener('click', () => updateEarningStatus(btn.dataset.id, btn.dataset.action));
    });
  }

  async function updateEarningStatus(earningId, newStatus) {
    const token = getToken();
    const card  = document.getElementById('earning-card-' + earningId);
    const btns  = card?.querySelectorAll('.bo-earning-btn');
    if (btns) btns.forEach(b => { b.disabled = true; });

    try {
      const res = await fetch(UPDATE_EARNING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ freelance_earning_id: parseInt(earningId), status: newStatus }),
      });
      if (!res.ok) throw new Error('Erreur serveur (' + res.status + ')');

      showToast('✅ Statut mis à jour → ' + newStatus);

      // Recharger les données et re-render
      const earningsRes = await fetch(EARNINGS_URL, { headers: { 'Authorization': 'Bearer ' + token } });
      if (earningsRes.ok) _earnings = await earningsRes.json();
      renderEarnings();
      updateBadges();

    } catch(e) {
      showToast('❌ Erreur : ' + e.message, 5000);
      if (btns) btns.forEach(b => { b.disabled = false; });
    }
  }

  // ============================================================
  // PANEL DÉTAIL COURS
  // ============================================================
  async function openCoursePanel(course) {
    _currentCourse = course;
    const token    = getToken();

    const panel  = document.getElementById('bo-panel');
    const overlay= document.getElementById('bo-panel-overlay');
    const body   = document.getElementById('bo-panel-body');
    const actions= document.getElementById('bo-panel-actions');

    document.getElementById('bo-panel-icon').src            = course.icon_cours_url || '';
    document.getElementById('bo-panel-title').textContent   = course.title || '—';
    document.getElementById('bo-panel-subtitle').textContent= (course._freelancer_profile?.display_name || '—') + ' · ' + (course.theme || '');
    const statusInfo = statusLabel(course.status);
    const statusBadge= document.getElementById('bo-panel-status-badge');
    statusBadge.textContent = statusInfo.text;
    statusBadge.className   = 'bo-status-badge ' + statusInfo.cls;

    body.innerHTML = '<div class="bo-loading">⏳ Chargement de la structure…</div>';
    actions.style.display = course.status === 'pending_validation' ? 'block' : 'none';

    panel.classList.add('open');
    overlay.classList.add('active');

    try {
      const res = await fetch(`${MODIFY_COURSE_URL}?course_id=${course.id}`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('Erreur chargement structure');
      const data = await res.json();
      renderCoursePanelBody(course, data);
    } catch(e) {
      body.innerHTML = '<div class="bo-loading">❌ Erreur chargement structure</div>';
    }
  }

  function renderCoursePanelBody(course, data) {
    const body     = document.getElementById('bo-panel-body');
    const chapters = (data.chapters || []).sort((a,b) => a.order_index - b.order_index);
    const modules  = data.modules  || [];
    const freelancer = course._freelancer_profile || {};

    let html = '';
    if (course.cover_url) html += `<img class="bo-cover-img" src="${course.cover_url}" alt="" />`;

    html += `
      <div class="bo-detail-section">
        <div class="bo-detail-section-title">Informations générales</div>
        <div class="bo-detail-grid">
          <div class="bo-detail-field"><span class="bo-detail-label">Thème</span><span class="bo-detail-value">${course.theme || '—'}</span></div>
          <div class="bo-detail-field"><span class="bo-detail-label">Prix</span><span class="bo-detail-value">${course.price_cents ? (course.price_cents / 100) + ' €' : '—'}</span></div>
          <div class="bo-detail-field"><span class="bo-detail-label">Durée totale</span><span class="bo-detail-value">${course.duration_minutes || '—'} min</span></div>
          <div class="bo-detail-field"><span class="bo-detail-label">Nb modules</span><span class="bo-detail-value">${course.modules_count || '—'}</span></div>
        </div>
      </div>
      <div class="bo-detail-section">
        <div class="bo-detail-section-title">Description</div>
        <div class="bo-detail-field" style="margin-bottom:10px;"><span class="bo-detail-label">Description courte</span><span class="bo-detail-value long">${course.description_short || '—'}</span></div>
        <div class="bo-detail-field"><span class="bo-detail-label">Bio formateur</span><span class="bo-detail-value long">${course.trainer_bio || '—'}</span></div>
      </div>
      <div class="bo-detail-section">
        <div class="bo-detail-section-title">Formateur</div>
        <div class="bo-detail-grid">
          <div class="bo-detail-field"><span class="bo-detail-label">Nom</span><span class="bo-detail-value">${freelancer.display_name || '—'}</span></div>
          <div class="bo-detail-field"><span class="bo-detail-label">Spécialité</span><span class="bo-detail-value">${freelancer.headline || '—'}</span></div>
        </div>
      </div>
    `;

    if (Array.isArray(course.skills) && course.skills.length) {
      html += `<div class="bo-detail-section"><div class="bo-detail-section-title">Compétences acquises</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${course.skills.map(s => `<span style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:4px 10px;font-size:.75rem;color:#1d4ed8;font-weight:600;">${s}</span>`).join('')}</div></div>`;
    }

    html += `<div class="bo-detail-section"><div class="bo-detail-section-title">Structure du cours</div>`;
    body.innerHTML = html;

    const structureEl = body.querySelector('.bo-detail-section:last-child');
    chapters.forEach((ch, ci) => {
      const chModules = modules.filter(m => m.chapter_temp_id === ch.chapter_temp_id).sort((a,b) => a.order_index - b.order_index);
      const block = document.createElement('div');
      block.className = 'bo-chapter-block';
      block.innerHTML = `
        <div class="bo-chapter-header">
          <span class="bo-chapter-label">${ci === 0 ? 'Chapitre 0 — Intro' : 'Chapitre ' + ci}</span>
          <span class="bo-chapter-name">${ch.title}</span>
          <span class="bo-chapter-meta">📚 ${ch.total_modules} modules · ⏱ ${ch.duration || 0} min</span>
        </div>
        ${chModules.map((mod, mi) => `
          <div class="bo-module-row" data-vimeo="${mod.vimeo_video_uri || ''}">
            <div class="bo-module-num">${mi + 1}</div>
            <div class="bo-module-title">${mod.title || '—'}</div>
            <div class="bo-module-duration">${secToDisplay(mod.duration_seconds)}</div>
            ${mod.vimeo_video_uri ? `<button class="bo-module-video-btn bo-open-video" data-uri="${mod.vimeo_video_uri}" data-title="${mod.title}">▶ Voir</button>` : '<span style="font-size:.72rem;color:#9ca3af;">Pas de vidéo</span>'}
          </div>
        `).join('')}
      `;
      structureEl.appendChild(block);
    });

    body.querySelectorAll('.bo-open-video').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); openVideoModal(btn.dataset.uri, btn.dataset.title); });
    });

    if (course.rejection_message) {
      const msgEl = document.createElement('div');
      msgEl.style.cssText = 'background:#fff1f2;border:1.5px solid #fca5a5;border-radius:10px;padding:14px;margin-top:16px;font-size:.82rem;color:#b91c1c;line-height:1.5;';
      msgEl.innerHTML = `<strong>Message de rejet :</strong> ${course.rejection_message}`;
      body.appendChild(msgEl);
    }
  }

  // ============================================================
  // PANEL GROUPE DE DEMANDES
  // ============================================================
  async function openChangesGroupPanel(course, freelancer, groupChanges) {
    const panel   = document.getElementById('bo-change-panel');
    const overlay = document.getElementById('bo-panel-overlay');
    const body    = document.getElementById('bo-change-panel-body');
    const token   = getToken();

    document.getElementById('bo-change-panel-title').textContent    = course.title || '—';
    document.getElementById('bo-change-panel-subtitle').textContent = '👤 ' + (freelancer.display_name || '—') + ' · ' + groupChanges.length + ' demande(s) en attente';
    document.getElementById('bo-change-panel-actions').style.display = 'none';

    body.innerHTML = '<div class="bo-loading">⏳ Chargement de la structure du cours…</div>';
    panel.classList.add('open');
    overlay.classList.add('active');

    let courseStructure = null;
    try {
      const res = await fetch(`${MODIFY_COURSE_URL}?course_id=${course.id}`, { headers: { 'Authorization': 'Bearer ' + token } });
      if (res.ok) courseStructure = await res.json();
    } catch(e) { console.warn('[BO] structure load failed:', e); }

    body.innerHTML = '';
    const structSection = document.createElement('div');
    structSection.className = 'bo-detail-section';
    structSection.innerHTML = '<div class="bo-detail-section-title">📋 Structure du cours + demandes en contexte</div>';
    body.appendChild(structSection);

    if (courseStructure) {
      const chapters = (courseStructure.chapters || []).sort((a,b) => a.order_index - b.order_index);
      const modules  = courseStructure.modules || [];

      chapters.forEach((ch, ci) => {
        const chModules    = modules.filter(m => m.chapter_temp_id === ch.chapter_temp_id).sort((a,b) => a.order_index - b.order_index);
        const chDeleteReq  = groupChanges.find(c => c.change_type === 'delete_chapter' && String(c.target_id) === String(ch.id));
        const chAddModReqs = groupChanges.filter(c => c.change_type === 'add_module' && String(c.target_id) === String(ch.id));

        const block = document.createElement('div');
        block.className = 'bo-chapter-block';
        if (chDeleteReq) block.style.cssText = 'border-color:#fca5a5;background:#fff1f2;';

        const header = document.createElement('div');
        header.className = 'bo-chapter-header';
        header.innerHTML = `
          <span class="bo-chapter-label">${ci === 0 ? 'Chapitre 0 — Intro' : 'Chapitre ' + ci}</span>
          <span class="bo-chapter-name">${ch.title}</span>
          <span class="bo-chapter-meta">📚 ${ch.total_modules || 0} modules · ⏱ ${ch.duration || 0} min</span>
          ${chDeleteReq ? '<span style="background:#fee2e2;color:#b91c1c;font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:6px;">🗑 Suppression demandée</span>' : ''}
        `;
        block.appendChild(header);

        chModules.forEach((mod, mi) => {
          const modDeleteReq  = groupChanges.find(c => c.change_type === 'delete_module' && String(c.target_id) === String(mod.id));
          const modReplaceReq = groupChanges.find(c => c.change_type === 'replace_video' && String(c.target_id) === String(mod.id));

          const modRow = document.createElement('div');
          modRow.className = 'bo-module-row';
          if (modDeleteReq)  modRow.style.cssText = 'background:#fff1f2;border-left:3px solid #fca5a5;';
          if (modReplaceReq) modRow.style.cssText = 'background:#faf5ff;border-left:3px solid #d8b4fe;';

          modRow.innerHTML = `
            <div class="bo-module-num">${mi + 1}</div>
            <div class="bo-module-title">${mod.title || '—'}</div>
            <div class="bo-module-duration">${secToDisplay(mod.duration_seconds)}</div>
            ${mod.vimeo_video_uri ? `<button class="bo-module-video-btn bo-open-video" data-uri="${mod.vimeo_video_uri}" data-title="${mod.title}">▶ Voir</button>` : ''}
            ${modDeleteReq  ? '<span style="font-size:.7rem;font-weight:700;color:#b91c1c;padding:2px 8px;background:#fee2e2;border-radius:5px;">🗑 Suppr. demandée</span>' : ''}
            ${modReplaceReq ? '<span style="font-size:.7rem;font-weight:700;color:#7c3aed;padding:2px 8px;background:#ede9fe;border-radius:5px;">🎬 Remplacement demandé</span>' : ''}
          `;
          block.appendChild(modRow);
          if (modDeleteReq)  block.appendChild(buildChangeActionCard(modDeleteReq,  course, groupChanges));
          if (modReplaceReq) block.appendChild(buildChangeActionCard(modReplaceReq, course, groupChanges));
        });

        chAddModReqs.forEach(addReq => {
          const addRow = document.createElement('div');
          addRow.className = 'bo-module-row';
          addRow.style.cssText = 'background:#f0fdf4;border-left:3px solid #86efac;';
          addRow.innerHTML = `
            <div class="bo-module-num" style="background:#059669;">+</div>
            <div class="bo-module-title">${addReq.new_title || '—'} <span style="font-size:.72rem;color:#6b7280;">(nouveau)</span></div>
            <div class="bo-module-duration">${secToDisplay(addReq.duration_seconds)}</div>
            ${addReq.new_vimeo_uri ? `<button class="bo-module-video-btn bo-open-video" data-uri="${addReq.new_vimeo_uri}" data-title="${addReq.new_title}">▶ Voir</button>` : ''}
            <span style="font-size:.7rem;font-weight:700;color:#15803d;padding:2px 8px;background:#dcfce7;border-radius:5px;">➕ Ajout demandé</span>
          `;
          block.appendChild(addRow);
          block.appendChild(buildChangeActionCard(addReq, course, groupChanges));
        });

        structSection.appendChild(block);
        if (chDeleteReq) structSection.appendChild(buildChangeActionCard(chDeleteReq, course, groupChanges));
      });

      const addChapterReqs = groupChanges.filter(c => c.change_type === 'add_chapter');
      addChapterReqs.forEach(addChReq => {
        const block = document.createElement('div');
        block.className = 'bo-chapter-block';
        block.style.cssText = 'border-color:#86efac;background:#f0fdf4;';
        block.innerHTML = `
          <div class="bo-chapter-header">
            <span class="bo-chapter-label" style="background:#059669;">NOUVEAU CHAPITRE</span>
            <span class="bo-chapter-name">${addChReq.new_title || '—'}</span>
            <span class="bo-chapter-meta">⏱ ${addChReq.duration_minutes || 0} min · 📚 ${addChReq.nb_modules || 0} modules prévus</span>
            <span style="background:#dcfce7;color:#15803d;font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:6px;">➕ Ajout demandé</span>
          </div>
        `;
        structSection.appendChild(block);
        structSection.appendChild(buildChangeActionCard(addChReq, course, groupChanges));
      });
    } else {
      structSection.innerHTML += '<div style="font-size:.82rem;color:#9ca3af;padding:12px;">Impossible de charger la structure.</div>';
    }

    body.querySelectorAll('.bo-open-video').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); openVideoModal(btn.dataset.uri, btn.dataset.title); });
    });
  }

  function buildChangeActionCard(change, course, groupChanges) {
    const typeInfo = changeTypeLabel(change.change_type);
    const card = document.createElement('div');
    card.className = 'bo-change-action-card';
    card.id = 'change-action-' + change.id;

    const msgId     = 'change-msg-' + change.id;
    const approveId = 'change-approve-' + change.id;
    const rejectId  = 'change-reject-' + change.id;

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span class="bo-change-type-badge ${typeInfo.cls}">${typeInfo.text}</span>
        <span style="font-size:.75rem;color:#6b7280;">Demande #${change.id} · ${formatDate(change.requested_at)}</span>
      </div>
      <textarea id="${msgId}" placeholder="Message pour le formateur (optionnel)…" style="width:100%;padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:DM Sans,sans-serif;font-size:.78rem;resize:vertical;min-height:56px;outline:none;margin-bottom:8px;"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="${rejectId}"  class="bo-btn bo-btn-danger"   style="padding:7px 16px;font-size:.78rem;">✕ Rejeter</button>
        <button id="${approveId}" class="bo-btn bo-btn-success"  style="padding:7px 16px;font-size:.78rem;">✅ Approuver</button>
      </div>
    `;

    card.querySelector('#' + approveId)?.addEventListener('click', async () => {
      const btn = card.querySelector('#' + approveId);
      const msg = card.querySelector('#' + msgId)?.value.trim() || '';
      btn.disabled = true; btn.textContent = '⏳…';
      try {
        const res = await fetch(VALIDATE_CHANGE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
          body: JSON.stringify({ request_id: change.id, action: 'approved', admin_message: msg }),
        });
        if (!res.ok) throw new Error('Erreur serveur');
        showToast('✅ Demande approuvée !');
        _changes = _changes.filter(c => c.id !== change.id);
        groupChanges.splice(groupChanges.indexOf(change), 1);
        card.style.cssText = 'background:#f0fdf4;border-color:#86efac;padding:10px 14px;border-radius:10px;text-align:center;font-size:.8rem;color:#15803d;font-weight:600;margin-bottom:8px;';
        card.innerHTML = '✅ Demande approuvée';
        updateBadges();
        if (groupChanges.length === 0) setTimeout(() => { closeAllPanels(); renderChangesList(); }, 1200);
      } catch(e) { showToast('❌ Erreur : ' + e.message, 5000); btn.disabled = false; btn.textContent = '✅ Approuver'; }
    });

    card.querySelector('#' + rejectId)?.addEventListener('click', async () => {
      const btn = card.querySelector('#' + rejectId);
      const msg = card.querySelector('#' + msgId)?.value.trim() || '';
      btn.disabled = true; btn.textContent = '⏳…';
      try {
        const res = await fetch(VALIDATE_CHANGE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
          body: JSON.stringify({ request_id: change.id, action: 'rejected', admin_message: msg }),
        });
        if (!res.ok) throw new Error('Erreur serveur');
        showToast('✕ Demande rejetée');
        _changes = _changes.filter(c => c.id !== change.id);
        groupChanges.splice(groupChanges.indexOf(change), 1);
        card.style.cssText = 'background:#fff1f2;border-color:#fca5a5;padding:10px 14px;border-radius:10px;text-align:center;font-size:.8rem;color:#b91c1c;font-weight:600;margin-bottom:8px;';
        card.innerHTML = '✕ Demande rejetée';
        updateBadges();
        if (groupChanges.length === 0) setTimeout(() => { closeAllPanels(); renderChangesList(); }, 1200);
      } catch(e) { showToast('❌ Erreur : ' + e.message, 5000); btn.disabled = false; btn.textContent = '✕ Rejeter'; }
    });

    return card;
  }

  // ============================================================
  // MODALE VIDÉO
  // ============================================================
  function openVideoModal(uri, title) {
    let modal = document.getElementById('bo-video-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bo-video-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:20px;max-width:700px;width:100%;position:relative;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <span style="font-size:.9rem;font-weight:700;color:#111112;" id="bo-video-modal-title"></span>
            <button id="bo-video-modal-close" style="background:#f3f4f6;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:14px;">✕</button>
          </div>
          <div id="bo-video-modal-player"></div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('bo-video-modal-close').addEventListener('click', () => {
        document.getElementById('bo-video-modal-player').innerHTML = '';
        modal.style.display = 'none';
      });
      modal.addEventListener('click', e => {
        if (e.target === modal) { document.getElementById('bo-video-modal-player').innerHTML = ''; modal.style.display = 'none'; }
      });
    }
    document.getElementById('bo-video-modal-title').textContent = title || 'Vidéo';
    document.getElementById('bo-video-modal-player').innerHTML = '';
    document.getElementById('bo-video-modal-player').appendChild(buildVimeoPlayer(uri));
    modal.style.display = 'flex';
  }

  // ============================================================
  // ACTIONS VALIDATION COURS
  // ============================================================
  function initCourseActions() {
    document.getElementById('bo-btn-approve-course')?.addEventListener('click', async () => {
      if (!_currentCourse) return;
      const btn = document.getElementById('bo-btn-approve-course');
      btn.disabled = true; btn.textContent = '⏳ Publication…';
      try {
        const res = await fetch(VALIDATE_COURSE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
          body: JSON.stringify({ course_id: _currentCourse.id, action: 'published', rejection_message: '' }),
        });
        if (!res.ok) throw new Error('Erreur serveur');
        showToast('✅ Formation publiée !');
        closeAllPanels();
        await loadAll();
      } catch(e) { showToast('❌ Erreur : ' + e.message, 5000); }
      finally { btn.disabled = false; btn.textContent = '✅ Publier la formation'; }
    });

    document.getElementById('bo-btn-reject-course')?.addEventListener('click', async () => {
      if (!_currentCourse) return;
      const msg = document.getElementById('bo-rejection-msg')?.value.trim();
      if (!msg) { showToast('❌ Entrez un message pour le formateur'); return; }
      const btn = document.getElementById('bo-btn-reject-course');
      btn.disabled = true; btn.textContent = '⏳ Rejet…';
      try {
        const res = await fetch(VALIDATE_COURSE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
          body: JSON.stringify({ course_id: _currentCourse.id, action: 'rejected', rejection_message: msg }),
        });
        if (!res.ok) throw new Error('Erreur serveur');
        showToast('✕ Formation rejetée');
        closeAllPanels();
        await loadAll();
      } catch(e) { showToast('❌ Erreur : ' + e.message, 5000); }
      finally { btn.disabled = false; btn.textContent = '✕ Rejeter'; }
    });
  }

  function initChangeActions() {}

  // ============================================================
  // FERMETURE PANELS
  // ============================================================
  function closeAllPanels() {
    document.getElementById('bo-panel')?.classList.remove('open');
    document.getElementById('bo-change-panel')?.classList.remove('open');
    document.getElementById('bo-panel-overlay')?.classList.remove('active');
    _currentCourse = null;
    _currentChange = null;
  }

  function initPanelClose() {
    document.getElementById('bo-panel-close')?.addEventListener('click', closeAllPanels);
    document.getElementById('bo-change-panel-close')?.addEventListener('click', closeAllPanels);
    document.getElementById('bo-panel-overlay')?.addEventListener('click', closeAllPanels);
  }

  // ============================================================
  // FILTRES
  // ============================================================
  function initFilters() {
    document.getElementById('bo-search-all')?.addEventListener('input', () => renderTableAll());
    document.getElementById('bo-filter-change-type')?.addEventListener('change', () => renderChangesList());
  }

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    initPanelClose();
    initCourseActions();
    initChangeActions();
    initFilters();
    loadAll();
  });

})();
