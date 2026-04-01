
(function () {
  const UPLOAD_URL  = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof';
  const ADD_RES_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:5QivUixX/add_ressources_blog';
  const DRAFT_URL   = 'https://xmot-l3ir-7kuj.p7.xano.io/api:5QivUixX/draft_article';
  const REFRESH_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data';

  const CATEGORIES = [
    {id:1,name:'Développement & Tech',emoji:'💻'},
    {id:2,name:'Design & Créativité',emoji:'🎨'},
    {id:3,name:'Marketing & Croissance',emoji:'📈'},
    {id:4,name:'Réseaux sociaux & Contenu',emoji:'📱'},
    {id:5,name:'Business & Entrepreneuriat',emoji:'💼'},
    {id:6,name:'Data & IA',emoji:'🤖'},
    {id:7,name:'E-commerce & Vente',emoji:'🛒'},
    {id:8,name:'Outils & Productivité',emoji:'⚙️'},
    {id:9,name:'Juridique & Finance',emoji:'⚖️'},
    {id:10,name:'Formation & Pédagogie',emoji:'🎓'},
  ];

  function getAuth()  { return JSON.parse(localStorage.getItem('auth') || 'null'); }
  function getToken() { return getAuth()?.token || ''; }
  function getFreelanceId() { return getAuth()?.freelance?.profile?.id || getAuth()?.freelance?.id || 0; }

  /* ── Section visibility ── */
  const section    = document.getElementById('section-article-form');
  const mktSection = document.getElementById('section-article-marketing');
  const mktTopline = document.getElementById('art-mkt-topline');
  if (!section) return;

  function showForm() {
    section.style.display = 'block';
    if (mktSection) mktSection.style.display = 'none';
    if (mktTopline) mktTopline.style.display  = 'none';
    section.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  document.addEventListener('article-start-writing', showForm);

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
  function updateDuration() { if(durNum) durNum.textContent=duration; if(durHidden) durHidden.value=duration; }
  document.getElementById('af-duration-up')  ?.addEventListener('click', () => { duration+=20; updateDuration(); });
  document.getElementById('af-duration-down')?.addEventListener('click', () => { if(duration>20){duration-=20; updateDuration();} });

  /* ── Richtext ── */
  const rtEditor = document.getElementById('af-corp-text');
  const rtHidden = document.getElementById('af-corp-text-hidden');
  let savedRange = null;
  function saveRange() { const s=window.getSelection(); if(s&&s.rangeCount) savedRange=s.getRangeAt(0).cloneRange(); }
  function restoreRange() { if(!savedRange) return; const s=window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
  function closeAllPopups() {
    ['af-rt-link-popup','af-rt-img-popup','af-rt-video-popup'].forEach(id => {
      const el=document.getElementById(id); if(el) el.style.display='none';
    });
  }
  document.querySelectorAll('.af-rt-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => { document.execCommand(btn.dataset.cmd, false, btn.dataset.val||null); rtEditor?.focus(); });
  });
  // Lien
  document.getElementById('af-rt-link-btn')?.addEventListener('click', () => { saveRange(); closeAllPopups(); const p=document.getElementById('af-rt-link-popup'); p.style.display='flex'; p.style.flexDirection='column'; });
  document.getElementById('af-rt-link-confirm')?.addEventListener('click', () => {
    const text=document.getElementById('af-rt-link-text').value.trim();
    const url=document.getElementById('af-rt-link-url').value.trim();
    if(!url) return; restoreRange();
    const a=document.createElement('a'); a.href=url; a.target='_blank'; a.textContent=text||url;
    document.execCommand('insertHTML',false,a.outerHTML); closeAllPopups();
    document.getElementById('af-rt-link-text').value=''; document.getElementById('af-rt-link-url').value='';
  });
  document.getElementById('af-rt-link-cancel')?.addEventListener('click', closeAllPopups);
  // Image inline
  document.getElementById('af-rt-img-btn')?.addEventListener('click', () => { saveRange(); closeAllPopups(); const p=document.getElementById('af-rt-img-popup'); p.style.display='flex'; p.style.flexDirection='column'; });
  document.getElementById('af-rt-img-confirm')?.addEventListener('click', () => {
    const url=document.getElementById('af-rt-img-url').value.trim(); if(!url) return;
    restoreRange(); document.execCommand('insertHTML',false,`<img src="${url}" alt="" style="max-width:100%;border-radius:8px;margin:8px 0;" />`);
    closeAllPopups(); document.getElementById('af-rt-img-url').value='';
  });
  document.getElementById('af-rt-img-cancel')?.addEventListener('click', closeAllPopups);
  // Vidéo
  document.getElementById('af-rt-video-btn')?.addEventListener('click', () => { saveRange(); closeAllPopups(); const p=document.getElementById('af-rt-video-popup'); p.style.display='flex'; p.style.flexDirection='column'; });
  document.getElementById('af-rt-video-confirm')?.addEventListener('click', () => {
    const url=document.getElementById('af-rt-video-url').value.trim(); if(!url) return;
    let embed='';
    const yt=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if(yt) embed=`https://www.youtube.com/embed/${yt[1]}`;
    const vm=url.match(/vimeo\.com\/(\d+)/);
    if(vm) embed=`https://player.vimeo.com/video/${vm[1]}`;
    if(!embed){ alert('URL YouTube ou Vimeo non reconnue.'); return; }
    restoreRange();
    document.execCommand('insertHTML',false,`<div class="af-video-embed"><iframe src="${embed}" allowfullscreen></iframe></div>`);
    closeAllPopups(); document.getElementById('af-rt-video-url').value='';
  });
  document.getElementById('af-rt-video-cancel')?.addEventListener('click', closeAllPopups);
  rtEditor?.addEventListener('input', () => { if(rtHidden) rtHidden.value=rtEditor.innerHTML; });

  /* ── Char count ── */
  const shortDesc=document.getElementById('af-short-description');
  const shortDescCount=document.getElementById('af-short-desc-count');
  shortDesc?.addEventListener('input', () => { if(shortDescCount) shortDescCount.textContent=shortDesc.value.length; });

  /* ── Upload ── */
  async function uploadImage(file, statusEl, previewEl, placeholderEl, hiddenEl) {
    if(!file) return;
    if(statusEl) statusEl.textContent='⏳ Upload en cours…';
    const fd=new FormData(); fd.append('file',file);
    try {
      const res=await fetch(UPLOAD_URL,{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd});
      const data=await res.json();
      // L'endpoint retourne un objet Xano attachment avec un path relatif
      // On reconstruit l'URL absolue avec la base de l'API Xano
      const XANO_BASE = 'https://xmot-l3ir-7kuj.p7.xano.io';
      const rawPath = data?.url || data?.path || data?.uploaded_file?.url || data?.uploaded_file?.path || '';
      const url = rawPath
        ? (rawPath.startsWith('http') ? rawPath : XANO_BASE + rawPath)
        : '';
      if(url) {
        if(hiddenEl) hiddenEl.value=url;
        if(previewEl){ previewEl.src=url; previewEl.style.display='block'; }
        if(placeholderEl) placeholderEl.style.display='none';
        if(statusEl) statusEl.textContent='✅ Image uploadée';
      } else {
        if(statusEl) statusEl.textContent='❌ Erreur upload';
        console.warn('[upload-proof] réponse inattendue :', data);
      }
    } catch { if(statusEl) statusEl.textContent='❌ Erreur réseau'; }
  }
  const imgZone=document.getElementById('af-img-zone'); const imgFile=document.getElementById('af-img-file');
  imgZone?.addEventListener('click',()=>imgFile?.click());
  imgFile?.addEventListener('change',()=>{
    if(imgFile.files[0]) {
      // Clear erreur image dès qu'on choisit un fichier
      const z=document.getElementById('af-img-zone');
      if(z){ z.style.borderColor=''; z.style.boxShadow=''; }
      const e=z?.parentElement?.querySelector('.af-img-error');
      if(e) e.style.display='none';
      uploadImage(imgFile.files[0],document.getElementById('af-img-status'),document.getElementById('af-img-preview'),document.getElementById('af-img-placeholder'),document.getElementById('af-url-img'));
    }
  });
  const resImgZone=document.getElementById('af-res-img-zone'); const resImgFile=document.getElementById('af-res-img-file');
  resImgZone?.addEventListener('click',()=>resImgFile?.click());
  resImgFile?.addEventListener('change',()=>{ if(resImgFile.files[0]) uploadImage(resImgFile.files[0],document.getElementById('af-res-img-status'),document.getElementById('af-res-img-preview'),document.getElementById('af-res-img-placeholder'),document.getElementById('af-res-url-img')); });

  /* ── Toggle cours — ouvert par défaut ── */
  const toggleCourse  = document.getElementById('af-toggle-course');
  const courseBody    = document.getElementById('af-course-body');
  const courseSelect  = document.getElementById('af-course-select');
  const courseHint    = document.getElementById('af-course-hint');
  const courseIdInput = document.getElementById('af-course-id');

  function syncCourseBody() {
    if(toggleCourse.checked) {
      courseBody.style.display='flex';
      courseBody.classList.add('af-body-open');
    } else {
      courseBody.style.display='none';
      courseBody.classList.remove('af-body-open');
    }
  }
  toggleCourse?.addEventListener('change', syncCourseBody);

  function fillCourses() {
    const courses=getAuth()?.freelance?.course_published||[];
    if(!courseSelect) return;
    courseSelect.innerHTML='<option value="">— Choisir un cours —</option>';
    if(courses.length===0){ if(courseHint) courseHint.style.display='block'; }
    else {
      if(courseHint) courseHint.style.display='none';
      courses.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.theme||c.title||'Cours #'+c.id; courseSelect.appendChild(o); });
    }
  }
  fillCourses();
  courseSelect?.addEventListener('change',()=>{ courseIdInput.value=courseSelect.value; });

  /* ── Toggle ressource ── */
  const toggleRes  = document.getElementById('af-toggle-ressource');
  const resBody    = document.getElementById('af-ressource-body');
  const resSelect  = document.getElementById('af-ressource-select');
  const resIdInput = document.getElementById('af-ressource-id');

  function syncResBody() {
    if(toggleRes.checked) {
      resBody.style.display='flex';
      resBody.classList.add('af-body-open');
    } else {
      resBody.style.display='none';
      resBody.classList.remove('af-body-open');
    }
  }
  toggleRes?.addEventListener('change', syncResBody);

  function fillRessources() {
    const ressources=getAuth()?.freelance?.ressources||[];
    if(!resSelect) return;
    resSelect.innerHTML='<option value="">— Sélectionner —</option>';
    ressources.forEach(r=>{ const o=document.createElement('option'); o.value=r.id; o.textContent=r.short_title||r.title||'Ressource #'+r.id; resSelect.appendChild(o); });
  }
  fillRessources();
  resSelect?.addEventListener('change',()=>{ resIdInput.value=resSelect.value; });

  /* ── Popup ressource info ── */
  const resPopup=document.getElementById('af-res-popup');
  document.getElementById('af-res-info-btn')?.addEventListener('click',()=>{ resPopup.style.display='flex'; });
  document.getElementById('af-res-popup-close')?.addEventListener('click',()=>{ resPopup.style.display='none'; });
  resPopup?.addEventListener('click',e=>{ if(e.target===resPopup) resPopup.style.display='none'; });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') resPopup.style.display='none'; });
  document.getElementById('af-res-popup-cta')?.addEventListener('click',()=>{
    resPopup.style.display='none';
    if(toggleRes&&!toggleRes.checked){ toggleRes.checked=true; syncResBody(); }
    document.getElementById('af-ressource-body')?.scrollIntoView({behavior:'smooth',block:'start'});
  });

  /* ══════════════════════════════════════════
     SYSTÈME DE VALIDATION INLINE
  ══════════════════════════════════════════ */

  // Marque un champ en erreur : bordure rouge + message sous le champ
  function setFieldError(el, msg) {
    if (!el) return;
    el.style.borderColor = '#ef4444';
    el.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.12)';
    // Créer ou recycler le message d'erreur
    let errEl = el.parentElement.querySelector('.af-field-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'af-field-error';
      el.parentElement.insertBefore(errEl, el.nextSibling);
    }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }

  // Nettoie l'état d'erreur d'un champ
  function clearFieldError(el) {
    if (!el) return;
    el.style.borderColor = '';
    el.style.boxShadow   = '';
    const errEl = el.parentElement?.querySelector('.af-field-error');
    if (errEl) errEl.style.display = 'none';
  }

  // Nettoie toutes les erreurs du formulaire
  function clearAllErrors() {
    document.querySelectorAll('#section-article-form .af-field-error').forEach(e => e.style.display = 'none');
    ['af-title','af-short-description','af-category-select','af-course-select',
     'af-res-title','af-res-short-title','af-res-link'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.borderColor=''; el.style.boxShadow=''; }
    });
    // richtext
    const rt = document.getElementById('af-corp-text');
    if (rt) { rt.style.borderColor=''; rt.style.boxShadow=''; }
    // upload image
    const imgZ = document.getElementById('af-img-zone');
    if (imgZ) { imgZ.style.borderColor=''; imgZ.style.boxShadow=''; }
  }

  // Scroll vers le premier élément en erreur
  function scrollToFirstError() {
    const first = document.querySelector('#section-article-form [style*="border-color: rgb(239"]');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Auto-clear quand l'utilisateur tape / change
  function bindClearOnInput(id) {
    const el = document.getElementById(id);
    el?.addEventListener('input',  () => clearFieldError(el));
    el?.addEventListener('change', () => clearFieldError(el));
  }
  ['af-title','af-short-description','af-category-select','af-course-select'].forEach(bindClearOnInput);
  rtEditor?.addEventListener('input', () => clearFieldError(rtEditor));

  /* ── Publier ressource ── */
  const publishResBtn=document.getElementById('af-publish-ressource-btn');
  publishResBtn?.addEventListener('click', async () => {
    const titleEl      = document.getElementById('af-res-title');
    const shortTitleEl = document.getElementById('af-res-short-title');
    const linkEl       = document.getElementById('af-res-link');
    const title      = titleEl?.value?.trim();
    const short_title= shortTitleEl?.value?.trim();
    const description= document.getElementById('af-res-description')?.value?.trim();
    const short_desc = document.getElementById('af-res-short-description')?.value?.trim();
    const link       = linkEl?.value?.trim();
    const url_img    = document.getElementById('af-res-url-img')?.value?.trim();

    // Validation inline ressource
    let resHasError = false;
    [titleEl, shortTitleEl, linkEl].forEach(el => clearFieldError(el));
    if (!title)       { setFieldError(titleEl,      'Le titre est obligatoire.');             resHasError = true; }
    if (!short_title) { setFieldError(shortTitleEl, 'Le titre court est obligatoire.');       resHasError = true; }
    if (!link)        { setFieldError(linkEl,        'Le lien de la ressource est obligatoire.'); resHasError = true; }
    if (resHasError) {
      const firstErr = [titleEl, shortTitleEl, linkEl].find(el => el?.style.borderColor === 'rgb(239, 68, 68)');
      if (firstErr) firstErr.scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }

    publishResBtn.disabled=true; publishResBtn.textContent='⏳ Publication…';
    try {
      const res=await fetch(ADD_RES_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
        body:JSON.stringify({ freelance_id: getFreelanceId(), title, short_title, description, short_description:short_desc, ressource_link:link, url_img }),
      });
      if(!res.ok) throw new Error('Erreur '+res.status);
      const r2=await fetch(REFRESH_URL,{headers:{'Authorization':'Bearer '+getToken()}});
      if(r2.ok){ const d=await r2.json(); localStorage.setItem('auth',JSON.stringify(Object.assign({},getAuth(),d))); }
      fillRessources();
      ['af-res-title','af-res-short-title','af-res-description','af-res-short-description','af-res-link','af-res-url-img'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
      const rp=document.getElementById('af-res-img-preview'); const rph=document.getElementById('af-res-img-placeholder');
      if(rp){rp.src='';rp.style.display='none';} if(rph) rph.style.display='flex';
      document.getElementById('af-res-img-status').textContent='';
      publishResBtn.textContent='✅ Ressource publiée !';
      setTimeout(()=>{ publishResBtn.disabled=false; publishResBtn.textContent='Publier la ressource'; },2000);
    } catch(e){
      publishResBtn.disabled=false; publishResBtn.textContent='Publier la ressource';
      // Toast erreur réseau
      showToast('❌ ' + e.message, 'error');
    }
  });

  /* ── Soumettre article ── */
  const submitBtn=document.getElementById('af-submit-btn');
  submitBtn?.addEventListener('click', async () => {
    clearAllErrors();

    const titleEl       = document.getElementById('af-title');
    const shortDescEl   = document.getElementById('af-short-description');
    const catSelectEl   = document.getElementById('af-category-select');
    const courseSelectEl= document.getElementById('af-course-select');

    const title             = titleEl?.value?.trim();
    const short_description = shortDescEl?.value?.trim();
    const corp_text         = rtHidden?.value || rtEditor?.innerHTML || '';
    const corp_clean        = corp_text.replace(/<[^>]*>/g,'').trim();
    const url_img           = document.getElementById('af-url-img')?.value?.trim()||'';
    const imgZoneEl         = document.getElementById('af-img-zone');
    const category_id       = parseInt(catInput?.value||'0');
    const duration_seconds  = parseInt(durHidden?.value||'60');
    const is_course_linked  = toggleCourse?.checked||false;
    const course_id         = is_course_linked ? parseInt(courseIdInput?.value||'0') : 0;
    const is_ressource      = toggleRes?.checked||false;
    const ressource_id      = is_ressource ? parseInt(resIdInput?.value||'0') : 0;
    const freelance_id      = getFreelanceId();

    // ── Validation ──
    let hasError = false;

    if (!title) {
      setFieldError(titleEl, 'Le titre de l\'article est obligatoire.');
      hasError = true;
    }
    if (!short_description) {
      setFieldError(shortDescEl, 'L\'introduction est obligatoire.');
      hasError = true;
    }
    if (!corp_clean) {
      const rt = document.getElementById('af-corp-text');
      rt.style.borderColor = '#ef4444';
      rt.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.12)';
      let errEl = rt.parentElement.querySelector('.af-rt-error');
      if (!errEl) { errEl = document.createElement('p'); errEl.className = 'af-field-error af-rt-error'; rt.parentElement.appendChild(errEl); }
      errEl.textContent = 'Le corps de l\'article est obligatoire.';
      errEl.style.display = 'block';
      hasError = true;
    }
    if (!url_img) {
      if (imgZoneEl) {
        imgZoneEl.style.borderColor = '#ef4444';
        imgZoneEl.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.12)';
        let errEl = imgZoneEl.parentElement.querySelector('.af-img-error');
        if (!errEl) { errEl = document.createElement('p'); errEl.className = 'af-field-error af-img-error'; imgZoneEl.parentElement.appendChild(errEl); }
        errEl.textContent = 'Une image est obligatoire.';
        errEl.style.display = 'block';
      }
      hasError = true;
    }
    if (!category_id) {
      setFieldError(catSelectEl, 'Veuillez choisir une catégorie.');
      hasError = true;
    }
    if (is_course_linked && !course_id) {
      setFieldError(courseSelectEl, 'Choisissez un cours ou désactivez le toggle "Lier à un cours".');
      hasError = true;
    }

    if (hasError) {
      scrollToFirstError();
      return;
    }

    submitBtn.disabled=true; submitBtn.textContent='⏳ Publication en cours…';
    try {
      const res=await fetch(DRAFT_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
        body:JSON.stringify({freelance_id,title,short_description,corp_text,url_img,category_id,duration_seconds,is_course_linked,course_id,is_ressource,ressource_id}),
      });
      if(!res.ok){ const d=await res.json(); throw new Error(d?.message||'Erreur '+res.status); }
      const r2=await fetch(REFRESH_URL,{headers:{'Authorization':'Bearer '+getToken()}});
      if(r2.ok){ const d=await r2.json(); localStorage.setItem('auth',JSON.stringify(Object.assign({},getAuth(),d))); }
      submitBtn.textContent='✅ Article publié !';
      document.dispatchEvent(new CustomEvent('article-published'));
      setTimeout(()=>{ section.style.display='none'; submitBtn.disabled=false; submitBtn.textContent='🚀 Publier l\'article'; },2000);
    } catch(e){
      submitBtn.disabled=false; submitBtn.textContent='🚀 Publier l\'article';
      showToast('❌ ' + e.message, 'error');
    }
  });

  /* ── Toast ── */
  function showToast(msg, type) {
    let toast = document.getElementById('af-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'af-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className   = 'af-toast af-toast-' + (type || 'info');
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateY(12px)';
    }, 3500);
  }

})();

