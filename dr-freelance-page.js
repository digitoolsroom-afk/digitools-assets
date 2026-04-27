/* ============================================================
   dr-freelance-page.js  —  Freelance Profile Page V2
   À héberger sur GitHub Pages
   ============================================================ */

document.addEventListener("DOMContentLoaded", async function () {

  /* ----------------------------------------------------------
     HELPERS
  ---------------------------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

  function setText(sel, val) {
    const el = $(sel);
    if (el) el.textContent = (val !== null && val !== undefined && val !== "") ? String(val) : "";
  }

  function setHTML(sel, html) {
    const el = $(sel);
    if (el) el.innerHTML = html || "";
  }

  function getAuth() {
    try { return JSON.parse(localStorage.getItem("auth") || "null"); } catch { return null; }
  }

  function getToken() {
    const a = getAuth();
    return a?.authToken || a?.token || a?.jwt || null;
  }

  /* ----------------------------------------------------------
     RÉCUPÉRATION DU FREELANCE ID
  ---------------------------------------------------------- */
  const formateurSection = $(".formateur-section");
  const freelanceIdAttr  = formateurSection?.getAttribute("freelance-id")?.trim();
  const freelanceId      = freelanceIdAttr;
  if (!freelanceId) return;

  /* ----------------------------------------------------------
     SKELETON
  ---------------------------------------------------------- */
  function applySkeleton() {
    const ids = [
      "formateur-display-name","formateur-headline","average_avis",
      "nb_project","nb_followers","fp-membre-depuis","fp-last-activity",
      "formateur-xp-years-display","fp-nb-courses","fp-nb-articles"
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add("fp-sk-hidden");
      const sk = document.createElement("span");
      sk.className = "fp-sk";
      sk.style.cssText = "width:80px;height:14px;display:inline-block;border-radius:6px;visibility:visible;";
      el.insertAdjacentElement("beforebegin", sk);
      el._sk = sk;
    });
    const photo = $("#freelance-profile-img");
    if (photo) {
      photo.classList.add("fp-sk-hidden");
    }
  }

  function removeSkeleton() {
    $$(".fp-sk").forEach(el => el.remove());
    $$(".fp-sk-hidden").forEach(el => el.classList.remove("fp-sk-hidden"));
  }

  applySkeleton();

  /* ----------------------------------------------------------
     FETCH DATA
  ---------------------------------------------------------- */
  const API_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/get_freelance_info_page";

  let data, rules, exceptions, bookings, notations, courses, articles, lastLogin;

  try {
    const res = await fetch(`${API_URL}?freelance_id=${freelanceId}`);
    if (!res.ok) throw new Error("API error");
    const raw = await res.json();

    data       = raw.freelancer_page_data?.data_profile || {};
    rules      = raw.freelancer_page_data?.rules        || [];
    exceptions = raw.freelancer_page_data?.exceptions   || [];
    bookings   = raw.freelancer_page_data?.booking      || [];
    notations  = raw.freelancer_page_data?.notation     || [];
    courses    = raw.freelancer_page_data?.courses      || [];
    articles   = raw.freelancer_page_data?.articles     || [];
    lastLogin  = raw.freelancer_page_data?.last_login   || null;

  } catch (err) {
    console.error("[FreelancePage] Erreur fetch:", err);
    removeSkeleton();
    return;
  }

  removeSkeleton();

  /* ----------------------------------------------------------
     HERO
  ---------------------------------------------------------- */

  // Photo
  const profileImg = $("#freelance-profile-img");
  if (profileImg && data.profile_image_url) {
    profileImg.src = data.profile_image_url;
    profileImg.alt = data.display_name || "";
  } else if (profileImg) {
    // Fallback initiales
    const initials = (data.display_name || "?").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
    profileImg.style.display = "none";
    const fallback = document.createElement("div");
    fallback.className = "fp-hero-photo-placeholder";
    fallback.textContent = initials;
    profileImg.insertAdjacentElement("afterend", fallback);
  }

  // Status dot
  const dot      = $("#freelance-pulse-dot");
  const dotLabel = $("#freelance-status-dot-label");
  const dotWrap  = $("#freelance-status-dot-wrap");
  if (dot && dotLabel) {
    if (data.status === "active") {
      dot.classList.remove("offline");
      dotLabel.textContent = "Disponible";
      dotLabel.classList.remove("offline");
    } else if (data.status === "suspended") {
      dot.classList.add("offline");
      dotLabel.textContent = "Hors ligne";
      dotLabel.classList.add("offline");
    } else {
      if (dotWrap) dotWrap.style.display = "none";
    }
  }

  setText("#formateur-display-name", data.display_name);
  setText("#formateur-headline",     data.headline);
  setText("#formateur-domaine-activity", data.domaine_activity ? `Domaine d'expertise ${data.domaine_activity}` : "");

  // Domaine tags (sous_domaine_activity)
  const tagList     = $("#category-list-domaine2");
  const tagTemplate = $(".freelance-card-category2");
  if (tagList && tagTemplate && Array.isArray(data.sous_domaine_activity) && data.sous_domaine_activity.length > 0) {
    tagList.innerHTML = "";
    data.sous_domaine_activity.forEach(tag => {
      const span = document.createElement("span");
      span.className = "fp-domain-tag";
      span.textContent = tag;
      tagList.appendChild(span);
    });
  }

  // Stats
  const nbFollowers = data.followers ?? 0;
  const nbProjects  = data.completed_projects ?? 0;
  const nbNotation  = data.nb_notation ?? 0;
  const avgNotation = data.notation;

  setText("#average_avis", nbNotation > 0 && avgNotation != null ? parseFloat(avgNotation).toFixed(1) : "N/A");
  const nbAvisEl = $("#nb_avis");
  if (nbAvisEl) nbAvisEl.textContent = `(${nbNotation} avis)`;
  setText("#nb_project",   nbProjects);
  setText("#nb_followers", nbFollowers);

  // Bouton suivre
  const followBtn = $("#add_follower");
  if (followBtn) {
    const auth         = getAuth();
    const userFollower = auth?.user_follower || [];
    const alreadyFollowing = userFollower.some(f => f.freelancer_profile_id === data.id);
    if (alreadyFollowing) {
      followBtn.style.display = "none";
    } else {
      followBtn.addEventListener("click", async () => {
        const token = getToken();
        if (!token) {
          const nonco = $(".abo-nonco-container");
          if (nonco) nonco.style.setProperty("display","flex","important");
          return;
        }
        followBtn.disabled = true;
        try {
          const r = await fetch("https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_follow_freelance", {
            method: "POST",
            headers: { "Content-Type":"application/json","Authorization":"Bearer "+token },
            body: JSON.stringify({ freelance_id: data.id })
          });
          if (r.ok) {
            followBtn.style.display = "none";
            const el = $("#nb_followers");
            if (el) el.textContent = (parseInt(el.textContent) || 0) + 1;
          } else { followBtn.disabled = false; }
        } catch(e) { followBtn.disabled = false; }
      });
    }
  }

  /* ----------------------------------------------------------
     À PROPOS
  ---------------------------------------------------------- */
  setHTML("#formateur-about", data.about_text);

  // Localisation
  const locEl = $("#fp-meta-location");
  if (locEl) {
    const loc = [data.ville, data.pays].filter(Boolean).join(", ");
    locEl.textContent = loc || "—";
  }

  // LinkedIn
  const linkedinLink = $("#formateur-linkedin");
  const linkedinWrap = $("#formateur-linkedin-wrap");
  if (linkedinLink && linkedinWrap && data.linkedin_url) {
    linkedinLink.href = data.linkedin_url;
    linkedinWrap.style.display = "flex";
  }

  /* ----------------------------------------------------------
     EXPERTISE + AUDIENCE (listes HTML → li
  ---------------------------------------------------------- */
  function renderHtmlList(selector, html) {
    const container = $(selector);
    if (!container) return;
    // Le html vient de Xano sous forme <ul><li>...</li></ul>
    // On extrait les li et on les reconstruit avec notre style
    const temp = document.createElement("div");
    temp.innerHTML = html || "";
    const items = Array.from(temp.querySelectorAll("li")).map(li => li.textContent.trim());
    container.innerHTML = "";
    items.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      container.appendChild(li);
    });
  }

  renderHtmlList("#formateur-expertise", data.expertise_list);
  renderHtmlList("#formateur-audience",  data.audience_list);

  /* ----------------------------------------------------------
     INFOS COMPLÉMENTAIRES
  ---------------------------------------------------------- */

  // Membre depuis (created_at)
  if (data.created_at) {
    const d = new Date(data.created_at);
    const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    setText("#fp-membre-depuis", `${monthNames[d.getMonth()]} ${d.getFullYear()}`);
  }

  // Dernière activité (last_login.logget_at)
  (function() {
    const ts = lastLogin?.logget_at || lastLogin?.created_at || null;
    if (!ts) { setText("#fp-last-activity", "—"); return; }
    const diffMs  = Date.now() - Number(ts);
    const diffMin = Math.floor(diffMs / 60000);
    const diffH   = Math.floor(diffMin / 60);
    const diffD   = Math.floor(diffH   / 24);
    const diffW   = Math.floor(diffD   / 7);
    const diffM   = Math.floor(diffD   / 30);
    let label;
    if      (diffMin < 5)   label = "En ligne";
    else if (diffMin < 60)  label = `Il y a ${diffMin} min`;
    else if (diffH   < 24)  label = `Il y a ${diffH}h`;
    else if (diffD   < 7)   label = diffD === 1 ? "Il y a 1 jour" : `Il y a ${diffD} jours`;
    else if (diffW   < 5)   label = diffW === 1 ? "Il y a 1 semaine" : `Il y a ${diffW} semaines`;
    else                    label = diffM <= 1  ? "Il y a 1 mois"    : `Il y a ${diffM} mois`;
    const el = document.getElementById("fp-last-activity");
    if (el) el.textContent = label;
  })();

  // Années d'expérience
  setText("#formateur-xp-years-display", data.years_experience ? `${data.years_experience} ans` : "—");

  // Cours / articles publiés
  setText("#fp-nb-courses",  courses.length  || "0");
  setText("#fp-nb-articles", articles.length || "0");

  /* ----------------------------------------------------------
     COMPÉTENCES (sous_domaine_activity → barres 100%)
  ---------------------------------------------------------- */
  const skillsList = $("#fp-skills-list");
  if (skillsList && Array.isArray(data.sous_domaine_activity) && data.sous_domaine_activity.length > 0) {
    skillsList.innerHTML = "";
    data.sous_domaine_activity.forEach(skill => {
      const item = document.createElement("div");
      item.className = "fp-skill-item";
      item.innerHTML = `
        <div class="fp-skill-header">
          <span class="fp-skill-name">${skill}</span>
          <span class="fp-skill-pct">100%</span>
        </div>
        <div class="fp-skill-bar">
          <div class="fp-skill-fill" data-pct="100"></div>
        </div>`;
      skillsList.appendChild(item);
    });
    // Anime les barres
    setTimeout(() => {
      $$(".fp-skill-fill").forEach(el => {
        el.style.width = el.dataset.pct + "%";
      });
    }, 200);
  } else if (skillsList) {
    const card = $("#fp-skills-card");
    if (card) card.style.display = "none";
  }

  /* ----------------------------------------------------------
     PARTAGER LE PROFIL
  ---------------------------------------------------------- */
  const pageUrl = window.location.href;
  const pageName = data.display_name || "Profil freelance";

  const shareTwitter  = $("#fp-share-twitter");
  const shareLinkedin = $("#fp-share-linkedin");
  const shareFacebook = $("#fp-share-facebook");
  const shareCopy     = $("#fp-share-copy");

  if (shareTwitter)  shareTwitter.href  = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageName)}`;
  if (shareLinkedin) shareLinkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
  if (shareFacebook) shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
  if (shareCopy) {
    shareCopy.addEventListener("click", () => {
      navigator.clipboard.writeText(pageUrl).then(() => {
        shareCopy.textContent = "✅";
        setTimeout(() => { shareCopy.textContent = "🔗"; }, 2000);
      });
    });
  }

  /* ----------------------------------------------------------
     SERVICE CARD (coaching / freelance)
  ---------------------------------------------------------- */
  const hasCoaching  = data.service_coaching  === true && data.stripe_status === "active" && data.status !== "suspended";
  const hasFreelance = data.service_freelance === true && data.status !== "suspended";

  const tabsEl         = $("#fp-service-tabs");
  const paneFreelance  = $("#tab-pane-freelance");
  const paneCoaching   = $("#tab-pane-coaching");
  const serviceCard    = $("#fp-service-card");

  if (!hasFreelance && !hasCoaching) {
    if (serviceCard) serviceCard.style.display = "none";
  } else if (hasFreelance && hasCoaching) {
    // Les deux : afficher les tabs
    if (tabsEl) {
      tabsEl.style.display = "flex";
      tabsEl.innerHTML = `
        <button class="fp-service-tab active" data-pane="tab-pane-freelance">Freelance</button>
        <button class="fp-service-tab" data-pane="tab-pane-coaching">Coaching</button>`;
      tabsEl.querySelectorAll(".fp-service-tab").forEach(btn => {
        btn.addEventListener("click", function() {
          tabsEl.querySelectorAll(".fp-service-tab").forEach(b => b.classList.remove("active"));
          this.classList.add("active");
          [paneFreelance, paneCoaching].forEach(p => p?.classList.remove("active"));
          $(("#" + this.dataset.pane))?.classList.add("active");
        });
      });
    }
    if (paneFreelance) paneFreelance.classList.add("active");
    if (paneCoaching)  paneCoaching.classList.remove("active");
  } else if (hasFreelance && !hasCoaching) {
    if (paneFreelance) paneFreelance.classList.add("active");
    if (paneCoaching)  paneCoaching.style.display = "none";
  } else if (!hasFreelance && hasCoaching) {
    if (paneFreelance) paneFreelance.style.display = "none";
    if (paneCoaching)  { paneCoaching.classList.add("active"); }
  }

  // Textes services
  setHTML("#formateur-freelance-text", data.text_freelance);
  setHTML("#formateur-coaching-text",  data.text_coaching);

  if (hasCoaching) {
    const priceHT  = data.price_cents ? data.price_cents / 100 : 0;
    const priceTTC = data.tva ? priceHT * 1.20 : priceHT;
    setText("#formateur-coaching-price", `${priceTTC.toFixed(0)}€ de l'heure`);
  }

  /* ----------------------------------------------------------
     AVIS
  ---------------------------------------------------------- */
  function timeAgo(ts) {
    if (!ts) return "";
    const diffMs = Date.now() - ts;
    const diffD  = Math.floor(diffMs / 86400000);
    const diffW  = Math.floor(diffD / 7);
    const diffM  = Math.floor(diffD / 30);
    if (diffD < 1)  return "Aujourd'hui";
    if (diffD < 7)  return diffD === 1 ? "Il y a 1 jour" : `Il y a ${diffD} jours`;
    if (diffW < 5)  return diffW === 1 ? "Il y a 1 semaine" : `Il y a ${diffW} semaines`;
    return diffM <= 1 ? "Il y a 1 mois" : `Il y a ${diffM} mois`;
  }

  function buildAvisItem(avis) {
    const item = document.createElement("div");
    item.className = "fp-avis-item";

    const ini = ((avis.first_name || "").charAt(0) + (avis.last_name || "").charAt(0)).toUpperCase() || "?";
    const avatarHTML = avis.image_url
      ? `<img class="fp-avis-avatar" src="${avis.image_url}" alt="${avis.first_name || ""}" />`
      : `<div class="fp-avis-avatar-fallback">${ini}</div>`;

    const stars = Math.round(avis.note || 0);
    let starsHTML = "";
    for (let i = 0; i < 5; i++) {
      starsHTML += `<span class="fp-avis-star ${i < stars ? 'lit' : ''}">★</span>`;
    }

    const serviceLabel = avis.service === "coaching" ? "🎯 Coaching" : "💼 Freelance";
    const name = [avis.first_name, avis.last_name ? avis.last_name.charAt(0) + "." : ""].filter(Boolean).join(" ");
    const comment = avis.commentaire?.trim();

    item.innerHTML = `
      ${avatarHTML}
      <div class="fp-avis-body">
        <div class="fp-avis-top">
          <span class="fp-avis-name">${name || "Anonyme"}</span>
          <span class="fp-avis-service-badge">${serviceLabel}</span>
        </div>
        <div class="fp-avis-stars">
          ${starsHTML}
          <span class="fp-avis-note">${parseFloat(avis.note || 0).toFixed(1)}/5</span>
        </div>
        ${comment ? `<div class="fp-avis-comment">${comment}</div>` : `<div class="fp-avis-comment" style="color:var(--text-muted);font-style:italic;">Aucun commentaire</div>`}
        <div class="fp-avis-date">${timeAgo(avis.created_at)}</div>
      </div>`;
    return item;
  }

  function renderAvis(list, containerSel, limit) {
    const container = $(containerSel);
    if (!container) return;
    container.innerHTML = "";
    const items = limit ? list.slice(0, limit) : list;
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "fp-avis-empty";
      empty.textContent = "Aucun avis pour le moment.";
      container.appendChild(empty);
      return;
    }
    items.forEach(avis => container.appendChild(buildAvisItem(avis)));
  }

  const sortedNotations = notations.slice().sort((a, b) => b.created_at - a.created_at);
  const MAX_AVIS_VISIBLE = 3;

  renderAvis(sortedNotations, "#avis-list", MAX_AVIS_VISIBLE);

  const avisVoirPlus = $("#avis-voir-plus");
  if (avisVoirPlus) {
    if (sortedNotations.length > MAX_AVIS_VISIBLE) {
      avisVoirPlus.style.display = "inline";
      avisVoirPlus.addEventListener("click", openAvisModal);
    }
  }

  // Modal avis
  function openAvisModal() {
    const modal = $("#avis-modal");
    if (!modal) return;
    renderAvis(sortedNotations, "#avis-modal-list", null);
    modal.classList.add("active");
  }

  $("#avis-modal-close")?.addEventListener("click", () => $("#avis-modal")?.classList.remove("active"));
  $("#avis-modal")?.addEventListener("click", e => { if (e.target === $("#avis-modal")) $("#avis-modal").classList.remove("active"); });

  /* ----------------------------------------------------------
     CONTENU PUBLIÉ (cours + articles mélangés)
  ---------------------------------------------------------- */
  const MAX_CONTENT_VISIBLE = 3;

  function buildCourseCard(item) {
    const c      = item.course || {};
    const slug   = c.slug || "";
    const title  = c.title || "—";
    const cover  = c.cover_url || "";
    const mods   = item.nb_modules || 0;
    const durMin = Math.round((item.duration || 0) / 60);
    const durH   = durMin >= 60 ? Math.floor(durMin / 60) + "h" + (durMin % 60 ? String(durMin % 60).padStart(2,"0") : "") : durMin + " min";
    const parts  = c.nb_participants || 0;
    const avgN   = parseFloat(c.average_notation) || 0;
    const nbN    = c.nb_notation || 0;

    const card = document.createElement("a");
    card.href      = `https://www.digitools-room.com/pages-formation/${slug}`;
    card.target    = "_blank";
    card.rel       = "noopener";
    card.className = "fp-course-card";
    card.innerHTML = `
      ${cover ? `<img class="fp-course-cover" src="${cover}" alt="${title}" />` : `<div class="fp-course-cover"></div>`}
      <div class="fp-course-body">
        <span class="fp-content-type-badge cours">📘 Cours</span>
        <div class="fp-course-title">${title}</div>
        <div class="fp-course-meta">
          <span class="fp-meta-badge">📚 ${mods} module${mods !== 1 ? "s" : ""}</span>
          ${durMin > 0 ? `<span class="fp-meta-badge">⏱ ${durH}</span>` : ""}
          <span class="fp-meta-badge">👥 ${parts}</span>
          ${avgN > 0 && nbN > 0 ? `<span class="fp-rating-badge">⭐ ${avgN.toFixed(1)} (${nbN})</span>` : ""}
        </div>
      </div>`;
    return card;
  }

  function buildArticleCard(item) {
    const a         = item.article || {};
    const title     = a.title || "—";
    const slug      = a.slug  || "";
    const img       = a.url_image || "";
    const isRes     = a.is_ressource === true;
    const tempsSec  = a.temps_lecture_secondes || 0;
    const tempsMin  = Math.round(tempsSec / 60) || 1;
    const nbView    = a.nb_view || 0;

    const card = document.createElement("a");
    card.href      = `https://www.digitools-room.com/articles-de-blog/${slug}`;
    card.target    = "_blank";
    card.rel       = "noopener";
    card.className = "fp-article-card";
    card.innerHTML = `
      ${img ? `<img class="fp-article-cover" src="${img}" alt="${title}" />` : `<div class="fp-article-cover"></div>`}
      <div class="fp-article-body">
        <span class="fp-content-type-badge article" style="display:inline-flex;">✍️ Article</span>${isRes ? ` <span class="fp-content-type-badge ressource" style="display:inline-flex;">🔗 Ressource</span>` : ""}
        <div class="fp-article-title">${title}</div>
        <div class="fp-course-meta">
          <span class="fp-meta-badge">⏱ ${tempsMin} min</span>
          ${nbView > 0 ? `<span class="fp-meta-badge">👁 ${nbView} vues</span>` : ""}
        </div>
      </div>`;
    return card;
  }

  // Merge cours + articles pour l'affichage principal (cours en premier)
  const allContent = [
    ...courses.map(c  => ({ type: "course",  data: c })),
    ...articles.map(a => ({ type: "article", data: a }))
  ];

  const contentGrid = $("#fp-content-grid");
  if (contentGrid) {
    contentGrid.innerHTML = "";
    if (allContent.length === 0) {
      const empty = document.createElement("div");
      empty.className = "fp-content-empty";
      empty.textContent = "Aucun contenu publié.";
      contentGrid.appendChild(empty);
    } else {
      allContent.slice(0, MAX_CONTENT_VISIBLE).forEach(item => {
        contentGrid.appendChild(
          item.type === "course" ? buildCourseCard(item.data) : buildArticleCard(item.data)
        );
      });
    }
  }

  // Bouton "Voir tout"
  const contentVoirPlus = $("#content-voir-plus");
  if (contentVoirPlus && allContent.length > MAX_CONTENT_VISIBLE) {
    contentVoirPlus.style.display = "inline";
    contentVoirPlus.addEventListener("click", openContentModal);
  }

  // Modal contenu
  function openContentModal() {
    const modal = $("#content-modal");
    if (!modal) return;
    modal.classList.add("active");

    // Courses tab
    const coursesList = $("#modal-courses-list");
    if (coursesList) {
      coursesList.innerHTML = "";
      if (!courses.length) {
        coursesList.innerHTML = `<div class="fp-content-empty">Aucun cours publié.</div>`;
      } else {
        courses.forEach(c => {
          // Version compacte pour modal
          const item = document.createElement("a");
          const course = c.course || {};
          item.href = `https://www.digitools-room.com/pages-formation/${course.slug || ""}`;
          item.target = "_blank"; item.rel = "noopener";
          item.className = "fp-modal-content-item";
          const mods   = c.nb_modules || 0;
          const durMin = Math.round((c.duration || 0) / 60);
          const durH   = durMin >= 60 ? Math.floor(durMin/60)+"h"+(durMin%60 ? String(durMin%60).padStart(2,"0"):"") : durMin+" min";
          item.innerHTML = `
            ${course.cover_url ? `<img class="fp-modal-content-thumb" src="${course.cover_url}" alt="${course.title||""}" />` : `<div class="fp-modal-content-thumb"></div>`}
            <div class="fp-modal-content-info">
              <div class="fp-modal-content-title">${course.title || "—"}</div>
              <div class="fp-modal-content-meta">
                <span class="fp-content-type-badge cours">📘 Cours</span>
                <span class="fp-meta-badge">📚 ${mods} module${mods!==1?"s":""}</span>
                ${durMin>0?`<span class="fp-meta-badge">⏱ ${durH}</span>`:""}
              </div>
            </div>`;
          coursesList.appendChild(item);
        });
      }
    }

    // Articles tab
    const articlesList = $("#modal-articles-list");
    if (articlesList) {
      articlesList.innerHTML = "";
      if (!articles.length) {
        articlesList.innerHTML = `<div class="fp-content-empty">Aucun article publié.</div>`;
      } else {
        articles.forEach(a => {
          const article = a.article || {};
          const item = document.createElement("a");
          item.href = `https://www.digitools-room.com/articles-de-blog/${article.slug||""}`;
          item.target = "_blank"; item.rel = "noopener";
          item.className = "fp-modal-content-item";
          const tempsMin = Math.round((article.temps_lecture_secondes||0)/60)||1;
          item.innerHTML = `
            ${article.url_image ? `<img class="fp-modal-content-thumb" src="${article.url_image}" alt="${article.title||""}" />` : `<div class="fp-modal-content-thumb"></div>`}
            <div class="fp-modal-content-info">
              <div class="fp-modal-content-title">${article.title || "—"}</div>
              <div class="fp-modal-content-meta">
                ${article.is_ressource ? `<span class="fp-content-type-badge ressource">🔗 Ressource</span>` : `<span class="fp-content-type-badge article">✍️ Article</span>`}
                <span class="fp-meta-badge">⏱ ${tempsMin} min</span>
                ${article.nb_view>0?`<span class="fp-meta-badge">👁 ${article.nb_view} vues</span>`:""}
              </div>
            </div>`;
          articlesList.appendChild(item);
        });
      }
    }
  }

  // Tabs dans la modal contenu
  $$(".fp-modal-tab").forEach(tab => {
    tab.addEventListener("click", function() {
      $$(".fp-modal-tab").forEach(t => t.classList.remove("active"));
      this.classList.add("active");
      $$(".fp-modal-tab-pane").forEach(p => p.classList.remove("active"));
      const target = $("#" + this.dataset.tab);
      if (target) target.classList.add("active");
    });
  });

  $("#content-modal-close")?.addEventListener("click", () => $("#content-modal")?.classList.remove("active"));
  $("#content-modal")?.addEventListener("click", e => { if (e.target === $("#content-modal")) $("#content-modal").classList.remove("active"); });

  /* ----------------------------------------------------------
     CONTACT FREELANCE (messagerie directe)
  ---------------------------------------------------------- */
  (function initContactModal() {
    const triggerBtn = $("#contact-freelance-btn");
    if (!triggerBtn) return;

    const freelanceIdInt = parseInt(freelanceId, 10);

    const modalHTML = `
    <div id="contact-freelance-overlay" style="
      display:none; position:fixed; inset:0; z-index:9999;
      background:rgba(15,23,42,0.45); backdrop-filter:blur(4px);
      align-items:center; justify-content:center;
    ">
      <div style="
        background:#fff; border-radius:20px;
        border:1.5px solid #bfdbfe;
        box-shadow:0 24px 64px rgba(37,99,235,0.15);
        width:100%; max-width:460px; margin:20px;
        font-family:'DM Sans',sans-serif; overflow:hidden;
      ">
        <div style="padding:22px 26px 18px;background:#eff6ff;border-bottom:1.5px solid #bfdbfe;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:1.05rem;font-weight:700;color:#0f172a;margin-bottom:3px;">💬 Ouvrir une discussion</div>
            <div style="font-size:0.78rem;color:#94a3b8;">Envoyez votre premier message</div>
          </div>
          <button onclick="document.getElementById('contact-freelance-overlay').style.display='none'" style="width:32px;height:32px;border-radius:8px;border:1.5px solid #bfdbfe;background:#fff;cursor:pointer;font-size:1rem;color:#94a3b8;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <div style="padding:22px 26px;display:flex;flex-direction:column;gap:14px;">
          <div>
            <label style="font-size:0.73rem;font-weight:700;color:#475569;letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:6px;">Votre message</label>
            <textarea id="contact-freelance-content" placeholder="Bonjour, je suis intéressé par votre profil…" style="width:100%;min-height:120px;padding:11px 13px;border:1.5px solid #bfdbfe;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:0.84rem;color:#0f172a;background:#f8fafc;outline:none;resize:none;line-height:1.6;box-sizing:border-box;" onfocus="this.style.borderColor='#2563eb';this.style.background='#fff'" onblur="this.style.borderColor='#bfdbfe';this.style.background='#f8fafc'"></textarea>
          </div>
          <div id="contact-freelance-error" style="display:none;font-size:0.77rem;color:#ef4444;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 12px;"></div>
          <button id="contact-freelance-submit" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2563eb;color:#fff;font-family:'DM Sans',sans-serif;font-size:0.86rem;font-weight:600;cursor:pointer;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
            Envoyer et ouvrir la discussion →
          </button>
          <div style="font-size:0.72rem;color:#94a3b8;text-align:center;">Vous serez redirigé vers votre messagerie après l'envoi</div>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const overlay = document.getElementById("contact-freelance-overlay");
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.style.display = "none"; });

    triggerBtn.addEventListener("click", async () => {
      const token = getToken();
      if (!token) {
        const nonco = $(".abo-nonco-container");
        if (nonco) nonco.style.setProperty("display","flex","important");
        return;
      }
      try {
        const res = await fetch("https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/get_freelance_user_id", {
          method: "POST",
          headers: { "Content-Type":"application/json","Authorization":"Bearer "+token },
          body: JSON.stringify({ freelance_id: freelanceIdInt })
        });
        const d = await res.json();
        window._contactFreelanceUserId = d?._user?.id || null;
      } catch(e) { window._contactFreelanceUserId = null; }

      document.getElementById("contact-freelance-content").value = "";
      document.getElementById("contact-freelance-error").style.display = "none";
      document.getElementById("contact-freelance-submit").textContent = "Envoyer et ouvrir la discussion →";
      overlay.style.display = "flex";
    });

    document.getElementById("contact-freelance-submit")?.addEventListener("click", async () => {
      const content  = document.getElementById("contact-freelance-content").value.trim();
      const errorEl  = document.getElementById("contact-freelance-error");
      const submitBtn = document.getElementById("contact-freelance-submit");
      errorEl.style.display = "none";

      if (!content) {
        errorEl.textContent = "Merci d'écrire un message avant d'envoyer.";
        errorEl.style.display = "block";
        return;
      }

      const auth   = getAuth();
      const token  = auth?.token || "";
      const userId = auth?.user?.id || null;
      const freelanceUserId = window._contactFreelanceUserId;

      if (!userId || !freelanceUserId) {
        errorEl.textContent = "Impossible d'identifier les participants. Réessayez.";
        errorEl.style.display = "block";
        return;
      }

      submitBtn.textContent = "Envoi en cours…";
      submitBtn.style.opacity = "0.7";
      submitBtn.disabled = true;

      try {
        const res = await fetch("https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_direct_conversation", {
          method: "POST",
          headers: { "Content-Type":"application/json","Authorization":"Bearer "+token },
          body: JSON.stringify({ user_id: userId, freelance_id: freelanceUserId, content, initiative: "user" })
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d?.message || "Erreur");
        if (d === "already exist" || d?.message === "already exist") {
          errorEl.innerHTML = `Vous avez déjà une conversation avec ce freelance. <a href="https://www.digitools-room.com/oauth/mes-messages" style="color:#2563eb;font-weight:700;text-decoration:underline;">Accéder à ma messagerie →</a>`;
          errorEl.style.background="#eff6ff"; errorEl.style.border="1px solid #bfdbfe"; errorEl.style.color="#2563eb"; errorEl.style.display="block";
          submitBtn.textContent = "Envoyer et ouvrir la discussion →";
          submitBtn.style.opacity = "1"; submitBtn.disabled = false;
          return;
        }
        window.location.href = "https://www.digitools-room.com/oauth/mes-messages";
      } catch(err) {
        errorEl.textContent = "Une erreur est survenue, veuillez réessayer.";
        errorEl.style.display = "block";
        submitBtn.textContent = "Envoyer et ouvrir la discussion →";
        submitBtn.style.opacity = "1"; submitBtn.disabled = false;
      }
    });
  })();

  /* ----------------------------------------------------------
     BOOKING (système existant conservé intégralement)
  ---------------------------------------------------------- */
  initBooking(data, rules, exceptions, bookings);

}); // END DOMContentLoaded


/* ============================================================
   PAGE VIEW TRACKING (gardé séparé comme avant)
   ============================================================ */
(function() {
  window.addEventListener("DOMContentLoaded", async function () {
    const freelanceElement = document.querySelector("#freelance-page-id");
    const freelanceId      = freelanceElement?.getAttribute("freelance-id");
    const freelanceIdInt   = parseInt(freelanceId, 10);
    if (!freelanceId || isNaN(freelanceIdInt)) return;
    if (typeof sendEvent !== "function") return;
    const result = await sendEvent({
      type:          "freelance_page_view",
      freelance_id:  freelanceIdInt,
      url:           window.location.href,
      referrer_type: document.referrer || null
    });
    const eventId   = result?.event_return?.id          || null;
    const sessionId = result?.event_return?.session_id  || null;
    if (eventId)   sessionStorage.setItem("current_freelance_view_id",    eventId);
    if (sessionId) sessionStorage.setItem("current_freelance_session_id", sessionId);
  });
})();


/* ============================================================
   SYSTÈME DE RÉSERVATION (conservé intégralement)
   ============================================================ */
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
      #payment-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;padding:20px;}
      #payment-overlay.active{display:flex;}
      #payment-modal{background:#fff;border-radius:20px;padding:32px 28px 28px;max-width:460px;width:100%;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.15);font-family:'DM Sans',sans-serif;max-height:90vh;overflow-y:auto;}
      #payment-modal-close{position:absolute;top:16px;right:16px;background:#f4f4f0;border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#666;}
      .payment-title{font-size:1.1rem;font-weight:700;color:#0f0f0f;margin-bottom:4px;}
      .payment-subtitle{font-size:0.82rem;color:#9a9a9a;margin-bottom:20px;}
      .payment-reassurance{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;font-size:0.78rem;color:#166534;margin-bottom:20px;display:flex;gap:8px;align-items:flex-start;line-height:1.5;}
      .payment-amount{background:#f8f9ff;border:1px solid #BFDBFE;border-radius:10px;padding:14px 16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;}
      .payment-amount-label{font-size:0.82rem;color:#9a9a9a;}
      .payment-amount-value{font-size:1.1rem;font-weight:700;color:#0f0f0f;}
      #payment-element{margin-bottom:20px;}
      #payment-submit{display:block;width:100%;padding:13px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:0.9rem;font-weight:600;cursor:pointer;}
      #payment-submit:disabled{opacity:0.6;cursor:not-allowed;}
      #payment-error{color:#ef4444;font-size:0.8rem;margin-top:10px;text-align:center;min-height:20px;}
    `;
    document.head.appendChild(style);
    const paymentOverlay = document.createElement('div');
    paymentOverlay.id = 'payment-overlay';
    paymentOverlay.innerHTML = `
      <div id="payment-modal">
        <button id="payment-modal-close">✕</button>
        <div class="payment-title">💳 Paiement sécurisé</div>
        <div class="payment-subtitle" id="payment-subtitle"></div>
        <div class="payment-reassurance"><span>🔒</span><span>Votre carte sera autorisée mais <strong>vous ne serez débité que si le freelance accepte le rendez-vous</strong>.</span></div>
        <div class="payment-amount"><span class="payment-amount-label">Montant à autoriser</span><span class="payment-amount-value" id="payment-amount-display"></span></div>
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
      #booking-confirm-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;padding:20px;}
      #booking-confirm-overlay.active{display:flex;}
      #booking-confirm-modal{background:#fff;border-radius:20px;padding:32px 28px 28px;max-width:460px;width:100%;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.15);font-family:'DM Sans',sans-serif;}
      #booking-confirm-close{position:absolute;top:16px;right:16px;background:#f4f4f0;border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#666;}
      .confirm-icon{font-size:2.5rem;text-align:center;margin-bottom:12px;}
      .confirm-title{font-size:1.2rem;font-weight:700;color:#0f0f0f;text-align:center;margin-bottom:4px;}
      .confirm-subtitle{font-size:0.82rem;color:#9a9a9a;text-align:center;margin-bottom:24px;}
      .confirm-details{background:#f8f9ff;border:1px solid #BFDBFE;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;margin-bottom:20px;}
      .confirm-detail-row{display:flex;align-items:center;gap:10px;font-size:0.85rem;color:#0f0f0f;}
      .confirm-detail-icon{font-size:1rem;flex-shrink:0;width:20px;text-align:center;}
      .confirm-detail-label{color:#9a9a9a;font-size:0.75rem;min-width:70px;}
      .confirm-detail-value{font-weight:600;}
      .confirm-visio-note{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;font-size:0.78rem;color:#166534;margin-bottom:20px;display:flex;gap:8px;align-items:flex-start;line-height:1.5;}
      .confirm-btn{display:block;width:100%;padding:13px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:0.9rem;font-weight:600;cursor:pointer;text-align:center;text-decoration:none;}
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
      <div class="confirm-detail-row"><span class="confirm-detail-icon">${isCoach?'🎯':'💼'}</span><span class="confirm-detail-label">Type</span><span class="confirm-detail-value">${isCoach?'Session coaching':'Rendez-vous freelance'}</span></div>`;
    confirmOverlay.classList.add('active');
  }

  injectConfirmationModal();

  function toLocalDateStr(date) { const y=date.getFullYear();const m=String(date.getMonth()+1).padStart(2,'0');const d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`; }
  function getLocalDow(date) { const noon=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12,0,0);const jsDay=noon.getDay();return jsDay===0?7:jsDay; }
  function toDateStr(val) { if(!val) return '';if(typeof val==='string'&&val.includes('-')) return val.substring(0,10);return toLocalDateStr(new Date(typeof val==='number'?val:parseInt(val))); }
  function getMonthStartOffset(year, mon) { const d=new Date(year,mon,1,12,0,0).getDay();return d===0?6:d-1; }
  function freelanceMinToUtcMs(dateStr, minutes) { const midnight=new Date(`${dateStr}T00:00:00Z`);const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:freelanceTz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});const parts=formatter.formatToParts(midnight);const p={};parts.forEach(x=>{p[x.type]=x.value;});const offsetMs=(parseInt(p.hour)*60+parseInt(p.minute))*60000;return midnight.getTime()-offsetMs+minutes*60000; }
  function utcMsToVisitorTime(utcMs) { return new Intl.DateTimeFormat('fr-FR',{timeZone:visitorTz,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(utcMs)); }
  function isInException(dateStr) { return exceptions.some(e=>{const s=toDateStr(e.start_at);const en=toDateStr(e.end_at);return dateStr>=s&&dateStr<=en;}); }
  function isSlotBooked(s,e) { return bookings.some(b=>{const bS=typeof b.start_at==='number'?b.start_at:parseInt(b.start_at);const bE=typeof b.end_at==='number'?b.end_at:parseInt(b.end_at);return s<bE&&e>bS;}); }
  function dayHasSlots(date, duration) { const dow=getLocalDow(date);const dateStr=toLocalDateStr(date);if(!rules.some(r=>r.day_of_week===dow)) return false;if(isInException(dateStr)) return false;const dur=duration||60;const dayRules=rules.filter(r=>r.day_of_week===dow);return dayRules.some(rule=>{let current=rule.start_time;while(current+dur<=rule.end_time){const sMs=freelanceMinToUtcMs(dateStr,current);const eMs=freelanceMinToUtcMs(dateStr,current+dur);if(!isSlotBooked(sMs,eMs)) return true;current+=dur+bufferMin;}return false;}); }
  function getSlotsForDay(date, duration) { const dow=getLocalDow(date);const dateStr=toLocalDateStr(date);const dayRules=rules.filter(r=>r.day_of_week===dow);const dur=duration||60;const step=dur+bufferMin;const slots=[];dayRules.forEach(rule=>{let current=rule.start_time;while(current+dur<=rule.end_time){const sMs=freelanceMinToUtcMs(dateStr,current);const eMs=freelanceMinToUtcMs(dateStr,current+dur);slots.push({startUtcMs:sMs,endUtcMs:eMs,startMin:current,endMin:current+dur,displayTime:utcMsToVisitorTime(sMs),booked:isSlotBooked(sMs,eMs)});current+=step;}});slots.sort((a,b)=>a.startUtcMs-b.startUtcMs);return slots; }

  let bookingState = { type:null,date:null,slot:null,duration:null,currentMonth:new Date(),phone:'',note:'',url:'',attachment1_url:'',attachment1_name:'',attachment2_url:'',attachment2_name:'' };
  let stripeElements = null;
  let currentPaymentIntentId = null;

  function renderStep1() {
    step1El.style.display=''; step2El.style.display='none';
    dot1.classList.add('active'); dot2.classList.remove('active');
    const isCoach=bookingState.type==='coaching';
    if(isCoach&&!bookingState.duration) bookingState.duration=coachingDurations[0];
    const now=new Date();const month=bookingState.currentMonth;const year=month.getFullYear();const mon=month.getMonth();
    const minBookingMs=now.getTime()+noticeHours*3600000;const minBookingDate=new Date(minBookingMs);
    const minDate=new Date(minBookingDate.getFullYear(),minBookingDate.getMonth(),minBookingDate.getDate()+1,12,0,0);
    const minDateStr=toLocalDateStr(minDate);const todayStr=toLocalDateStr(now);const lastDay=new Date(year,mon+1,0);const startDow=getMonthStartOffset(year,mon);
    let html=`<div class="cal-header"><button class="cal-nav-btn" id="cal-prev">‹</button><span class="cal-month-label">${MONTHS_FR[mon]} ${year}</span><button class="cal-nav-btn" id="cal-next">›</button></div><div class="cal-grid">${DAYS_FR.map(d=>`<div class="cal-day-name">${d}</div>`).join('')}${Array(startDow).fill('<div class="cal-day empty"></div>').join('')}`;
    for(let d=1;d<=lastDay.getDate();d++){const date=new Date(year,mon,d,12,0,0);const dateStr=toLocalDateStr(date);const isTooSoon=dateStr<minDateStr;const hasSlots=!isTooSoon&&dayHasSlots(date,bookingState.duration||60);const isSelected=bookingState.date===dateStr;const isToday=dateStr===todayStr;let cls='cal-day';if(isTooSoon||!hasSlots) cls+=' disabled';else cls+=' has-slots';if(isSelected) cls+=' selected';if(isToday) cls+=' today';html+=`<div class="${cls}" data-date="${dateStr}">${d}</div>`;}
    html+=`</div>`;
    if(isCoach) html+=`<div class="durations-section"><div class="slots-title">Durée de la session</div><div class="duration-btns">${coachingDurations.map(dur=>`<button class="duration-btn ${bookingState.duration===dur?'selected':''}" data-duration="${dur}">${dur} min</button>`).join('')}</div></div>`;
    if(bookingState.date){const selectedDate=new Date(bookingState.date+'T12:00:00');const slots=getSlotsForDay(selectedDate,bookingState.duration||60);const tzNote=freelanceTz!==visitorTz?`<div style="font-size:0.72rem;color:#9a9a9a;margin-bottom:8px;">Horaires en heure locale (${visitorTz})</div>`:'';html+=`<div class="slots-section"><div class="slots-title">Créneaux disponibles</div>${tzNote}${slots.length>0?`<div class="slots-grid">${slots.map((s,i)=>`<button class="slot-btn ${s.booked?'unavailable':''} ${bookingState.slot?.startUtcMs===s.startUtcMs&&!s.booked?'selected':''}" data-index="${i}" ${s.booked?'disabled':''}>${s.displayTime}</button>`).join('')}</div>`:`<p style="font-size:0.82rem;color:#9a9a9a;margin-bottom:20px;">Aucun créneau disponible ce jour.</p>`}</div>`;step1El._slots=slots;}
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
    document.getElementById('booking-phone')?.addEventListener('input',e=>{bookingState.phone=e.target.value;});
    document.getElementById('booking-note')?.addEventListener('input',e=>{bookingState.note=e.target.value;});
    document.getElementById('booking-url')?.addEventListener('input',e=>{bookingState.url=e.target.value;});
    document.getElementById('file-name-1')?.addEventListener('input',e=>{bookingState.attachment1_name=e.target.value;});
    document.getElementById('file-name-2')?.addEventListener('input',e=>{bookingState.attachment2_name=e.target.value;});
    document.getElementById('booking-file-1')?.addEventListener('change',async function(){const url=await uploadFile(this.files[0],'file-zone-1','file-success-1');if(url) bookingState.attachment1_url=url;});
    document.getElementById('booking-file-2')?.addEventListener('change',async function(){const url=await uploadFile(this.files[0],'file-zone-2','file-success-2');if(url) bookingState.attachment2_url=url;});
    document.getElementById('step2-back')?.addEventListener('click',renderStep1);
    document.getElementById('step2-submit')?.addEventListener('click',submitBooking);
  }

  async function uploadFile(file, zoneId, successId) {
    if(!file) return null;
    const zone=document.getElementById(zoneId);const successEl=document.getElementById(successId);
    if(successEl){successEl.textContent='⏳ Upload en cours...';successEl.style.display='block';}
    if(zone) zone.classList.add('has-file');
    const formData=new FormData();formData.append('file',file);
    try {
      const res=await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof',{method:'POST',headers:getToken()?{Authorization:'Bearer '+getToken()}:{},body:formData});
      const d=await res.json();
      const url=d?.path?'https://xmot-l3ir-7kuj.p7.xano.io'+d.path:null;
      if(url){if(successEl) successEl.textContent='✅ '+file.name;const nameInput=document.getElementById(zoneId==='file-zone-1'?'file-name-1':'file-name-2');if(nameInput) nameInput.style.display='block';return url;}
      else{if(successEl) successEl.textContent='❌ Erreur upload';if(zone) zone.classList.remove('has-file');return null;}
    } catch{if(successEl) successEl.textContent='❌ Erreur upload';if(zone) zone.classList.remove('has-file');return null;}
  }

  async function submitBooking() {
    const btn=document.getElementById('step2-submit');
    const token=getToken();
    const isCoach=bookingState.type==='coaching';
    let hasError=false;let firstErrorEl=null;
    const phoneInput=document.getElementById('booking-phone');const noteInput=document.getElementById('booking-note');
    const name1Input=document.getElementById('file-name-1');const name2Input=document.getElementById('file-name-2');
    const banner=document.getElementById('booking-error-banner');
    if(!bookingState.phone||bookingState.phone.trim()===''){if(phoneInput){phoneInput.style.borderColor='#ef4444';if(!firstErrorEl) firstErrorEl=phoneInput;}hasError=true;}else{if(phoneInput) phoneInput.style.borderColor='#BFDBFE';}
    if(!bookingState.note||bookingState.note.trim()===''){if(noteInput){noteInput.style.borderColor='#ef4444';if(!firstErrorEl) firstErrorEl=noteInput;}hasError=true;}else{if(noteInput) noteInput.style.borderColor='#BFDBFE';}
    if(bookingState.attachment1_url&&!bookingState.attachment1_name.trim()){if(name1Input){name1Input.style.borderColor='#ef4444';if(!firstErrorEl) firstErrorEl=name1Input;}hasError=true;}
    if(bookingState.attachment2_url&&!bookingState.attachment2_name.trim()){if(name2Input){name2Input.style.borderColor='#ef4444';if(!firstErrorEl) firstErrorEl=name2Input;}hasError=true;}
    if(hasError){if(banner) banner.style.display='flex';if(firstErrorEl) firstErrorEl.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(banner) banner.style.display='none';
    if(isCoach){
      if(btn){btn.disabled=true;btn.textContent='Chargement...';}
      try {
        const piRes=await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_payment_intent',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({freelancer_profile_id:data.id,duration_min:bookingState.duration})});
        const piData=await piRes.json();
        if(!piData?.client_secret) throw new Error('Impossible de créer le paiement');
        currentPaymentIntentId=piData.payment_intent_id;
        const amountHT=(data.price_cents*bookingState.duration/60)/100;
        const amountTTC=data.tva?amountHT*1.20:amountHT;
        document.getElementById('payment-amount-display').textContent=amountTTC.toFixed(0)+' €';
        document.getElementById('payment-subtitle').textContent=`Session coaching · ${bookingState.duration} min avec ${data.display_name}`;
        stripeElements=stripe.elements({clientSecret:piData.client_secret,locale:'fr'});
        const paymentElement=stripeElements.create('payment');
        document.getElementById('payment-element').innerHTML='';
        paymentElement.mount('#payment-element');
        document.getElementById('payment-overlay').classList.add('active');
        document.getElementById('payment-submit').onclick=async()=>{
          const payBtn=document.getElementById('payment-submit');const errorEl=document.getElementById('payment-error');
          payBtn.disabled=true;payBtn.textContent='Autorisation en cours...';errorEl.textContent='';
          const{error}=await stripe.confirmPayment({elements:stripeElements,confirmParams:{return_url:window.location.href},redirect:'if_required'});
          if(error){errorEl.textContent=error.message;payBtn.disabled=false;payBtn.textContent='Autoriser le paiement';return;}
          payBtn.textContent='Création du rendez-vous...';
          await createBookingItem(token);
        };
      } catch(err){alert('Une erreur est survenue, veuillez réessayer.');}
      if(btn){btn.disabled=false;btn.textContent='💳 Payer et réserver';}
      return;
    }
    if(btn){btn.disabled=true;btn.textContent='Envoi...';}
    await createBookingItem(token);
    if(btn){btn.disabled=false;btn.textContent='Confirmer le rendez-vous';}
  }

  async function createBookingItem(token) {
    const payload={
      freelancer_profile_id:data.id,booking_type:bookingState.type,
      duration_min:bookingState.duration||(bookingState.slot.endMin-bookingState.slot.startMin),
      price_cents:bookingState.type==='coaching'?(data.price_cents||0):0,
      currency:'EUR',start_at:bookingState.slot.startUtcMs,end_at:bookingState.slot.endUtcMs,
      client_phone:bookingState.phone||'',client_note:bookingState.note||'',
      reference_url:bookingState.url||'',
      attachment_1_url:bookingState.attachment1_url||'',attachment_1_name:bookingState.attachment1_url?bookingState.attachment1_name||'':'',
      attachment_2_url:bookingState.attachment2_url||'',attachment_2_name:bookingState.attachment2_url?bookingState.attachment2_name||'':'',
      payment_intent_id:currentPaymentIntentId||''
    };
    try {
      const res=await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_booking_item',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(payload)});
      if(res.ok){
        document.getElementById('payment-overlay')?.classList.remove('active');
        overlay.classList.remove('active');
        showConfirmation(bookingState.type,bookingState.slot,bookingState.duration||(bookingState.slot.endMin-bookingState.slot.startMin),data.display_name);
      } else {
        const errData=await res.json().catch(()=>({}));
        alert(errData?.message||'Une erreur est survenue, veuillez réessayer.');
      }
    } catch(err){alert('Erreur réseau, veuillez réessayer.');}
  }

  function openBooking(type) {
    const token=getToken();
    if(!token){const c=document.querySelector(".abo-nonco-container");if(c) c.style.setProperty("display","flex","important");return;}
    bookingState={type,date:null,slot:null,duration:type==='coaching'?coachingDurations[0]:null,currentMonth:new Date(),phone:'',note:'',url:'',attachment1_url:'',attachment1_name:'',attachment2_url:'',attachment2_name:''};
    currentPaymentIntentId=null;
    modalTitle.textContent=type==='coaching'?'Réserver une session coaching':'Prendre rendez-vous';
    overlay.classList.add('active');
    renderStep1();
  }

  document.querySelector('#coaching-book-btn')?.addEventListener('click',()=>openBooking('coaching'));
  document.querySelector('#freelance-book-btn')?.addEventListener('click',()=>openBooking('freelance'));
  closeBtn?.addEventListener('click',()=>overlay.classList.remove('active'));
  overlay?.addEventListener('click',e=>{if(e.target===overlay) overlay.classList.remove('active');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape') overlay.classList.remove('active');});
}
