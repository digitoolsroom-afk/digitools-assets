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

  // ============================================================
  // ROUTING — vérifie le statut de la formation au chargement
  // ============================================================
  (function checkCourseStatus() {
    const courses = auth?.freelance?.course;
    const course  = Array.isArray(courses) && courses.length > 0 ? courses[0] : null;
    if (!course) return; // pas encore de formation → étape 1 normale

    const s1 = document.getElementById('step1-root');
    const s2 = document.getElementById('step2-root');

    if (course.status === 'published') {
      // Formation publiée → masquer les deux étapes, afficher message
      if (s1) s1.style.display = 'none';
      if (s2) s2.style.cssText = 'display:none!important;';
      const msg = document.createElement('div');
      msg.style.cssText = 'padding:40px 20px;text-align:center;font-family:"DM Sans",sans-serif;color:#111;';
      msg.innerHTML = '<p style="font-size:1.1rem;font-weight:700;margin-bottom:8px;">✅ Formation déjà publiée</p><p style="font-size:0.85rem;color:#555;">Rendez-vous dans votre espace freelance pour la gérer.</p>';
      if (s1) s1.insertAdjacentElement('afterend', msg);
      return;
    }

    if (course.status === 'draft') {
      // Formation en brouillon → aller directement à l'étape 2
      if (s1) s1.style.display = 'none';
      if (s2) s2.style.cssText = 'display:flex!important;flex-direction:column;gap:12px;';
      if (typeof window.initCourseBuilder === 'function') {
        window.initCourseBuilder();
      }
      return;
    }
  })();

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
          // Masque étape 1, affiche étape 2
          const step1Root = document.getElementById('step1-root');
          const step2Root = document.getElementById('step2-root');
          if (step1Root) step1Root.style.display = 'none';
          if (step2Root) {
            step2Root.style.removeProperty('display');
            step2Root.style.cssText = 'display:flex!important;flex-direction:column;gap:12px;';
            step2Root.scrollIntoView({ behavior: 'smooth', block: 'start' });
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




















