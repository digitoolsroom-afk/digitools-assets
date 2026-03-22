// ============================================================
// dr-course-step1.js
// Expose window.initCourseStep1() — appelé par dr-course-routing.js
// NE S'AUTO-INIT PAS. Même pattern que initCourseBuilder.
// ============================================================

// ── Helper create_course ──
const COURSE_CREATE_ENDPOINT = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_course';

window.triggerCreateCourse = async function (payload, token, onSuccess, onError) {
  if (!token) { if (onError) onError('Vous devez être connecté.'); return; }
  const auth               = JSON.parse(localStorage.getItem('auth') || 'null');
  const profile            = auth?.freelance?.profile;
  const freelanceProfileId = profile?.id || null;

  const body = {
    freelance_profile_id: freelanceProfileId,
    theme:             payload.theme              || '',
    icon_url:          payload.icon_url           || '',
    title:             payload.titre              || '',
    cover_url:         payload.cover_url          || '',
    description_short: payload.description        || '',
    description_long:  payload.description_longue || '',
    trainer_bio:       payload.formateur          || '',
    price_cents:       Math.round((parseFloat(payload.prix_ht) || 0) * 100),
    duration_minutes:  parseInt(payload.duree_minutes) || 0,
    modules_count:     parseInt(payload.nb_modules)    || 0,
    skills:            Array.isArray(payload.competences) ? payload.competences : [],
    faq:               Array.isArray(payload.faq)        ? payload.faq         : [],
  };

  try {
    const res = await fetch(COURSE_CREATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
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

// ============================================================
// initCourseStep1 — appelé par le routing quand il faut afficher step1
// ============================================================
window.initCourseStep1 = function () {

  // Évite double-init
  if (window._step1Initialized) return;
  window._step1Initialized = true;

  const auth    = JSON.parse(localStorage.getItem('auth') || 'null');
  const token   = auth?.token;
  const profile = auth?.freelance?.profile;

  const UPLOAD_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof';

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
  // HELPER durée
  // ============================================================
  function minutesToDisplay(min) {
    if (!min || min <= 0) return '— au total';
    const h = Math.floor(min / 60), m = min % 60;
    if (h === 0) return `${m}min au total`;
    if (m === 0) return `${h}h au total`;
    return `${h}h${String(m).padStart(2,'0')} au total`;
  }

  // ============================================================
  // LIVE PREVIEW
  // ============================================================
  function updatePreview() {
    const themeVal = document.getElementById('formation-theme')?.value.trim();
    const prevTheme = document.getElementById('prev-theme');
    if (prevTheme) prevTheme.textContent = themeVal || '—';

    const titreVal = document.getElementById('formation-titre')?.value.trim();
    const prevTitre = document.getElementById('prev-titre');
    if (prevTitre) {
      prevTitre.textContent = titreVal || 'Le titre de votre formation apparaîtra ici';
      prevTitre.classList.toggle('preview-titre-empty', !titreVal);
    }

    const descVal = document.getElementById('formation-description')?.value.trim();
    const prevDesc = document.getElementById('prev-desc');
    if (prevDesc) {
      prevDesc.textContent = descVal || 'Votre description courte apparaîtra ici…';
      prevDesc.classList.toggle('preview-desc-empty', !descVal);
    }

    const dureeVal = parseInt(document.getElementById('formation-duree')?.value) || 0;
    const prevDuree = document.getElementById('prev-duree');
    if (prevDuree) prevDuree.textContent = minutesToDisplay(dureeVal);

    const modVal = parseInt(document.getElementById('formation-modules')?.value) || 0;
    const prevMod = document.getElementById('prev-modules');
    if (prevMod) prevMod.textContent = modVal > 0 ? `${modVal} module${modVal > 1 ? 's' : ''}` : '— modules';

    const prixVal = document.getElementById('formation-prix')?.value.trim();
    const prevPrix = document.getElementById('prev-prix');
    if (prevPrix) prevPrix.innerHTML = prixVal
      ? `${prixVal}&nbsp;€<br><span style="font-size:0.72rem;font-weight:400;opacity:0.75;">Accès à vie à CETTE formation</span>`
      : `—&nbsp;€<br><span style="font-size:0.72rem;font-weight:400;opacity:0.75;">Accès à vie à CETTE formation</span>`;
  }

  ['formation-theme','formation-titre','formation-description','formation-duree','formation-modules','formation-prix']
    .forEach(id => document.getElementById(id)?.addEventListener('input', updatePreview));

  updatePreview();

  // ============================================================
  // POPUPS
  // ============================================================
  document.querySelectorAll('.example-trigger').forEach(t => {
    t.addEventListener('click', function () {
      document.getElementById(this.dataset.popup)?.classList.add('active');
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
  async function uploadFile(file, statusEl, hiddenEl) {
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
      if (url) { hiddenEl.value = url; statusEl.innerText = '✅ Uploadé avec succès'; }
      else { statusEl.innerText = '❌ Erreur lors de l\'upload.'; }
    } catch { statusEl.innerText = '❌ Erreur serveur. Réessayez.'; }
  }

  function previewLocalFile(fileInput, imgEl, placeholderEl) {
    if (!fileInput) return;
    fileInput.addEventListener('change', function () {
      if (!this.files[0]) return;
      const reader = new FileReader();
      reader.onload = e => {
        if (imgEl) { imgEl.src = e.target.result; imgEl.style.display = 'block'; }
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

  document.getElementById('formation-icon-file')?.addEventListener('change', function () {
    if (this.files[0]) uploadFile(this.files[0], document.getElementById('formation-icon-status'), document.getElementById('formation-icon-url'));
  });
  document.getElementById('formation-cover-file')?.addEventListener('change', function () {
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
    if (!compTags) return;
    compTags.innerHTML = '';
    competences.forEach((item, i) => {
      const tag = document.createElement('div');
      tag.className = 'tag-item';
      tag.innerHTML = `<span>${item}</span><span class="tag-remove" data-index="${i}">✕</span>`;
      compTags.appendChild(tag);
    });
    if (compHidden) compHidden.value = JSON.stringify(competences);
  }

  function addCompetence() {
    const val = compInput?.value.trim();
    if (!val || competences.includes(val) || competences.length >= 6) { if (compInput) compInput.value = ''; return; }
    competences.push(val);
    if (compInput) compInput.value = '';
    renderCompetences();
  }

  compTags?.addEventListener('click', e => {
    if (e.target.classList.contains('tag-remove')) { competences.splice(parseInt(e.target.dataset.index), 1); renderCompetences(); }
  });
  compAddBtn?.addEventListener('click', addCompetence);
  compInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCompetence(); } });

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
      editor?.focus();
    });
  });
  editor?.addEventListener('input', () => { if (descHidden) descHidden.value = editor.innerHTML; });

  // ============================================================
  // FAQ
  // ============================================================
  const faqList   = document.getElementById('faq-list');
  const faqHidden = document.getElementById('faq-hidden');
  let faqItems    = [];

  function renderFaq() {
    if (!faqList) return;
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
    if (faqHidden) faqHidden.value = JSON.stringify(faqItems);
  }

  document.getElementById('faq-add-btn')?.addEventListener('click', () => {
    const q = document.getElementById('faq-question')?.value.trim();
    const a = document.getElementById('faq-answer')?.value.trim();
    if (!q || !a) { alert('Veuillez remplir la question et la réponse.'); return; }
    faqItems.push({ question: q, answer: a });
    if (document.getElementById('faq-question')) document.getElementById('faq-question').value = '';
    if (document.getElementById('faq-answer'))   document.getElementById('faq-answer').value   = '';
    renderFaq();
  });

  faqList?.addEventListener('click', e => {
    if (e.target.classList.contains('faq-item-remove')) { faqItems.splice(parseInt(e.target.dataset.index), 1); renderFaq(); }
  });

  renderFaq();

  // ============================================================
  // VALIDATION
  // ============================================================
  const REQUIRED_FIELDS = [
    { id: 'formation-theme',       label: 'Thème' },
    { id: 'formation-titre',       label: 'Titre' },
    { id: 'formation-cover-url',   label: 'Image de couverture', hidden: true },
    { id: 'formation-icon-url',    label: 'Icône du cours',      hidden: true },
    { id: 'formation-description', label: 'Description courte' },
    { id: 'formation-prix',        label: 'Prix HT' },
    { id: 'formation-duree',       label: 'Durée totale' },
    { id: 'formation-modules',     label: 'Nombre de modules' },
    { id: 'formation-formateur',   label: 'Le formateur' },
  ];

  document.querySelectorAll('.field-input, .field-textarea').forEach(el => {
    ['input', 'focus'].forEach(evt => el.addEventListener(evt, function () {
      this.classList.remove('input-error');
      this.parentElement.querySelector('.field-error-msg')?.remove();
    }));
  });

  function addFieldError(container, msg) {
    if (container && !container.querySelector('.field-error-msg')) {
      const el = document.createElement('span');
      el.className = 'field-error-msg';
      el.textContent = msg;
      container.appendChild(el);
    }
    return container;
  }

  function validateForm() {
    let valid = true, firstErrorEl = null;

    REQUIRED_FIELDS.forEach(field => {
      const el = document.getElementById(field.id);
      if (!el) return;
      const val = el.value.trim();
      const isEmpty = !val
        || (['formation-prix','formation-duree','formation-modules'].includes(field.id) && parseInt(val) <= 0);

      if (isEmpty) {
        valid = false;
        if (field.hidden) {
          const container = el.closest('.field-group');
          const errEl = addFieldError(container, `${field.label} est requis`);
          if (!firstErrorEl) firstErrorEl = errEl;
        } else {
          el.classList.add('input-error');
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

    // Compétences min 2
    const comps = JSON.parse(document.getElementById('competences-hidden')?.value || '[]');
    if (comps.length < 2) {
      valid = false;
      const container = document.getElementById('competence-tags')?.closest('.field-group');
      const errEl = addFieldError(container, 'Ajoutez au moins 2 compétences');
      if (!firstErrorEl) firstErrorEl = errEl || document.getElementById('competence-input');
    }

    // Description longue obligatoire
    const descLongueVal = document.getElementById('formation-desc-longue-hidden')?.value?.trim();
    const descLongueEl  = document.getElementById('formation-desc-longue');
    if (!descLongueVal || descLongueVal === '<br>' || descLongueVal.replace(/<[^>]*>/g,'').trim().length < 10) {
      valid = false;
      if (descLongueEl && !descLongueEl.classList.contains('input-error')) {
        descLongueEl.classList.add('input-error');
        if (!descLongueEl.nextElementSibling?.classList.contains('field-error-msg')) {
          const msg = document.createElement('span');
          msg.className = 'field-error-msg';
          msg.textContent = 'Description longue requise';
          descLongueEl.insertAdjacentElement('afterend', msg);
        }
      }
      if (!firstErrorEl) firstErrorEl = descLongueEl;
    }

    // FAQ min 2 questions
    const faq = JSON.parse(document.getElementById('faq-hidden')?.value || '[]');
    if (faq.length < 2) {
      valid = false;
      const faqContainer = document.getElementById('faq-list')?.closest('.field-group')
                        || document.getElementById('faq-list')?.parentElement;
      const errEl = addFieldError(faqContainer, 'Ajoutez au moins 2 questions à la FAQ');
      if (!firstErrorEl) firstErrorEl = errEl || document.getElementById('faq-question');
    }

    if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return valid;
  }

  // ============================================================
  // BOUTON ÉTAPE SUIVANTE
  // ============================================================
  document.getElementById('formation-next-btn')?.addEventListener('click', async function () {
    document.querySelectorAll('.field-error-msg').forEach(m => m.remove());
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    if (!validateForm()) return;

    const btn = this;
    btn.disabled  = true;
    btn.innerHTML = 'Enregistrement… <span style="font-size:1.1em;">⏳</span>';

    const payload = {
      theme:              document.getElementById('formation-theme')?.value.trim(),
      icon_url:           document.getElementById('formation-icon-url')?.value.trim(),
      titre:              document.getElementById('formation-titre')?.value.trim(),
      cover_url:          document.getElementById('formation-cover-url')?.value.trim(),
      description:        document.getElementById('formation-description')?.value.trim(),
      prix_ht:            parseInt(document.getElementById('formation-prix')?.value) || 0,
      duree_minutes:      parseInt(document.getElementById('formation-duree')?.value) || 0,
      nb_modules:         parseInt(document.getElementById('formation-modules')?.value) || 0,
      competences:        JSON.parse(document.getElementById('competences-hidden')?.value || '[]'),
      description_longue: document.getElementById('formation-desc-longue-hidden')?.value,
      formateur:          document.getElementById('formation-formateur')?.value.trim(),
      faq:                JSON.parse(document.getElementById('faq-hidden')?.value || '[]'),
    };

    window.triggerCreateCourse(
      payload, token,
      async function (course) {
        btn.innerHTML = '✅ Enregistré — chargement…';

        window._newCourseId = course.id;

        await new Promise(resolve => setTimeout(resolve, 800));
        try {
          const meRes = await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data', {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            const currentAuth = JSON.parse(localStorage.getItem('auth') || '{}');
            localStorage.setItem('auth', JSON.stringify(Object.assign({}, currentAuth, meData)));
          }
        } catch(e) { console.warn('Refresh auth failed:', e); }

        ['step1-root','step1-title','step1-desc'].forEach(id => {
          document.getElementById(id)?.classList.remove('is-visible');
        });
        ['step2-title','step2-desc','step2-root'].forEach(id => {
          document.getElementById(id)?.classList.add('is-visible');
        });

        setTimeout(() => {
          if (typeof window.initCourseBuilder === 'function') window.initCourseBuilder();
          document.getElementById('step2-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);

        btn.disabled  = false;
        btn.innerHTML = '✅ Enregistré !';
      },
      function (errMsg) {
        alert(errMsg);
        btn.disabled  = false;
        btn.innerHTML = 'Étape suivante — Chapitres & modules <span style="font-size:1.1em;">→</span>';
      }
    );
  });

}; // fin initCourseStep1


// ============================================================
// dr-course-step2.js
// ============================================================

window.initCourseBuilder = function () {

  const VIMEO_UPLOAD_URL   = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/vimeo_upload';
  const VIMEO_DELETE_URL   = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/vimeo_delete';
  const VIMEO_FINALIZE_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/vimeo_finalize';
  const VIMEO_STATUS_URL   = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/vimeo_status';
  const CHUNK_SIZE         = 5 * 1024 * 1024;
  const POLL_INTERVAL_MS   = 4000;
  const POLL_MAX_ATTEMPTS  = 60;

  const auth     = JSON.parse(localStorage.getItem('auth') || 'null');
  const token    = auth?.token;

  const courses  = auth?.freelance?.course_draft;
  const courseId = window._newCourseId
    || ((Array.isArray(courses) && courses.length > 0) ? courses[0].id : null);

  if (window._newCourseId) window._newCourseId = null;

  let chapters = [];

  function showToast(msg, duration = 2800) {
    const t = document.getElementById('builder-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  }

  async function vimeoDelete(vimeoUri) {
    if (!vimeoUri) return;
    try {
      await fetch(VIMEO_DELETE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ vimeo_uri: vimeoUri }),
      });
    } catch (e) { console.warn('vimeoDelete failed:', e); }
  }

  let _cb = null;
  function showConfirm(htmlMsg, onConfirm) {
    _cb = onConfirm;
    const el = document.getElementById('confirm-modal-text');
    if (el) el.innerHTML = htmlMsg;
    document.getElementById('confirm-modal')?.classList.add('active');
  }
  document.getElementById('confirm-ok')?.addEventListener('click', () => {
    document.getElementById('confirm-modal')?.classList.remove('active');
    if (_cb) { _cb(); _cb = null; }
  });
  ['confirm-cancel', 'confirm-cancel-x'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      document.getElementById('confirm-modal')?.classList.remove('active');
      _cb = null;
    });
  });

  function uid()    { return 'ch-'  + Math.random().toString(36).slice(2, 9); }
  function modUid() { return 'mod-' + Math.random().toString(36).slice(2, 11) + '-' + Date.now().toString(36); }
  function toSlug(str) {
    return (str || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  }
  function isValidDuration(val) { return /^\d{1,3}:\d{2}$/.test(val.trim()); }
  function durationToSec(val) {
    if (!val || !isValidDuration(val)) return 0;
    const [m, s] = val.trim().split(':').map(Number);
    return m * 60 + s;
  }
  function secToDisplay(sec) {
    if (!sec) return '0 min';
    const m = Math.floor(sec / 60), s = sec % 60;
    return s ? `${m}m ${s}s` : `${m} min`;
  }
  function hasActiveUpload() {
    return chapters.some(ch => ch.modules.some(m => m.upload_status === 'uploading'));
  }
  function recomputeOrders() {
    chapters.forEach((ch, ci) => {
      ch.chapter_order = ci;
      ch.modules.forEach((m, mi) => { m.module_order = mi; });
    });
  }
  function chapterDurationSec(ch) {
    return ch.modules.reduce((acc, m) => acc + durationToSec(m.duration), 0);
  }
  function refreshChapterMeta(chId) {
    const ch = chapters.find(c => c._id === chId);
    if (!ch) return;
    const durEl = document.querySelector(`[data-ch-dur="${chId}"]`);
    const modEl = document.querySelector(`[data-ch-mod="${chId}"]`);
    if (durEl) durEl.textContent = '⏱ ' + secToDisplay(chapterDurationSec(ch));
    if (modEl) modEl.textContent = '📚 ' + ch.modules.length + ' module' + (ch.modules.length !== 1 ? 's' : '');
  }
  function updateTotals() {
    let totalMods = 0, totalSec = 0;
    chapters.forEach(ch => { totalMods += ch.modules.length; totalSec += chapterDurationSec(ch); });
    const inMods = document.getElementById('input-total-modules');
    const inDur  = document.getElementById('input-total-duration');
    if (inMods) inMods.value = totalMods;
    if (inDur)  inDur.value  = totalSec;
  }

  function makeChapter(title = '', isIntro = false) {
    return { _id: uid(), title, chapter_order: 0, isIntro, modules: [] };
  }
  function makeModule(opts = {}) {
    return {
      _id:            uid(),
      module_temp_id: modUid(),
      title:          opts.title        || '',
      slug:           opts.slug         || '',
      duration:       opts.duration     || '',
      module_order:   opts.module_order || 0,
      upload_status:  'idle',
      vimeo_uri:      null,
      file:           null,
      is_required:    opts.is_required  || false,
    };
  }

  function initChapter0() {
    const ch0 = makeChapter('Introduction', true);
    ch0._id = 'chapter-0';
    ch0.modules = [
      makeModule({ title: 'Présentation de la formation', is_required: true }),
      makeModule({ title: 'Présentation du formateur',    is_required: true }),
      makeModule({ title: 'Plan de la formation',         is_required: true }),
    ];
    ch0.modules.forEach((m, i) => { m.module_order = i; });
    chapters.push(ch0);
  }

  if (window._draftRestore && window._draftRestore.length > 0) {
    chapters = window._draftRestore;
    window._draftRestore = null;
  } else {
    initChapter0();
  }
  render();

  function render() {
    recomputeOrders();
    const list = document.getElementById('chapter-list');
    if (!list) return;
    list.innerHTML = '';
    chapters.forEach((ch, ci) => list.appendChild(buildChapterEl(ch, ci)));
    initDragChapters();
    updateTotals();
  }

  function buildChapterEl(ch, ci) {
    const card = document.createElement('div');
    card.className = 'chapter-card';
    card.dataset.chapterId = ch._id;

    const header = document.createElement('div');
    header.className = 'chapter-header';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'chapter-drag-handle' + (ch.isIntro ? ' disabled' : '');
    dragHandle.innerHTML = '⠿';
    if (!ch.isIntro) {
      dragHandle.setAttribute('draggable', 'true');
      dragHandle.addEventListener('mousedown', () => card.setAttribute('draggable', 'true'));
      dragHandle.addEventListener('mouseup',   () => card.setAttribute('draggable', 'false'));
    }
    header.appendChild(dragHandle);

    const badge = document.createElement('span');
    badge.className = 'chapter-badge';
    badge.textContent = ch.isIntro ? 'CHAPITRE 0 — INTRO' : `CHAPITRE ${ci}`;
    header.appendChild(badge);

    const titleInput = document.createElement('input');
    titleInput.type = 'text'; titleInput.className = 'chapter-title-input';
    titleInput.value = ch.title; titleInput.disabled = ch.isIntro;
    titleInput.placeholder = 'Titre du chapitre…';
    titleInput.addEventListener('input', () => { ch.title = titleInput.value; });
    header.appendChild(titleInput);

    const meta = document.createElement('div');
    meta.className = 'chapter-meta';
    const modCountEl = document.createElement('div');
    modCountEl.className = 'chapter-meta-item';
    modCountEl.dataset.chMod = ch._id;
    modCountEl.textContent = '📚 ' + ch.modules.length + ' module' + (ch.modules.length !== 1 ? 's' : '');
    meta.appendChild(modCountEl);
    const durEl = document.createElement('div');
    durEl.className = 'chapter-meta-item';
    durEl.dataset.chDur = ch._id;
    durEl.textContent = '⏱ ' + secToDisplay(chapterDurationSec(ch));
    meta.appendChild(durEl);
    header.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'chapter-actions';
    if (!ch.isIntro) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete-chapter';
      delBtn.innerHTML = '🗑'; delBtn.title = 'Supprimer ce chapitre';
      delBtn.addEventListener('click', () => {
        if (hasActiveUpload()) { showToast('⚠️ Upload en cours — attendez la fin.'); return; }
        showConfirm(`Supprimer "<strong>${ch.title || 'sans titre'}</strong>" et tous ses modules ?`,
          () => { chapters = chapters.filter(c => c._id !== ch._id); render(); });
      });
      actions.appendChild(delBtn);
    }
    header.appendChild(actions);
    card.appendChild(header);

    const modList = document.createElement('div');
    modList.className = 'modules-list';
    modList.dataset.chapterId = ch._id;

    if (ch.isIntro) {
      ch.modules.slice(0, 2).forEach((m, mi) => modList.appendChild(buildModuleEl(m, ch, mi)));
      modList.appendChild(buildBonusSection(ch));
      if (ch.modules.length >= 3) {
        modList.appendChild(buildModuleEl(ch.modules[ch.modules.length - 1], ch, ch.modules.length - 1));
      }
    } else {
      ch.modules.forEach((m, mi) => modList.appendChild(buildModuleEl(m, ch, mi)));
    }
    card.appendChild(modList);

    if (!ch.isIntro) {
      const addRow = document.createElement('div');
      addRow.className = 'btn-add-module-row';
      const addBtn = document.createElement('button');
      addBtn.className = 'btn-add-module-main';
      addBtn.textContent = '+ Ajouter un module';
      addBtn.addEventListener('click', () => {
        const newMod = makeModule({ module_order: ch.modules.length });
        ch.modules.push(newMod);
        render();
        setTimeout(() => {
          const el = document.querySelector(`[data-module-id="${newMod._id}"]`);
          if (el) { el.classList.add('open'); el.querySelector('.module-body').style.display = 'flex'; }
        }, 50);
      });
      addRow.appendChild(addBtn);
      card.appendChild(addRow);
    }
    return card;
  }

  function buildBonusSection(ch) {
    const section = document.createElement('div');
    section.className = 'bonus-section';
    const label = document.createElement('div');
    label.className = 'bonus-label';
    label.textContent = 'Modules bonus (optionnels)';
    section.appendChild(label);
    const bonusMods = ch.modules.slice(2, ch.modules.length > 3 ? ch.modules.length - 1 : 2);
    bonusMods.forEach((m, bi) => section.appendChild(buildModuleEl(m, ch, bi + 2)));
    const actRow = document.createElement('div');
    actRow.className = 'bonus-actions';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add-bonus';
    addBtn.textContent = '+ Ajouter un module bonus';
    addBtn.addEventListener('click', () => {
      const newMod = makeModule({ is_required: false });
      ch.modules.splice(ch.modules.length - 1, 0, newMod);
      render();
      setTimeout(() => {
        const el = document.querySelector(`[data-module-id="${newMod._id}"]`);
        if (el) { el.classList.add('open'); el.querySelector('.module-body').style.display = 'flex'; }
      }, 50);
    });
    actRow.appendChild(addBtn);
    const exBtn = document.createElement('button');
    exBtn.className = 'btn-see-examples';
    exBtn.textContent = '💡 Voir des exemples';
    exBtn.addEventListener('click', () => document.getElementById('popup-bonus-examples')?.classList.add('active'));
    actRow.appendChild(exBtn);
    section.appendChild(actRow);
    const hint = document.createElement('div');
    hint.className = 'bonus-hint';
    hint.textContent = 'Ajoutez des modules qui donnent envie de suivre la formation.';
    section.appendChild(hint);
    return section;
  }

  function buildModuleEl(mod, ch, mi) {
    const item = document.createElement('div');
    item.className = 'module-item' + (mod.is_required ? ' is-required' : '');
    item.dataset.moduleId = mod._id;
    if (mod.upload_status === 'uploading') item.classList.add('locked-upload');

    const header = document.createElement('div');
    header.className = 'module-header';
    const dragHandle = document.createElement('span');
    const canDrag = !mod.is_required && mod.upload_status !== 'uploading';
    dragHandle.className = 'module-drag-handle' + (canDrag ? '' : ' disabled');
    dragHandle.innerHTML = '⠿';
    if (canDrag) {
      dragHandle.setAttribute('draggable', 'true');
      dragHandle.addEventListener('mousedown', () => item.setAttribute('draggable', 'true'));
      dragHandle.addEventListener('mouseup',   () => item.setAttribute('draggable', 'false'));
    }
    header.appendChild(dragHandle);
    const badge = document.createElement('div');
    badge.className = 'module-order-badge';
    badge.textContent = mi + 1;
    header.appendChild(badge);
    const titleDisplay = document.createElement('div');
    titleDisplay.className = 'module-title-display' + (mod.title ? '' : ' empty');
    titleDisplay.textContent = mod.title || 'Titre du module…';
    header.appendChild(titleDisplay);

    // ✅ FIX 1 : badge "Obligatoire" toujours affiché, ET badge statut upload en plus
    if (mod.is_required) {
      const requiredPill = document.createElement('span');
      requiredPill.className = 'module-status-pill status-required';
      requiredPill.textContent = 'Obligatoire';
      header.appendChild(requiredPill);
    }
    const pill = document.createElement('span');
    setPill(pill, mod);
    header.appendChild(pill);

    const chevron = document.createElement('span');
    chevron.className = 'module-chevron'; chevron.innerHTML = '▼';
    header.appendChild(chevron);

    const body = document.createElement('div');
    body.className = 'module-body';

    header.addEventListener('click', () => {
      item.classList.toggle('open');
      body.style.display = item.classList.contains('open') ? 'flex' : 'none';
    });
    item.appendChild(header);

    const titleSection = document.createElement('div');
    titleSection.className = 'module-title-section';
    const titleField = document.createElement('div');
    titleField.className = 'module-field';
    const titleLabel = document.createElement('label');
    titleLabel.className = 'module-label'; titleLabel.textContent = 'Titre du module';
    const titleInput = document.createElement('input');
    titleInput.type = 'text'; titleInput.className = 'module-input';
    titleInput.value = mod.title; titleInput.disabled = mod.is_required;
    titleInput.placeholder = 'Ex : Introduction au référencement naturel';
    titleInput.addEventListener('input', () => {
      mod.title = titleInput.value;
      mod.slug  = toSlug(titleInput.value);
      titleDisplay.textContent = mod.title || 'Titre du module…';
      titleDisplay.className   = 'module-title-display' + (mod.title ? '' : ' empty');
    });
    if (!mod.slug && mod.title) mod.slug = toSlug(mod.title);
    titleField.appendChild(titleLabel);
    titleField.appendChild(titleInput);
    titleSection.appendChild(titleField);
    body.appendChild(titleSection);

    const grid = document.createElement('div');
    grid.className = 'module-grid';
    const colLeft = document.createElement('div');
    colLeft.className = 'module-col-left';
    const durField = document.createElement('div');
    durField.className = 'module-field';
    const durLabel = document.createElement('label');
    durLabel.className = 'module-label'; durLabel.textContent = 'Durée de la vidéo';
    const durInput = document.createElement('input');
    durInput.type = 'text'; durInput.className = 'module-input dur-input';
    durInput.value = mod.duration; durInput.placeholder = '00:00';
    const durErrMsg = document.createElement('span');
    durErrMsg.className = 'dur-error-msg';
    durErrMsg.textContent = 'Format invalide — ex: 12:34';
    durInput.addEventListener('input', () => { durInput.classList.remove('error'); durErrMsg.classList.remove('visible'); });
    durInput.addEventListener('blur', () => {
      const v = durInput.value.trim();
      if (v && !isValidDuration(v)) { durInput.classList.add('error'); durErrMsg.classList.add('visible'); }
      else { durInput.classList.remove('error'); durErrMsg.classList.remove('visible'); mod.duration = v; refreshChapterMeta(ch._id); updateTotals(); }
    });
    durField.appendChild(durLabel); durField.appendChild(durInput); durField.appendChild(durErrMsg);
    colLeft.appendChild(durField);
    grid.appendChild(colLeft);
    const colRight = document.createElement('div');
    colRight.className = 'module-col-right';
    colRight.appendChild(buildUploadZone(mod, ch, pill));
    grid.appendChild(colRight);
    body.appendChild(grid);

    const actRow = document.createElement('div');
    actRow.className = 'module-actions-row';
    if (!mod.is_required) {
      const delBtn = document.createElement('button');
      delBtn.className = 'module-delete-btn';
      delBtn.innerHTML = '🗑 Supprimer ce module';
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (mod.upload_status === 'uploading') { showToast('⚠️ Upload en cours.'); return; }
        showConfirm(`Supprimer "<strong>${mod.title || 'sans titre'}</strong>" ?`, () => {
          if (mod.vimeo_uri) vimeoDelete(mod.vimeo_uri);
          ch.modules = ch.modules.filter(m => m._id !== mod._id);
          render();
        });
      });
      actRow.appendChild(delBtn);
    } else {
      const note = document.createElement('span');
      note.className = 'module-fixed-note';
      note.textContent = 'Module obligatoire — non supprimable';
      actRow.appendChild(note);
    }
    body.appendChild(actRow);
    item.appendChild(body);
    return item;
  }

  // ✅ FIX 1 : setPill n'affiche plus "Obligatoire" — c'est géré séparément dans buildModuleEl
  // Il affiche toujours le statut upload, même pour les modules obligatoires
  function setPill(pill, mod) {
    const map = {
      idle:      ['status-idle',      'En attente'],
      uploading: ['status-uploading', 'Upload…'],
      checking:  ['status-checking',  'Vérification…'],
      uploaded:  ['status-uploaded',  '✅ Prêt'],
      error:     ['status-error',     '❌ Erreur'],
    };
    const [cls, txt] = map[mod.upload_status] || map.idle;
    pill.className = 'module-status-pill ' + cls;
    pill.textContent = txt;
  }

  function buildUploadZone(mod, ch, pill) {
    const zone = document.createElement('div');
    zone.className = 'upload-zone' + (mod.vimeo_uri ? ' has-video' : '');
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'video/*'; fileInput.style.display = 'none';
    zone.appendChild(fileInput);

    if (mod.vimeo_uri) {
      // ✅ FIX 2 : si le statut est "checking", on affiche un message d'attente
      // au lieu d'essayer de charger le player Vimeo (qui n'est pas encore prêt)
      if (mod.upload_status === 'checking') {
        const waitMsg = document.createElement('div');
        waitMsg.style.cssText = 'padding:16px;text-align:center;font-size:.78rem;color:#7c3aed;font-weight:500;';
        waitMsg.innerHTML = '⏳ Transcodage en cours… la vidéo sera disponible dans quelques instants.';
        zone.appendChild(waitMsg);
      } else {
        zone.appendChild(buildPlayer(mod.vimeo_uri));
      }
      const replaceBtn = document.createElement('button');
      replaceBtn.className = 'upload-file-btn';
      replaceBtn.style.cssText = 'font-size:.72rem;padding:6px 12px;margin-top:6px;width:100%;';
      replaceBtn.textContent = '↩️ Remplacer la vidéo';
      replaceBtn.addEventListener('click', () => fileInput.click());
      zone.appendChild(replaceBtn);
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0]; if (!file) return;
        const oldUri = mod.vimeo_uri; mod.vimeo_uri = null; mod.upload_status = 'idle'; mod.file = file;
        if (oldUri) vimeoDelete(oldUri);
        zone.innerHTML = ''; zone.classList.remove('has-video');
        const freshZone = buildUploadZone(mod, ch, pill);
        while (freshZone.firstChild) zone.appendChild(freshZone.firstChild);
        const freshInput = zone.querySelector('input[type=file]');
        if (freshInput) { const dt = new DataTransfer(); dt.items.add(file); freshInput.files = dt.files; freshInput.dispatchEvent(new Event('change')); }
      });
    } else {
      const btnRow = document.createElement('div'); btnRow.className = 'upload-btn-row';
      const uploadBtn = document.createElement('button'); uploadBtn.className = 'upload-file-btn'; uploadBtn.innerHTML = '🎬 Choisir une vidéo'; uploadBtn.disabled = mod.upload_status === 'uploading';
      uploadBtn.addEventListener('click', () => fileInput.click()); btnRow.appendChild(uploadBtn);
      const fileNameEl = document.createElement('span'); fileNameEl.className = 'upload-filename'; fileNameEl.textContent = 'Aucun fichier sélectionné'; btnRow.appendChild(fileNameEl);
      zone.appendChild(btnRow);
      const progressBar = document.createElement('div'); progressBar.className = 'upload-progress-bar'; progressBar.style.display = 'none';
      const progressFill = document.createElement('div'); progressFill.className = 'upload-progress-fill'; progressBar.appendChild(progressFill); zone.appendChild(progressBar);
      const statusText = document.createElement('div'); statusText.className = 'upload-status-text'; zone.appendChild(statusText);
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0]; if (!file) return;
        mod.file = file; fileNameEl.textContent = file.name;
        startUpload(mod, ch, file, progressBar, progressFill, statusText, uploadBtn, zone, pill);
      });
    }
    return zone;
  }

  function buildPlayer(vimeoUri) {
    const vimeoId = vimeoUri.replace('/videos/', '');
    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&badge=0`;
    iframe.className = 'upload-vimeo-player'; iframe.allow = 'autoplay; fullscreen; picture-in-picture'; iframe.allowFullscreen = true;
    return iframe;
  }

  async function startUpload(mod, ch, file, progressBar, progressFill, statusText, uploadBtn, zone, pill) {
    if (!courseId) { showToast('⚠️ Course ID introuvable — rechargez la page.'); return; }
    if (mod.upload_status === 'uploading') return;
    mod.upload_status = 'uploading'; uploadBtn.disabled = true; progressBar.style.display = 'block';
    progressFill.style.width = '0%'; progressFill.className = 'upload-progress-fill'; statusText.textContent = 'Préparation…'; setPill(pill, mod);
    try {
      const initRes = await fetch(VIMEO_UPLOAD_URL, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body:JSON.stringify({course_id:courseId,module_temp_id:mod.module_temp_id,file_name:file.name,file_size:file.size}) });
      if (!initRes.ok) throw new Error('Erreur création slot Vimeo (' + initRes.status + ')');
      const { upload_link, vimeo_uri } = await initRes.json();
      statusText.textContent = 'Upload… 0%';
      await tusUpload(file, upload_link, pct => { progressFill.style.width = Math.round(pct*0.8)+'%'; statusText.textContent = 'Upload… '+pct+'%'; });
      progressFill.style.width = '80%';
      statusText.textContent = 'Finalisation…';
      const finalRes = await fetch(VIMEO_FINALIZE_URL, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body:JSON.stringify({vimeo_uri,module_temp_id:mod.module_temp_id}) });
      if (!finalRes.ok) throw new Error('Erreur finalisation (' + finalRes.status + ')');
      progressFill.style.width = '85%';
      mod.vimeo_uri = vimeo_uri; mod.upload_status = 'checking'; setPill(pill, mod);
      await pollVimeoStatus(vimeo_uri, mod.module_temp_id, statusText, progressFill, mod, ch, zone, pill);
      mod.upload_status = 'uploaded'; setPill(pill, mod); refreshChapterMeta(ch._id);
      zone.innerHTML = ''; zone.classList.add('has-video');
      const newFileInput = document.createElement('input'); newFileInput.type='file'; newFileInput.accept='video/*'; newFileInput.style.display='none'; zone.appendChild(newFileInput);
      zone.appendChild(buildPlayer(vimeo_uri));
      const replBtn = document.createElement('button'); replBtn.className='upload-file-btn'; replBtn.style.cssText='font-size:.72rem;padding:6px 12px;margin-top:6px;width:100%;'; replBtn.textContent='↩️ Remplacer la vidéo'; replBtn.addEventListener('click',()=>newFileInput.click()); zone.appendChild(replBtn);
      newFileInput.addEventListener('change', () => {
        const file = newFileInput.files[0]; if (!file) return;
        const oldUri = mod.vimeo_uri; if (oldUri) vimeoDelete(oldUri);
        mod.vimeo_uri=null; mod.upload_status='idle';
        zone.innerHTML=''; zone.classList.remove('has-video');
        const freshZone=buildUploadZone(mod,ch,pill); while(freshZone.firstChild) zone.appendChild(freshZone.firstChild);
        const freshInput=zone.querySelector('input[type=file]');
        if(freshInput){const dt=new DataTransfer();dt.items.add(file);freshInput.files=dt.files;freshInput.dispatchEvent(new Event('change'));}
      });
      showToast('✅ Vidéo uploadée avec succès !');
    } catch(err) {
      mod.upload_status='error'; progressFill.style.width='100%'; progressFill.classList.add('error');
      statusText.textContent='❌ '+err.message; uploadBtn.disabled=false; uploadBtn.textContent='↩️ Réessayer'; setPill(pill,mod);
    }
  }

  async function pollVimeoStatus(vimeoUri, moduleTempId, statusText, progressFill, mod, ch, zone, pill) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(VIMEO_STATUS_URL+'?vimeo_uri='+encodeURIComponent(vimeoUri), {method:'GET',headers:{'Authorization':'Bearer '+token}});
          if (!res.ok) { clearInterval(interval); reject(new Error('Erreur statut Vimeo')); return; }
          const data = await res.json();
          const isDone = (data.transcode==='complete' || data.transcode===true) && (data.playable===true || data.playable==='true');
          const isErr  = data.transcode==='error' || data.transcode===false;
          if (isDone) { clearInterval(interval); resolve(); }
          else if (isErr) { clearInterval(interval); reject(new Error('Transcodage Vimeo échoué')); }
          else {
            const liveItem = document.querySelector(`[data-module-id="${mod._id}"]`);
            const pct = Math.min(85+attempts*2,99);
            if (liveItem) { const lb=liveItem.querySelector('.upload-progress-fill'); const ls=liveItem.querySelector('.upload-status-text'); if(lb)lb.style.width=pct+'%'; if(ls)ls.textContent='Transcodage… '+pct+'%'; }
            else { progressFill.style.width=pct+'%'; statusText.textContent='Transcodage… '+pct+'%'; }
          }
        } catch(e) { clearInterval(interval); reject(e); }
        if (attempts>=POLL_MAX_ATTEMPTS) { clearInterval(interval); reject(new Error('Timeout transcodage (4 min)')); }
      }, POLL_INTERVAL_MS);
    });
  }

  async function tusUpload(file, uploadLink, onProgress) {
    let offset=0; const total=file.size;
    while (offset<total) {
      const chunk=file.slice(offset,offset+CHUNK_SIZE);
      const res=await fetch(uploadLink,{method:'PATCH',headers:{'Tus-Resumable':'1.0.0','Upload-Offset':String(offset),'Content-Type':'application/offset+octet-stream','Content-Length':String(chunk.size)},body:chunk});
      if (!res.ok && res.status!==204) throw new Error('TUS PATCH échoué (offset '+offset+')');
      offset+=chunk.size;
      if (onProgress) onProgress(Math.min(Math.round((offset/total)*100),99));
    }
  }

  function initDragChapters() {
    const list=document.getElementById('chapter-list'); if(!list) return;
    let dragSrc=null;
    list.querySelectorAll('.chapter-card').forEach(card => {
      if (card.dataset.chapterId==='chapter-0') return;
      card.addEventListener('dragstart',e=>{if(hasActiveUpload()){e.preventDefault();showToast('⚠️ Upload en cours.');return;}dragSrc=card;card.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
      card.addEventListener('dragend',()=>{card.classList.remove('dragging');list.querySelectorAll('.chapter-card').forEach(c=>c.classList.remove('drag-over'));card.setAttribute('draggable','false');const newOrder=[];list.querySelectorAll('.chapter-card').forEach(c=>{const found=chapters.find(ch=>ch._id===c.dataset.chapterId);if(found)newOrder.push(found);});chapters=newOrder;render();});
      card.addEventListener('dragover',e=>{e.preventDefault();if(!dragSrc||dragSrc===card||card.dataset.chapterId==='chapter-0')return;card.classList.add('drag-over');const mid=card.getBoundingClientRect().top+card.getBoundingClientRect().height/2;list.insertBefore(dragSrc,e.clientY<mid?card:card.nextSibling);});
      card.addEventListener('dragleave',()=>card.classList.remove('drag-over'));
    });
    list.querySelectorAll('.modules-list').forEach(ml=>initDragModules(ml));
  }

  function initDragModules(modList) {
    const ch=chapters.find(c=>c._id===modList.dataset.chapterId); if(!ch) return;
    let dragSrc=null;
    modList.querySelectorAll('.module-item').forEach(item=>{
      item.addEventListener('dragstart',e=>{const mod=ch.modules.find(m=>m._id===item.dataset.moduleId);if(!mod||mod.is_required||mod.upload_status==='uploading'){e.preventDefault();return;}dragSrc=item;item.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
      item.addEventListener('dragend',()=>{item.classList.remove('dragging');modList.querySelectorAll('.module-item').forEach(i=>i.classList.remove('drag-over'));item.setAttribute('draggable','false');const newOrder=[];modList.querySelectorAll('.module-item').forEach(i=>{const found=ch.modules.find(m=>m._id===i.dataset.moduleId);if(found)newOrder.push(found);});ch.modules=newOrder;render();});
      item.addEventListener('dragover',e=>{e.preventDefault();if(!dragSrc||dragSrc===item)return;const mod=ch.modules.find(m=>m._id===item.dataset.moduleId);if(mod?.is_required)return;item.classList.add('drag-over');const mid=item.getBoundingClientRect().top+item.getBoundingClientRect().height/2;modList.insertBefore(dragSrc,e.clientY<mid?item:item.nextSibling);});
      item.addEventListener('dragleave',()=>item.classList.remove('drag-over'));
    });
  }

  document.getElementById('btn-add-chapter-main')?.addEventListener('click', () => {
    const ch=makeChapter(); ch.modules.push(makeModule({module_order:0})); chapters.push(ch); render();
    setTimeout(()=>{const cards=document.querySelectorAll('.chapter-card');if(cards.length)cards[cards.length-1].scrollIntoView({behavior:'smooth',block:'start'});},80);
  });

  const SAVE_URL    = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/save_module_chapter';
  const PUBLISH_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/published_module_chapter';

  // ── RICH TEXT EDITOR — RESSOURCES ──
  (function initRessourcesEditor() {
    const editor   = document.getElementById('ressources-html');
    const hidden   = document.getElementById('ressources-html-hidden');
    const toolbar  = document.getElementById('ressources-rt-toolbar');
    const linkBtn  = document.getElementById('ressources-link-btn');
    const linkPopup= document.getElementById('ressources-link-popup');
    const linkText = document.getElementById('ressources-link-text');
    const linkUrl  = document.getElementById('ressources-link-url');
    const linkOk   = document.getElementById('ressources-link-confirm');
    const linkCx   = document.getElementById('ressources-link-cancel');
    if (!editor) return;

    editor.addEventListener('input', () => { if (hidden) hidden.value = editor.innerHTML; });
    editor.addEventListener('focus', () => editor.classList.add('rt-focused'));
    editor.addEventListener('blur',  () => editor.classList.remove('rt-focused'));

    toolbar?.querySelectorAll('.rt-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        document.execCommand(btn.dataset.cmd, false, null);
        editor.focus();
        if (hidden) hidden.value = editor.innerHTML;
      });
    });

    let savedRange = null;
    linkBtn?.addEventListener('click', e => {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        savedRange = sel.getRangeAt(0).cloneRange();
        linkText.value = sel.toString() || '';
      }
      linkUrl.value = '';
      linkPopup.style.display = 'block';
      linkUrl.focus();
    });

    linkCx?.addEventListener('click', () => { linkPopup.style.display = 'none'; editor.focus(); });

    linkOk?.addEventListener('click', () => {
      const txt = linkText.value.trim();
      const url = linkUrl.value.trim();
      if (!url) { linkPopup.style.display = 'none'; return; }
      linkPopup.style.display = 'none';
      editor.focus();
      if (savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
      const label = txt || url;
      document.execCommand('insertHTML', false,
        `<a href="${url}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline;">${label}</a>`
      );
      if (hidden) hidden.value = editor.innerHTML;
      savedRange = null;
    });

    [linkText, linkUrl].forEach(inp => inp?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); linkOk.click(); }
      if (e.key === 'Escape') { linkPopup.style.display = 'none'; editor.focus(); }
    }));
  })();

  function buildPayload() {
    recomputeOrders();
    const userId = auth?.user?.id || null;
    const chaptersPayload = chapters.map(ch=>({chapter_temp_id:ch._id,title:ch.title,slug:toSlug(ch.title),order_index:ch.chapter_order,duration:Math.ceil(chapterDurationSec(ch)/60),total_modules:ch.modules.length}));
    const modulesPayload=[];
    chapters.forEach(ch=>ch.modules.forEach(mod=>modulesPayload.push({chapter_temp_id:ch._id,module_temp_id:mod.module_temp_id,title:mod.title,slug:mod.slug||toSlug(mod.title),order_index:mod.module_order,duration_seconds:durationToSec(mod.duration),vimeo_video_uri:mod.vimeo_uri||null})));
    const ressourcesHtml = document.getElementById('ressources-html-hidden')?.value || '';
    return {course_id:courseId,user_id:userId,total_modules:modulesPayload.length,total_duration:chapters.reduce((acc,ch)=>acc+chapterDurationSec(ch),0),chapters:chaptersPayload,modules:modulesPayload,ressources_html:ressourcesHtml};
  }

  function validateForPublish() {
    const errors=[];
    if(chapters.length<2) errors.push("Ajoutez au moins 1 chapitre de contenu en plus de l'introduction");
    chapters.forEach((ch,ci)=>{
      const label=ch.isIntro?'Chapitre Introduction':`Chapitre ${ci}`;
      if(!ch.isIntro&&!ch.title.trim()) errors.push(`${label} : titre manquant`);
      if(!ch.isIntro&&ch.modules.length===0) errors.push(`${label} : aucun module`);
      ch.modules.forEach((mod,mi)=>{
        const modLabel=`${label} — Module ${mi+1} (${mod.title||'sans titre'})`;
        if(!mod.title.trim()) errors.push(`${modLabel} : titre manquant`);
        if(!mod.duration||!isValidDuration(mod.duration)) errors.push(`${modLabel} : durée manquante ou invalide`);
        if(!mod.vimeo_uri) errors.push(`${modLabel} : vidéo non uploadée`);
      });
    });
    return errors;
  }

  let _errInterval=null;
  function showValidationErrors(errors) {
    const existing=document.getElementById('publish-errors'); if(existing) existing.remove();
    if(_errInterval){clearInterval(_errInterval);_errInterval=null;}
    const box=document.createElement('div'); box.id='publish-errors';
    box.style.cssText='background:#fff1f2;border:1.5px solid #fca5a5;border-radius:12px;padding:16px 20px;font-family:DM Sans,sans-serif;font-size:.82rem;color:#b91c1c;line-height:1.7;';
    const title=document.createElement('div'); title.style.cssText='font-weight:700;margin-bottom:10px;font-size:.85rem;'; title.textContent='⚠️ Impossible de publier — corrigez ces erreurs :'; box.appendChild(title);
    const errorLines={};
    errors.forEach(err=>{
      const line=document.createElement('div'); line.style.cssText='display:flex;align-items:center;gap:8px;padding:2px 0;transition:opacity .3s;'; line.dataset.errKey=err;
      const icon=document.createElement('span'); icon.style.cssText='font-size:.85rem;flex-shrink:0;'; icon.textContent='•'; line.appendChild(icon);
      const txt=document.createElement('span'); txt.textContent=err; line.appendChild(txt);
      box.appendChild(line); errorLines[err]={line,icon,txt};
    });
    const bottom=document.getElementById('btn-publish')?.closest('.builder-bottom');
    if(bottom) bottom.insertAdjacentElement('beforebegin',box);
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
    _errInterval=setInterval(()=>{
      const remaining=validateForPublish();
      Object.entries(errorLines).forEach(([err,{line,icon,txt}])=>{
        const resolved=!remaining.includes(err);
        if(resolved){line.style.color='#15803d';icon.textContent='✅';line.style.opacity='0.6';line.style.textDecoration='line-through';}
        else{line.style.color='#b91c1c';icon.textContent='•';line.style.opacity='1';line.style.textDecoration='none';}
      });
      const stillLeft=remaining.length;
      if(stillLeft===0){title.textContent='✅ Toutes les erreurs sont corrigées — vous pouvez publier !';title.style.color='#15803d';box.style.background='#f0fdf4';box.style.borderColor='#86efac';clearInterval(_errInterval);_errInterval=null;setTimeout(()=>{box.remove();document.getElementById('btn-publish')?.click();},2000);}
      else{title.textContent=`⚠️ ${stillLeft} erreur${stillLeft>1?'s':''} restante${stillLeft>1?'s':''} :`;}
    },1500);
  }

  document.getElementById('btn-save-bottom')?.addEventListener('click', async () => {
    const btn=document.getElementById('btn-save-bottom'); btn.disabled=true; btn.textContent='💾 Sauvegarde…';
    try {
      const res=await fetch(SAVE_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(buildPayload())});
      if(!res.ok) throw new Error('Erreur serveur ('+res.status+')');
      await new Promise(resolve => setTimeout(resolve, 800));
      try {
        const meRes=await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data',{headers:{'Authorization':'Bearer '+token}});
        if(meRes.ok){const meData=await meRes.json();const cur=JSON.parse(localStorage.getItem('auth')||'{}');localStorage.setItem('auth',JSON.stringify(Object.assign({},cur,meData)));}
      } catch(e){console.warn('Refresh auth failed:',e);}
      showToast('💾 Brouillon sauvegardé !');
    } catch(err) { showToast('❌ Erreur sauvegarde : '+err.message,4000); }
    finally { btn.disabled=false; btn.textContent='💾 Sauvegarder brouillon'; }
  });

  document.getElementById('btn-publish')?.addEventListener('click', async () => {
    if(hasActiveUpload()){showToast('⚠️ Upload en cours — attendez avant de publier.');return;}
    const errors=validateForPublish();
    if(errors.length>0){if(!document.getElementById('publish-errors'))showValidationErrors(errors);return;}
    document.getElementById('publish-errors')?.remove();
    if(_errInterval){clearInterval(_errInterval);_errInterval=null;}
    const btn=document.getElementById('btn-publish'); btn.disabled=true; btn.textContent='🚀 Publication…';
    try {
      const res=await fetch(PUBLISH_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(buildPayload())});
      if(!res.ok) throw new Error('Erreur serveur ('+res.status+')');

      await new Promise(resolve => setTimeout(resolve, 800));
      try {
        const meRes=await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data',{headers:{'Authorization':'Bearer '+token}});
        if(meRes.ok){
          const meData=await meRes.json();
          const cur=JSON.parse(localStorage.getItem('auth')||'{}');
          localStorage.setItem('auth',JSON.stringify(Object.assign({},cur,meData)));

          ['step2-root','step2-title','step2-desc'].forEach(id => {
            document.getElementById(id)?.classList.remove('is-visible');
          });

          const publishedData = meData?.freelance?.course_published || [];
          if (typeof window.renderPublishedSection === 'function') {
            window.renderPublishedSection(publishedData);
          }
          document.getElementById('section-published')?.classList.add('is-visible');
          if (publishedData.length > 0) {
            document.getElementById('freelance--add-formation-submit-btn')?.classList.add('is-visible');
          }
        }
      } catch(e){console.warn('Refresh auth failed:',e);}

      document.getElementById('popup-publish-confirm')?.classList.add('active');

    } catch(err) { showToast('❌ Erreur publication : '+err.message,4000); }
    finally { btn.disabled=false; btn.textContent='🚀 Publier la formation'; }
  });

  document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>document.getElementById(btn.dataset.close)?.classList.remove('active')));
  document.querySelectorAll('.popup-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('active');}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.popup-overlay.active').forEach(p=>p.classList.remove('active'));});

};


// ============================================================
// ROUTING
// ============================================================

(function () {

  const auth      = JSON.parse(localStorage.getItem('auth') || 'null');
  const freelance = auth?.freelance;

  if (!freelance) {
    console.warn('[routing] Pas de données freelance dans auth.');
    return;
  }

  const courseDraft     = freelance.course_draft             || [];
  const coursePublished = freelance.course_published         || [];
  const draftData       = freelance.draft_item_by_course     || null;
  const publishedData   = freelance.course_published         || [];

  function show(id) { document.getElementById(id)?.classList.add('is-visible'); }
  function hide(id) { document.getElementById(id)?.classList.remove('is-visible'); }

  if (courseDraft.length === 0 && coursePublished.length === 0) {
    show('section-marketing');
    document.getElementById('btn-start-formation')?.addEventListener('click', () => {
      hide('section-marketing');
      show('step1-title');
      show('step1-desc');
      show('step1-root');
      window.initCourseStep1();
    });
    return;
  }

  if (courseDraft.length > 0) {
    if (draftData && draftData.chapters && draftData.course) {
      window._draftRestore = buildRestoreData(draftData);
    }
    show('step2-title');
    show('step2-desc');
    show('step2-root');
    window.initCourseBuilder();

    if (coursePublished.length > 0) {
      renderPublishedSection(publishedData);
      show('section-published');
    }
    return;
  }

  if (coursePublished.length > 0) {
    renderPublishedSection(publishedData);
    show('section-published');
    const addBtn = document.getElementById('freelance--add-formation-submit-btn');
    if (addBtn) {
      addBtn.classList.add('is-visible');
      addBtn.addEventListener('click', () => {
        hide('section-published');
        show('step1-title');
        show('step1-desc');
        show('step1-root');
        window.initCourseStep1();
      });
    }
    return;
  }

  function buildRestoreData(data) {
    const rawChapters = data.chapters || [];
    const rawModules  = data.course   || [];
    return [...rawChapters]
      .sort((a, b) => a.order_index - b.order_index)
      .map(ch => ({
        _id:           ch.chapter_temp_id,
        title:         ch.title       || '',
        chapter_order: ch.order_index || 0,
        isIntro:       ch.order_index === 0,
        modules: rawModules
          .filter(m => m.chapter_temp_id === ch.chapter_temp_id)
          .sort((a, b) => a.order_index - b.order_index)
          .map(m => ({
            _id:            m.module_temp_id,
            module_temp_id: m.module_temp_id,
            title:          m.title           || '',
            slug:           m.slug            || '',
            duration:       secToMmSs(m.duration_seconds || 0),
            module_order:   m.order_index     || 0,
            upload_status:  m.vimeo_video_uri ? 'uploaded' : 'idle',
            vimeo_uri:      m.vimeo_video_uri || null,
            file:           null,
            is_required:    ch.order_index === 0 && m.order_index <= 2,
          })),
      }));
  }

  function secToMmSs(sec) {
    if (!sec) return '';
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }

  function renderPublishedSection(publishedData) {
    const list = document.getElementById('pub-list');
    if (!list) return;
    list.innerHTML = '';
    if (!publishedData || publishedData.length === 0) {
      list.innerHTML = "<div class='pub-empty'>Aucune formation publiée pour l'instant.</div>";
      return;
    }
    publishedData.forEach(item => {
      const courseTitle    = item.title            || 'Formation sans titre';
      const coverUrl       = item.cover_url        || '';
      const iconUrl        = item.icon_cours_url   || '';
      const status         = item.status           || 'pending_validation';
      const totalMods      = item.modules_count    || 0;
      const totalDurMin    = item.duration_minutes || 0;
      const nbParticipants = item.nb_participants  || 0;
      const avgNote        = item.average_notation || 0;
      const nbNotes        = item.nb_notation      || 0;

      const statusLabel = status === 'published' ? '✅ Publié' : '⏳ En cours de validation';
      const statusClass = status === 'published' ? 'pub-badge-published' : 'pub-badge-pending';
      const ratingHtml  = nbNotes >= 1
        ? `<span class="pub-card-badge">⭐ ${Number(avgNote).toFixed(1)} (${nbNotes} avis)</span>`
        : '';

      const card = document.createElement('div');
      card.className = 'pub-card';
      card.innerHTML = `
        <div class="pub-card-cover">
          ${coverUrl ? `<img src="${esc(coverUrl)}" alt="" />` : '<div class="pub-cover-placeholder"></div>'}
        </div>
        <div class="pub-card-info">
          <div class="pub-card-header">
            ${iconUrl ? `<img class="pub-card-icon" src="${esc(iconUrl)}" alt="" />` : ''}
            <div class="pub-card-title">${esc(courseTitle)}</div>
          </div>
          <div class="pub-card-meta">
            <span class="pub-card-badge ${statusClass}">${statusLabel}</span>
            <span class="pub-card-badge">📚 ${totalMods} module${totalMods !== 1 ? 's' : ''}</span>
            <span class="pub-card-badge">⏱ ${totalDurMin} min</span>
            <span class="pub-card-badge">👥 ${nbParticipants} participant${nbParticipants !== 1 ? 's' : ''}</span>
            ${ratingHtml}
          </div>
        </div>
        <div class="pub-card-actions">
          <button class="pub-btn-edit" data-course-id="${item.id}">✏️ Modifier</button>
        </div>`;
      card.querySelector('.pub-btn-edit').addEventListener('click', () => {
        if (typeof window.openCourseEdit === 'function') window.openCourseEdit(item);
      });
      list.appendChild(card);
    });
  }
  window.renderPublishedSection = renderPublishedSection;

  function esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

})();

// ============================================================
// POP-UP CONFIRMATION PUBLICATION
// ============================================================
(function() {
  const popup = document.createElement('div');
  popup.id = 'popup-publish-confirm';
  popup.className = 'popup-overlay';
  popup.innerHTML = `
    <div class="popup-box publish-confirm-box">
      <div class="publish-confirm-icon">🎉</div>
      <h3 class="publish-confirm-title">Formation soumise avec succès !</h3>
      <p class="publish-confirm-msg">
        Merci d'avoir publié une formation sur notre plateforme.<br>
        Celle-ci est en cours de validation par nos équipes.<br>
        <strong>Cela peut prendre jusqu'à 24h.</strong>
      </p>
      <button class="publish-confirm-btn" id="btn-publish-confirm-close">C'est compris !</button>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('btn-publish-confirm-close')?.addEventListener('click', () => {
    popup.classList.remove('active');
  });
  popup.addEventListener('click', e => {
    if (e.target === popup) popup.classList.remove('active');
  });
})();

