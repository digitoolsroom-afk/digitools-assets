/* ============================================================
   dr-article-form.js
   ============================================================ */
(function () {

  const UPLOAD_URL  = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof';
  const ADD_RES_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:5QivUixX/add_ressources_blog';
  const DRAFT_URL   = 'https://xmot-l3ir-7kuj.p7.xano.io/api:5QivUixX/draft_article';
  const REFRESH_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data';
  const XANO_BASE   = 'https://xmot-l3ir-7kuj.p7.xano.io';

  const CATEGORIES = [
    {id:1,  name:'Développement & Tech',      emoji:'💻'},
    {id:2,  name:'Design & Créativité',        emoji:'🎨'},
    {id:3,  name:'Marketing & Croissance',     emoji:'📈'},
    {id:4,  name:'Réseaux sociaux & Contenu',  emoji:'📱'},
    {id:5,  name:'Business & Entrepreneuriat', emoji:'💼'},
    {id:6,  name:'Data & IA',                  emoji:'🤖'},
    {id:7,  name:'E-commerce & Vente',         emoji:'🛒'},
    {id:8,  name:'Outils & Productivité',      emoji:'⚙️'},
    {id:9,  name:'Juridique & Finance',        emoji:'⚖️'},
    {id:10, name:'Formation & Pédagogie',      emoji:'🎓'},
  ];

  /* ── Auth helpers ── */
  function getAuth()       { return JSON.parse(localStorage.getItem('auth') || 'null'); }
  function getToken()      { return getAuth()?.token || ''; }
  function getFreelanceId(){ return getAuth()?.freelance?.profile?.id || getAuth()?.freelance?.id || 0; }

  /* ── Section visibility ── */
  const section    = document.getElementById('section-article-form');
  const mktSection = document.getElementById('section-article-marketing');
  const mktTopline = document.getElementById('art-mkt-topline');
  if (!section) return;

  function resetForm() {
    const titleEl = document.getElementById('af-title');
    const shortEl = document.getElementById('af-short-description');
    const corpEl  = document.getElementById('af-corp-text');
    const corpH   = document.getElementById('af-corp-text-hidden');
    const urlImg  = document.getElementById('af-url-img');
    const catSel  = document.getElementById('af-category-select');
    const catIn   = document.getElementById('af-category-id');
    if (titleEl) titleEl.value = '';
    if (shortEl) shortEl.value = '';
    if (corpEl)  corpEl.innerHTML = '';
    if (corpH)   corpH.value = '';
    if (urlImg)  urlImg.value = '';
    if (catSel)  catSel.value = '';
    if (catIn)   catIn.value = '';
    duration = 60;
    if (durNum)    durNum.textContent = 60;
    if (durHidden) durHidden.value = 60;
    const prev = document.getElementById('af-img-preview');
    const ph   = document.getElementById('af-img-placeholder');
    const stat = document.getElementById('af-img-status');
    if (prev) { prev.src = ''; prev.style.display = 'none'; }
    if (ph)   ph.style.display = 'flex';
    if (stat) stat.textContent = '';
    if (toggleCourse) { toggleCourse.checked = true; syncCourseBody(); }
    if (toggleRes)    { toggleRes.checked    = true; syncResBody(); }
    const courseId = document.getElementById('af-course-id');
    const resId    = document.getElementById('af-ressource-id');
    if (courseId) courseId.value = '';
    if (resId)    resId.value = '';
    if (courseSelect) courseSelect.value = '';
    if (resSelect)    resSelect.value = '';
    document.querySelectorAll('#section-article-form .af-field-error').forEach(e => e.style.display = 'none');
  }

  window.resetArticleForm = resetForm;

  function showForm() {
    resetForm();
    section.style.display = 'block';
    if (mktSection) mktSection.style.display = 'none';
    if (mktTopline) mktTopline.style.display  = 'none';
    section.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  document.addEventListener('article-start-writing', showForm);

  document.addEventListener('click', e => {
    if (!e.target.closest('#af-abandon-btn')) return;
    section.style.display = 'none';
    const auth     = getAuth();
    const articles = auth?.freelance?.article || [];
    if (articles.length > 0) {
      const listSection = document.getElementById('section-article-list');
      if (listSection) { listSection.style.display = 'block'; } // ← CORRECTION : 'block' pas 'flex'
    } else {
      if (mktSection) mktSection.style.display = 'block';
      if (mktTopline) mktTopline.style.display  = 'block';
    }
  });

  /* ── Catégories ── */
  const catSelect = document.getElementById('af-category-select');
  const catInput  = document.getElementById('af-category-id');
  if (catSelect) {
    CATEGORIES.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.emoji + ' ' + c.name;
      catSelect.appendChild(o);
    });
    catSelect.addEventListener('change', () => { catInput.value = catSelect.value; });
  }

  /* ── Durée ── */
  let duration = 60;
  const durNum    = document.getElementById('af-duration-num');
  const durHidden = document.getElementById('af-duration-seconds');
  function updateDuration() {
    if (durNum)    durNum.textContent = duration;
    if (durHidden) durHidden.value    = duration;
  }
  document.getElementById('af-duration-up')  ?.addEventListener('click', () => { duration += 20; updateDuration(); });
  document.getElementById('af-duration-down')?.addEventListener('click', () => { if (duration > 20) { duration -= 20; updateDuration(); } });

  /* ── Richtext ── */
  const rtEditor = document.getElementById('af-corp-text');
  const rtHidden = document.getElementById('af-corp-text-hidden');
  let savedRange = null;

  function saveRange() {
    const s = window.getSelection();
    if (s && s.rangeCount) savedRange = s.getRangeAt(0).cloneRange();
  }
  function restoreRange() {
    if (!savedRange) return;
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange);
  }
  function closeAllRtPopups() {
    ['af-rt-link-popup','af-rt-img-popup','af-rt-video-popup'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  }

  document.querySelectorAll('.af-rt-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.execCommand(btn.dataset.cmd, false, btn.dataset.val || null);
      rtEditor?.focus();
    });
  });

  document.getElementById('af-rt-link-btn')?.addEventListener('click', () => {
    saveRange(); closeAllRtPopups();
    const p = document.getElementById('af-rt-link-popup');
    p.style.display = 'flex'; p.style.flexDirection = 'column';
  });
  document.getElementById('af-rt-link-confirm')?.addEventListener('click', () => {
    const text = document.getElementById('af-rt-link-text').value.trim();
    const url  = document.getElementById('af-rt-link-url').value.trim();
    if (!url) return; restoreRange();
    const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.textContent = text || url;
    document.execCommand('insertHTML', false, a.outerHTML); closeAllRtPopups();
    document.getElementById('af-rt-link-text').value = '';
    document.getElementById('af-rt-link-url').value  = '';
  });
  document.getElementById('af-rt-link-cancel')?.addEventListener('click', closeAllRtPopups);

  document.getElementById('af-rt-img-btn')?.addEventListener('click', () => {
    saveRange(); closeAllRtPopups();
    const p = document.getElementById('af-rt-img-popup');
    p.style.display = 'flex'; p.style.flexDirection = 'column';
  });
  document.getElementById('af-rt-img-confirm')?.addEventListener('click', () => {
    const url = document.getElementById('af-rt-img-url').value.trim(); if (!url) return;
    restoreRange();
    document.execCommand('insertHTML', false, `<img src="${url}" alt="" style="max-width:100%;border-radius:8px;margin:8px 0;" />`);
    closeAllRtPopups(); document.getElementById('af-rt-img-url').value = '';
  });
  document.getElementById('af-rt-img-cancel')?.addEventListener('click', closeAllRtPopups);

  document.getElementById('af-rt-video-btn')?.addEventListener('click', () => {
    saveRange(); closeAllRtPopups();
    const p = document.getElementById('af-rt-video-popup');
    p.style.display = 'flex'; p.style.flexDirection = 'column';
  });
  document.getElementById('af-rt-video-confirm')?.addEventListener('click', () => {
    const url = document.getElementById('af-rt-video-url').value.trim(); if (!url) return;
    let embed = '';
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (yt) embed = `https://www.youtube.com/embed/${yt[1]}`;
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) embed = `https://player.vimeo.com/video/${vm[1]}`;
    if (!embed) { showToast('❌ URL YouTube ou Vimeo non reconnue.', 'error'); return; }
    rtEditor?.focus();
    const wrap = document.createElement('div');
    wrap.className = 'af-video-embed';
    const iframe = document.createElement('iframe');
    iframe.src = embed; iframe.allowFullscreen = true; iframe.frameBorder = '0';
    wrap.appendChild(iframe);
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(wrap);
      range.setStartAfter(wrap); range.collapse(true);
      sel.removeAllRanges(); sel.addRange(range);
    } else {
      rtEditor.appendChild(wrap);
    }
    if (rtHidden) rtHidden.value = rtEditor.innerHTML;
    closeAllRtPopups(); document.getElementById('af-rt-video-url').value = '';
  });
  document.getElementById('af-rt-video-cancel')?.addEventListener('click', closeAllRtPopups);

  rtEditor?.addEventListener('input', () => { if (rtHidden) rtHidden.value = rtEditor.innerHTML; });

  /* ── Char count ── */
  const shortDesc      = document.getElementById('af-short-description');
  const shortDescCount = document.getElementById('af-short-desc-count');
  shortDesc?.addEventListener('input', () => { if (shortDescCount) shortDescCount.textContent = shortDesc.value.length; });

  /* ── Upload image ── */
  async function uploadImage(file, statusEl, previewEl, placeholderEl, hiddenEl) {
    if (!file) return;
    if (statusEl) statusEl.textContent = '⏳ Upload en cours…';
    const fd = new FormData(); fd.append('file', file);
    try {
      const res  = await fetch(UPLOAD_URL, { method:'POST', headers:{ 'Authorization':'Bearer '+getToken() }, body:fd });
      const data = await res.json();
      const rawPath = data?.url || data?.path || data?.uploaded_file?.url || data?.uploaded_file?.path || '';
      const url = rawPath ? (rawPath.startsWith('http') ? rawPath : XANO_BASE + rawPath) : '';
      if (url) {
        if (hiddenEl)      hiddenEl.value = url;
        if (previewEl)     { previewEl.src = url; previewEl.style.display = 'block'; }
        if (placeholderEl) placeholderEl.style.display = 'none';
        if (statusEl)      statusEl.textContent = '✅ Image uploadée';
      } else {
        if (statusEl) statusEl.textContent = '❌ Erreur upload';
        console.warn('[upload-proof] réponse inattendue :', data);
      }
    } catch { if (statusEl) statusEl.textContent = '❌ Erreur réseau'; }
  }

  const imgZone = document.getElementById('af-img-zone');
  const imgFile = document.getElementById('af-img-file');
  imgZone?.addEventListener('click', () => imgFile?.click());
  imgFile?.addEventListener('change', () => {
    if (imgFile.files[0]) {
      const z = document.getElementById('af-img-zone');
      if (z) { z.style.borderColor = ''; z.style.boxShadow = ''; }
      const e = z?.parentElement?.querySelector('.af-img-error');
      if (e) e.style.display = 'none';
      uploadImage(imgFile.files[0],
        document.getElementById('af-img-status'),
        document.getElementById('af-img-preview'),
        document.getElementById('af-img-placeholder'),
        document.getElementById('af-url-img')
      );
    }
  });

  /* ── Toggle cours ── */
  const toggleCourse   = document.getElementById('af-toggle-course');
  const courseBody     = document.getElementById('af-course-body');
  const courseSelect   = document.getElementById('af-course-select');
  const courseHint     = document.getElementById('af-course-hint');
  const courseIdInput  = document.getElementById('af-course-id');

  function syncCourseBody() {
    if (toggleCourse.checked) { courseBody.style.display = 'flex'; courseBody.classList.add('af-body-open'); }
    else                      { courseBody.style.display = 'none';  courseBody.classList.remove('af-body-open'); }
  }
  toggleCourse?.addEventListener('change', syncCourseBody);

  function fillCourses() {
    const courses = getAuth()?.freelance?.course_published || [];
    if (!courseSelect) return;
    courseSelect.innerHTML = '<option value="">— Choisir un cours —</option>';
    if (courses.length === 0) { if (courseHint) courseHint.style.display = 'block'; }
    else {
      if (courseHint) courseHint.style.display = 'none';
      courses.forEach(c => {
        const o = document.createElement('option'); o.value = c.id;
        o.textContent = c.theme || c.title || 'Cours #' + c.id;
        courseSelect.appendChild(o);
      });
    }
  }
  fillCourses();
  courseSelect?.addEventListener('change', () => { courseIdInput.value = courseSelect.value; clearFieldError(courseSelect); });

  /* ── Toggle ressource ── */
  const toggleRes   = document.getElementById('af-toggle-ressource');
  const resBody     = document.getElementById('af-ressource-body');
  const resSelect   = document.getElementById('af-ressource-select');
  const resIdInput  = document.getElementById('af-ressource-id');

  function syncResBody() {
    if (toggleRes.checked) { resBody.style.display = 'flex'; resBody.classList.add('af-body-open'); }
    else                   { resBody.style.display = 'none';  resBody.classList.remove('af-body-open'); }
  }
  toggleRes?.addEventListener('change', syncResBody);

  function fillRessources() {
    const ressources = getAuth()?.freelance?.ressources || [];
    if (!resSelect) return;
    resSelect.innerHTML = '<option value="">— Sélectionner une ressource —</option>';
    ressources.forEach(r => {
      const o = document.createElement('option'); o.value = r.id;
      o.textContent = r.short_title || r.title || 'Ressource #' + r.id;
      resSelect.appendChild(o);
    });
  }
  fillRessources();
  resSelect?.addEventListener('change', () => { resIdInput.value = resSelect.value; clearFieldError(resSelect); });

  /* ── Popup info ressources ── */
  const resInfoPopup  = document.getElementById('af-res-popup');
  document.getElementById('af-res-info-btn')  ?.addEventListener('click', () => { resInfoPopup.style.display = 'flex'; });
  document.getElementById('af-res-popup-close')?.addEventListener('click', () => { resInfoPopup.style.display = 'none'; });
  resInfoPopup?.addEventListener('click', e => { if (e.target === resInfoPopup) resInfoPopup.style.display = 'none'; });

  /* ── Popup nouvelle ressource ── */
  const newResPopup      = document.getElementById('af-new-res-popup');
  const openResPopupBtn  = document.getElementById('af-open-res-popup-btn');
  const closeResPopupBtn = document.getElementById('af-new-res-popup-close');

  openResPopupBtn?.addEventListener('click',  () => { newResPopup.style.display = 'flex'; });
  closeResPopupBtn?.addEventListener('click', () => { newResPopup.style.display = 'none'; });
  newResPopup?.addEventListener('click', e => { if (e.target === newResPopup) newResPopup.style.display = 'none'; });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (resInfoPopup) resInfoPopup.style.display = 'none';
      if (newResPopup)  newResPopup.style.display  = 'none';
      document.querySelectorAll('.af-ex-popup').forEach(p => p.style.display = 'none');
    }
  });

  document.querySelectorAll('.af-example-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const popup = document.getElementById(btn.dataset.popup);
      if (popup) popup.style.display = 'flex';
    });
  });
  document.querySelectorAll('.af-ex-close').forEach(btn => {
    btn.addEventListener('click', () => { btn.closest('.af-ex-popup').style.display = 'none'; });
  });
  document.querySelectorAll('.af-ex-popup').forEach(popup => {
    popup.addEventListener('click', e => { if (e.target === popup) popup.style.display = 'none'; });
  });

  /* ══════════════════════════════════════════
     PUBLIER RESSOURCE
     ← CORRECTION : btn récupéré dans le handler,
       pas au chargement de la page
  ══════════════════════════════════════════ */
  document.addEventListener('click', async e => {
    if (!e.target.closest('#af-publish-ressource-btn')) return;

    const btn = document.getElementById('af-publish-ressource-btn');
    if (!btn || btn.disabled) return;

    const titleEl      = document.getElementById('af-res-title');
    const shortTitleEl = document.getElementById('af-res-short-title');
    const linkEl       = document.getElementById('af-res-link');
    const title        = titleEl?.value?.trim();
    const short_title  = shortTitleEl?.value?.trim();
    const description  = document.getElementById('af-res-description')?.value?.trim();
    const short_desc   = document.getElementById('af-res-short-description')?.value?.trim();
    const link         = linkEl?.value?.trim();

    let hasErr = false;
    [titleEl, shortTitleEl, linkEl].forEach(el => clearFieldError(el));
    if (!title)       { setFieldError(titleEl,      'Le titre est obligatoire.');                 hasErr = true; }
    if (!short_title) { setFieldError(shortTitleEl, 'Le titre court est obligatoire.');           hasErr = true; }
    if (!link)        { setFieldError(linkEl,        'Le lien de la ressource est obligatoire.'); hasErr = true; }
    if (hasErr) return;

    btn.disabled = true; btn.textContent = '⏳ Publication…';

    try {
      const res = await fetch(ADD_RES_URL, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+getToken() },
        body: JSON.stringify({ freelance_id:getFreelanceId(), title, short_title, description, short_description:short_desc, ressource_link:link }),
      });
      if (!res.ok) throw new Error('Erreur ' + res.status);

      // Refresh auth
      const r2 = await fetch(REFRESH_URL, { headers:{ 'Authorization':'Bearer '+getToken() } });
      if (r2.ok) {
        const d = await r2.json();
        localStorage.setItem('auth', JSON.stringify(Object.assign({}, getAuth(), d)));
      }

      // Recharger le select avec les nouvelles ressources
      fillRessources();

      // Reset champs du formulaire ressource
      ['af-res-title','af-res-short-title','af-res-description','af-res-short-description','af-res-link']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

      // Fermer la popup
      if (newResPopup) newResPopup.style.display = 'none';

      // Afficher message succès dans le formulaire
      const addedMsg = document.getElementById('af-res-added-msg');
      if (addedMsg) addedMsg.style.display = 'flex';

      // Auto-sélectionner la dernière ressource dans le select
      setTimeout(() => {
        const opts = resSelect?.options;
        if (opts && opts.length > 1) {
          resSelect.selectedIndex = opts.length - 1;
          if (resIdInput) resIdInput.value = opts[opts.length - 1].value;
          // Highlight du select pour attirer l'attention
          if (resSelect) {
            resSelect.style.borderColor = '#22c55e';
            resSelect.style.boxShadow   = '0 0 0 3px rgba(34,197,94,.2)';
            setTimeout(() => {
              resSelect.style.borderColor = '';
              resSelect.style.boxShadow   = '';
            }, 2000);
          }
        }
      }, 300);

      btn.textContent = '✅ Ressource publiée !';
      setTimeout(() => {
        btn.disabled    = false;
        btn.textContent = '🚀 Publier la ressource';
      }, 2000);

    } catch(e) {
      btn.disabled    = false;
      btn.textContent = '🚀 Publier la ressource';
      showToast('❌ ' + e.message, 'error');
    }
  });

  /* ══════════════════════════════════════════
     VALIDATION INLINE
  ══════════════════════════════════════════ */
  function setFieldError(el, msg) {
    if (!el) return;
    el.style.borderColor = '#ef4444';
    el.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.12)';
    let errEl = el.parentElement.querySelector('.af-field-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'af-field-error';
      el.parentElement.insertBefore(errEl, el.nextSibling);
    }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }

  function clearFieldError(el) {
    if (!el) return;
    el.style.borderColor = '';
    el.style.boxShadow   = '';
    const errEl = el.parentElement?.querySelector('.af-field-error');
    if (errEl) errEl.style.display = 'none';
  }

  function clearAllErrors() {
    document.querySelectorAll('#section-article-form .af-field-error').forEach(e => e.style.display = 'none');
    ['af-title','af-short-description','af-category-select','af-course-select','af-ressource-select',
     'af-res-title','af-res-short-title','af-res-link'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
    });
    const rt   = document.getElementById('af-corp-text');
    const imgZ = document.getElementById('af-img-zone');
    if (rt)   { rt.style.borderColor   = ''; rt.style.boxShadow   = ''; }
    if (imgZ) { imgZ.style.borderColor = ''; imgZ.style.boxShadow = ''; }
  }

  function scrollToFirstError() {
    const first = document.querySelector(
      '#section-article-form input[style*="border-color: rgb(239"],' +
      '#section-article-form select[style*="border-color: rgb(239"],' +
      '#section-article-form textarea[style*="border-color: rgb(239"],' +
      '#section-article-form [style*="border-color: rgb(239"]'
    );
    if (first) first.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  ['af-title','af-short-description','af-category-select','af-course-select'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('input',  () => clearFieldError(el));
    el?.addEventListener('change', () => clearFieldError(el));
  });
  rtEditor?.addEventListener('input', () => clearFieldError(rtEditor));

  /* ── Soumettre article ── */
  const submitBtn = document.getElementById('af-submit-btn');
  submitBtn?.addEventListener('click', async () => {
    clearAllErrors();

    const titleEl        = document.getElementById('af-title');
    const shortDescEl    = document.getElementById('af-short-description');
    const catSelectEl    = document.getElementById('af-category-select');
    const courseSelectEl = document.getElementById('af-course-select');
    const resSelectEl    = document.getElementById('af-ressource-select');
    const imgZoneEl      = document.getElementById('af-img-zone');

    const title             = titleEl?.value?.trim();
    const short_description = shortDescEl?.value?.trim();
    const corp_text         = rtHidden?.value || rtEditor?.innerHTML || '';
    const corp_clean        = corp_text.replace(/<[^>]*>/g, '').trim();
    const url_img           = document.getElementById('af-url-img')?.value?.trim() || '';
    const category_id       = parseInt(catInput?.value || '0');
    const duration_seconds  = parseInt(durHidden?.value || '60');
    const is_course_linked  = toggleCourse?.checked || false;
    const course_id         = is_course_linked ? parseInt(courseIdInput?.value || '0') : 0;
    const is_ressource      = toggleRes?.checked || false;
    const ressource_id      = is_ressource ? parseInt(resIdInput?.value || '0') : 0;
    const freelance_id      = getFreelanceId();

    let hasError = false;

    if (!title)             { setFieldError(titleEl,     'Le titre de l\'article est obligatoire.'); hasError = true; }
    if (!short_description) { setFieldError(shortDescEl, 'L\'introduction est obligatoire.');        hasError = true; }

    if (!corp_clean) {
      const rt = document.getElementById('af-corp-text');
      rt.style.borderColor = '#ef4444'; rt.style.boxShadow = '0 0 0 3px rgba(239,68,68,.12)';
      let errEl = rt.parentElement.querySelector('.af-rt-error');
      if (!errEl) { errEl = document.createElement('p'); errEl.className = 'af-field-error af-rt-error'; rt.parentElement.appendChild(errEl); }
      errEl.textContent = 'Le corps de l\'article est obligatoire.'; errEl.style.display = 'block';
      hasError = true;
    }

    if (!url_img) {
      if (imgZoneEl) {
        imgZoneEl.style.borderColor = '#ef4444'; imgZoneEl.style.boxShadow = '0 0 0 3px rgba(239,68,68,.12)';
        let errEl = imgZoneEl.parentElement.querySelector('.af-img-error');
        if (!errEl) { errEl = document.createElement('p'); errEl.className = 'af-field-error af-img-error'; imgZoneEl.parentElement.appendChild(errEl); }
        errEl.textContent = 'Une image est obligatoire.'; errEl.style.display = 'block';
      }
      hasError = true;
    }

    if (!category_id) { setFieldError(catSelectEl, 'Veuillez choisir une catégorie.'); hasError = true; }

    if (is_course_linked && !course_id) {
      setFieldError(courseSelectEl, 'Choisissez un cours ou désactivez le toggle "Lier à un cours".');
      hasError = true;
    }
    if (is_ressource && !ressource_id) {
      setFieldError(resSelectEl, 'Sélectionnez une ressource ou désactivez le toggle "Ressource associée".');
      hasError = true;
    }

    if (hasError) { scrollToFirstError(); return; }

    submitBtn.disabled = true; submitBtn.textContent = '⏳ Publication en cours…';
    try {
      const res = await fetch(DRAFT_URL, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+getToken() },
        body: JSON.stringify({ freelance_id, title, short_description, corp_text, url_img, category_id, duration_seconds, is_course_linked, course_id, is_ressource, ressource_id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.message || 'Erreur ' + res.status); }

      const r2 = await fetch(REFRESH_URL, { headers:{ 'Authorization':'Bearer '+getToken() } });
      if (r2.ok) { const d = await r2.json(); localStorage.setItem('auth', JSON.stringify(Object.assign({}, getAuth(), d))); }

      submitBtn.textContent = '✅ Article publié !';
      document.dispatchEvent(new CustomEvent('article-published'));
      setTimeout(() => {
        section.style.display = 'none';
        submitBtn.disabled    = false;
        submitBtn.textContent = '🚀 Publier l\'article';
      }, 2200);

    } catch(e) {
      submitBtn.disabled    = false;
      submitBtn.textContent = '🚀 Publier l\'article';
      showToast('❌ ' + e.message, 'error');
    }
  });

  /* ── Toast ── */
  function showToast(msg, type) {
    let toast = document.getElementById('af-toast');
    if (!toast) {
      toast = document.createElement('div'); toast.id = 'af-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className   = 'af-toast af-toast-' + (type || 'info');
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateX(-50%) translateY(12px)';
    }, 3500);
  }

})();








































