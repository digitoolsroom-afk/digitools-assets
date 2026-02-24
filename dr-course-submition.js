// ============================================================
// dr-course-step1.js
// Script étape 1 — Formulaire création formation
// Chargé via <script src="..." defer></script> dans le body Webflow
// ============================================================

// create_course helper (inline, pas besoin d'un fichier séparé)
// ============================================================
// SCRIPT — CREATE COURSE
// Embed séparé sur la même page que le formulaire étape 1.
// Exposé via window.triggerCreateCourse(payload, token, onSuccess, onError)
// Appelé par le formulaire principal après validation.
// ============================================================

(function () {

  const ENDPOINT = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_course';

  // ============================================================
  // triggerCreateCourse
  //   payload   : objet construit par le formulaire principal
  //   token     : JWT récupéré depuis localStorage auth.token
  //   onSuccess : function(course) — reçoit l'objet retourné par Xano
  //   onError   : function(message) — reçoit le message d'erreur string
  // ============================================================
  window.triggerCreateCourse = async function (payload, token, onSuccess, onError) {

    if (!token) {
      if (onError) onError('Vous devez être connecté pour créer une formation.');
      return;
    }

    // Récupère l'id du profil freelance depuis localStorage
    const auth    = JSON.parse(localStorage.getItem('auth') || 'null');
    const profile = auth?.freelance?.profile?.[0];
    const freelanceProfileId = profile?.id || null;

    // Mapping payload → champs Xano (voir tableau ci-dessous)
    const body = {
      freelance_profile_id: freelanceProfileId,
      theme:              payload.theme              || '',
      icon_url:           payload.icon_url           || '',
      title:              payload.titre              || '',
      cover_url:          payload.cover_url          || '',
      description_short:  payload.description        || '',
      description_long:   payload.description_longue || '',
      trainer_bio:        payload.formateur           || '',
      price_cents:        Math.round((parseFloat(payload.prix_ht) || 0) * 100),
      duration_minutes:   parseInt(payload.duree_minutes)  || 0,
      modules_count:      parseInt(payload.nb_modules)     || 0,
      skills:             Array.isArray(payload.competences) ? payload.competences : [],
      faq:                Array.isArray(payload.faq)         ? payload.faq         : [],
    };

    try {
      const res = await fetch(ENDPOINT, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (onSuccess) onSuccess(data);
      } else {
        const err = await res.json().catch(() => ({}));
        if (onError) onError(err?.message || 'Erreur ' + res.status);
      }
    } catch (e) {
      if (onError) onError('Erreur réseau : ' + e.message);
    }
  };

})();

