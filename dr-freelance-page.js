document.addEventListener("DOMContentLoaded", async function () {

  const formateurSection = document.querySelector(".formateur-section");
  const freelanceId = formateurSection?.getAttribute("freelance-id")?.trim();
  if (!freelanceId) return;

  const API_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/get_freelance_info_page";

  injectSkeletonStyles();
  applySkeleton();

  try {
    const response = await fetch(`${API_URL}?freelance_id=${freelanceId}`);
    if (!response.ok) return;
    const raw = await response.json();

    const data       = raw.freelancer_page_data?.data_profile || {};
    const rules      = raw.freelancer_page_data?.rules        || [];
    const exceptions = raw.freelancer_page_data?.exceptions   || [];
    const bookings   = raw.freelancer_page_data?.booking      || [];

    removeSkeleton();

    setText("#formateur-display-name",      data.display_name);
    setText("#formateur-headline",          data.headline);
    setText("#formateur-xp-years",          data.years_experience);
    setText("#formateur-xp-domaine",        data.domaine_activity);
    setText("#formateur-domaine-activity",  data.domaine_activity);

    const nbFollowers = data.followers ?? 0;
    const nbProjects  = data.completed_projects ?? 0;
    const nbNotation  = data.nb_notation ?? 0;
    const avgNotation = data.notation;

    setText("#nb_followers", nbFollowers > 0 ? nbFollowers : '—');
    setText("#nb_project",   nbProjects  > 0 ? nbProjects  : '—');
    setText("#average_avis", nbNotation  > 0 && avgNotation != null ? parseFloat(avgNotation).toFixed(1) : '—');

    const nbAvisEl = document.querySelector("#nb_avis");
    if (nbAvisEl) nbAvisEl.textContent = `(${nbNotation} avis)`;

    const notations = raw.freelancer_page_data?.notation || [];
    renderAvis(notations);

    const followBtn = document.querySelector("#add_follower");
    if (followBtn) {
      const auth         = (() => { try { return JSON.parse(localStorage.getItem("auth") || "null"); } catch { return null; } })();
      const userFollower = auth?.user_follower || [];
      const alreadyFollowing = userFollower.some(f => f.freelancer_profile_id === data.id);

      if (alreadyFollowing) {
        followBtn.style.display = 'none';
      } else {
        followBtn.addEventListener('click', async function () {
          const token = auth?.token || auth?.authToken || null;
          if (!token) {
            const nonco = document.querySelector(".abo-nonco-container");
            if (nonco) nonco.style.setProperty("display", "flex", "important");
            return;
          }
          followBtn.disabled = true;
          try {
            const res = await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_follow_freelance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({ freelance_id: data.id }),
            });
            if (res.ok) {
              followBtn.style.display = 'none';
              const nbFollEl = document.querySelector("#nb_followers");
              if (nbFollEl) nbFollEl.textContent = (parseInt(nbFollEl.textContent) || 0) + 1;
            } else { followBtn.disabled = false; }
          } catch(e) { console.error('[Follow] Erreur:', e); followBtn.disabled = false; }
        });
      }
    }

    // ✅ Photo de profil depuis Xano (déjà le cas, inchangé)
    const profileImg = document.querySelector("#freelance-profile-img");
    if (profileImg && data.profile_image_url) profileImg.src = data.profile_image_url;

    const linkedinLink = document.querySelector("#formateur-linkedin");
    if (linkedinLink && data.linkedin_url) {
      linkedinLink.href = data.linkedin_url;
      linkedinLink.target = "_blank";
      linkedinLink.rel = "noopener noreferrer";
    }

    setHTML("#formateur-about",     data.about_text);
    setHTML("#formateur-audience",  data.audience_list);
    setHTML("#formateur-expertise", data.expertise_list);

    const categoryList     = document.querySelector("#category-list-domaine2");
    const categoryTemplate = document.querySelector(".freelance-card-category2");
    if (categoryList && categoryTemplate && Array.isArray(data.sous_domaine_activity) && data.sous_domaine_activity.length > 0) {
      categoryList.innerHTML = '';
      data.sous_domaine_activity.forEach(sousDomaine => {
        const clone = categoryTemplate.cloneNode(true);
        clone.style.display = 'flex';
        const nameEl = clone.querySelector(".freelance-card-category-name2");
        if (nameEl) nameEl.textContent = sousDomaine;
        categoryList.appendChild(clone);
      });
    }

    // ✅ MODIF — dot status depuis Xano
    applyStatusDot(data.status);

    // ✅ MODIF — suspended masque les deux tabs coaching et freelance
    const hasCoaching  = data.service_coaching === true && data.stripe_status === "active" && data.status !== 'suspended';
    const hasFreelance = data.service_freelance === true && data.status !== 'suspended';

    const tabLinkCoaching  = document.querySelector("#tab-link-coaching");
    const tabLinkFreelance = document.querySelector("#tab-link-freelance");
    const tabPaneCoaching  = document.querySelector("#tab-pane-coaching");
    const tabPaneFreelance = document.querySelector("#tab-pane-freelance");

    if (hasCoaching && hasFreelance) {
      // les deux actifs
    } else if (hasCoaching && !hasFreelance) {
      if (tabLinkFreelance) tabLinkFreelance.style.display = "none";
      if (tabPaneFreelance) tabPaneFreelance.style.display = "none";
      if (tabPaneCoaching)  tabPaneCoaching.style.display  = "block";
    } else if (!hasCoaching && hasFreelance) {
      if (tabLinkCoaching)  tabLinkCoaching.style.display  = "none";
      if (tabPaneCoaching)  tabPaneCoaching.style.display  = "none";
      if (tabPaneFreelance) tabPaneFreelance.style.display = "block";
      if (tabLinkFreelance) tabLinkFreelance.click();
    } else {
      // suspended ou aucun service actif → tout masquer
      if (tabLinkCoaching)  tabLinkCoaching.style.display  = "none";
      if (tabLinkFreelance) tabLinkFreelance.style.display = "none";
      if (tabPaneCoaching)  tabPaneCoaching.style.display  = "none";
      if (tabPaneFreelance) tabPaneFreelance.style.display = "none";
    }

    if (hasCoaching) {
      const priceHT = data.price_cents ? data.price_cents / 100 : 0;
      const priceTTC = data.tva ? priceHT * 1.20 : priceHT;
      setText("#formateur-coaching-price", `${priceTTC.toFixed(0)}€ de l'heure`);
      setHTML("#formateur-coaching-text", data.text_coaching);
    }

    if (hasFreelance) setHTML("#formateur-freelance-text", data.text_freelance);

    // ✅ AJOUT — Render cours
    renderCourses(raw.freelancer_page_data?.courses || []);

    // ✅ AJOUT — Render articles
    renderArticles(raw.freelancer_page_data?.articles || []);

    initBooking(data, rules, exceptions, bookings);

  } catch (error) {
    console.error("[Freelance] ❌ Erreur:", error);
    removeSkeleton();
  }

  // ============================================================
  // ✅ AJOUT — DOT STATUS
  // ============================================================
  function applyStatusDot(status) {
    const wrap    = document.getElementById('freelance-status-dot-wrap');
    const dot     = document.getElementById('freelance-pulse-dot');
    const labelEl = document.getElementById('freelance-status-dot-label');
    if (!dot || !labelEl) return;

    if (status === 'active') {
      dot.classList.remove('offline');
      labelEl.textContent = 'Disponible';
      labelEl.style.color = '#22c55e';
    } else if (status === 'suspended') {
      dot.classList.add('offline');
      labelEl.textContent = 'Hors ligne';
      labelEl.style.color = '#f97316';
    } else {
      // cancel ou autre → cacher
      if (wrap) wrap.style.display = 'none';
    }
  }

  // ============================================================
  // ✅ AJOUT — RENDER COURS
  // ============================================================
  function renderCourses(courses) {
    const list = document.getElementById('fl-courses-list');
    if (!list) return;

    if (!courses || !courses.length) {
      list.innerHTML = '<div class="fl-empty-msg">0 cours publiés</div>';
      return;
    }

    list.innerHTML = '';
    courses.forEach(function(item) {
      const c       = item.course || {};
      const slug    = c.slug || '';
      const title   = c.title || '—';
      const cover   = c.cover_url || '';
      const icon    = c.icon_cours_url || '';
      const nbMods  = item.nb_modules || 0;
      const durMin  = Math.round((item.duration || 0) / 60);
      const nbPart  = c.nb_participants || 0;
      const avgNote = parseFloat(c.average_notation) || 0;
      const nbNote  = c.nb_notation || 0;

      const ratingHTML = (avgNote > 0 && nbNote > 0)
        ? `<span class="fl-course-rating">⭐ ${avgNote.toFixed(1)} (${nbNote} avis)</span>`
        : '';

      const card = document.createElement('a');
      card.href      = 'https://www.digitools-room.com/pages-formation/' + slug;
      card.className = 'fl-course-card';
      card.target    = '_blank';
      card.rel       = 'noopener';
      card.innerHTML =
        (cover ? `<img class="fl-course-cover" src="${cover}" alt="${title}" />` : '<div class="fl-course-cover"></div>') +
        `<div class="fl-course-info">
          <div class="fl-course-icon-title">
            ${icon ? `<img class="fl-course-icon" src="${icon}" alt="" />` : ''}
            <div class="fl-course-title">${title}</div>
          </div>
          <div class="fl-course-meta">
            <span class="fl-course-badge">📚 ${nbMods} module${nbMods !== 1 ? 's' : ''}</span>
            ${durMin > 0 ? `<span class="fl-course-badge">⏱ ${durMin} min</span>` : ''}
            <span class="fl-course-badge">👥 ${nbPart} participant${nbPart !== 1 ? 's' : ''}</span>
            ${ratingHTML}
          </div>
        </div>`;

      list.appendChild(card);
    });
  }

  // ============================================================
  // ✅ AJOUT — RENDER ARTICLES
  // ============================================================
  function renderArticles(articles) {
    const list = document.getElementById('fl-articles-list');
    if (!list) return;

    if (!articles || !articles.length) {
      list.innerHTML = '<div class="fl-empty-msg">0 articles publiés</div>';
      return;
    }

    list.innerHTML = '';
    articles.forEach(function(item) {
      const a           = item.article || {};
      const title       = a.title || '—';
      const slug        = a.slug  || '';
      const img         = a.url_image || '';
      const isRessource = a.is_ressource === true;
      const tempsSec    = a.temps_lecture_secondes || 0;
      const nbView      = a.nb_view || 0;
      const tempsMin    = Math.round(tempsSec / 60) || 1;

      const card = document.createElement('a');
      card.href      = 'https://www.digitools-room.com/articles-de-blog/' + slug;
      card.className = 'fl-article-card';
      card.target    = '_blank';
      card.rel       = 'noopener';
      card.innerHTML =
        (img ? `<img class="fl-article-img" src="${img}" alt="${title}" />` : '<div class="fl-article-img"></div>') +
        `<div class="fl-article-info">
          <div class="fl-article-title">${title}</div>
          <div class="fl-article-meta">
            <span class="fl-article-badge">⏱ ${tempsMin} min</span>
            ${nbView > 0 ? `<span class="fl-article-badge">👁 ${nbView} vues</span>` : ''}
            ${isRessource ? '<span class="fl-article-badge ressource">📎 Ressource</span>' : ''}
          </div>
        </div>`;

      list.appendChild(card);
    });
  }

  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = (text !== null && text !== undefined && text !== "") ? String(text) : "";
  }

  function setHTML(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html || "";
  }

  // ============================================================
  // RENDER AVIS
  // ============================================================
  function openAvisModal(validAvis) {
    const modalEl = document.querySelector("#avis-modal");
    const mListEl = document.querySelector("#avis-modal-list");
    if (!modalEl || !mListEl) return;
    mListEl.innerHTML = '';
    validAvis.forEach(avis => mListEl.appendChild(buildAvisCard(avis, true)));
    modalEl.classList.add('active');
  }

  function renderAvis(notations) {
    const listEl      = document.querySelector("#avis-list");
    const modalEl     = document.querySelector("#avis-modal");
    const voirPlusBtn = document.querySelector("#avis-voir-plus");
    const mCloseBtn   = document.querySelector("#avis-modal-close");
    if (!listEl) return;

    const validAvis = notations.slice().sort((a, b) => b.created_at - a.created_at);
    const top3 = validAvis.slice(0, 3);
    listEl.innerHTML = '';

    if (!top3.length) {
      listEl.innerHTML = '<div class="avis-empty">Aucun avis pour le moment.</div>';
      if (voirPlusBtn) voirPlusBtn.style.display = 'none';
      return;
    }

    top3.forEach(avis => {
      const card = buildAvisCard(avis, false);
      card.addEventListener('click', () => openAvisModal(validAvis));
      listEl.appendChild(card);
    });

    if (voirPlusBtn) {
      if (validAvis.length > 3) {
        voirPlusBtn.style.setProperty('display', 'block', 'important');
        voirPlusBtn.textContent = 'Voir les ' + validAvis.length + ' avis →';
        voirPlusBtn.addEventListener('click', () => openAvisModal(validAvis));
      } else {
        voirPlusBtn.style.display = 'none';
      }
    }

    const avisHeaderEl = document.querySelector("#avis-header-count");
    if (avisHeaderEl) {
      avisHeaderEl.textContent = validAvis.length + ' avis';
      avisHeaderEl.style.display = validAvis.length > 0 ? '' : 'none';
    }

    if (mCloseBtn) mCloseBtn.addEventListener('click', () => { if (modalEl) modalEl.classList.remove('active'); });
    if (modalEl) modalEl.addEventListener('click', e => { if (e.target === modalEl) modalEl.classList.remove('active'); });
  }

  function buildAvisCard(avis, inModal) {
    const div = document.createElement('div');
    div.className = inModal ? 'avis-card avis-card-modal' : 'avis-card';
    const stars = Math.round(avis.note);
    let starsHTML = '';
    for (let i = 0; i < 5; i++) starsHTML += '<span class="avis-star-icon" style="color:' + (i < stars ? '#f59e0b' : '#e5e7eb') + ';">★</span>';
    const serviceLabel = avis.service === 'coaching' ? '🤝 Coaching' : '💼 Freelance';
    const hasComment = avis.commentaire && avis.commentaire.trim();
    const ini = ((avis.first_name || '').charAt(0) + (avis.last_name || '').charAt(0)).toUpperCase() || '?';
    const avatarHTML = avis.image_url
      ? '<img class="avis-avatar" src="' + avis.image_url + '" alt="' + (avis.first_name || '') + '" />'
      : '<div class="avis-avatar-fallback">' + ini + '</div>';
    const commentHTML = hasComment ? '<div class="avis-comment">&ldquo;' + avis.commentaire + '&rdquo;</div>' : '<div class="avis-no-comment">Aucun commentaire</div>';
    const hintHTML = inModal ? '' : '<span class="avis-read-hint">Lire →</span>';
    div.innerHTML = '<div class="avis-card-header">' + avatarHTML + '<div class="avis-user-info"><div class="avis-user-name">' + (avis.first_name || '') + ' ' + (avis.last_name || '') + '</div><div class="avis-stars-row">' + starsHTML + '<span class="avis-note-num">' + avis.note + '/5</span></div></div><span class="avis-service-badge">' + serviceLabel + '</span></div>' + commentHTML + hintHTML;
    return div;
  }

  // ============================================================
  // SKELETON
  // ============================================================
  function injectSkeletonStyles() {
    if (document.getElementById('sk-styles')) return;
    const style = document.createElement('style');
    style.id = 'sk-styles';
    style.textContent = `
      @keyframes sk-shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
      .sk-box { display:inline-block; border-radius:8px; background:linear-gradient(90deg,#e8edf5 25%,#d0d8e8 50%,#e8edf5 75%); background-size:600px 100%; animation:sk-shimmer 1.4s infinite linear; min-height:16px; }
      .sk-hidden-content { opacity:0 !important; pointer-events:none !important; }
    `;
    document.head.appendChild(style);
  }

  function applySkeleton() {
    const profileWrapper = document.querySelector(".profile-img-wrapper");
    if (profileWrapper) {
      profileWrapper.classList.add('sk-hidden-content');
      const skImg = document.createElement('div');
      skImg.className = 'sk-box sk-img-placeholder';
      skImg.style.cssText = `width:${profileWrapper.offsetWidth||144}px;height:${profileWrapper.offsetHeight||160}px;border-radius:1rem;display:block;`;
      profileWrapper.insertAdjacentElement('beforebegin', skImg);
    }
    skText("#formateur-display-name", 200, 22);
    skText("#formateur-headline", 160, 14);
    skText("#formateur-xp-years", 40, 14);
    skText("#formateur-xp-domaine", 100, 14);
    skText("#formateur-domaine-activity", 100, 14);
    skText("#formateur-coaching-price", 80, 14);
    skMultiline("#formateur-about", 3);
    skMultiline("#formateur-audience", 2);
    skMultiline("#formateur-expertise", 2);
    skMultiline("#formateur-coaching-text", 2);
    skMultiline("#formateur-freelance-text", 2);
    skTextInline("#nb_followers", 40, 18);
    skTextInline("#nb_project", 40, 18);
    skTextInline("#average_avis", 40, 18);
    skTextInline("#nb_avis", 60, 14);
  }

  function skText(selector, width, height) { const el=document.querySelector(selector); if(!el) return; el.classList.add('sk-hidden-content'); injectSkeletonBefore(el,width,height); }
  function skTextInline(selector, width, height) { const el=document.querySelector(selector); if(!el) return; el.classList.add('sk-hidden-content'); const box=document.createElement('div'); box.className='sk-box sk-placeholder'; box.style.cssText=`width:${width}px;height:${height}px;display:inline-block;vertical-align:middle;border-radius:6px;`; el.insertAdjacentElement('beforebegin',box); }
  function skMultiline(selector, lines) { const el=document.querySelector(selector); if(!el) return; el.classList.add('sk-hidden-content'); const wrap=document.createElement('div'); wrap.className='sk-multiline-placeholder'; wrap.style.cssText='display:flex;flex-direction:column;gap:8px;'; for(let i=0;i<lines;i++){const box=document.createElement('div'); box.className='sk-box'; box.style.width=i===lines-1?'65%':'100%'; box.style.height='14px'; wrap.appendChild(box);} el.insertAdjacentElement('beforebegin',wrap); }
  function injectSkeletonBefore(el, width, height) { const box=document.createElement('div'); box.className='sk-box sk-placeholder'; box.style.cssText=`width:100%;max-width:${width}px;height:${height}px;display:block;`; el.insertAdjacentElement('beforebegin',box); }
  function removeSkeleton() { document.querySelectorAll('.sk-placeholder,.sk-multiline-placeholder,.sk-img-placeholder').forEach(el=>el.remove()); document.querySelectorAll('.sk-hidden-content').forEach(el=>el.classList.remove('sk-hidden-content')); }
});