/* ============================================================
   dr-article-list.js
   ============================================================ */
(function () {

  const STATS_URL      = 'https://xmot-l3ir-7kuj.p7.xano.io/api:5QivUixX/get_stats_article_freelance';
  const MODIFY_URL     = 'https://xmot-l3ir-7kuj.p7.xano.io/api:5QivUixX/modify_article';
  const MODIFY_RES_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:5QivUixX/modify_ressource';
  const ADD_RES_URL    = 'https://xmot-l3ir-7kuj.p7.xano.io/api:5QivUixX/add_ressources_blog';
  const UPLOAD_URL     = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof';
  const REFRESH_URL    = 'https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data';
  const XANO_BASE      = 'https://xmot-l3ir-7kuj.p7.xano.io';

  const CATEGORIES = [
    {id:1,name:'Développement & Tech',emoji:'💻'},{id:2,name:'Design & Créativité',emoji:'🎨'},
    {id:3,name:'Marketing & Croissance',emoji:'📈'},{id:4,name:'Réseaux sociaux & Contenu',emoji:'📱'},
    {id:5,name:'Business & Entrepreneuriat',emoji:'💼'},{id:6,name:'Data & IA',emoji:'🤖'},
    {id:7,name:'E-commerce & Vente',emoji:'🛒'},{id:8,name:'Outils & Productivité',emoji:'⚙️'},
    {id:9,name:'Juridique & Finance',emoji:'⚖️'},{id:10,name:'Formation & Pédagogie',emoji:'🎓'},
  ];

  const STATUS_LABELS = {
    pending:   {label:'En attente', cls:'pending'},
    published: {label:'Publié ✓',  cls:'published'},
    refused:   {label:'Refusé',     cls:'refused'},
  };

  function getAuth()       { return JSON.parse(localStorage.getItem('auth') || 'null'); }
  function getToken()      { return getAuth()?.token || ''; }
  function getFreelanceId(){ return getAuth()?.freelance?.profile?.id || getAuth()?.freelance?.id || 0; }
  function fmt(n)          { return (n || 0).toLocaleString('fr-FR'); }
  function formatDuration(sec) {
    if (!sec) return '—';
    const m = Math.floor(sec / 60), s = sec % 60;
    return m > 0 ? `${m}min${s > 0 ? ' '+s+'s':''}` : `${s}s`;
  }
  function formatRelativeTime(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts, m = Math.floor(diff/60000);
    if (m < 1) return 'À l\'instant';
    if (m < 60) return `Il y a ${m}min`;
    const h = Math.floor(m/60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h/24)}j`;
  }

  const section     = document.getElementById('section-article-list');
  const listEl      = document.getElementById('al-articles-list');
  const resListEl   = document.getElementById('al-ressources-list');
  const mktSection  = document.getElementById('section-article-marketing');
  const mktTopline  = document.getElementById('art-mkt-topline');
  const formSection = document.getElementById('section-article-form');
  if (!section) return;

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  async function init() {
    const auth     = getAuth();
    const articles = auth?.freelance?.article || [];
    if (articles.length === 0) { section.style.display = 'none'; return; }

    if (mktSection) mktSection.style.display = 'none';
    if (mktTopline) mktTopline.style.display  = 'none';
    section.style.display = 'block'; // ← CORRECTION : était 'flex', corrigé en 'block'

    renderArticles(articles);
    renderRessources(auth?.freelance?.ressources || []);

    const articleIds = articles.map(a => a.id).filter(Boolean);
    if (articleIds.length > 0) {
      try {
        const res = await fetch(STATS_URL, {
          method:  'POST',
          headers: {'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
          body:    JSON.stringify({ article_id: articleIds }),
        });
        if (res.ok) {
          const stats = await res.json();
          renderChart(stats);
          renderNotifications(stats);
        }
      } catch(e) {
        console.error('[Stats]', e);
        renderChart([]);
        renderNotifications([]);
      }
    }
  }

  document.addEventListener('article-published', () => {
    setTimeout(() => {
      if (formSection) formSection.style.display = 'none';
      init();
    }, 2200);
  });

  /* ══════════════════════════════════════
     ARTICLES
  ══════════════════════════════════════ */
  function renderArticles(articles) {
    if (!listEl) return;
    listEl.innerHTML = '';
    articles.forEach(article => {
      const status    = article.status || 'pending';
      const statusCfg = STATUS_LABELS[status] || STATUS_LABELS.pending;
      const item      = document.createElement('div');
      item.className  = 'al-article-item';

      const imgHtml = article.url_image
        ? `<img class="al-article-img" src="${article.url_image}" alt="" />`
        : `<div class="al-article-img-placeholder">📄</div>`;

      item.innerHTML = `
        ${imgHtml}
        <div class="al-article-info">
          <p class="al-article-title">${article.title || '—'}</p>
          <div class="al-article-meta">
            <span class="al-badge ${statusCfg.cls}">${statusCfg.label}</span>
            <span class="al-article-stat">⭐ ${article.average_notation > 0 ? Number(article.average_notation).toFixed(1) : '—'}</span>
            <span class="al-article-stat">⏱️ ${formatDuration(article.temps_lecture_secondes)}</span>
            <span class="al-article-stat">👁️ ${fmt(article.nb_view)} vues</span>
            <span class="al-article-stat">💬 ${fmt(article.nb_notation)} avis</span>
          </div>
        </div>
        <div class="al-article-actions">
          ${status === 'published' && article.slug ? `<a class="al-btn-view" href="https://www.digitools-room.com/articles-de-blog/${article.slug}" target="_blank">👁️ Voir →</a>` : ''}
          <button class="al-btn-edit" data-article-id="${article.id}" data-status="${status}">✏️ Modifier →</button>
        </div>`;

      item.querySelector('.al-btn-edit').addEventListener('click', () => handleEditArticle(article, status));
      listEl.appendChild(item);
    });
  }

  /* ══════════════════════════════════════
     RESSOURCES
  ══════════════════════════════════════ */
  function renderRessources(ressources) {
    if (!resListEl) return;
    resListEl.innerHTML = '';
    if (ressources.length === 0) {
      resListEl.innerHTML = `<div class="al-notif-empty"><span class="al-notif-empty-icon">📎</span>Aucune ressource publiée.</div>`;
      return;
    }
    ressources.forEach(res => {
      const item = document.createElement('div');
      item.className = 'al-res-item';
      const imgHtml = res.url_image
        ? `<img class="al-res-img" src="${res.url_image}" alt="" />`
        : `<div class="al-res-img-placeholder">📎</div>`;
      item.innerHTML = `
        ${imgHtml}
        <div class="al-res-info">
          <p class="al-res-title">${res.title || res.short_title || '—'}</p>
          <p class="al-res-meta">${res.short_title || ''}</p>
        </div>
        <div class="al-res-actions">
          <button class="al-btn-edit">✏️ Modifier →</button>
        </div>`;
      item.querySelector('.al-res-actions .al-btn-edit').addEventListener('click', () => openEditResPopup(res));
      resListEl.appendChild(item);
    });
  }

  /* ══════════════════════════════════════
     GRAPHIQUE
  ══════════════════════════════════════ */
  function renderChart(statsData) {
    const wrap = document.getElementById('al-chart-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';

    const now  = Date.now();
    const h24  = 24 * 3600 * 1000;
    const articles = statsData || [];

    if (articles.length === 0) {
      wrap.innerHTML = '<div class="al-chart-empty">Aucune donnée à afficher.</div>';
      return;
    }

    const data = articles.map(a => ({
      title: a.article?.title || '—',
      views: (a.view || []).filter(v => (now - v.created_at) <= h24).length,
    }));

    const maxViews = Math.max(...data.map(d => d.views));

    data.forEach(d => {
      const pct = maxViews > 0 ? Math.max((d.views / maxViews) * 80, d.views > 0 ? 6 : 2) : 2;
      const col = document.createElement('div');
      col.className = 'al-chart-col';
      col.innerHTML = `
        <div class="al-chart-val">${d.views > 0 ? d.views : ''}</div>
        <div class="al-chart-bar-wrap">
          <div class="al-chart-bar" style="height:0%"></div>
        </div>
        <div class="al-chart-label" title="${d.title}">${d.title.split(' ').slice(0,3).join(' ')}${d.title.split(' ').length > 3 ? '…' : ''}</div>`;
      wrap.appendChild(col);
      setTimeout(() => { col.querySelector('.al-chart-bar').style.height = pct + '%'; }, 100);
    });

    if (data.length === 1) {
      const ghost = document.createElement('div');
      ghost.className = 'al-chart-col';
      ghost.innerHTML = `
        <div class="al-chart-val"></div>
        <div class="al-chart-bar-wrap">
          <div class="al-chart-bar-ghost" title="Publiez un nouvel article pour augmenter vos vues"></div>
        </div>
        <div class="al-chart-label">+ Nouvel article</div>`;
      ghost.querySelector('.al-chart-bar-ghost').addEventListener('click', () => {
        const btn = document.getElementById('al-btn-new-article');
        if (btn) btn.click();
      });
      wrap.appendChild(ghost);
    }
  }

  /* ══════════════════════════════════════
     NOTIFICATIONS
  ══════════════════════════════════════ */
  function renderNotifications(statsData) {
    const notifEl  = document.getElementById('al-notif-list');
    const badgeEl  = document.getElementById('al-notif-badge');
    if (!notifEl) return;

    const now  = Date.now();
    const h24  = 24 * 3600 * 1000;
    const items = [];

    (statsData || []).forEach(a => {
      const title = a.article?.title || 'votre article';
      (a.avis || []).forEach(av => {
        if ((now - av.created_at) <= h24) {
          items.push({
            icon: '⭐',
            text: `Nouvelle note <strong>${av.note}/5</strong> sur "<strong>${title}</strong>" — "${av.avis}"`,
            ts:   av.created_at,
          });
        }
      });
      (a.ressource || []).forEach(r => {
        if ((now - r.created_at) <= h24) {
          const resTitle = r._blog_ressources?.title_short || 'Votre ressource';
          items.push({
            icon: '📥',
            text: `"<strong>${resTitle}</strong>" a été téléchargée (article : <strong>${title}</strong>)`,
            ts:   r.created_at,
          });
        }
      });
    });

    items.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    if (badgeEl) {
      badgeEl.textContent   = items.length;
      badgeEl.style.display = items.length > 0 ? 'inline-flex' : 'none';
    }

    if (items.length === 0) {
      notifEl.innerHTML = `<div class="al-notif-empty"><span class="al-notif-empty-icon">🔕</span>Aucune nouvelle notification dans les 24 dernières heures.</div>`;
      return;
    }

    notifEl.innerHTML = '';
    items.forEach(n => {
      const el = document.createElement('div');
      el.className = 'al-notif-item new';
      el.innerHTML = `
        <span class="al-notif-icon">${n.icon}</span>
        <span class="al-notif-text">${n.text}</span>
        <span class="al-notif-time">${formatRelativeTime(n.ts)}</span>`;
      notifEl.appendChild(el);
    });
  }

  /* ══════════════════════════════════════
     EDIT ARTICLE
  ══════════════════════════════════════ */
  function handleEditArticle(article, status) {
    if (status === 'pending') {
      document.getElementById('al-pending-popup').style.display = 'flex';
      return;
    }
    openEditArticlePopup(article);
  }

  function openEditArticlePopup(article) {
    const popup = document.getElementById('al-edit-popup');
    if (!popup) return;

    document.getElementById('al-edit-popup-title').textContent = article.title || '—';
    document.getElementById('al-edit-article-id').value        = article.id;

    const refNote = document.getElementById('al-refused-note');
    const refText = document.getElementById('al-refused-note-text');
    if (article.status === 'refused' && article.note_refused) {
      refNote.style.display = 'flex'; refText.textContent = article.note_refused;
    } else { refNote.style.display = 'none'; }

    document.getElementById('al-edit-title').value             = article.title || '';
    document.getElementById('al-edit-short-description').value = article.short_description || '';

    const corp  = document.getElementById('al-edit-corp');
    const corpH = document.getElementById('al-edit-corp-hidden');
    if (corp)  corp.innerHTML = article.corp_text || '';
    if (corpH) corpH.value   = article.corp_text || '';

    const ip  = document.getElementById('al-edit-img-preview');
    const iph = document.getElementById('al-edit-img-placeholder');
    const ih  = document.getElementById('al-edit-url-img');
    if (article.url_image) { ip.src=article.url_image; ip.style.display='block'; iph.style.display='none'; }
    else                   { ip.style.display='none'; iph.style.display='flex'; }
    if (ih) ih.value = article.url_image || '';

    const catSel = document.getElementById('al-edit-category-select');
    const catH   = document.getElementById('al-edit-category-id');
    if (catSel) {
      catSel.innerHTML = '<option value="">— Choisir une catégorie —</option>';
      CATEGORIES.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id; o.textContent = c.emoji+' '+c.name;
        if (c.id === article.blog_category_id) o.selected = true;
        catSel.appendChild(o);
      });
      if (catH) catH.value = article.blog_category_id || '';
      catSel.onchange = () => { if (catH) catH.value = catSel.value; };
    }

    editDuration = article.temps_lecture_secondes || 60;
    const dn = document.getElementById('al-edit-duration-num');
    const dh = document.getElementById('al-edit-duration-seconds');
    if (dn) dn.textContent = editDuration;
    if (dh) dh.value       = editDuration;

    const tc = document.getElementById('al-edit-toggle-course');
    const cb = document.getElementById('al-edit-course-body');
    const cs = document.getElementById('al-edit-course-select');
    const ch = document.getElementById('al-edit-course-id');
    if (tc) { tc.checked = !!article.is_course_linked; syncBody(tc, cb); }
    if (cs) {
      cs.innerHTML = '<option value="">— Choisir un cours —</option>';
      (getAuth()?.freelance?.course_published || []).forEach(c => {
        const o = document.createElement('option');
        o.value = c.id; o.textContent = c.theme || c.title || 'Cours #'+c.id;
        if (c.id === article.courses_id) o.selected = true;
        cs.appendChild(o);
      });
      if (ch) ch.value = article.courses_id || '';
      cs.onchange = () => { if (ch) ch.value = cs.value; };
    }

    const tr = document.getElementById('al-edit-toggle-res');
    const rb = document.getElementById('al-edit-res-body');
    const rs = document.getElementById('al-edit-res-select');
    const rh = document.getElementById('al-edit-res-id');
    if (tr) { tr.checked = !!article.is_ressource; syncBody(tr, rb); }
    if (rs) {
      rs.innerHTML = '<option value="">— Sélectionner une ressource —</option>';
      (getAuth()?.freelance?.ressources || []).forEach(r => {
        const o = document.createElement('option');
        o.value = r.id; o.textContent = r.short_title || r.title || 'Ressource #'+r.id;
        if (r.id === article.blog_ressources_id) o.selected = true;
        rs.appendChild(o);
      });
      if (rh) rh.value = article.blog_ressources_id || '';
      rs.onchange = () => { if (rh) rh.value = rs.value; };
    }

    popup.style.display = 'flex';
    popup.scrollTop = 0;
  }

  function syncBody(toggle, body) {
    if (!body) return;
    if (toggle.checked) { body.style.display='flex'; body.classList.add('af-body-open'); }
    else                { body.style.display='none';  body.classList.remove('af-body-open'); }
  }

  document.getElementById('al-pending-popup-close')?.addEventListener('click', () => {
    document.getElementById('al-pending-popup').style.display = 'none';
  });
  document.getElementById('al-pending-popup')?.addEventListener('click', e => {
    if (e.target.id === 'al-pending-popup') document.getElementById('al-pending-popup').style.display = 'none';
  });
  document.getElementById('al-edit-popup-close')?.addEventListener('click', () => {
    document.getElementById('al-edit-popup').style.display = 'none';
  });
  document.getElementById('al-edit-popup')?.addEventListener('click', e => {
    if (e.target.id === 'al-edit-popup') document.getElementById('al-edit-popup').style.display = 'none';
  });
  document.getElementById('al-edit-toggle-course')?.addEventListener('change', function () {
    syncBody(this, document.getElementById('al-edit-course-body'));
  });
  document.getElementById('al-edit-toggle-res')?.addEventListener('change', function () {
    syncBody(this, document.getElementById('al-edit-res-body'));
  });

  let editDuration = 60;
  document.getElementById('al-edit-duration-up')?.addEventListener('click', () => {
    editDuration += 20;
    const n=document.getElementById('al-edit-duration-num'), h=document.getElementById('al-edit-duration-seconds');
    if(n) n.textContent=editDuration; if(h) h.value=editDuration;
  });
  document.getElementById('al-edit-duration-down')?.addEventListener('click', () => {
    if (editDuration > 20) { editDuration -= 20;
      const n=document.getElementById('al-edit-duration-num'), h=document.getElementById('al-edit-duration-seconds');
      if(n) n.textContent=editDuration; if(h) h.value=editDuration;
    }
  });

  const editCorp  = document.getElementById('al-edit-corp');
  const editCorpH = document.getElementById('al-edit-corp-hidden');
  document.querySelectorAll('.af-rt-btn[data-editor="al-edit-corp"]').forEach(btn => {
    btn.addEventListener('click', () => { document.execCommand(btn.dataset.cmd, false, btn.dataset.val||null); editCorp?.focus(); });
  });
  editCorp?.addEventListener('input', () => { if(editCorpH) editCorpH.value = editCorp.innerHTML; });

  let editSavedRange = null;
  document.getElementById('al-edit-rt-link-btn')?.addEventListener('click', () => {
    const s=window.getSelection(); if(s&&s.rangeCount) editSavedRange=s.getRangeAt(0).cloneRange();
    const p=document.getElementById('al-edit-link-popup');
    if(p) { p.style.display = p.style.display==='none' ? 'flex' : 'none'; p.style.flexDirection='column'; }
  });
  document.getElementById('al-edit-link-confirm')?.addEventListener('click', () => {
    const text=document.getElementById('al-edit-link-text')?.value.trim();
    const url=document.getElementById('al-edit-link-url')?.value.trim();
    if(!url) return;
    if(editSavedRange){ const s=window.getSelection(); s.removeAllRanges(); s.addRange(editSavedRange); }
    const a=document.createElement('a'); a.href=url; a.target='_blank'; a.textContent=text||url;
    document.execCommand('insertHTML',false,a.outerHTML);
    document.getElementById('al-edit-link-popup').style.display='none';
    document.getElementById('al-edit-link-text').value='';
    document.getElementById('al-edit-link-url').value='';
  });
  document.getElementById('al-edit-link-cancel')?.addEventListener('click', () => {
    document.getElementById('al-edit-link-popup').style.display='none';
  });

  const editImgZone = document.getElementById('al-edit-img-zone');
  const editImgFile = document.getElementById('al-edit-img-file');
  editImgZone?.addEventListener('click', () => editImgFile?.click());
  editImgFile?.addEventListener('change', () => {
    if(editImgFile.files[0]) uploadImage(editImgFile.files[0],
      document.getElementById('al-edit-img-status'),
      document.getElementById('al-edit-img-preview'),
      document.getElementById('al-edit-img-placeholder'),
      document.getElementById('al-edit-url-img')
    );
  });

  document.getElementById('al-edit-submit-btn')?.addEventListener('click', async () => {
    const article_id       = parseInt(document.getElementById('al-edit-article-id')?.value||'0');
    const title            = document.getElementById('al-edit-title')?.value?.trim();
    const short_description= document.getElementById('al-edit-short-description')?.value?.trim();
    const corp_text        = document.getElementById('al-edit-corp-hidden')?.value || editCorp?.innerHTML || '';
    const url_img          = document.getElementById('al-edit-url-img')?.value?.trim()||'';
    const category_id      = parseInt(document.getElementById('al-edit-category-id')?.value||'0');
    const duration_seconds = parseInt(document.getElementById('al-edit-duration-seconds')?.value||'60');
    const tc               = document.getElementById('al-edit-toggle-course');
    const is_course_linked = tc?.checked||false;
    const course_id        = is_course_linked ? parseInt(document.getElementById('al-edit-course-id')?.value||'0') : 0;
    const tr               = document.getElementById('al-edit-toggle-res');
    const is_ressource     = tr?.checked||false;
    const ressource_id     = is_ressource ? parseInt(document.getElementById('al-edit-res-id')?.value||'0') : 0;
    const freelance_id     = getFreelanceId();

    if (!title)       { alert('Le titre est obligatoire.'); return; }
    if (!category_id) { alert('Choisissez une catégorie.'); return; }

    const btn = document.getElementById('al-edit-submit-btn');
    btn.disabled=true; btn.textContent='⏳ Enregistrement…';

    try {
      const res = await fetch(MODIFY_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
        body: JSON.stringify({article_id,freelance_id,title,short_description,corp_text,url_img,category_id,duration_seconds,is_course_linked,course_id,is_ressource,ressource_id}),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d?.message||'Erreur '+res.status); }
      const r2 = await fetch(REFRESH_URL, {headers:{'Authorization':'Bearer '+getToken()}});
      if (r2.ok) { const d=await r2.json(); localStorage.setItem('auth',JSON.stringify(Object.assign({},getAuth(),d))); }
      btn.textContent='✅ Modifications enregistrées !';
      setTimeout(() => {
        document.getElementById('al-edit-popup').style.display='none';
        btn.disabled=false; btn.textContent='💾 Enregistrer les modifications';
        init();
      }, 1800);
    } catch(e) {
      btn.disabled=false; btn.textContent='💾 Enregistrer les modifications';
      alert('Erreur : '+e.message);
    }
  });

  /* ══════════════════════════════════════
     EDIT RESSOURCE
  ══════════════════════════════════════ */
  function openEditResPopup(res) {
    const popup = document.getElementById('al-edit-res-popup');
    if (!popup) return;
    document.getElementById('al-edit-res-popup-title').textContent = res.title || res.short_title || '—';
    document.getElementById('al-res-edit-id').value          = res.id;
    document.getElementById('al-res-edit-title').value       = res.title || '';
    document.getElementById('al-res-edit-short-title').value = res.short_title || res.title_short || '';
    document.getElementById('al-res-edit-description').value = res.description || res.description_short || '';
    document.getElementById('al-res-edit-link').value        = res.lien_ressource || res.ressource_link || '';
    document.getElementById('al-res-edit-url-img').value     = res.url_image || '';

    // img preview optionnel — les éléments peuvent ne pas exister si supprimés du HTML
    const rp  = document.getElementById('al-res-edit-img-preview');
    const rph = document.getElementById('al-res-edit-img-placeholder');
    if (rp && rph) {
      if (res.url_image) { rp.src=res.url_image; rp.style.display='block'; rph.style.display='none'; }
      else               { rp.style.display='none'; rph.style.display='flex'; }
    }

    popup.style.display = 'flex';
  }

  document.getElementById('al-edit-res-popup-close')?.addEventListener('click', () => {
    document.getElementById('al-edit-res-popup').style.display = 'none';
  });
  document.getElementById('al-edit-res-popup')?.addEventListener('click', e => {
    if (e.target.id === 'al-edit-res-popup') document.getElementById('al-edit-res-popup').style.display = 'none';
  });

  document.getElementById('al-res-edit-submit-btn')?.addEventListener('click', async () => {
    const id          = parseInt(document.getElementById('al-res-edit-id')?.value||'0');
    const title       = document.getElementById('al-res-edit-title')?.value?.trim();
    const short_title = document.getElementById('al-res-edit-short-title')?.value?.trim();
    const description = document.getElementById('al-res-edit-description')?.value?.trim();
    const link        = document.getElementById('al-res-edit-link')?.value?.trim();
    const url_img     = document.getElementById('al-res-edit-url-img')?.value?.trim();

    if (!title||!short_title||!link) { alert('Titre, titre court et lien sont obligatoires.'); return; }

    const btn = document.getElementById('al-res-edit-submit-btn');
    btn.disabled=true; btn.textContent='⏳ Enregistrement…';

    try {
      const res = await fetch(MODIFY_RES_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
        body: JSON.stringify({ressource_id:id, freelance_id:getFreelanceId(), title, short_title, description, short_description:description, ressource_link:link}),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d?.message||'Erreur '+res.status); }
      const r2 = await fetch(REFRESH_URL, {headers:{'Authorization':'Bearer '+getToken()}});
      if (r2.ok) { const d=await r2.json(); localStorage.setItem('auth',JSON.stringify(Object.assign({},getAuth(),d))); }
      btn.textContent='✅ Ressource mise à jour !';
      setTimeout(() => {
        document.getElementById('al-edit-res-popup').style.display='none';
        btn.disabled=false; btn.textContent='💾 Enregistrer';
        renderRessources(getAuth()?.freelance?.ressources||[]);
      }, 1800);
    } catch(e) {
      btn.disabled=false; btn.textContent='💾 Enregistrer';
      alert('Erreur : '+e.message);
    }
  });

  /* ══════════════════════════════════════
     NOUVELLE RESSOURCE INDÉPENDANTE
  ══════════════════════════════════════ */
  document.getElementById('al-btn-new-ressource')?.addEventListener('click', () => {
    document.getElementById('al-new-res-standalone-popup').style.display = 'flex';
  });
  document.getElementById('al-new-res-standalone-close')?.addEventListener('click', () => {
    document.getElementById('al-new-res-standalone-popup').style.display = 'none';
  });
  document.getElementById('al-new-res-standalone-popup')?.addEventListener('click', e => {
    if (e.target.id === 'al-new-res-standalone-popup')
      document.getElementById('al-new-res-standalone-popup').style.display = 'none';
  });

  document.getElementById('al-new-res-submit-btn')?.addEventListener('click', async () => {
    const title       = document.getElementById('al-new-res-title')?.value?.trim();
    const short_title = document.getElementById('al-new-res-short-title')?.value?.trim();
    const description = document.getElementById('al-new-res-description')?.value?.trim();
    const link        = document.getElementById('al-new-res-link')?.value?.trim();

    // ← CORRECTION : blocage sur url_img supprimé (champ image retiré du HTML)
    if (!title)       { alert('Le titre est obligatoire.'); return; }
    if (!short_title) { alert('Le titre court est obligatoire.'); return; }
    if (!link)        { alert('Le lien de la ressource est obligatoire.'); return; }

    const btn = document.getElementById('al-new-res-submit-btn');
    btn.disabled=true; btn.textContent='⏳ Publication…';

    try {
      const res = await fetch(ADD_RES_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
        body: JSON.stringify({freelance_id:getFreelanceId(), title, short_title, description, short_description:description, ressource_link:link}),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d?.message||'Erreur '+res.status); }
      const r2 = await fetch(REFRESH_URL, {headers:{'Authorization':'Bearer '+getToken()}});
      if (r2.ok) { const d=await r2.json(); localStorage.setItem('auth',JSON.stringify(Object.assign({},getAuth(),d))); }

      ['al-new-res-title','al-new-res-short-title','al-new-res-description','al-new-res-link'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.value='';
      });
      btn.textContent='✅ Ressource publiée !';
      setTimeout(() => {
        document.getElementById('al-new-res-standalone-popup').style.display='none';
        btn.disabled=false; btn.textContent='🚀 Publier la ressource';
        renderRessources(getAuth()?.freelance?.ressources||[]);
      }, 1800);
    } catch(e) {
      btn.disabled=false; btn.textContent='🚀 Publier la ressource';
      alert('Erreur : '+e.message);
    }
  });

  /* ══════════════════════════════════════
     UPLOAD IMAGE (helper)
  ══════════════════════════════════════ */
  async function uploadImage(file, statusEl, previewEl, placeholderEl, hiddenEl) {
    if (!file) return;
    if (statusEl) statusEl.textContent='⏳ Upload en cours…';
    const fd=new FormData(); fd.append('file',file);
    try {
      const res=await fetch(UPLOAD_URL,{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd});
      const data=await res.json();
      const raw=data?.url||data?.path||data?.uploaded_file?.url||data?.uploaded_file?.path||'';
      const url=raw?(raw.startsWith('http')?raw:XANO_BASE+raw):'';
      if(url){
        if(hiddenEl) hiddenEl.value=url;
        if(previewEl){previewEl.src=url;previewEl.style.display='block';}
        if(placeholderEl) placeholderEl.style.display='none';
        if(statusEl) statusEl.textContent='✅ Image uploadée';
      } else { if(statusEl) statusEl.textContent='❌ Erreur upload'; }
    } catch { if(statusEl) statusEl.textContent='❌ Erreur réseau'; }
  }

  /* ══════════════════════════════════════
     BOUTON NOUVEL ARTICLE
  ══════════════════════════════════════ */
  document.getElementById('al-btn-new-article')?.addEventListener('click', () => {
    if (formSection) {
      if (typeof window.resetArticleForm === "function") window.resetArticleForm();
      formSection.style.display = 'block';
      section.style.display = 'none';
      formSection.scrollIntoView({ behavior:'smooth', block:'start' });
    }
  });

  // Bouton abandon dans dr-article-form.js — rappel : doit aussi utiliser 'block' pas 'flex'
  // La correction est dans dr-article-form.js à la ligne : listSection.style.display = 'block'

  /* ── Echap ── */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['al-pending-popup','al-edit-popup','al-edit-res-popup','al-new-res-standalone-popup'].forEach(id => {
      const el=document.getElementById(id); if(el) el.style.display='none';
    });
  });

  init();

})();