// ── Étape 1 : init au chargement DOM ──
document.addEventListener('DOMContentLoaded', function () {


  const auth    = JSON.parse(localStorage.getItem('auth') || 'null');
  const token   = auth?.token;
  const profile = auth?.freelance?.profile?.[0];

  const UPLOAD_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof';
  const SAVE_URL   = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_formation';

  // ============================================================
  // INJECTION FORMATEUR depuis profil
  // ============================================================
  if (profile) {
    const avatarEl   = document.getElementById('prev-form-avatar');
    const nameEl     = document.getElementById('prev-form-name');
    const headlineEl = document.getElementById('prev-form-headline');
    const servicesEl = document.getElementById('prev-form-services');

    if (avatarEl && profile.profile_image_url) avatarEl.src = profile.profile_image_url;
    if (nameEl)     nameEl.textContent     = profile.display_name || '—';
    if (headlineEl) headlineEl.textContent = profile.headline     || '—';

    if (servicesEl) {
      servicesEl.innerHTML = '';
      if (profile.service_coaching)  servicesEl.innerHTML += `<span class="preview-service-badge coaching">🤝 Coaching</span>`;
      if (profile.service_freelance) servicesEl.innerHTML += `<span class="preview-service-badge freelance">💼 Freelance</span>`;
    }
  }

  // ============================================================
  // HELPER : minutes → "Xh Ymin au total"
  // ============================================================
  function minutesToDisplay(min) {
    if (!min || min <= 0) return '— au total';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}min au total`;
    if (m === 0) return `${h}h au total`;
    return `${h}h${String(m).padStart(2,'0')} au total`;
  }

  // ============================================================
  // LIVE PREVIEW
  // ============================================================
  function updatePreview() {
    // Thème
    const themeVal = document.getElementById('formation-theme').value.trim();
    document.getElementById('prev-theme').textContent = themeVal || '—';

    // Titre
    const titreVal = document.getElementById('formation-titre').value.trim();
    const prevTitre = document.getElementById('prev-titre');
    if (titreVal) {
      prevTitre.textContent = titreVal;
      prevTitre.classList.remove('preview-titre-empty');
    } else {
      prevTitre.textContent = 'Le titre de votre formation apparaîtra ici';
      prevTitre.classList.add('preview-titre-empty');
    }

    // Description courte
    const descVal   = document.getElementById('formation-description').value.trim();
    const prevDesc  = document.getElementById('prev-desc');
    if (descVal) {
      prevDesc.textContent = descVal;
      prevDesc.classList.remove('preview-desc-empty');
    } else {
      prevDesc.textContent = 'Votre description courte apparaîtra ici…';
      prevDesc.classList.add('preview-desc-empty');
    }

    // Durée
    const dureeVal = parseInt(document.getElementById('formation-duree').value) || 0;
    document.getElementById('prev-duree').textContent = minutesToDisplay(dureeVal);

    // Modules
    const modVal = parseInt(document.getElementById('formation-modules').value) || 0;
    document.getElementById('prev-modules').textContent = modVal > 0 ? `${modVal} module${modVal > 1 ? 's' : ''}` : '— modules';

    // Prix
    const prixVal = document.getElementById('formation-prix').value.trim();
    document.getElementById('prev-prix').innerHTML = prixVal
      ? `${prixVal}&nbsp;€<br><span style="font-size:0.72rem;font-weight:400;opacity:0.75;">Accès à vie à CETTE formation</span>`
      : `—&nbsp;€<br><span style="font-size:0.72rem;font-weight:400;opacity:0.75;">Accès à vie à CETTE formation</span>`;
  }

  ['formation-theme','formation-titre','formation-description','formation-duree','formation-modules','formation-prix']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updatePreview);
    });

  updatePreview();

  // ============================================================
  // POPUPS
  // ============================================================
  document.querySelectorAll('.example-trigger').forEach(t => {
    t.addEventListener('click', function () {
      const p = document.getElementById(this.dataset.popup);
      if (p) p.classList.add('active');
    });
  });

  document.querySelectorAll('.popup-close').forEach(b => {
    b.addEventListener('click', function () { this.closest('.popup-overlay').classList.remove('active'); });
  });

  document.querySelectorAll('.popup-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('active'); });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.popup-overlay.active').forEach(p => p.classList.remove('active'));
  });

  // ============================================================
  // UPLOAD HELPER
  // ============================================================
  async function uploadFile(file, statusEl, hiddenEl, onSuccess) {
    if (file.size > 5 * 1024 * 1024) { statusEl.innerText = '❌ Fichier trop volumineux (max 5MB).'; return; }
    const allowed = ['image/jpeg','image/png','image/webp','image/svg+xml'];
    if (!allowed.includes(file.type)) { statusEl.innerText = '❌ Format non autorisé (JPG, PNG, WEBP, SVG).'; return; }
    statusEl.innerText = '⏳ Upload en cours...';
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res  = await fetch(UPLOAD_URL, { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: fd });
      const data = await res.json();
      const url  = data?.path ? 'https://xmot-l3ir-7kuj.p7.xano.io' + data.path : null;
      if (url) { hiddenEl.value = url; statusEl.innerText = '✅ Uploadé avec succès'; if (onSuccess) onSuccess(url); }
      else { statusEl.innerText = '❌ Erreur lors de l\'upload.'; }
    } catch { statusEl.innerText = '❌ Erreur serveur. Réessayez.'; }
  }

  // Preview locale immédiate à la sélection du fichier
  function previewLocalFile(fileInput, imgEl, placeholderEl) {
    fileInput.addEventListener('change', function () {
      if (!this.files[0]) return;
      const reader = new FileReader();
      reader.onload = e => {
        imgEl.src = e.target.result;
        imgEl.style.display = 'block';
        if (placeholderEl) placeholderEl.style.display = 'none';
      };
      reader.readAsDataURL(this.files[0]);
    });
  }

  previewLocalFile(
    document.getElementById('formation-icon-file'),
    document.getElementById('prev-icon'),
    document.getElementById('prev-icon-placeholder')
  );
  previewLocalFile(
    document.getElementById('formation-cover-file'),
    document.getElementById('prev-cover'),
    document.getElementById('prev-cover-placeholder')
  );

  document.getElementById('formation-icon-file').addEventListener('change', function () {
    if (this.files[0]) uploadFile(this.files[0], document.getElementById('formation-icon-status'), document.getElementById('formation-icon-url'));
  });

  document.getElementById('formation-cover-file').addEventListener('change', function () {
    if (this.files[0]) uploadFile(this.files[0], document.getElementById('formation-cover-status'), document.getElementById('formation-cover-url'));
  });

  // ============================================================
  // COMPÉTENCES
  // ============================================================
  const compInput  = document.getElementById('competence-input');
  const compAddBtn = document.getElementById('competence-add-btn');
  const compTags   = document.getElementById('competence-tags');
  const compHidden = document.getElementById('competences-hidden');
  let competences  = [];

  function renderCompetences() {
    compTags.innerHTML = '';
    competences.forEach((item, i) => {
      const tag = document.createElement('div');
      tag.className = 'tag-item';
      tag.innerHTML = `<span>${item}</span><span class="tag-remove" data-index="${i}">✕</span>`;
      compTags.appendChild(tag);
    });
    compHidden.value = JSON.stringify(competences);
  }

  function addCompetence() {
    const val = compInput.value.trim();
    if (!val || competences.includes(val) || competences.length >= 6) { compInput.value = ''; return; }
    competences.push(val);
    compInput.value = '';
    renderCompetences();
  }

  compTags.addEventListener('click', e => {
    if (e.target.classList.contains('tag-remove')) { competences.splice(parseInt(e.target.dataset.index), 1); renderCompetences(); }
  });
  compAddBtn.addEventListener('click', addCompetence);
  compInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCompetence(); } });

  // ============================================================
  // RICH TEXT
  // ============================================================
  const editor     = document.getElementById('formation-desc-longue');
  const descHidden = document.getElementById('formation-desc-longue-hidden');

  document.querySelectorAll('.rt-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const cmd = this.dataset.cmd;
      if (cmd === 'formatBlock-h3') document.execCommand('formatBlock', false, '<h3>');
      else document.execCommand(cmd, false, null);
      editor.focus();
    });
  });
  editor.addEventListener('input', () => { descHidden.value = editor.innerHTML; });

  // ============================================================
  // FAQ
  // ============================================================
  const faqList   = document.getElementById('faq-list');
  const faqHidden = document.getElementById('faq-hidden');
  let faqItems    = [];

  function renderFaq() {
    faqList.innerHTML = '';
    if (faqItems.length === 0) {
      faqList.innerHTML = '<div style="font-size:0.75rem;color:#9a9a9a;">Aucune question ajoutée.</div>';
    } else {
      faqItems.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = 'faq-item';
        el.innerHTML = `
          <div class="faq-item-question">${item.question}</div>
          <div class="faq-item-answer">${item.answer}</div>
          <button class="faq-item-remove" data-index="${i}">✕</button>
        `;
        faqList.appendChild(el);
      });
    }
    faqHidden.value = JSON.stringify(faqItems);
  }

  document.getElementById('faq-add-btn').addEventListener('click', () => {
    const q = document.getElementById('faq-question').value.trim();
    const a = document.getElementById('faq-answer').value.trim();
    if (!q || !a) { alert('Veuillez remplir la question et la réponse.'); return; }
    faqItems.push({ question: q, answer: a });
    document.getElementById('faq-question').value = '';
    document.getElementById('faq-answer').value   = '';
    renderFaq();
  });

  faqList.addEventListener('click', e => {
    if (e.target.classList.contains('faq-item-remove')) { faqItems.splice(parseInt(e.target.dataset.index), 1); renderFaq(); }
  });

  renderFaq();

  // ============================================================
  // VALIDATION + ÉTAPE SUIVANTE
  // ============================================================

  // Required fields config: [inputId, label for error message]
  const REQUIRED_FIELDS = [
    { id: 'formation-theme',       label: 'Thème' },
    { id: 'formation-titre',       label: 'Titre' },
    { id: 'formation-cover-url',   label: 'Image de couverture', hidden: true },
    { id: 'formation-description', label: 'Description courte' },
    { id: 'formation-prix',        label: 'Prix HT' },
    { id: 'formation-duree',       label: 'Durée totale' },
    { id: 'formation-modules',     label: 'Nombre de modules' },
    { id: 'formation-formateur',   label: 'Le formateur' },
  ];

  // Clear error on focus/input
  document.querySelectorAll('.field-input, .field-textarea').forEach(el => {
    el.addEventListener('input', function () {
      this.classList.remove('input-error');
      const msg = this.parentElement.querySelector('.field-error-msg');
      if (msg) msg.remove();
    });
    el.addEventListener('focus', function () {
      this.classList.remove('input-error');
      const msg = this.parentElement.querySelector('.field-error-msg');
      if (msg) msg.remove();
    });
  });

  function validateForm() {
    let valid = true;
    let firstErrorEl = null;

    REQUIRED_FIELDS.forEach(field => {
      const el = document.getElementById(field.id);
      if (!el) return;
      const val = el.value.trim();
      const isEmpty = !val || (field.id === 'formation-prix' && parseInt(val) <= 0) ||
                      (field.id === 'formation-duree' && parseInt(val) <= 0) ||
                      (field.id === 'formation-modules' && parseInt(val) <= 0);

      if (isEmpty) {
        valid = false;

        if (field.hidden) {
          // Hidden input — find nearest upload-btn's parent for error message
          const uploadBtn = el.closest('.field-group')?.querySelector('.upload-btn') ||
                            el.parentElement?.querySelector('.upload-btn');
          const container = el.closest('.field-group');
          if (container && !container.querySelector('.field-error-msg')) {
            const msg = document.createElement('span');
            msg.className = 'field-error-msg';
            msg.textContent = `${field.label} est requis`;
            container.appendChild(msg);
          }
          if (!firstErrorEl && container) firstErrorEl = container;
        } else {
          el.classList.add('input-error');
          // Add error msg below input if not already there
          if (!el.nextElementSibling?.classList.contains('field-error-msg')) {
            const msg = document.createElement('span');
            msg.className = 'field-error-msg';
            msg.textContent = `${field.label} est requis`;
            el.insertAdjacentElement('afterend', msg);
          }
          if (!firstErrorEl) firstErrorEl = el;
        }
      }
    });

    // Also check icon — not required but if cover is empty it's already caught above
    // Check competences: min 2
    const comps = JSON.parse(document.getElementById('competences-hidden').value || '[]');
    if (comps.length < 2) {
      valid = false;
      const container = document.getElementById('competence-tags').closest('.field-group');
      if (container && !container.querySelector('.field-error-msg')) {
        const msg = document.createElement('span');
        msg.className = 'field-error-msg';
        msg.textContent = 'Ajoutez au moins 2 compétences';
        container.appendChild(msg);
      }
      if (!firstErrorEl) firstErrorEl = document.getElementById('competence-input');
    }

    if (firstErrorEl) {
      firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
  }

  document.getElementById('formation-next-btn').addEventListener('click', async function () {
    // Clear all previous errors first
    document.querySelectorAll('.field-error-msg').forEach(m => m.remove());
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    if (!validateForm()) return;

    const btn = this;
    btn.disabled  = true;
    btn.innerHTML = 'Enregistrement… <span style="font-size:1.1rem;">⏳</span>';

    const payload = {
      theme:              document.getElementById('formation-theme').value.trim(),
      icon_url:           document.getElementById('formation-icon-url').value.trim(),
      titre:              document.getElementById('formation-titre').value.trim(),
      cover_url:          document.getElementById('formation-cover-url').value.trim(),
      description:        document.getElementById('formation-description').value.trim(),
      prix_ht:            parseInt(document.getElementById('formation-prix').value) || 0,
      duree_minutes:      parseInt(document.getElementById('formation-duree').value) || 0,
      nb_modules:         parseInt(document.getElementById('formation-modules').value) || 0,
      competences:        JSON.parse(document.getElementById('competences-hidden').value || '[]'),
      description_longue: document.getElementById('formation-desc-longue-hidden').value,
      formateur:          document.getElementById('formation-formateur').value.trim(),
      faq:                JSON.parse(document.getElementById('faq-hidden').value || '[]'),
    };

    // Délègue l'appel API au script create_course (embed séparé)
    if (typeof window.triggerCreateCourse === 'function') {
      window.triggerCreateCourse(
        payload, token,
        async function(course) {
          btn.innerHTML = '\u2705 Enregistr\u00e9 \u2014 chargement\u2026';

          // ── Refresh du localStorage auth avec les nouvelles données user ──
          // Appelle DR.Session.refresh si disponible (Webflow/Directus pattern)
          // puis relit le localStorage pour avoir freelance.course[0].id
          try {
            if (window.DR?.Session?.refresh) {
              await window.DR.Session.refresh({ force: true });
            } else {
              // Fallback : refetch user_full_data depuis Xano et update localStorage
              const meRes = await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/user_full_data', {
                headers: { 'Authorization': 'Bearer ' + token }
              });
              if (meRes.ok) {
                const meData = await meRes.json();
                // Merge dans l'objet auth existant
                const currentAuth = JSON.parse(localStorage.getItem('auth') || '{}');
                const updatedAuth = Object.assign({}, currentAuth, meData);
                localStorage.setItem('auth', JSON.stringify(updatedAuth));
              }
            }
          } catch(e) { console.warn('Refresh auth failed:', e); }

          // ── Passe à l'étape 2 ──
          // Masque l'étape 1
          const step1Root = document.querySelector('.formation-root');
          if (step1Root) step1Root.style.display = 'none';

          // Affiche l'étape 2 et l'initialise (lit le nouveau localStorage)
          const step2 = document.getElementById('builder-root');
          if (step2) {
            step2.style.display = 'flex';
            step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          // Initialise le builder étape 2 avec les données auth fraîches
          if (typeof window.initCourseBuilder === 'function') {
            window.initCourseBuilder();
          }

          btn.disabled = false;
          btn.innerHTML = '\u2705 Enregistr\u00e9 !';
        },
        function(errMsg) {
          alert(errMsg);
          btn.disabled  = false;
          btn.innerHTML = '\u00c9tape suivante \u2014 Chapitres & modules <span style="font-size:1.1rem;">\u2192</span>';
        }
      );
    } else {
      alert('Script create_course non chargé.');
      btn.disabled  = false;
      btn.innerHTML = '\u00c9tape suivante \u2014 Chapitres & modules <span style="font-size:1.1rem;">\u2192</span>';
    }
  });

});





















// ============================================================
// dr-course-step2.js
// Script étape 2 — Constructeur chapitres & modules
// Chargé via <script src="..." defer></script> dans le body Webflow
//
// NE S'INITIALISE PAS AUTOMATIQUEMENT.
// Appelé par step1 via : window.initCourseBuilder()
// après le refresh du localStorage auth.
// ============================================================

window.initCourseBuilder = function () {


  // ============================================================
  // CONFIG & STATE
  // ============================================================
  const VIMEO_UPLOAD_URL   = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/vimeo_upload';
  const VIMEO_FINALIZE_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/vimeo_finalize';
  const CHUNK_SIZE         = 5 * 1024 * 1024; // 5 MB chunks TUS

  const auth    = JSON.parse(localStorage.getItem('auth') || 'null');
  const token   = auth?.token;
  const courses = auth?.freelance?.course;
  const courseId = (Array.isArray(courses) && courses.length > 0) ? courses[0].id : null;

  // Affiche le course_id dans la toolbar
  const courseInfoEl = document.getElementById('builder-course-info');
  if (courseInfoEl) {
    courseInfoEl.textContent = courseId
      ? `Course ID : ${courseId}`
      : '⚠️ Course ID introuvable — rechargez la page ou revenez à l\'étape 1';
  }

  // State : array de chapitres
  // chapter = { id (temp), title, duration, chapter_order, modules: [] }
  // module  = { id (temp), module_temp_id, title, slug, duration, module_order,
  //             upload_status, vimeo_uri, file, is_required, required_label }
  let chapters = [];

  // ============================================================
  // TOAST
  // ============================================================
  function showToast(msg, duration = 2500) {
    const t = document.getElementById('builder-toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  }

  // ============================================================
  // CONFIRM MODAL
  // ============================================================
  let _confirmCallback = null;

  function showConfirm(htmlMsg, onConfirm) {
    _confirmCallback = onConfirm;
    document.getElementById('confirm-modal-text').innerHTML = htmlMsg;
    document.getElementById('confirm-modal').classList.add('active');
  }

  document.getElementById('confirm-ok').addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.remove('active');
    if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
  });

  ['confirm-cancel', 'confirm-cancel-x'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      document.getElementById('confirm-modal').classList.remove('active');
      _confirmCallback = null;
    });
  });

  // ============================================================
  // HELPERS
  // ============================================================
  function uid() { return 'ch-' + Math.random().toString(36).slice(2, 9); }
  function modUid() { return 'mod-' + Math.random().toString(36).slice(2, 11) + '-' + Date.now().toString(36); }

  function toSlug(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  function isValidDuration(val) {
    return /^\d{1,2}:\d{2}$/.test(val);
  }

  function hasActiveUpload() {
    return chapters.some(ch => ch.modules.some(m => m.upload_status === 'uploading'));
  }

  function isModuleLocked(mod) { return mod.upload_status === 'uploading'; }

  function recomputeOrders() {
    chapters.forEach((ch, ci) => {
      ch.chapter_order = ci;
      ch.modules.forEach((m, mi) => { m.module_order = mi; });
    });
  }

  // ============================================================
  // CHAPTER FACTORY
  // ============================================================
  function makeChapter(title = '', isIntro = false) {
    return {
      _id: uid(),
      title: title,
      duration: '',
      chapter_order: 0,
      isIntro,
      modules: [],
    };
  }

  function makeModule(opts = {}) {
    return {
      _id: uid(),
      module_temp_id: modUid(),
      title:         opts.title        || '',
      slug:          opts.slug         || '',
      duration:      opts.duration     || '',
      module_order:  opts.module_order || 0,
      upload_status: 'idle',
      vimeo_uri:     null,
      file:          null,
      is_required:   opts.is_required  || false,
      required_label: opts.required_label || '',
    };
  }

  // ============================================================
  // INIT : chapitre 0 obligatoire
  // ============================================================
  function initChapter0() {
    const ch0 = makeChapter('Introduction', true);
    ch0._id = 'chapter-0';
    ch0.modules = [
      makeModule({ title: 'Présentation de la formation', is_required: true, required_label: 'Obligatoire' }),
      makeModule({ title: 'Présentation du formateur',    is_required: true, required_label: 'Obligatoire' }),
      makeModule({ title: 'Plan de la formation',         is_required: true, required_label: 'Obligatoire' }),
    ];
    ch0.modules.forEach((m, i) => { m.module_order = i; });
    chapters.push(ch0);
  }

  initChapter0();
  render();

  // ============================================================
  // MAIN RENDER
  // ============================================================
  function render() {
    recomputeOrders();
    const list = document.getElementById('chapter-list');
    list.innerHTML = '';
    chapters.forEach((ch, ci) => { list.appendChild(buildChapterEl(ch, ci)); });
    initDragChapters();
  }

  // ============================================================
  // BUILD CHAPTER ELEMENT
  // ============================================================
  function buildChapterEl(ch, ci) {
    const card = document.createElement('div');
    card.className = 'chapter-card';
    card.dataset.chapterId = ch._id;

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'chapter-header';

    // Drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'chapter-drag-handle' + (ch.isIntro ? ' disabled' : '');
    dragHandle.innerHTML = '⠿';
    dragHandle.title = ch.isIntro ? 'Chapitre fixe' : 'Déplacer le chapitre';
    if (!ch.isIntro) {
      dragHandle.setAttribute('draggable', 'true');
      dragHandle.addEventListener('mousedown', () => { card.setAttribute('draggable', 'true'); });
      dragHandle.addEventListener('mouseup',   () => { card.setAttribute('draggable', 'false'); });
    }
    header.appendChild(dragHandle);

    // Badge
    const badge = document.createElement('span');
    badge.className = 'chapter-badge' + (ch.isIntro ? ' intro' : '');
    badge.textContent = ch.isIntro ? 'CHAPITRE 0 — Intro' : `CHAPITRE ${ci}`;
    header.appendChild(badge);

    // Title input
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'chapter-title-input';
    titleInput.value = ch.title;
    titleInput.disabled = ch.isIntro;
    titleInput.placeholder = 'Titre du chapitre…';
    titleInput.addEventListener('input', () => {
      ch.title = titleInput.value;
    });
    header.appendChild(titleInput);

    // Meta : nb modules + durée
    const meta = document.createElement('div');
    meta.className = 'chapter-meta';

    const modCount = document.createElement('div');
    modCount.className = 'chapter-meta-item';
    modCount.title = 'Nombre de modules';
    modCount.textContent = `📚 ${ch.modules.length} module${ch.modules.length !== 1 ? 's' : ''}`;
    meta.appendChild(modCount);

    const durContainer = document.createElement('div');
    durContainer.className = 'chapter-meta-item';
    durContainer.title = 'Durée du chapitre (minutes)';
    durContainer.innerHTML = '⏱️ ';
    const durInput = document.createElement('input');
    durInput.type = 'number';
    durInput.className = 'chapter-duration-input';
    durInput.value = ch.duration;
    durInput.placeholder = '0';
    durInput.min = '0';
    durInput.addEventListener('input', () => { ch.duration = durInput.value; });
    durContainer.appendChild(durInput);
    durContainer.appendChild(document.createTextNode(' min'));
    meta.appendChild(durContainer);

    header.appendChild(meta);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'chapter-actions';

    const addModBtn = document.createElement('button');
    addModBtn.className = 'btn-icon';
    addModBtn.innerHTML = '+ Module';
    addModBtn.title = 'Ajouter un module';
    addModBtn.addEventListener('click', () => {
      const newMod = makeModule({ module_order: ch.modules.length });
      ch.modules.push(newMod);
      render();
      // Re-open the new module
      setTimeout(() => {
        const el = document.querySelector(`[data-module-id="${newMod._id}"]`);
        if (el) { el.classList.add('open'); el.querySelector('.module-body').style.display = 'flex'; }
      }, 50);
    });
    actions.appendChild(addModBtn);

    if (!ch.isIntro) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon danger';
      delBtn.innerHTML = '🗑';
      delBtn.title = 'Supprimer le chapitre';
      delBtn.addEventListener('click', () => {
        if (hasActiveUpload()) { showToast('⚠️ Un upload est en cours, attendez qu\'il se termine.'); return; }
        showConfirm(
          `Supprimer le chapitre "<strong>${ch.title || 'sans titre'}</strong>" et tous ses modules ?`,
          () => { chapters = chapters.filter(c => c._id !== ch._id); render(); }
        );
      });
      actions.appendChild(delBtn);
    }

    header.appendChild(actions);
    card.appendChild(header);

    // --- Modules list ---
    const modList = document.createElement('div');
    modList.className = 'modules-list';
    modList.dataset.chapterId = ch._id;

    if (ch.isIntro) {
      // Chapître 0 : 3 obligatoires + bonus section
      ch.modules.slice(0, 2).forEach((mod, mi) => {
        modList.appendChild(buildModuleEl(mod, ch, mi));
      });

      // Bonus section between module 2 and 3
      const bonusSection = buildBonusSection(ch);
      modList.appendChild(bonusSection);

      // Module 3 (Plan de la formation) always last in required
      if (ch.modules.length >= 3) {
        modList.appendChild(buildModuleEl(ch.modules[ch.modules.length - 1], ch, ch.modules.length - 1));
      }
    } else {
      ch.modules.forEach((mod, mi) => {
        modList.appendChild(buildModuleEl(mod, ch, mi));
      });
    }

    card.appendChild(modList);
    return card;
  }

  // ============================================================
  // BONUS SECTION (chapitre 0 only)
  // ============================================================
  function buildBonusSection(ch) {
    const section = document.createElement('div');
    section.className = 'bonus-section';

    const label = document.createElement('div');
    label.className = 'bonus-label';
    label.textContent = 'Modules bonus (optionnels)';
    section.appendChild(label);

    // Render bonus modules (index 2 up to last-1 if >=4 modules)
    const bonusMods = ch.modules.slice(2, ch.modules.length > 3 ? ch.modules.length - 1 : 2);
    bonusMods.forEach((mod, bi) => {
      section.appendChild(buildModuleEl(mod, ch, bi + 2));
    });

    const actionsRow = document.createElement('div');
    actionsRow.className = 'bonus-actions';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add-module';
    addBtn.innerHTML = '+ Ajouter un module bonus';
    addBtn.addEventListener('click', () => {
      const newMod = makeModule({ is_required: false });
      // Insert before the last required module (Plan de la formation)
      ch.modules.splice(ch.modules.length - 1, 0, newMod);
      render();
      setTimeout(() => {
        const el = document.querySelector(`[data-module-id="${newMod._id}"]`);
        if (el) { el.classList.add('open'); el.querySelector('.module-body').style.display = 'flex'; }
      }, 50);
    });
    actionsRow.appendChild(addBtn);

    const exBtn = document.createElement('button');
    exBtn.className = 'btn-icon';
    exBtn.innerHTML = '💡 Voir des exemples';
    exBtn.style.fontSize = '0.78rem';
    exBtn.addEventListener('click', () => {
      openPopup('popup-bonus-examples');
    });
    actionsRow.appendChild(exBtn);
    section.appendChild(actionsRow);

    const hint = document.createElement('div');
    hint.className = 'bonus-hint';
    hint.textContent = 'Vous pouvez ajouter n\'importe quel module qui donne envie de suivre la formation.';
    section.appendChild(hint);

    return section;
  }

  // ============================================================
  // BUILD MODULE ELEMENT
  // ============================================================
  function buildModuleEl(mod, ch, mi) {
    const item = document.createElement('div');
    item.className = 'module-item';
    item.dataset.moduleId = mod._id;
    if (mod.is_required) item.classList.add('is-required');
    if (mod.upload_status === 'uploading') item.classList.add('locked-upload');

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'module-header';

    // Drag handle
    const dragHandle = document.createElement('span');
    const canDrag = !mod.is_required && mod.upload_status !== 'uploading';
    dragHandle.className = 'module-drag-handle' + (canDrag ? '' : ' disabled');
    dragHandle.innerHTML = '⠿';
    dragHandle.title = mod.is_required ? 'Module fixe' : (mod.upload_status === 'uploading' ? 'Upload en cours' : 'Déplacer');
    if (canDrag) {
      dragHandle.setAttribute('draggable', 'true');
      dragHandle.addEventListener('mousedown', () => { item.setAttribute('draggable', 'true'); });
      dragHandle.addEventListener('mouseup',   () => { item.setAttribute('draggable', 'false'); });
    }
    header.appendChild(dragHandle);

    // Order badge
    const badge = document.createElement('div');
    badge.className = 'module-order-badge';
    badge.textContent = mi + 1;
    header.appendChild(badge);

    // Title display
    const titleDisplay = document.createElement('div');
    titleDisplay.className = 'module-title-display' + (mod.title ? '' : ' empty');
    titleDisplay.textContent = mod.title || 'Titre du module…';
    header.appendChild(titleDisplay);

    // Status pill
    const pill = document.createElement('span');
    pill.className = 'module-status-pill';
    if (mod.is_required) {
      pill.className += ' status-required';
      pill.textContent = 'Obligatoire';
    } else {
      const statusMap = { idle: ['status-idle', 'En attente'], uploading: ['status-uploading', 'Upload…'], uploaded: ['status-uploaded', '✅ Prêt'], error: ['status-error', '❌ Erreur'] };
      const [cls, txt] = statusMap[mod.upload_status] || ['status-idle', '—'];
      pill.className += ' ' + cls;
      pill.textContent = txt;
    }
    header.appendChild(pill);

    // Chevron
    const chevron = document.createElement('span');
    chevron.className = 'module-chevron';
    chevron.innerHTML = '▼';
    header.appendChild(chevron);

    // Toggle open
    header.addEventListener('click', () => {
      item.classList.toggle('open');
      body.style.display = item.classList.contains('open') ? 'flex' : 'none';
    });

    item.appendChild(header);

    // --- Body ---
    const body = document.createElement('div');
    body.className = 'module-body';

    // Title input
    const titleField = document.createElement('div');
    titleField.className = 'module-field';
    const titleLabel = document.createElement('label');
    titleLabel.className = 'module-label';
    titleLabel.textContent = 'Titre du module';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'module-input';
    titleInput.value = mod.title;
    titleInput.disabled = mod.is_required;
    titleInput.placeholder = 'Ex : Introduction au référencement naturel';
    titleInput.addEventListener('input', () => {
      mod.title = titleInput.value;
      mod.slug  = toSlug(titleInput.value);
      titleDisplay.textContent  = mod.title || 'Titre du module…';
      titleDisplay.className = 'module-title-display' + (mod.title ? '' : ' empty');
    });
    titleField.appendChild(titleLabel);
    titleField.appendChild(titleInput);

    // Slug (hidden, updated silently)
    if (!mod.slug && mod.title) mod.slug = toSlug(mod.title);
    body.appendChild(titleField);

    // Row : duration + hidden fields display
    const row = document.createElement('div');
    row.className = 'module-row';

    const durField = document.createElement('div');
    durField.className = 'module-field';
    const durLabel = document.createElement('label');
    durLabel.className = 'module-label';
    durLabel.textContent = 'Durée vidéo (mm:ss)';
    const durInput = document.createElement('input');
    durInput.type = 'text';
    durInput.className = 'module-input';
    durInput.value = mod.duration;
    durInput.placeholder = '00:00';
    durInput.style.fontFamily = "'DM Mono', monospace";
    durInput.addEventListener('blur', () => {
      if (durInput.value && !isValidDuration(durInput.value)) {
        durInput.classList.add('error');
        durInput.title = 'Format invalide — utilisez mm:ss (ex: 12:34)';
      } else {
        durInput.classList.remove('error');
        durInput.title = '';
        mod.duration = durInput.value;
      }
    });
    durField.appendChild(durLabel);
    durField.appendChild(durInput);
    row.appendChild(durField);

    // module_temp_id — hidden, used internally only
    body.appendChild(row);

    // Upload zone
    const uploadZone = buildUploadZone(mod, ch);
    body.appendChild(uploadZone);

    // Actions row
    const actionsRow = document.createElement('div');
    actionsRow.className = 'module-actions-row';
    if (!mod.is_required) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon danger';
      delBtn.style.fontSize = '0.75rem';
      delBtn.innerHTML = '🗑 Supprimer ce module';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (mod.upload_status === 'uploading') { showToast('⚠️ Upload en cours, impossible de supprimer.'); return; }
        showConfirm(
          `Supprimer le module "<strong>${mod.title || 'sans titre'}</strong>" ?`,
          () => { ch.modules = ch.modules.filter(m => m._id !== mod._id); render(); }
        );
      });
      actionsRow.appendChild(delBtn);
    } else {
      const fixedNote = document.createElement('span');
      fixedNote.style.cssText = 'font-size:0.7rem;color:#9a9a9a;font-style:italic;';
      fixedNote.textContent = 'Module obligatoire — non supprimable';
      actionsRow.appendChild(fixedNote);
    }
    body.appendChild(actionsRow);

    item.appendChild(body);
    return item;
  }

  // ============================================================
  // BUILD UPLOAD ZONE
  // ============================================================
  function buildUploadZone(mod, ch) {
    const zone = document.createElement('div');
    zone.className = 'upload-zone' + (mod.vimeo_uri ? ' has-video' : '');

    const top = document.createElement('div');
    top.className = 'upload-top';

    // File input (hidden)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*';
    fileInput.style.display = 'none';
    zone.appendChild(fileInput);

    // Upload btn
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'upload-file-btn';
    uploadBtn.innerHTML = '🎬 Choisir une vidéo';
    uploadBtn.disabled = mod.upload_status === 'uploading';
    uploadBtn.addEventListener('click', () => { fileInput.click(); });
    top.appendChild(uploadBtn);

    // Filename display
    const fileNameEl = document.createElement('span');
    fileNameEl.className = 'upload-filename';
    fileNameEl.textContent = mod.file ? mod.file.name : (mod.vimeo_uri ? '✅ Vidéo uploadée' : 'Aucun fichier sélectionné');
    top.appendChild(fileNameEl);

    zone.appendChild(top);

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'upload-progress-bar';
    progressBar.style.display = 'none';
    const progressFill = document.createElement('div');
    progressFill.className = 'upload-progress-fill';
    progressBar.appendChild(progressFill);
    zone.appendChild(progressBar);

    // Status text
    const statusText = document.createElement('div');
    statusText.className = 'upload-status-text';
    statusText.textContent = mod.vimeo_uri ? '✅ Finalisé' : 'En attente';
    zone.appendChild(statusText);

    // Vimeo player (if already uploaded)
    if (mod.vimeo_uri) {
      const vimeoId = mod.vimeo_uri.replace('/videos/', '');
      const iframe = document.createElement('iframe');
      iframe.src = `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0`;
      iframe.className = 'upload-vimeo-player';
      iframe.allowFullscreen = true;
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      zone.appendChild(iframe);
      zone.classList.add('has-video');
    }

    // On file selected
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      mod.file = file;
      fileNameEl.textContent = file.name;
      statusText.textContent = 'Prêt à uploader — cliquez sur "Uploader"';

      // Replace btn
      uploadBtn.innerHTML = '⬆️ Uploader la vidéo';
      uploadBtn.onclick = () => startUpload(mod, ch, file, progressBar, progressFill, statusText, uploadBtn, zone);
    });

    return zone;
  }

  // ============================================================
  // VIMEO TUS UPLOAD
  // ============================================================
  async function startUpload(mod, ch, file, progressBar, progressFill, statusText, uploadBtn, zone) {
    if (!courseId) {
      showToast('⚠️ Course ID introuvable. Rechargez la page.');
      return;
    }
    if (mod.upload_status === 'uploading') return;

    // Lock
    mod.upload_status = 'uploading';
    uploadBtn.disabled = true;
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    statusText.textContent = 'Préparation Vimeo…';

    // Re-render header pill (locked state)
    refreshModulePill(mod._id);

    try {
      // 1. Create Vimeo slot
      const initRes = await fetch(VIMEO_UPLOAD_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          course_id:      courseId,
          module_temp_id: mod.module_temp_id,
          file_name:      file.name,
          file_size:      file.size,
        }),
      });
      if (!initRes.ok) throw new Error('Erreur création slot Vimeo (' + initRes.status + ')');
      const initData = await initRes.json();
      const { upload_link, vimeo_uri } = initData;

      // 2. TUS upload (PATCH chunks)
      statusText.textContent = 'Upload en cours… 0%';
      await tusUpload(file, upload_link, (pct) => {
        progressFill.style.width = pct + '%';
        statusText.textContent = `Upload en cours… ${pct}%`;
      });

      // 3. Finalize
      statusText.textContent = 'Transcodage en cours…';
      const finalRes = await fetch(VIMEO_FINALIZE_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ vimeo_uri, module_temp_id: mod.module_temp_id }),
      });
      if (!finalRes.ok) throw new Error('Erreur finalisation Vimeo (' + finalRes.status + ')');

      // 4. Success
      mod.upload_status = 'uploaded';
      mod.vimeo_uri     = vimeo_uri;
      progressFill.style.width = '100%';
      statusText.textContent   = '✅ Finalisé';
      zone.classList.add('has-video');

      // Inject iframe
      const vimeoId = vimeo_uri.replace('/videos/', '');
      const iframe = document.createElement('iframe');
      iframe.src = `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0`;
      iframe.className = 'upload-vimeo-player';
      iframe.allowFullscreen = true;
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      zone.appendChild(iframe);

      refreshModulePill(mod._id);
      showToast('✅ Vidéo uploadée avec succès !');

    } catch (err) {
      mod.upload_status = 'error';
      statusText.textContent = '❌ Erreur : ' + err.message;
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = '↩️ Réessayer';
      refreshModulePill(mod._id);
    }
  }

  // ============================================================
  // TUS PATCH UPLOAD (chunked)
  // ============================================================
  async function tusUpload(file, uploadLink, onProgress) {
    let offset = 0;
    const total = file.size;

    while (offset < total) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const res = await fetch(uploadLink, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable':        '1.0.0',
          'Upload-Offset':        String(offset),
          'Content-Type':         'application/offset+octet-stream',
          'Content-Length':       String(chunk.size),
        },
        body: chunk,
      });
      if (!res.ok && res.status !== 204) throw new Error('TUS PATCH failed at offset ' + offset);
      offset += chunk.size;
      const pct = Math.round((offset / total) * 100);
      if (onProgress) onProgress(Math.min(pct, 99));
    }
  }

  // ============================================================
  // REFRESH MODULE PILL (sans re-render complet)
  // ============================================================
  function refreshModulePill(modId) {
    const item = document.querySelector(`[data-module-id="${modId}"]`);
    if (!item) return;
    const pill = item.querySelector('.module-status-pill');
    if (!pill) return;
    // Find module in state
    let mod = null;
    chapters.forEach(ch => { ch.modules.forEach(m => { if (m._id === modId) mod = m; }); });
    if (!mod || mod.is_required) return;
    const statusMap = { idle: ['status-idle', 'En attente'], uploading: ['status-uploading', 'Upload…'], uploaded: ['status-uploaded', '✅ Prêt'], error: ['status-error', '❌ Erreur'] };
    const [cls, txt] = statusMap[mod.upload_status] || ['status-idle', '—'];
    pill.className = 'module-status-pill ' + cls;
    pill.textContent = txt;
    // Lock class
    if (mod.upload_status === 'uploading') item.classList.add('locked-upload');
    else item.classList.remove('locked-upload');
  }

  // ============================================================
  // DRAG & DROP — CHAPTERS
  // ============================================================
  function initDragChapters() {
    const list = document.getElementById('chapter-list');
    let dragSrc = null;

    list.querySelectorAll('.chapter-card').forEach(card => {
      if (card.dataset.chapterId === 'chapter-0') return; // chapitre 0 : skip

      card.addEventListener('dragstart', e => {
        if (hasActiveUpload()) { e.preventDefault(); showToast('⚠️ Upload en cours, réorganisation bloquée.'); return; }
        dragSrc = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        list.querySelectorAll('.chapter-card').forEach(c => c.classList.remove('drag-over'));
        card.setAttribute('draggable', 'false');
        // Sync state order from DOM
        const newOrder = [];
        list.querySelectorAll('.chapter-card').forEach(c => {
          const found = chapters.find(ch => ch._id === c.dataset.chapterId);
          if (found) newOrder.push(found);
        });
        chapters = newOrder;
        render();
      });

      card.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragSrc || dragSrc === card || card.dataset.chapterId === 'chapter-0') return;
        card.classList.add('drag-over');
        const bounding = card.getBoundingClientRect();
        const offset   = e.clientY - bounding.top;
        if (offset < bounding.height / 2) {
          list.insertBefore(dragSrc, card);
        } else {
          list.insertBefore(dragSrc, card.nextSibling);
        }
      });

      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    });

    // Module drag & drop per chapter
    list.querySelectorAll('.modules-list').forEach(modList => {
      initDragModules(modList);
    });
  }

  // ============================================================
  // DRAG & DROP — MODULES
  // ============================================================
  function initDragModules(modList) {
    const chId = modList.dataset.chapterId;
    const ch   = chapters.find(c => c._id === chId);
    if (!ch) return;

    let dragSrcMod = null;

    modList.querySelectorAll('.module-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        const modId = item.dataset.moduleId;
        const mod   = ch.modules.find(m => m._id === modId);
        if (!mod || mod.is_required || mod.upload_status === 'uploading') { e.preventDefault(); return; }
        dragSrcMod = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        modList.querySelectorAll('.module-item').forEach(i => i.classList.remove('drag-over'));
        item.setAttribute('draggable', 'false');
        // Sync modules order from DOM
        const newModOrder = [];
        modList.querySelectorAll('.module-item').forEach(i => {
          const found = ch.modules.find(m => m._id === i.dataset.moduleId);
          if (found) newModOrder.push(found);
        });
        ch.modules = newModOrder;
        render();
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragSrcMod || dragSrcMod === item) return;
        const modId = item.dataset.moduleId;
        const mod   = ch.modules.find(m => m._id === modId);
        if (mod?.is_required) return;
        item.classList.add('drag-over');
        const bounding = item.getBoundingClientRect();
        const offset   = e.clientY - bounding.top;
        if (offset < bounding.height / 2) {
          modList.insertBefore(dragSrcMod, item);
        } else {
          modList.insertBefore(dragSrcMod, item.nextSibling);
        }
      });

      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    });
  }

  // ============================================================
  // ADD CHAPTER
  // ============================================================
  function addChapter() {
    const ch = makeChapter();
    const mod = makeModule({ module_order: 0 });
    ch.modules.push(mod);
    chapters.push(ch);
    render();
    // Scroll to new chapter
    setTimeout(() => {
      const cards = document.querySelectorAll('.chapter-card');
      if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  document.getElementById('btn-add-chapter-main').addEventListener('click', addChapter);

  // ============================================================
  // SAVE (placeholder)
  // ============================================================
  function onSave() {
    const payload = buildPayload();
    console.log('💾 Brouillon sauvegardé :', payload);
    showToast('💾 Brouillon sauvegardé (console)');
  }

  document.getElementById('btn-save-bottom').addEventListener('click', onSave);

  // ============================================================
  // PUBLISH (placeholder)
  // ============================================================
  function onPublish() {
    if (hasActiveUpload()) { showToast('⚠️ Un upload est en cours, attendez avant de publier.'); return; }
    const payload = buildPayload();
    console.log('🚀 Formation publiée :', payload);
    showToast('🚀 Formation publiée (console)');
  }

  document.getElementById('btn-publish').addEventListener('click', onPublish);

  // ============================================================
  // BUILD PAYLOAD (pour save/publish)
  // ============================================================
  function buildPayload() {
    recomputeOrders();
    return {
      course_id: courseId,
      chapters: chapters.map(ch => ({
        _id:           ch._id,
        title:         ch.title,
        slug:          toSlug(ch.title),
        duration:      parseInt(ch.duration) || 0,
        chapter_order: ch.chapter_order,
        is_intro:      ch.isIntro || false,
        modules: ch.modules.map(m => ({
          module_temp_id: m.module_temp_id,
          title:          m.title,
          slug:           m.slug || toSlug(m.title),
          duration:       m.duration,
          module_order:   m.module_order,
          upload_status:  m.upload_status,
          vimeo_uri:      m.vimeo_uri,
          is_required:    m.is_required,
        })),
      })),
    };
  }

  // ============================================================
  // POPUP — Exemples bonus
  // ============================================================
  function openPopup(id) {
    document.getElementById(id)?.classList.add('active');
  }
  function closePopup(id) {
    document.getElementById(id)?.classList.remove('active');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closePopup(btn.dataset.close));
  });

  document.querySelectorAll('.popup-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.popup-overlay.active').forEach(p => p.classList.remove('active'));
  });

  // Bonus examples popup — display only, no click action

};