// ============================================================
// SYSTÈME DE RÉSERVATION
// ============================================================
function initBooking(data, rules, exceptions, bookings) {

  const getAuth  = () => { try { return JSON.parse(localStorage.getItem("auth") || "null"); } catch { return null; } };
  const getToken = () => { const a = getAuth(); return a?.authToken || a?.token || a?.jwt || null; };

  const stripe = Stripe('pk_test_51SyzcDL3xhjHUkMPws3SM77dfSMlxd0ji3JzWRYkSdbOS0dCATxxKRcaFaOrwmc8dnce969oeB7xgADPK9rxtuWt00ik1auOHM');

  const overlay    = document.getElementById('booking-overlay');
  const closeBtn   = document.getElementById('booking-modal-close');
  const modalTitle = document.getElementById('booking-modal-title');
  const step1El    = document.getElementById('booking-step-1');
  const step2El    = document.getElementById('booking-step-2');
  const dot1       = document.getElementById('step-dot-1');
  const dot2       = document.getElementById('step-dot-2');

  const DAYS_FR   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  const bufferMin         = data.buffer_between_min_integer || 0;
  const coachingDurations = Array.isArray(data.coaching_duration) ? data.coaching_duration : [60];
  const noticeHours       = data.min_notice_hours || 0;
  const freelanceTz       = data.timezone || 'Europe/Paris';
  const visitorTz         = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function injectPaymentModal() {
    if (document.getElementById('payment-overlay')) return;
    const style = document.createElement('style');
    style.textContent = `
      #payment-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center; padding:20px; }
      #payment-overlay.active { display:flex; }
      #payment-modal {
        background:#fff; border-radius:20px; padding:32px 28px 28px;
        max-width:460px; width:100%; position:relative;
        box-shadow:0 20px 60px rgba(0,0,0,0.15); font-family:'DM Sans',sans-serif;
        max-height:90vh; overflow-y:auto;
      }
      #payment-modal-close { position:absolute; top:16px; right:16px; background:#f4f4f0; border:none; border-radius:50%; width:32px; height:32px; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#666; }
      #payment-modal-close:hover { background:#e8e8e4; }
      .payment-title { font-size:1.1rem; font-weight:700; color:#0f0f0f; margin-bottom:4px; }
      .payment-subtitle { font-size:0.82rem; color:#9a9a9a; margin-bottom:20px; }
      .payment-reassurance { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px 14px; font-size:0.78rem; color:#166534; margin-bottom:20px; display:flex; gap:8px; align-items:flex-start; line-height:1.5; }
      .payment-amount { background:#f8f9ff; border:1px solid #BFDBFE; border-radius:10px; padding:14px 16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; }
      .payment-amount-label { font-size:0.82rem; color:#9a9a9a; }
      .payment-amount-value { font-size:1.1rem; font-weight:700; color:#0f0f0f; }
      #payment-element { margin-bottom:20px; }
      #payment-submit { display:block; width:100%; padding:13px; background:#2563eb; color:#fff; border:none; border-radius:10px; font-family:'DM Sans',sans-serif; font-size:0.9rem; font-weight:600; cursor:pointer; transition:background 0.15s; }
      #payment-submit:hover { background:#1d4ed8; }
      #payment-submit:disabled { opacity:0.6; cursor:not-allowed; }
      #payment-error { color:#ef4444; font-size:0.8rem; margin-top:10px; text-align:center; min-height:20px; }
    `;
    document.head.appendChild(style);
    const paymentOverlay = document.createElement('div');
    paymentOverlay.id = 'payment-overlay';
    paymentOverlay.innerHTML = `
      <div id="payment-modal">
        <button id="payment-modal-close">✕</button>
        <div class="payment-title">💳 Paiement sécurisé</div>
        <div class="payment-subtitle" id="payment-subtitle"></div>
        <div class="payment-reassurance">
          <span>🔒</span>
          <span>Votre carte sera autorisée mais <strong>vous ne serez débité que si le freelance accepte le rendez-vous</strong>. En cas de refus, aucun montant ne sera prélevé.</span>
        </div>
        <div class="payment-amount">
          <span class="payment-amount-label">Montant à autoriser</span>
          <span class="payment-amount-value" id="payment-amount-display"></span>
        </div>
        <div id="payment-element"></div>
        <button id="payment-submit">Autoriser le paiement</button>
        <div id="payment-error"></div>
      </div>`;
    document.body.appendChild(paymentOverlay);
    document.getElementById('payment-modal-close')?.addEventListener('click', () => paymentOverlay.classList.remove('active'));
    paymentOverlay.addEventListener('click', e => { if (e.target === paymentOverlay) paymentOverlay.classList.remove('active'); });
  }

  injectPaymentModal();

  function injectConfirmationModal() {
    if (document.getElementById('booking-confirm-overlay')) return;
    const style = document.createElement('style');
    style.textContent = `
      #booking-confirm-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center; padding:20px; }
      #booking-confirm-overlay.active { display:flex; }
      #booking-confirm-modal { background:#fff; border-radius:20px; padding:32px 28px 28px; max-width:460px; width:100%; position:relative; box-shadow:0 20px 60px rgba(0,0,0,0.15); font-family:'DM Sans',sans-serif; }
      #booking-confirm-close { position:absolute; top:16px; right:16px; background:#f4f4f0; border:none; border-radius:50%; width:32px; height:32px; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#666; }
      .confirm-icon { font-size:2.5rem; text-align:center; margin-bottom:12px; }
      .confirm-title { font-size:1.2rem; font-weight:700; color:#0f0f0f; text-align:center; margin-bottom:4px; }
      .confirm-subtitle { font-size:0.82rem; color:#9a9a9a; text-align:center; margin-bottom:24px; }
      .confirm-details { background:#f8f9ff; border:1px solid #BFDBFE; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:10px; margin-bottom:20px; }
      .confirm-detail-row { display:flex; align-items:center; gap:10px; font-size:0.85rem; color:#0f0f0f; }
      .confirm-detail-icon { font-size:1rem; flex-shrink:0; width:20px; text-align:center; }
      .confirm-detail-label { color:#9a9a9a; font-size:0.75rem; min-width:70px; }
      .confirm-detail-value { font-weight:600; }
      .confirm-visio-note { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px 14px; font-size:0.78rem; color:#166534; margin-bottom:20px; display:flex; gap:8px; align-items:flex-start; line-height:1.5; }
      .confirm-btn { display:block; width:100%; padding:13px; background:#2563eb; color:#fff; border:none; border-radius:10px; font-family:'DM Sans',sans-serif; font-size:0.9rem; font-weight:600; cursor:pointer; text-align:center; text-decoration:none; transition:background 0.15s; box-sizing:border-box; }
      .confirm-btn:hover { background:#1d4ed8; }
      .booking-error-banner { background:#FEE2E2; border:1px solid #FCA5A5; border-radius:10px; padding:10px 14px; font-size:0.82rem; color:#991B1B; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
      .file-drop-zone { border:2px dashed #BFDBFE; border-radius:12px; background:#F8FAFF; padding:16px 12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; cursor:pointer; transition:all 0.2s; text-align:center; }
      .file-drop-zone:hover { border-color:#2563eb; background:#EFF6FF; }
      .file-drop-zone.has-file { border-style:solid; border-color:#86efac; background:#f0fdf4; }
      .file-drop-zone-icon { font-size:1.4rem; }
      .file-drop-zone-title { font-size:0.78rem; font-weight:700; color:#111112; font-family:'DM Sans',sans-serif; }
      .file-drop-zone-sub { font-size:0.68rem; color:#9ca3af; font-family:'DM Sans',sans-serif; }
      .file-drop-zone-success { font-size:0.72rem; color:#15803d; font-weight:600; font-family:'DM Sans',sans-serif; display:none; word-break:break-all; }
      .file-drop-zone.has-file .file-drop-zone-icon, .file-drop-zone.has-file .file-drop-zone-title, .file-drop-zone.has-file .file-drop-zone-sub { display:none; }
      .file-drop-zone.has-file .file-drop-zone-success { display:block; }
      .attachments-row { display:flex; gap:16px; }
      .attachments-row .form-field { flex:1; min-width:0; }
      @media (max-width:600px) { .attachments-row { flex-direction:column; } }
    `;
    document.head.appendChild(style);
    const confirmOverlay = document.createElement('div');
    confirmOverlay.id = 'booking-confirm-overlay';
    confirmOverlay.innerHTML = `
      <div id="booking-confirm-modal">
        <button id="booking-confirm-close">✕</button>
        <div class="confirm-icon">🎉</div>
        <div class="confirm-title" id="confirm-title"></div>
        <div class="confirm-subtitle" id="confirm-subtitle"></div>
        <div class="confirm-details" id="confirm-details"></div>
        <div class="confirm-visio-note"><span>💡</span><span>Sur votre page <strong>Mes rendez-vous</strong> vous retrouverez toutes les informations de votre session.</span></div>
        <a href="https://www.digitools-room.com/oauth/mes-freelances" class="confirm-btn">Voir mon rendez-vous →</a>
      </div>`;
    document.body.appendChild(confirmOverlay);
    document.getElementById('booking-confirm-close')?.addEventListener('click', () => confirmOverlay.classList.remove('active'));
    confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) confirmOverlay.classList.remove('active'); });
  }

  function showConfirmation(bookingType, slot, duration, displayName) {
    const confirmOverlay = document.getElementById('booking-confirm-overlay');
    if (!confirmOverlay) return;
    const isCoach = bookingType === 'coaching';
    const dateLabel = new Date(slot.startUtcMs).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone: visitorTz });
    document.getElementById('confirm-title').textContent    = `Votre rendez-vous avec ${displayName} est confirmé !`;
    document.getElementById('confirm-subtitle').textContent = isCoach ? 'Votre session coaching a bien été enregistrée. Le freelance dispose de 48h pour confirmer.' : 'Votre demande de rendez-vous a bien été envoyée.';
    document.getElementById('confirm-details').innerHTML = `
      <div class="confirm-detail-row"><span class="confirm-detail-icon">👤</span><span class="confirm-detail-label">Avec</span><span class="confirm-detail-value">${displayName}</span></div>
      <div class="confirm-detail-row"><span class="confirm-detail-icon">📅</span><span class="confirm-detail-label">Date</span><span class="confirm-detail-value">${dateLabel}</span></div>
      <div class="confirm-detail-row"><span class="confirm-detail-icon">🕐</span><span class="confirm-detail-label">Heure</span><span class="confirm-detail-value">${slot.displayTime}</span></div>
      <div class="confirm-detail-row"><span class="confirm-detail-icon">⏱️</span><span class="confirm-detail-label">Durée</span><span class="confirm-detail-value">${duration} min</span></div>
      <div class="confirm-detail-row"><span class="confirm-detail-icon">${isCoach ? '🎯' : '💼'}</span><span class="confirm-detail-label">Type</span><span class="confirm-detail-value">${isCoach ? 'Session coaching' : 'Rendez-vous freelance'}</span></div>`;
    confirmOverlay.classList.add('active');
  }

  injectConfirmationModal();

  function toLocalDateStr(date) { const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
  function getLocalDow(date) { const noon=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12,0,0); const jsDay=noon.getDay(); return jsDay===0?7:jsDay; }
  function toDateStr(val) { if(!val) return ''; if(typeof val==='string'&&val.includes('-')) return val.substring(0,10); return toLocalDateStr(new Date(typeof val==='number'?val:parseInt(val))); }
  function getMonthStartOffset(year, mon) { const d=new Date(year,mon,1,12,0,0).getDay(); return d===0?6:d-1; }
  function freelanceMinToUtcMs(dateStr, minutes) { const midnight=new Date(`${dateStr}T00:00:00Z`); const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:freelanceTz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}); const parts=formatter.formatToParts(midnight); const p={}; parts.forEach(x=>{p[x.type]=x.value;}); const offsetMs=(parseInt(p.hour)*60+parseInt(p.minute))*60000; return midnight.getTime()-offsetMs+minutes*60000; }
  function utcMsToVisitorTime(utcMs) { return new Intl.DateTimeFormat('fr-FR',{timeZone:visitorTz,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(utcMs)); }
  function isInException(dateStr) { return exceptions.some(e=>{const s=toDateStr(e.start_at); const en=toDateStr(e.end_at); return dateStr>=s&&dateStr<=en;}); }
  function isSlotBooked(s,e) { return bookings.some(b=>{const bS=typeof b.start_at==='number'?b.start_at:parseInt(b.start_at); const bE=typeof b.end_at==='number'?b.end_at:parseInt(b.end_at); return s<bE&&e>bS;}); }
  function dayHasSlots(date, duration) { const dow=getLocalDow(date); const dateStr=toLocalDateStr(date); if(!rules.some(r=>r.day_of_week===dow)) return false; if(isInException(dateStr)) return false; const dur=duration||60; const dayRules=rules.filter(r=>r.day_of_week===dow); return dayRules.some(rule=>{let current=rule.start_time; while(current+dur<=rule.end_time){const sMs=freelanceMinToUtcMs(dateStr,current); const eMs=freelanceMinToUtcMs(dateStr,current+dur); if(!isSlotBooked(sMs,eMs)) return true; current+=dur+bufferMin;} return false;}); }
  function getSlotsForDay(date, duration) { const dow=getLocalDow(date); const dateStr=toLocalDateStr(date); const dayRules=rules.filter(r=>r.day_of_week===dow); const dur=duration||60; const step=dur+bufferMin; const slots=[]; dayRules.forEach(rule=>{let current=rule.start_time; while(current+dur<=rule.end_time){const sMs=freelanceMinToUtcMs(dateStr,current); const eMs=freelanceMinToUtcMs(dateStr,current+dur); slots.push({startUtcMs:sMs,endUtcMs:eMs,startMin:current,endMin:current+dur,displayTime:utcMsToVisitorTime(sMs),booked:isSlotBooked(sMs,eMs)}); current+=step;}}); slots.sort((a,b)=>a.startUtcMs-b.startUtcMs); return slots; }

  let bookingState = { type:null,date:null,slot:null,duration:null,currentMonth:new Date(),phone:'',note:'',url:'',attachment1_url:'',attachment1_name:'',attachment2_url:'',attachment2_name:'' };
  let stripeElements = null;
  let currentPaymentIntentId = null;

  function renderStep1() {
    step1El.style.display=''; step2El.style.display='none';
    dot1.classList.add('active'); dot2.classList.remove('active');
    const isCoach=bookingState.type==='coaching';
    if(isCoach&&!bookingState.duration) bookingState.duration=coachingDurations[0];
    const now=new Date(); const month=bookingState.currentMonth; const year=month.getFullYear(); const mon=month.getMonth();
    const minBookingMs=now.getTime()+noticeHours*3600000; const minBookingDate=new Date(minBookingMs);
    const minDate=new Date(minBookingDate.getFullYear(),minBookingDate.getMonth(),minBookingDate.getDate()+1,12,0,0);
    const minDateStr=toLocalDateStr(minDate); const todayStr=toLocalDateStr(now); const lastDay=new Date(year,mon+1,0); const startDow=getMonthStartOffset(year,mon);
    let html=`<div class="cal-header"><button class="cal-nav-btn" id="cal-prev">‹</button><span class="cal-month-label">${MONTHS_FR[mon]} ${year}</span><button class="cal-nav-btn" id="cal-next">›</button></div><div class="cal-grid">${DAYS_FR.map(d=>`<div class="cal-day-name">${d}</div>`).join('')}${Array(startDow).fill('<div class="cal-day empty"></div>').join('')}`;
    for(let d=1;d<=lastDay.getDate();d++){const date=new Date(year,mon,d,12,0,0); const dateStr=toLocalDateStr(date); const isTooSoon=dateStr<minDateStr; const hasSlots=!isTooSoon&&dayHasSlots(date,bookingState.duration||60); const isSelected=bookingState.date===dateStr; const isToday=dateStr===todayStr; let cls='cal-day'; if(isTooSoon||!hasSlots) cls+=' disabled'; else cls+=' has-slots'; if(isSelected) cls+=' selected'; if(isToday) cls+=' today'; html+=`<div class="${cls}" data-date="${dateStr}">${d}</div>`;}
    html+=`</div>`;
    if(isCoach) html+=`<div class="durations-section"><div class="slots-title">Durée de la session</div><div class="duration-btns">${coachingDurations.map(dur=>`<button class="duration-btn ${bookingState.duration===dur?'selected':''}" data-duration="${dur}">${dur} min</button>`).join('')}</div></div>`;
    if(bookingState.date){const selectedDate=new Date(bookingState.date+'T12:00:00'); const slots=getSlotsForDay(selectedDate,bookingState.duration||60); const tzNote=freelanceTz!==visitorTz?`<div style="font-size:0.72rem;color:#9a9a9a;margin-bottom:8px;">Horaires en heure locale (${visitorTz})</div>`:''; html+=`<div class="slots-section"><div class="slots-title">Créneaux disponibles</div>${tzNote}${slots.length>0?`<div class="slots-grid">${slots.map((s,i)=>`<button class="slot-btn ${s.booked?'unavailable':''} ${bookingState.slot?.startUtcMs===s.startUtcMs&&!s.booked?'selected':''}" data-index="${i}" ${s.booked?'disabled':''}>${s.displayTime}</button>`).join('')}</div>`:`<p style="font-size:0.82rem;color:#9a9a9a;margin-bottom:20px;">Aucun créneau disponible ce jour.</p>`}</div>`; step1El._slots=slots;}
    html+=`<div class="booking-actions"><button class="booking-btn-next" id="step1-next" ${(!bookingState.date||!bookingState.slot)?'disabled':''}>Continuer →</button></div>`;
    step1El.innerHTML=html;
    document.getElementById('cal-prev')?.addEventListener('click',()=>{bookingState.currentMonth=new Date(year,mon-1,1);renderStep1();});
    document.getElementById('cal-next')?.addEventListener('click',()=>{bookingState.currentMonth=new Date(year,mon+1,1);renderStep1();});
    step1El.querySelectorAll('.cal-day:not(.disabled):not(.empty)').forEach(el=>{el.addEventListener('click',function(){bookingState.date=this.dataset.date;bookingState.slot=null;renderStep1();});});
    step1El.querySelectorAll('.duration-btn').forEach(btn=>{btn.addEventListener('click',function(){bookingState.duration=parseInt(this.dataset.duration);bookingState.slot=null;renderStep1();});});
    step1El.querySelectorAll('.slot-btn:not(.unavailable)').forEach(btn=>{btn.addEventListener('click',function(){const idx=parseInt(this.dataset.index);bookingState.slot=(step1El._slots||[])[idx]||null;renderStep1();});});
    document.getElementById('step1-next')?.addEventListener('click',renderStep2);
  }

  function renderStep2() {
    step1El.style.display='none'; step2El.style.display='';
    dot1.classList.add('active'); dot2.classList.add('active');
    const isCoach=bookingState.type==='coaching';
    const dateLabel=new Date(bookingState.date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
    const timeLabel=bookingState.slot?.displayTime||'';
    const durLabel=isCoach?` · ${bookingState.duration} min`:'';
    const noteLabel=isCoach?"Décrivez votre situation, vos objectifs et tout ce qui aidera le coach à préparer la session.":"Décrivez votre projet, vos besoins et tout ce qui aidera le freelance à préparer l'échange.";
    const noteTitle=isCoach?"Préparer la session":"Votre projet";
    const btnLabel=isCoach?"💳 Payer et réserver":"Confirmer le rendez-vous";

    step2El.innerHTML=`
      <div class="booking-recap-slot"><span class="booking-recap-slot-icon">📅</span><span class="booking-recap-slot-text">${dateLabel} à ${timeLabel}${durLabel}</span></div>
      <div id="booking-error-banner" style="display:none;" class="booking-error-banner">⚠️ Veuillez remplir tous les champs obligatoires avant de continuer.</div>
      <div class="booking-form" style="margin-top:20px;">
        <div class="form-field">
          <label class="form-label">Numéro de téléphone <span style="color:#ef4444;">*</span></label>
          <div class="form-hint">Utilisé uniquement par le ${isCoach?'coach':'freelance'} en cas de besoin</div>
          <input type="tel" class="form-input" id="booking-phone" placeholder="+33 6 12 34 56 78" value="${bookingState.phone}" />
        </div>
        <div class="form-field">
          <label class="form-label">${noteTitle} <span style="color:#ef4444;">*</span></label>
          <textarea class="form-textarea" id="booking-note" placeholder="${noteLabel}">${bookingState.note}</textarea>
        </div>
        <div class="form-field">
          <label class="form-label">URL de référence <span class="form-optional">(optionnel)</span></label>
          <input type="url" class="form-input" id="booking-url" placeholder="https://votre-site.com" value="${bookingState.url}" />
        </div>
        <div class="attachments-row">
          <div class="form-field">
            <label class="form-label">Pièce jointe 1 <span class="form-optional">(optionnel)</span></label>
            <div class="file-drop-zone ${bookingState.attachment1_url?'has-file':''}" id="file-zone-1" onclick="document.getElementById('booking-file-1').click()">
              <div class="file-drop-zone-icon">📎</div>
              <div class="file-drop-zone-title">Ajouter un fichier</div>
              <div class="file-drop-zone-sub">PDF, JPG, PNG, DOCX</div>
              <div class="file-drop-zone-success" id="file-success-1">${bookingState.attachment1_url?'✅ Fichier chargé':''}</div>
            </div>
            <input type="file" id="booking-file-1" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
            <input type="text" class="form-input" id="file-name-1" placeholder="Nommez votre fichier" autocomplete="off" style="margin-top:8px;display:${bookingState.attachment1_url?'block':'none'};" value="${bookingState.attachment1_name}" />
          </div>
          <div class="form-field">
            <label class="form-label">Pièce jointe 2 <span class="form-optional">(optionnel)</span></label>
            <div class="file-drop-zone ${bookingState.attachment2_url?'has-file':''}" id="file-zone-2" onclick="document.getElementById('booking-file-2').click()">
              <div class="file-drop-zone-icon">📎</div>
              <div class="file-drop-zone-title">Ajouter un fichier</div>
              <div class="file-drop-zone-sub">PDF, JPG, PNG, DOCX</div>
              <div class="file-drop-zone-success" id="file-success-2">${bookingState.attachment2_url?'✅ Fichier chargé':''}</div>
            </div>
            <input type="file" id="booking-file-2" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
            <input type="text" class="form-input" id="file-name-2" placeholder="Nommez votre fichier" autocomplete="off" style="margin-top:8px;display:${bookingState.attachment2_url?'block':'none'};" value="${bookingState.attachment2_name}" />
          </div>
        </div>
      </div>
      <div class="booking-actions">
        <button class="booking-btn-back" id="step2-back">← Retour</button>
        <button class="${isCoach?'booking-btn-pay':'booking-btn-next'}" id="step2-submit">${btnLabel}</button>
      </div>`;

    document.getElementById('booking-phone')?.addEventListener('input',e=>{bookingState.phone=e.target.value;if(e.target.value.trim()){e.target.style.borderColor='#BFDBFE';document.getElementById('booking-error-banner').style.display='none';}});
    document.getElementById('booking-note')?.addEventListener('input',e=>{bookingState.note=e.target.value;if(e.target.value.trim()){e.target.style.borderColor='#BFDBFE';document.getElementById('booking-error-banner').style.display='none';}});
    document.getElementById('booking-url')?.addEventListener('input',e=>{bookingState.url=e.target.value;});
    document.getElementById('file-name-1')?.addEventListener('input',e=>{bookingState.attachment1_name=e.target.value;});
    document.getElementById('file-name-2')?.addEventListener('input',e=>{bookingState.attachment2_name=e.target.value;});

    document.getElementById('booking-file-1')?.addEventListener('change',async function(){
      const url = await uploadFile(this.files[0], 'file-zone-1', 'file-success-1');
      if(url) bookingState.attachment1_url = url;
    });
    document.getElementById('booking-file-2')?.addEventListener('change',async function(){
      const url = await uploadFile(this.files[0], 'file-zone-2', 'file-success-2');
      if(url) bookingState.attachment2_url = url;
    });

    document.getElementById('step2-back')?.addEventListener('click',renderStep1);
    document.getElementById('step2-submit')?.addEventListener('click',submitBooking);
  }

  async function uploadFile(file, zoneId, successId) {
    if (!file) return null;
    const zone = document.getElementById(zoneId);
    const successEl = document.getElementById(successId);
    if (successEl) { successEl.textContent = '⏳ Upload en cours...'; successEl.style.display = 'block'; }
    if (zone) zone.classList.add('has-file');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof', {
        method: 'POST',
        headers: getToken() ? { Authorization: 'Bearer ' + getToken() } : {},
        body: formData
      });
      const d = await res.json();
      const url = d?.path ? 'https://xmot-l3ir-7kuj.p7.xano.io' + d.path : null;
      if (url) {
        if (successEl) successEl.textContent = '✅ ' + file.name;
        const nameInput = document.getElementById(zoneId === 'file-zone-1' ? 'file-name-1' : 'file-name-2');
        if (nameInput) nameInput.style.display = 'block';
        return url;
      } else {
        if (successEl) successEl.textContent = '❌ Erreur upload';
        if (zone) zone.classList.remove('has-file');
        return null;
      }
    } catch {
      if (successEl) successEl.textContent = '❌ Erreur upload';
      if (zone) zone.classList.remove('has-file');
      return null;
    }
  }

  async function submitBooking() {
    const btn = document.getElementById('step2-submit');
    const token = getToken();
    const isCoach = bookingState.type === 'coaching';

    let hasError = false;
    let firstErrorEl = null;
    const phoneInput = document.getElementById('booking-phone');
    const noteInput  = document.getElementById('booking-note');
    const name1Input = document.getElementById('file-name-1');
    const name2Input = document.getElementById('file-name-2');
    const banner     = document.getElementById('booking-error-banner');

    if (!bookingState.phone || bookingState.phone.trim() === '') {
      if (phoneInput) { phoneInput.style.borderColor = '#ef4444'; if (!firstErrorEl) firstErrorEl = phoneInput; }
      hasError = true;
    } else { if (phoneInput) phoneInput.style.borderColor = '#BFDBFE'; }

    if (!bookingState.note || bookingState.note.trim() === '') {
      if (noteInput) { noteInput.style.borderColor = '#ef4444'; if (!firstErrorEl) firstErrorEl = noteInput; }
      hasError = true;
    } else { if (noteInput) noteInput.style.borderColor = '#BFDBFE'; }

    if (bookingState.attachment1_url && !bookingState.attachment1_name.trim()) {
      if (name1Input) { name1Input.style.borderColor = '#ef4444'; if (!firstErrorEl) firstErrorEl = name1Input; }
      hasError = true;
    } else { if (name1Input) name1Input.style.borderColor = '#BFDBFE'; }

    if (bookingState.attachment2_url && !bookingState.attachment2_name.trim()) {
      if (name2Input) { name2Input.style.borderColor = '#ef4444'; if (!firstErrorEl) firstErrorEl = name2Input; }
      hasError = true;
    } else { if (name2Input) name2Input.style.borderColor = '#BFDBFE'; }

    if (hasError) {
      if (banner) banner.style.display = 'flex';
      if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (banner) banner.style.display = 'none';

    if (isCoach) {
      if (btn) { btn.disabled = true; btn.textContent = 'Chargement...'; }
      try {
        const piRes = await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_payment_intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ freelancer_profile_id: data.id, duration_min: bookingState.duration })
        });
        const piData = await piRes.json();
        if (!piData?.client_secret) throw new Error('Impossible de créer le paiement');

        currentPaymentIntentId = piData.payment_intent_id;

        const amountHT = (data.price_cents * bookingState.duration / 60) / 100;
        const amountTTC = data.tva ? amountHT * 1.20 : amountHT;
        document.getElementById('payment-amount-display').textContent = amountTTC.toFixed(0) + ' €';
        document.getElementById('payment-subtitle').textContent = `Session coaching · ${bookingState.duration} min avec ${data.display_name}`;

        stripeElements = stripe.elements({ clientSecret: piData.client_secret, locale: 'fr' });
        const paymentElement = stripeElements.create('payment');
        document.getElementById('payment-element').innerHTML = '';
        paymentElement.mount('#payment-element');

        document.getElementById('payment-overlay').classList.add('active');

        document.getElementById('payment-submit').onclick = async () => {
          const payBtn = document.getElementById('payment-submit');
          const errorEl = document.getElementById('payment-error');
          payBtn.disabled = true;
          payBtn.textContent = 'Autorisation en cours...';
          errorEl.textContent = '';

          const { error } = await stripe.confirmPayment({
            elements: stripeElements,
            confirmParams: { return_url: window.location.href },
            redirect: 'if_required'
          });

          if (error) {
            errorEl.textContent = error.message;
            payBtn.disabled = false;
            payBtn.textContent = 'Autoriser le paiement';
            return;
          }

          payBtn.textContent = 'Création du rendez-vous...';
          await createBookingItem(token);
        };

      } catch(err) {
        console.error('[Payment] Erreur:', err);
        alert('Une erreur est survenue, veuillez réessayer.');
      }
      if (btn) { btn.disabled = false; btn.textContent = '💳 Payer et réserver'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Envoi...'; }
    await createBookingItem(token);
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmer le rendez-vous'; }
  }

  async function createBookingItem(token) {
    const payload = {
      freelancer_profile_id: data.id,
      booking_type: bookingState.type,
      duration_min: bookingState.duration || (bookingState.slot.endMin - bookingState.slot.startMin),
      price_cents: bookingState.type === 'coaching' ? (data.price_cents || 0) : 0,
      currency: 'EUR',
      start_at: bookingState.slot.startUtcMs,
      end_at: bookingState.slot.endUtcMs,
      client_phone: bookingState.phone || '',
      client_note: bookingState.note || '',
      reference_url: bookingState.url || '',
      attachment_1_url: bookingState.attachment1_url || '',
      attachment_1_name: bookingState.attachment1_url ? bookingState.attachment1_name || '' : '',
      attachment_2_url: bookingState.attachment2_url || '',
      attachment_2_name: bookingState.attachment2_url ? bookingState.attachment2_name || '' : '',
      payment_intent_id: currentPaymentIntentId || ''
    };
    try {
      const res = await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_booking_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        document.getElementById('payment-overlay')?.classList.remove('active');
        overlay.classList.remove('active');
        showConfirmation(bookingState.type, bookingState.slot, bookingState.duration || (bookingState.slot.endMin - bookingState.slot.startMin), data.display_name);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData?.message || 'Une erreur est survenue, veuillez réessayer.');
      }
    } catch(err) {
      console.error('[Booking] Erreur réseau:', err);
      alert('Erreur réseau, veuillez réessayer.');
    }
  }

  function openBooking(type) {
    const token = getToken();
    if (!token) { const c = document.querySelector(".abo-nonco-container"); if (c) c.style.setProperty("display","flex","important"); return; }
    bookingState = { type, date:null, slot:null, duration:type==='coaching'?coachingDurations[0]:null, currentMonth:new Date(), phone:'', note:'', url:'', attachment1_url:'', attachment1_name:'', attachment2_url:'', attachment2_name:'' };
    currentPaymentIntentId = null;
    modalTitle.textContent = type === 'coaching' ? 'Réserver une session coaching' : 'Prendre rendez-vous';
    overlay.classList.add('active');
    renderStep1();
  }

  document.querySelector('#coaching-book-btn')?.addEventListener('click', () => openBooking('coaching'));
  document.querySelector('#freelance-book-btn')?.addEventListener('click', () => openBooking('freelance'));
  closeBtn?.addEventListener('click', () => overlay.classList.remove('active'));
  overlay?.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('active'); });
}