// ============================================================
// BOUTON ABANDONNER LA FORMATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btn-delete-draft')?.addEventListener('click', () => {
    document.getElementById('popup-delete-draft')?.classList.add('active');
  });

  document.getElementById('btn-delete-draft-cancel')?.addEventListener('click', () => {
    document.getElementById('popup-delete-draft')?.classList.remove('active');
  });

  document.getElementById('btn-delete-draft-confirm')?.addEventListener('click', async () => {
    const popup      = document.getElementById('popup-delete-draft');
    const confirmBtn = document.getElementById('btn-delete-draft-confirm');
    confirmBtn.disabled    = true;
    confirmBtn.textContent = 'Suppression…';

    const auth     = JSON.parse(localStorage.getItem('auth') || 'null');
    const token    = auth?.token;
    const courses  = auth?.freelance?.course_draft;
    const courseId = window._newCourseId
      || (Array.isArray(courses) && courses.length > 0 ? courses[0].id : null);

    try {
      const res = await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/delate_course_drafted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ course_id: courseId }),
      });
      if (!res.ok) throw new Error('Erreur serveur (' + res.status + ')');

      popup?.classList.remove('active');

      await new Promise(resolve => setTimeout(resolve, 800));
      const meRes = await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!meRes.ok) throw new Error('Refresh failed');
      const meData = await meRes.json();
      const cur = JSON.parse(localStorage.getItem('auth') || '{}');
      localStorage.setItem('auth', JSON.stringify(Object.assign({}, cur, meData)));

      ['step2-root','step2-title','step2-desc'].forEach(id => {
        document.getElementById(id)?.classList.remove('is-visible');
      });

      const freshPublished = meData?.freelance?.course_published || [];
      if (freshPublished.length > 0) {
        if (typeof window.renderPublishedSection === 'function') {
          window.renderPublishedSection(freshPublished);
        }
        document.getElementById('section-published')?.classList.add('is-visible');
        document.getElementById('freelance--add-formation-submit-btn')?.classList.add('is-visible');
      } else {
        document.getElementById('section-marketing')?.classList.add('is-visible');
      }

    } catch(err) {
      alert('Erreur : ' + err.message);
      confirmBtn.disabled    = false;
      confirmBtn.textContent = 'Oui, supprimer';
    }
  });
});
