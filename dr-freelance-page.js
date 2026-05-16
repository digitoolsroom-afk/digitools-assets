/* ============================================================
   dr-freelance-page.js — V3
   Design : hero sombre + 3 colonnes + consulting par défaut
   ============================================================ */

document.addEventListener("DOMContentLoaded", async function () {

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => c.querySelectorAll(s);
  const setText = (s, v) => { const e = $(s); if (e) e.textContent = (v != null && v !== "") ? String(v) : ""; };
  const setHTML = (s, h) => { const e = $(s); if (e) e.innerHTML = h || ""; };
  const getAuth  = () => { try { return JSON.parse(localStorage.getItem("auth") || "null"); } catch { return null; } };
  const getToken = () => { const a = getAuth(); return a?.authToken || a?.token || a?.jwt || null; };

  /* ── ID ── */
  const formateurSection = $(".formateur-section");
  const freelanceId = formateurSection?.getAttribute("freelance-id")?.trim();
  if (!freelanceId) return;

  /* ── Skeleton ── */
  const SK_IDS = ["formateur-display-name","formateur-domaine-activity","average_avis","nb_project","nb_followers","fp-membre-depuis","fp-last-activity","formateur-xp-years-display","fp-nb-courses","fp-nb-articles"];
  function applySkeleton() {
    SK_IDS.forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      el.classList.add("fp-sk-h");
      const sk = document.createElement("span");
      sk.className = "fp-sk"; sk.style.cssText = "width:72px;height:13px;display:inline-block;border-radius:5px;";
      el.insertAdjacentElement("beforebegin", sk);
    });
    const img = $("#freelance-profile-img"); if (img) img.classList.add("fp-sk-h");
  }
  function removeSkeleton() {
    $$(".fp-sk").forEach(e => e.remove());
    $$(".fp-sk-h").forEach(e => e.classList.remove("fp-sk-h"));
  }
  applySkeleton();

  /* ── Fetch ── */
  let data, rules, exceptions, bookings, notations, courses, articles, lastLogin;
  try {
    const res = await fetch(`https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/get_freelance_info_page?freelance_id=${freelanceId}`);
    if (!res.ok) throw new Error();
    const raw = await res.json();
    const fd  = raw.freelancer_page_data || {};
    data       = fd.data_profile || {};
    rules      = fd.rules        || [];
    exceptions = fd.exceptions   || [];
    bookings   = fd.booking      || [];
    notations  = fd.notation     || [];
    courses    = fd.courses      || [];
    articles   = fd.articles     || [];
    lastLogin  = fd.last_login   || null;
  } catch {
    removeSkeleton(); return;
  }
  removeSkeleton();

  /* ── HERO ── */

  /* Avatar */
  const profileImg  = $("#freelance-profile-img");
  const initSpan    = $("#fp-avatar-initials");
  if (data.profile_image_url && profileImg) {
    profileImg.src = data.profile_image_url;
    profileImg.alt = data.display_name || "";
    profileImg.style.display = "block";
    if (initSpan) initSpan.style.display = "none";
  } else {
    const initials = (data.display_name || "?").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
    if (initSpan) initSpan.textContent = initials;
    if (profileImg) profileImg.style.display = "none";
  }

  /* Status */
  const statusWrap = $("#fp-status-wrap");
  if (statusWrap) {
    if (data.status === "active") {
      statusWrap.innerHTML = `<span class="fp-online-pill"><span class="fp-online-dot"></span>Disponible</span>`;
    } else if (data.status === "suspended") {
      statusWrap.innerHTML = `<span class="fp-offline-pill">Hors ligne</span>`;
    }
  }

  /* Tags services dans la pill hero */
  const svcTypesEl = $("#fp-svc-types");
  const hasFreelance = data.service_freelance === true && data.status !== "suspended";
  const hasCoaching  = data.service_coaching  === true && data.stripe_status === "active" && data.status !== "suspended";
  if (svcTypesEl && (hasFreelance || hasCoaching)) {
    const parts = [];
    if (hasCoaching)  parts.push("Consulting");
    if (hasFreelance) parts.push("Freelance");
    svcTypesEl.textContent = parts.join(" & ");
    svcTypesEl.style.display = "inline-flex";
  }

  setText("#formateur-display-name",     data.display_name);
  setText("#formateur-domaine-activity", data.domaine_activity ? `Domaine d'expertise ${data.domaine_activity}` : "");

  /* Tags hero : sous-domaines */
  const heroTags = $("#fp-hero-tags");
  if (heroTags && Array.isArray(data.sous_domaine_activity)) {
    data.sous_domaine_activity.slice(0, 5).forEach(tag => {
      const sp = document.createElement("span");
      sp.className = "fp-hero-tag";
      sp.textContent = tag;
      heroTags.appendChild(sp);
    });
    if (data.ville) {
      const loc = document.createElement("span");
      loc.className = "fp-hero-tag";
      loc.textContent = "📍 " + data.ville;
      heroTags.insertBefore(loc, heroTags.firstChild);
    }
    if (data.years_experience) {
      const xp = document.createElement("span");
      xp.className = "fp-hero-tag";
      xp.textContent = data.years_experience + " ans d'exp.";
      heroTags.insertBefore(xp, heroTags.firstChild);
    }
  }

  /* Stats */
  const nbNotation  = data.nb_notation ?? 0;
  const avgNotation = data.notation;
  setText("#average_avis", nbNotation > 0 && avgNotation != null ? parseFloat(avgNotation).toFixed(1) : "N/A");
  const nbAvisEl = $("#nb_avis");
  if (nbAvisEl) nbAvisEl.textContent = `(${nbNotation} avis)`;
  setText("#nb_project",   data.completed_projects ?? 0);
  setText("#nb_followers", data.followers ?? 0);

  /* Suivre */
  const followBtn = $("#add_follower");
  if (followBtn) {
    const auth = getAuth();
    const alreadyFollowing = (auth?.user_follower || []).some(f => f.freelancer_profile_id === data.id);
    if (alreadyFollowing) { followBtn.style.display = "none"; }
    else {
      followBtn.addEventListener("click", async () => {
        const token = getToken();
        if (!token) { const n = [...$$(".abo-nonco-container")].pop(); if (n) n.style.cssText = "display:flex!important"; return; }
        followBtn.disabled = true;
        try {
          const r = await fetch("https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_follow_freelance", {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ freelance_id: data.id })
          });
          if (r.ok) { followBtn.style.display = "none"; const el = $("#nb_followers"); if (el) el.textContent = (parseInt(el.textContent) || 0) + 1; }
          else followBtn.disabled = false;
        } catch { followBtn.disabled = false; }
      });
    }
  }

  /* ── À PROPOS ── */
  setHTML("#formateur-about", data.about_text);
  const locEl = $("#fp-meta-location");
  if (locEl) locEl.textContent = [data.ville, data.pays].filter(Boolean).join(", ") || "—";
  if (data.linkedin_url) {
    const lw = $("#formateur-linkedin-wrap"); const ll = $("#formateur-linkedin");
    if (lw) lw.style.display = "inline-flex";
    if (ll) ll.href = data.linkedin_url;
    /* LinkedIn sidebar */
    const liCard = $("#fp-linkedin-card"); const liLink = $("#fp-linkedin-link"); const liVal = $("#fp-linkedin-val");
    if (liCard) liCard.style.display = "block";
    if (liLink) liLink.href = data.linkedin_url;
    if (liVal)  liVal.textContent  = data.linkedin_url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  }

  /* ── EXPERTISE + AUDIENCE ── */
  function renderChips(containerId, html, isBlue) {
    const c = document.getElementById(containerId); if (!c) return;
    const tmp = document.createElement("div"); tmp.innerHTML = html || "";
    const items = Array.from(tmp.querySelectorAll("li")).map(li => li.textContent.trim());
    c.innerHTML = "";
    items.forEach(item => {
      const sp = document.createElement("span");
      sp.className = "fp-chip" + (isBlue ? "" : " neutral");
      sp.textContent = item;
      c.appendChild(sp);
    });
  }
  renderChips("formateur-expertise", data.expertise_list, true);
  renderChips("formateur-audience",  data.audience_list,  false);

  /* ── INFOS ── */
  if (data.created_at) {
    const d = new Date(data.created_at);
    const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    setText("#fp-membre-depuis", `${months[d.getMonth()]} ${d.getFullYear()}`);
  }
  (function() {
    const ts = lastLogin?.logget_at || lastLogin?.created_at || null;
    if (!ts) { setText("#fp-last-activity", "—"); return; }
    const diff = Date.now() - Number(ts);
    const m = Math.floor(diff/60000), h = Math.floor(m/60), dy = Math.floor(h/24), w = Math.floor(dy/7), mo = Math.floor(dy/30);
    let lbl;
    if      (m  < 5)  lbl = "En ligne";
    else if (m  < 60) lbl = `Il y a ${m} min`;
    else if (h  < 24) lbl = `Il y a ${h}h`;
    else if (dy < 7)  lbl = dy === 1 ? "Il y a 1 jour" : `Il y a ${dy} jours`;
    else if (w  < 5)  lbl = w  === 1 ? "Il y a 1 semaine" : `Il y a ${w} semaines`;
    else              lbl = mo <= 1  ? "Il y a 1 mois"  : `Il y a ${mo} mois`;
    setText("#fp-last-activity", lbl);
  })();
  setText("#formateur-xp-years-display", data.years_experience ? `${data.years_experience} ans` : "—");
  setText("#fp-nb-courses",  courses.length  || "0");
  setText("#fp-nb-articles", articles.length || "0");

  /* ── COMPÉTENCES ── */
  const skillsList = $("#fp-skills-list");
  if (skillsList && Array.isArray(data.sous_domaine_activity) && data.sous_domaine_activity.length) {
    skillsList.innerHTML = "";
    data.sous_domaine_activity.forEach(skill => {
      const d2 = document.createElement("div"); d2.className = "fp-skill";
      d2.innerHTML = `<span class="fp-skill-n">${skill}</span><div class="fp-skill-bar"><div class="fp-skill-fill" data-pct="100"></div></div><span class="fp-skill-pct">100%</span>`;
      skillsList.appendChild(d2);
    });
    setTimeout(() => $$(".fp-skill-fill").forEach(el => { el.style.width = el.dataset.pct + "%"; }), 200);
  } else { const c = $("#fp-skills-card"); if (c) c.style.display = "none"; }

  /* ── PARTAGER ── */
  const pageUrl = window.location.href, pageName = data.display_name || "Profil freelance";
  const tw = $("#fp-share-twitter"), li2 = $("#fp-share-linkedin"), fb = $("#fp-share-facebook"), cp = $("#fp-share-copy");
  if (tw)  tw.href  = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageName)}`;
  if (li2) li2.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
  if (fb)  fb.href  = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
  if (cp)  cp.addEventListener("click", () => navigator.clipboard.writeText(pageUrl).then(() => { cp.textContent = "✅"; setTimeout(() => { cp.textContent = "🔗"; }, 2000); }));

  /* ── SERVICE CARD — consulting par défaut ── */
  const switcher    = $("#fp-svc-switcher");
  const paneF       = $("#tab-pane-freelance");
  const paneC       = $("#tab-pane-coaching");
  const serviceCard = $("#fp-service-card");

  if (!hasFreelance && !hasCoaching) {
    if (serviceCard) serviceCard.style.display = "none";
  } else if (hasFreelance && hasCoaching) {
    /* Les deux : switcher visible, consulting actif par défaut */
    if (switcher) {
      switcher.style.display = "flex";
      /* Consulting premier = premier bouton actif */
      const swBtns = switcher.querySelectorAll(".fp-svc-sw");
      swBtns[0].classList.add("active"); /* consulting */
      paneC?.classList.add("active");
      paneF?.classList.remove("active");
      swBtns.forEach(btn => {
        btn.addEventListener("click", function () {
          swBtns.forEach(b => b.classList.remove("active"));
          this.classList.add("active");
          [paneF, paneC].forEach(p => p?.classList.remove("active"));
          document.getElementById(this.dataset.pane)?.classList.add("active");
        });
      });
    }
  } else if (hasCoaching && !hasFreelance) {
    /* Consulting seulement */
    paneC?.classList.add("active");
    if (paneF) paneF.style.display = "none";
  } else {
    /* Freelance seulement */
    paneF?.classList.add("active");
    if (paneC) paneC.style.display = "none";
  }

  setHTML("#formateur-freelance-text", data.text_freelance);
  setHTML("#formateur-coaching-text",  data.text_coaching);
  if (hasCoaching) {
    const priceHT  = data.price_cents ? data.price_cents / 100 : 0;
    const priceTTC = data.tva ? priceHT * 1.20 : priceHT;
    setText("#formateur-coaching-price", `${priceTTC.toFixed(0)}€ / heure`);
  }

  /* Boutons "envoyer un message" depuis la service card */
  ["#fp-contact-from-svc", "#fp-contact-from-coaching"].forEach(sel => {
    $(sel)?.addEventListener("click", () => $("#contact-freelance-btn")?.click());
  });

  /* ── AVIS ── */
  function timeAgo(ts) {
    if (!ts) return "";
    const d2 = Math.floor((Date.now()-ts)/86400000), w2 = Math.floor(d2/7), m2 = Math.floor(d2/30);
    if (d2 < 1) return "Aujourd'hui";
    if (d2 < 7) return d2 === 1 ? "Il y a 1 jour" : `Il y a ${d2} jours`;
    if (w2 < 5) return w2 === 1 ? "Il y a 1 semaine" : `Il y a ${w2} semaines`;
    return m2 <= 1 ? "Il y a 1 mois" : `Il y a ${m2} mois`;
  }

  function buildAvisItem(avis) {
    const item = document.createElement("div"); item.className = "fp-avis-item";
    const ini = ((avis.first_name||"").charAt(0) + (avis.last_name||"").charAt(0)).toUpperCase() || "?";
    const av  = avis.image_url ? `<img class="fp-avis-av" src="${avis.image_url}" alt="" />` : `<div class="fp-avis-av-fb">${ini}</div>`;
    const stars = Math.round(avis.note || 0);
    let sh = ""; for (let i=0;i<5;i++) sh += `<span class="fp-avis-star ${i<stars?"lit":""}">★</span>`;
    const svcLabel = avis.service === "coaching" ? "🎯 Consulting" : "💼 Freelance";
    const name = [avis.first_name, avis.last_name ? avis.last_name.charAt(0)+"." : ""].filter(Boolean).join(" ");
    const comment = avis.commentaire?.trim();
    item.innerHTML = `${av}<div class="fp-avis-body"><div class="fp-avis-top"><span class="fp-avis-name">${name||"Anonyme"}</span><span class="fp-avis-badge">${svcLabel}</span></div><div class="fp-avis-stars">${sh}<span class="fp-avis-note">${parseFloat(avis.note||0).toFixed(1)}/5</span></div>${comment?`<div class="fp-avis-comment">${comment}</div>`:`<div class="fp-avis-comment" style="color:var(--muted);font-style:italic;">Aucun commentaire</div>`}<div class="fp-avis-date">${timeAgo(avis.created_at)}</div></div>`;
    return item;
  }

  function buildAvisEmpty() {
    const div = document.createElement("div"); div.className = "fp-avis-empty";
    div.innerHTML = `<div class="fp-avis-empty-stars">${"★★★★★".split("").map(()=>`<div class="fp-avis-empty-star">☆</div>`).join("")}</div><div class="fp-avis-empty-t">Pas encore d'avis</div><div class="fp-avis-empty-s">Les avis apparaissent après chaque session terminée. Réservez et soyez le premier à en laisser un.</div><button class="fp-avis-empty-cta" id="fp-avis-empty-cta">📅 Réserver une session</button>`;
    return div;
  }

  function renderAvis(list, containerSel, limit) {
    const c = $(containerSel); if (!c) return;
    c.innerHTML = "";
    const items = limit ? list.slice(0, limit) : list;
    if (!items.length) {
      const empty = buildAvisEmpty(); c.appendChild(empty);
      c.querySelector("#fp-avis-empty-cta")?.addEventListener("click", () => {
        (hasCoaching ? $("#coaching-book-btn") : $("#freelance-book-btn"))?.click();
      });
      return;
    }
    items.forEach(a => c.appendChild(buildAvisItem(a)));
  }

  const sorted = notations.slice().sort((a,b) => b.created_at - a.created_at);
  renderAvis(sorted, "#avis-list", 3);
  const avBtn = $("#avis-voir-plus");
  if (avBtn && sorted.length > 3) {
    avBtn.style.display = "inline";
    avBtn.addEventListener("click", () => {
      const m = $("#avis-modal"); if (!m) return;
      renderAvis(sorted, "#avis-modal-list", null);
      m.classList.add("active");
    });
  }
  $("#avis-modal-close")?.addEventListener("click", () => $("#avis-modal")?.classList.remove("active"));
  $("#avis-modal")?.addEventListener("click", e => { if (e.target === $("#avis-modal")) $("#avis-modal").classList.remove("active"); });

  /* ── CONTENU — tabs ── */
  function buildCourseCard(item) {
    const c2 = item.course || {}, title = c2.title||"—", cover = c2.cover_url||"";
    const mods = item.nb_modules||0, durMin = Math.round((item.duration||0)/60);
    const durH = durMin>=60 ? Math.floor(durMin/60)+"h"+(durMin%60?String(durMin%60).padStart(2,"0"):"") : durMin+" min";
    const parts = c2.nb_participants||0, avgN = parseFloat(c2.average_notation)||0, nbN = c2.nb_notation||0;
    const card = document.createElement("a");
    card.href = `https://www.digitools-room.com/pages-formation/${c2.slug||""}`; card.target="_blank"; card.rel="noopener"; card.className="fp-course-card";
    card.innerHTML = `${cover?`<img class="fp-course-cover" src="${cover}" alt="${title}" />`:`<div class="fp-course-cover" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">▶</div>`}<div class="fp-course-body"><span class="fp-ctype cours">📘 Cours</span><div class="fp-ctitle">${title}</div><div class="fp-cmeta-row"><span class="fp-mbadge">📚 ${mods} module${mods!==1?"s":""}</span>${durMin>0?`<span class="fp-mbadge">⏱ ${durH}</span>`:""}<span class="fp-mbadge">👥 ${parts}</span>${avgN>0&&nbN>0?`<span class="fp-rbadge">⭐ ${avgN.toFixed(1)} (${nbN})</span>`:""}</div></div>`;
    return card;
  }

  function buildArticleCard(item) {
    const a2 = item.article||{}, title = a2.title||"—", img = a2.url_image||"";
    const isRes = a2.is_ressource===true, tempsMin = Math.round((a2.temps_lecture_secondes||0)/60)||1, nbView = a2.nb_view||0;
    const card = document.createElement("a");
    card.href = `https://www.digitools-room.com/articles-de-blog/${a2.slug||""}`; card.target="_blank"; card.rel="noopener"; card.className="fp-article-card";
    card.innerHTML = `${img?`<img class="fp-article-cover" src="${img}" alt="${title}" />`:`<div class="fp-article-cover" style="display:flex;align-items:center;justify-content:center;font-size:2rem;">📄</div>`}<div class="fp-article-body"><span class="fp-ctype ${isRes?"ressource":"article"}">${isRes?"🔗 Ressource":"✍️ Article"}</span><div class="fp-ctitle">${title}</div><div class="fp-cmeta-row"><span class="fp-mbadge">⏱ ${tempsMin} min</span>${nbView>0?`<span class="fp-mbadge">👁 ${nbView} vues</span>`:""}</div></div>`;
    return card;
  }

  function buildEmpty(icon, title, sub) {
    const div = document.createElement("div"); div.className = "fp-panel-empty";
    div.innerHTML = `<div class="fp-panel-empty-ico">${icon}</div><div class="fp-panel-empty-t">${title}</div><div class="fp-panel-empty-s">${sub}</div>`;
    return div;
  }

  const articlesOnly = articles.filter(a => !a.article?.is_ressource);
  const ressources   = articles.filter(a =>  a.article?.is_ressource === true);

  function fillGrid(gridId, panelId, items, buildFn, icon, title, sub) {
    const grid = document.getElementById(gridId);
    const panel = document.getElementById(panelId);
    if (!grid || !panel) return;
    if (!items.length) { grid.remove(); panel.appendChild(buildEmpty(icon, title, sub)); }
    else items.forEach(i => grid.appendChild(buildFn(i)));
  }
  fillGrid("fp-grid-cours",     "fp-panel-cours",     courses,     buildCourseCard,  "📘", "Aucune formation", "Les formations apparaîtront ici.");
  fillGrid("fp-grid-articles",  "fp-panel-articles",  articlesOnly,buildArticleCard, "✍️", "Aucun article",    "Les articles apparaîtront ici.");
  fillGrid("fp-grid-ressources","fp-panel-ressources",ressources,  buildArticleCard, "🔗", "Aucune ressource", "Les ressources apparaîtront ici.");

  /* Labels tabs avec compteurs */
  const tabEls = $$(".fp-tab", document.getElementById("fp-content-tabs"));
  if (tabEls[0]) tabEls[0].textContent = `Formations (${courses.length})`;
  if (tabEls[1]) tabEls[1].textContent = `Articles (${articlesOnly.length})`;
  if (tabEls[2]) tabEls[2].textContent = `Ressources (${ressources.length})`;

  /* Tabs interactives */
  tabEls.forEach(tab => {
    tab.addEventListener("click", function () {
      tabEls.forEach(t => t.classList.remove("active"));
      this.classList.add("active");
      $$(".fp-panel", document.getElementById("fp-content-section")).forEach(p => p.classList.remove("active"));
      document.getElementById(this.dataset.panel)?.classList.add("active");
    });
  });

  /* Tabs modal contenu */
  $$(".fp-modal-tab").forEach(tab => {
    tab.addEventListener("click", function () {
      $$(".fp-modal-tab").forEach(t => t.classList.remove("active"));
      this.classList.add("active");
      $$(".fp-modal-tab-pane").forEach(p => p.classList.remove("active"));
      document.getElementById(this.dataset.tab)?.classList.add("active");
    });
  });
  $("#content-modal-close")?.addEventListener("click", () => $("#content-modal")?.classList.remove("active"));
  $("#content-modal")?.addEventListener("click", e => { if (e.target === $("#content-modal")) $("#content-modal").classList.remove("active"); });

  /* ── CONTACT ── */
  (function initContact() {
    const triggerBtn = $("#contact-freelance-btn"); if (!triggerBtn) return;
    const freelanceIdInt = parseInt(freelanceId, 10);
    document.body.insertAdjacentHTML("beforeend", `<div id="cfover" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);align-items:center;justify-content:center;"><div style="background:#fff;border-radius:20px;border:1.5px solid #bfdbfe;box-shadow:0 24px 64px rgba(37,99,235,.15);width:100%;max-width:460px;margin:20px;font-family:'DM Sans',sans-serif;overflow:hidden;"><div style="padding:22px 26px 18px;background:#eff6ff;border-bottom:1.5px solid #bfdbfe;display:flex;align-items:center;justify-content:space-between;"><div><div style="font-size:1.05rem;font-weight:700;color:#0f172a;margin-bottom:3px;">💬 Ouvrir une discussion</div><div style="font-size:.78rem;color:#94a3b8;">Envoyez votre premier message</div></div><button onclick="document.getElementById('cfover').style.display='none'" style="width:32px;height:32px;border-radius:8px;border:1.5px solid #bfdbfe;background:#fff;cursor:pointer;font-size:1rem;color:#94a3b8;display:flex;align-items:center;justify-content:center;">✕</button></div><div style="padding:22px 26px;display:flex;flex-direction:column;gap:14px;"><div><label style="font-size:.73rem;font-weight:700;color:#475569;letter-spacing:.06em;text-transform:uppercase;display:block;margin-bottom:6px;">Votre message</label><textarea id="cf-content" placeholder="Bonjour, je suis intéressé par votre profil…" style="width:100%;min-height:120px;padding:11px 13px;border:1.5px solid #bfdbfe;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.84rem;color:#0f172a;background:#f8fafc;outline:none;resize:none;line-height:1.6;box-sizing:border-box;"></textarea></div><div id="cf-error" style="display:none;font-size:.77rem;color:#ef4444;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 12px;"></div><button id="cf-submit" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2563eb;color:#fff;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:600;cursor:pointer;">Envoyer et ouvrir la discussion →</button><div style="font-size:.72rem;color:#94a3b8;text-align:center;">Vous serez redirigé vers votre messagerie après l'envoi</div></div></div></div>`);
    const overlay = document.getElementById("cfover");
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.style.display = "none"; });
    triggerBtn.addEventListener("click", async () => {
      const token = getToken();
      if (!token) { const n=[...$$(".abo-nonco-container")].pop(); if(n) n.style.cssText="display:flex!important"; return; }
      try {
        const res2 = await fetch("https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/get_freelance_user_id", { method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+token}, body:JSON.stringify({freelance_id:freelanceIdInt}) });
        const d2 = await res2.json(); window._cfUserId = d2?._user?.id || null;
      } catch { window._cfUserId = null; }
      document.getElementById("cf-content").value = "";
      document.getElementById("cf-error").style.display = "none";
      document.getElementById("cf-submit").textContent = "Envoyer et ouvrir la discussion →";
      overlay.style.display = "flex";
    });
    document.getElementById("cf-submit")?.addEventListener("click", async () => {
      const content = document.getElementById("cf-content").value.trim();
      const errorEl = document.getElementById("cf-error"), submitBtn = document.getElementById("cf-submit");
      errorEl.style.display = "none";
      if (!content) { errorEl.textContent = "Merci d'écrire un message avant d'envoyer."; errorEl.style.display = "block"; return; }
      const auth2 = getAuth(), token2 = auth2?.token||"", userId = auth2?.user?.id||null;
      if (!userId || !window._cfUserId) { errorEl.textContent = "Impossible d'identifier les participants. Réessayez."; errorEl.style.display = "block"; return; }
      submitBtn.textContent = "Envoi en cours…"; submitBtn.style.opacity = ".7"; submitBtn.disabled = true;
      try {
        const res3 = await fetch("https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_direct_conversation", { method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+token2}, body:JSON.stringify({user_id:userId,freelance_id:window._cfUserId,content,initiative:"user"}) });
        const d3 = await res3.json();
        if (!res3.ok) throw new Error(d3?.message||"Erreur");
        if (d3==="already exist"||d3?.message==="already exist") {
          errorEl.innerHTML=`Vous avez déjà une conversation avec ce freelance. <a href="https://www.digitools-room.com/oauth/mes-messages" style="color:#2563eb;font-weight:700;text-decoration:underline;">Accéder à ma messagerie →</a>`;
          errorEl.style.background="#eff6ff"; errorEl.style.border="1px solid #bfdbfe"; errorEl.style.color="#2563eb"; errorEl.style.display="block";
          submitBtn.textContent="Envoyer et ouvrir la discussion →"; submitBtn.style.opacity="1"; submitBtn.disabled=false; return;
        }
        window.location.href = "https://www.digitools-room.com/oauth/mes-messages";
      } catch(err) {
        errorEl.textContent="Une erreur est survenue, veuillez réessayer."; errorEl.style.display="block";
        submitBtn.textContent="Envoyer et ouvrir la discussion →"; submitBtn.style.opacity="1"; submitBtn.disabled=false;
      }
    });
  })();

  /* ── BOOKING ── */
  initBooking(data, rules, exceptions, bookings);
});

/* ── PAGE VIEW ── */
(function(){
  window.addEventListener("DOMContentLoaded", async function(){
    const el = document.querySelector("#freelance-page-id");
    const id = el?.getAttribute("freelance-id"), idInt = parseInt(id,10);
    if (!id||isNaN(idInt)||typeof sendEvent!=="function") return;
    const r = await sendEvent({type:"freelance_page_view",freelance_id:idInt,url:window.location.href,referrer_type:document.referrer||null});
    const eId=r?.event_return?.id||null, sId=r?.event_return?.session_id||null;
    if (eId)  sessionStorage.setItem("current_freelance_view_id",eId);
    if (sId)  sessionStorage.setItem("current_freelance_session_id",sId);
  });
})();

/* ── BOOKING SYSTEM (identique) ── */
function initBooking(data, rules, exceptions, bookings) {
  const getAuth  = () => { try { return JSON.parse(localStorage.getItem("auth")||"null"); } catch { return null; } };
  const getToken = () => { const a=getAuth(); return a?.authToken||a?.token||a?.jwt||null; };
  const stripe = Stripe('pk_test_51SyzcDL3xhjHUkMPws3SM77dfSMlxd0ji3JzWRYkSdbOS0dCATxxKRcaFaOrwmc8dnce969oeB7xgADPK9rxtuWt00ik1auOHM');
  const overlay=document.getElementById('booking-overlay'),closeBtn=document.getElementById('booking-modal-close'),modalTitle=document.getElementById('booking-modal-title'),step1El=document.getElementById('booking-step-1'),step2El=document.getElementById('booking-step-2'),dot1=document.getElementById('step-dot-1'),dot2=document.getElementById('step-dot-2');
  const DAYS_FR=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'],MONTHS_FR=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const bufferMin=data.buffer_between_min_integer||0,coachingDurations=Array.isArray(data.coaching_duration)?data.coaching_duration:[60],noticeHours=data.min_notice_hours||0,freelanceTz=data.timezone||'Europe/Paris',visitorTz=Intl.DateTimeFormat().resolvedOptions().timeZone;

  function injectPaymentModal(){
    if(document.getElementById('payment-overlay')) return;
    const s=document.createElement('style');s.textContent=`#payment-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;align-items:center;justify-content:center;padding:20px;}#payment-overlay.active{display:flex;}#payment-modal{background:#fff;border-radius:20px;padding:32px 28px 28px;max-width:460px;width:100%;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:'DM Sans',sans-serif;max-height:90vh;overflow-y:auto;}#payment-modal-close{position:absolute;top:16px;right:16px;background:#f4f4f0;border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#666;}.payment-title{font-size:1.1rem;font-weight:700;color:#0f0f0f;margin-bottom:4px;}.payment-subtitle{font-size:.82rem;color:#9a9a9a;margin-bottom:20px;}.payment-reassurance{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;font-size:.78rem;color:#166534;margin-bottom:20px;display:flex;gap:8px;align-items:flex-start;line-height:1.5;}.payment-amount{background:#f8f9ff;border:1px solid #BFDBFE;border-radius:10px;padding:14px 16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;}.payment-amount-label{font-size:.82rem;color:#9a9a9a;}.payment-amount-value{font-size:1.1rem;font-weight:700;color:#0f0f0f;}#payment-element{margin-bottom:20px;}#payment-submit{display:block;width:100%;padding:13px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:600;cursor:pointer;}#payment-submit:disabled{opacity:.6;cursor:not-allowed;}#payment-error{color:#ef4444;font-size:.8rem;margin-top:10px;text-align:center;min-height:20px;}`;document.head.appendChild(s);
    const el=document.createElement('div');el.id='payment-overlay';el.innerHTML=`<div id="payment-modal"><button id="payment-modal-close">✕</button><div class="payment-title">💳 Paiement sécurisé</div><div class="payment-subtitle" id="payment-subtitle"></div><div class="payment-reassurance"><span>🔒</span><span>Votre carte sera autorisée mais <strong>vous ne serez débité que si le freelance accepte le rendez-vous</strong>.</span></div><div class="payment-amount"><span class="payment-amount-label">Montant à autoriser</span><span class="payment-amount-value" id="payment-amount-display"></span></div><div id="payment-element"></div><button id="payment-submit">Autoriser le paiement</button><div id="payment-error"></div></div>`;document.body.appendChild(el);
    document.getElementById('payment-modal-close')?.addEventListener('click',()=>el.classList.remove('active'));el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('active');});
  }
  injectPaymentModal();

  function injectConfirmModal(){
    if(document.getElementById('booking-confirm-overlay')) return;
    const s=document.createElement('style');s.textContent=`#booking-confirm-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;padding:20px;}#booking-confirm-overlay.active{display:flex;}#booking-confirm-modal{background:#fff;border-radius:20px;padding:32px 28px 28px;max-width:460px;width:100%;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.15);font-family:'DM Sans',sans-serif;}.bcc{position:absolute;top:16px;right:16px;background:#f4f4f0;border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#666;}.ci{font-size:2.5rem;text-align:center;margin-bottom:12px;}.ct{font-size:1.2rem;font-weight:700;color:#0f0f0f;text-align:center;margin-bottom:4px;}.cs{font-size:.82rem;color:#9a9a9a;text-align:center;margin-bottom:24px;}.cd{background:#f8f9ff;border:1px solid #BFDBFE;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;margin-bottom:20px;}.cdr{display:flex;align-items:center;gap:10px;font-size:.85rem;color:#0f0f0f;}.cdi{font-size:1rem;flex-shrink:0;width:20px;text-align:center;}.cdl{color:#9a9a9a;font-size:.75rem;min-width:70px;}.cdv{font-weight:600;}.cn{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;font-size:.78rem;color:#166534;margin-bottom:20px;display:flex;gap:8px;align-items:flex-start;line-height:1.5;}.cb{display:block;width:100%;padding:13px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:600;cursor:pointer;text-align:center;text-decoration:none;}`;document.head.appendChild(s);
    const el=document.createElement('div');el.id='booking-confirm-overlay';el.innerHTML=`<div id="booking-confirm-modal"><button class="bcc" id="booking-confirm-close">✕</button><div class="ci">🎉</div><div class="ct" id="confirm-title"></div><div class="cs" id="confirm-subtitle"></div><div class="cd" id="confirm-details"></div><div class="cn"><span>💡</span><span>Sur votre page <strong>Mes rendez-vous</strong> vous retrouverez toutes les informations de votre session.</span></div><a href="https://www.digitools-room.com/oauth/mes-freelances" class="cb">Voir mon rendez-vous →</a></div>`;document.body.appendChild(el);
    document.getElementById('booking-confirm-close')?.addEventListener('click',()=>el.classList.remove('active'));el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('active');});
  }
  injectConfirmModal();

  function showConfirmation(type,slot,duration,name){
    const el=document.getElementById('booking-confirm-overlay');if(!el)return;
    const isCoach=type==='coaching',dateLabel=new Date(slot.startUtcMs).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:visitorTz});
    document.getElementById('confirm-title').textContent=`Votre rendez-vous avec ${name} est confirmé !`;
    document.getElementById('confirm-subtitle').textContent=isCoach?'Votre session coaching a bien été enregistrée. Le freelance dispose de 48h pour confirmer.':'Votre demande de rendez-vous a bien été envoyée.';
    document.getElementById('confirm-details').innerHTML=`<div class="cdr"><span class="cdi">👤</span><span class="cdl">Avec</span><span class="cdv">${name}</span></div><div class="cdr"><span class="cdi">📅</span><span class="cdl">Date</span><span class="cdv">${dateLabel}</span></div><div class="cdr"><span class="cdi">🕐</span><span class="cdl">Heure</span><span class="cdv">${slot.displayTime}</span></div><div class="cdr"><span class="cdi">⏱️</span><span class="cdl">Durée</span><span class="cdv">${duration} min</span></div><div class="cdr"><span class="cdi">${isCoach?'🎯':'💼'}</span><span class="cdl">Type</span><span class="cdv">${isCoach?'Session coaching':'Rendez-vous freelance'}</span></div>`;
    el.classList.add('active');
  }

  function toLocalDateStr(d){const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
  function getLocalDow(d){const noon=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0);const j=noon.getDay();return j===0?7:j;}
  function toDateStr(v){if(!v)return'';if(typeof v==='string'&&v.includes('-'))return v.substring(0,10);return toLocalDateStr(new Date(typeof v==='number'?v:parseInt(v)));}
  function getMonthStartOffset(y,m){const d=new Date(y,m,1,12,0,0).getDay();return d===0?6:d-1;}
  function freelanceMinToUtcMs(dateStr,minutes){const midnight=new Date(`${dateStr}T00:00:00Z`);const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:freelanceTz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});const parts=fmt.formatToParts(midnight);const p={};parts.forEach(x=>{p[x.type]=x.value;});const off=(parseInt(p.hour)*60+parseInt(p.minute))*60000;return midnight.getTime()-off+minutes*60000;}
  function utcMsToVisitorTime(ms){return new Intl.DateTimeFormat('fr-FR',{timeZone:visitorTz,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));}
  function isInException(dateStr){return exceptions.some(e=>{const s=toDateStr(e.start_at),en=toDateStr(e.end_at);return dateStr>=s&&dateStr<=en;});}
  function isSlotBooked(s,e){return bookings.some(b=>{const bS=typeof b.start_at==='number'?b.start_at:parseInt(b.start_at),bE=typeof b.end_at==='number'?b.end_at:parseInt(b.end_at);return s<bE&&e>bS;});}
  function dayHasSlots(date,dur){const dow=getLocalDow(date),dateStr=toLocalDateStr(date);if(!rules.some(r=>r.day_of_week===dow))return false;if(isInException(dateStr))return false;const d=dur||60;return rules.filter(r=>r.day_of_week===dow).some(rule=>{let cur=rule.start_time;while(cur+d<=rule.end_time){const sMs=freelanceMinToUtcMs(dateStr,cur),eMs=freelanceMinToUtcMs(dateStr,cur+d);if(!isSlotBooked(sMs,eMs))return true;cur+=d+bufferMin;}return false;});}
  function getSlotsForDay(date,dur){const dow=getLocalDow(date),dateStr=toLocalDateStr(date),d=dur||60,step=d+bufferMin,slots=[];rules.filter(r=>r.day_of_week===dow).forEach(rule=>{let cur=rule.start_time;while(cur+d<=rule.end_time){const sMs=freelanceMinToUtcMs(dateStr,cur),eMs=freelanceMinToUtcMs(dateStr,cur+d);slots.push({startUtcMs:sMs,endUtcMs:eMs,startMin:cur,endMin:cur+d,displayTime:utcMsToVisitorTime(sMs),booked:isSlotBooked(sMs,eMs)});cur+=step;}});return slots.sort((a,b)=>a.startUtcMs-b.startUtcMs);}

  let bs={type:null,date:null,slot:null,duration:null,currentMonth:new Date(),phone:'',note:'',url:'',attachment1_url:'',attachment1_name:'',attachment2_url:'',attachment2_name:''};
  let stripeElements=null,currentPI=null;

  function renderStep1(){
    step1El.style.display='';step2El.style.display='none';dot1.classList.add('active');dot2.classList.remove('active');
    const isCoach=bs.type==='coaching';if(isCoach&&!bs.duration)bs.duration=coachingDurations[0];
    const now=new Date(),month=bs.currentMonth,year=month.getFullYear(),mon=month.getMonth();
    const minMs=now.getTime()+noticeHours*3600000,minDate=new Date(new Date(minMs).getFullYear(),new Date(minMs).getMonth(),new Date(minMs).getDate()+1,12,0,0);
    const minDateStr=toLocalDateStr(minDate),todayStr=toLocalDateStr(now),lastDay=new Date(year,mon+1,0),startDow=getMonthStartOffset(year,mon);
    let html=`<div class="cal-header"><button class="cal-nav-btn" id="cal-prev">‹</button><span class="cal-month-label">${MONTHS_FR[mon]} ${year}</span><button class="cal-nav-btn" id="cal-next">›</button></div><div class="cal-grid">${DAYS_FR.map(d=>`<div class="cal-day-name">${d}</div>`).join('')}${Array(startDow).fill('<div class="cal-day empty"></div>').join('')}`;
    for(let d=1;d<=lastDay.getDate();d++){const date=new Date(year,mon,d,12,0,0),dateStr=toLocalDateStr(date),isTooSoon=dateStr<minDateStr,hasSlots=!isTooSoon&&dayHasSlots(date,bs.duration||60),isSelected=bs.date===dateStr,isToday=dateStr===todayStr;let cls='cal-day';if(isTooSoon||!hasSlots)cls+=' disabled';else cls+=' has-slots';if(isSelected)cls+=' selected';if(isToday)cls+=' today';html+=`<div class="${cls}" data-date="${dateStr}">${d}</div>`;}
    html+=`</div>`;
    if(isCoach)html+=`<div class="durations-section"><div class="slots-title">Durée de la session</div><div class="duration-btns">${coachingDurations.map(dur=>`<button class="duration-btn ${bs.duration===dur?'selected':''}" data-duration="${dur}">${dur} min</button>`).join('')}</div></div>`;
    if(bs.date){const slots=getSlotsForDay(new Date(bs.date+'T12:00:00'),bs.duration||60);const tzNote=freelanceTz!==visitorTz?`<div style="font-size:.72rem;color:#9a9a9a;margin-bottom:8px;">Horaires en heure locale (${visitorTz})</div>`:'';html+=`<div class="slots-section"><div class="slots-title">Créneaux disponibles</div>${tzNote}${slots.length>0?`<div class="slots-grid">${slots.map((s,i)=>`<button class="slot-btn ${s.booked?'unavailable':''} ${bs.slot?.startUtcMs===s.startUtcMs&&!s.booked?'selected':''}" data-index="${i}" ${s.booked?'disabled':''}>${s.displayTime}</button>`).join('')}</div>`:`<p style="font-size:.82rem;color:#9a9a9a;margin-bottom:20px;">Aucun créneau disponible ce jour.</p>`}</div>`;step1El._slots=slots;}
    html+=`<div class="booking-actions"><button class="booking-btn-next" id="step1-next" ${(!bs.date||!bs.slot)?'disabled':''}>Continuer →</button></div>`;
    step1El.innerHTML=html;
    document.getElementById('cal-prev')?.addEventListener('click',()=>{bs.currentMonth=new Date(year,mon-1,1);renderStep1();});
    document.getElementById('cal-next')?.addEventListener('click',()=>{bs.currentMonth=new Date(year,mon+1,1);renderStep1();});
    step1El.querySelectorAll('.cal-day:not(.disabled):not(.empty)').forEach(el=>{el.addEventListener('click',function(){bs.date=this.dataset.date;bs.slot=null;renderStep1();});});
    step1El.querySelectorAll('.duration-btn').forEach(btn=>{btn.addEventListener('click',function(){bs.duration=parseInt(this.dataset.duration);bs.slot=null;renderStep1();});});
    step1El.querySelectorAll('.slot-btn:not(.unavailable)').forEach(btn=>{btn.addEventListener('click',function(){bs.slot=(step1El._slots||[])[parseInt(this.dataset.index)]||null;renderStep1();});});
    document.getElementById('step1-next')?.addEventListener('click',renderStep2);
  }

  function renderStep2(){
    step1El.style.display='none';step2El.style.display='';dot1.classList.add('active');dot2.classList.add('active');
    const isCoach=bs.type==='coaching';
    const dateLabel=new Date(bs.date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
    const durLabel=isCoach?` · ${bs.duration} min`:'';
    const noteLabel=isCoach?"Décrivez votre situation, vos objectifs et tout ce qui aidera le coach à préparer la session.":"Décrivez votre projet, vos besoins et tout ce qui aidera le freelance à préparer l'échange.";
    const btnLabel=isCoach?"💳 Payer et réserver":"Confirmer le rendez-vous";
    step2El.innerHTML=`<div class="booking-recap-slot"><span class="booking-recap-slot-icon">📅</span><span class="booking-recap-slot-text">${dateLabel} à ${bs.slot?.displayTime||''}${durLabel}</span></div><div id="booking-error-banner" style="display:none;" class="booking-error-banner">⚠️ Veuillez remplir tous les champs obligatoires avant de continuer.</div><div class="booking-form" style="margin-top:20px;"><div class="form-field"><label class="form-label">Numéro de téléphone <span style="color:#ef4444;">*</span></label><div class="form-hint">Utilisé uniquement par le ${isCoach?'coach':'freelance'} en cas de besoin</div><input type="tel" class="form-input" id="booking-phone" placeholder="+33 6 12 34 56 78" value="${bs.phone}" /></div><div class="form-field"><label class="form-label">${isCoach?'Préparer la session':'Votre projet'} <span style="color:#ef4444;">*</span></label><textarea class="form-textarea" id="booking-note" placeholder="${noteLabel}">${bs.note}</textarea></div><div class="form-field"><label class="form-label">URL de référence <span class="form-optional">(optionnel)</span></label><input type="url" class="form-input" id="booking-url" placeholder="https://votre-site.com" value="${bs.url}" /></div><div class="attachments-row"><div class="form-field"><label class="form-label">Pièce jointe 1 <span class="form-optional">(optionnel)</span></label><div class="file-drop-zone ${bs.attachment1_url?'has-file':''}" id="file-zone-1" onclick="document.getElementById('booking-file-1').click()"><div class="file-drop-zone-icon">📎</div><div class="file-drop-zone-title">Ajouter un fichier</div><div class="file-drop-zone-sub">PDF, JPG, PNG, DOCX</div><div class="file-drop-zone-success" id="file-success-1">${bs.attachment1_url?'✅ Fichier chargé':''}</div></div><input type="file" id="booking-file-1" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" /><input type="text" class="form-input" id="file-name-1" placeholder="Nommez votre fichier" style="margin-top:8px;display:${bs.attachment1_url?'block':'none'};" value="${bs.attachment1_name}" /></div><div class="form-field"><label class="form-label">Pièce jointe 2 <span class="form-optional">(optionnel)</span></label><div class="file-drop-zone ${bs.attachment2_url?'has-file':''}" id="file-zone-2" onclick="document.getElementById('booking-file-2').click()"><div class="file-drop-zone-icon">📎</div><div class="file-drop-zone-title">Ajouter un fichier</div><div class="file-drop-zone-sub">PDF, JPG, PNG, DOCX</div><div class="file-drop-zone-success" id="file-success-2">${bs.attachment2_url?'✅ Fichier chargé':''}</div></div><input type="file" id="booking-file-2" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" /><input type="text" class="form-input" id="file-name-2" placeholder="Nommez votre fichier" style="margin-top:8px;display:${bs.attachment2_url?'block':'none'};" value="${bs.attachment2_name}" /></div></div></div><div class="booking-actions"><button class="booking-btn-back" id="step2-back">← Retour</button><button class="${isCoach?'booking-btn-pay':'booking-btn-next'}" id="step2-submit">${btnLabel}</button></div>`;
    document.getElementById('booking-phone')?.addEventListener('input',e=>{bs.phone=e.target.value;});
    document.getElementById('booking-note')?.addEventListener('input',e=>{bs.note=e.target.value;});
    document.getElementById('booking-url')?.addEventListener('input',e=>{bs.url=e.target.value;});
    document.getElementById('file-name-1')?.addEventListener('input',e=>{bs.attachment1_name=e.target.value;});
    document.getElementById('file-name-2')?.addEventListener('input',e=>{bs.attachment2_name=e.target.value;});
    document.getElementById('booking-file-1')?.addEventListener('change',async function(){const url=await uploadFile(this.files[0],'file-zone-1','file-success-1');if(url)bs.attachment1_url=url;});
    document.getElementById('booking-file-2')?.addEventListener('change',async function(){const url=await uploadFile(this.files[0],'file-zone-2','file-success-2');if(url)bs.attachment2_url=url;});
    document.getElementById('step2-back')?.addEventListener('click',renderStep1);
    document.getElementById('step2-submit')?.addEventListener('click',submitBooking);
  }

  async function uploadFile(file,zoneId,successId){
    if(!file)return null;const zone=document.getElementById(zoneId),sEl=document.getElementById(successId);
    if(sEl){sEl.textContent='⏳ Upload en cours...';sEl.style.display='block';}if(zone)zone.classList.add('has-file');
    const fd=new FormData();fd.append('file',file);
    try{const res=await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof',{method:'POST',headers:getToken()?{Authorization:'Bearer '+getToken()}:{},body:fd});const d=await res.json();const url=d?.path?'https://xmot-l3ir-7kuj.p7.xano.io'+d.path:null;if(url){if(sEl)sEl.textContent='✅ '+file.name;const n=document.getElementById(zoneId==='file-zone-1'?'file-name-1':'file-name-2');if(n)n.style.display='block';return url;}else{if(sEl)sEl.textContent='❌ Erreur upload';if(zone)zone.classList.remove('has-file');return null;}}catch{if(sEl)sEl.textContent='❌ Erreur upload';if(zone)zone.classList.remove('has-file');return null;}
  }

  async function submitBooking(){
    const btn=document.getElementById('step2-submit'),token=getToken(),isCoach=bs.type==='coaching';
    let hasErr=false,firstEl=null;
    const pI=document.getElementById('booking-phone'),nI=document.getElementById('booking-note'),n1I=document.getElementById('file-name-1'),n2I=document.getElementById('file-name-2'),banner=document.getElementById('booking-error-banner');
    if(!bs.phone?.trim()){if(pI){pI.style.borderColor='#ef4444';if(!firstEl)firstEl=pI;}hasErr=true;}else if(pI)pI.style.borderColor='#BFDBFE';
    if(!bs.note?.trim()){if(nI){nI.style.borderColor='#ef4444';if(!firstEl)firstEl=nI;}hasErr=true;}else if(nI)nI.style.borderColor='#BFDBFE';
    if(bs.attachment1_url&&!bs.attachment1_name.trim()){if(n1I){n1I.style.borderColor='#ef4444';if(!firstEl)firstEl=n1I;}hasErr=true;}
    if(bs.attachment2_url&&!bs.attachment2_name.trim()){if(n2I){n2I.style.borderColor='#ef4444';if(!firstEl)firstEl=n2I;}hasErr=true;}
    if(hasErr){if(banner)banner.style.display='flex';if(firstEl)firstEl.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(banner)banner.style.display='none';
    if(isCoach){
      if(btn){btn.disabled=true;btn.textContent='Chargement...';}
      try{const piRes=await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_payment_intent',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({freelancer_profile_id:data.id,duration_min:bs.duration})});const piData=await piRes.json();if(!piData?.client_secret)throw new Error('Impossible de créer le paiement');currentPI=piData.payment_intent_id;const amHT=(data.price_cents*bs.duration/60)/100,amTTC=data.tva?amHT*1.20:amHT;document.getElementById('payment-amount-display').textContent=amTTC.toFixed(0)+' €';document.getElementById('payment-subtitle').textContent=`Session coaching · ${bs.duration} min avec ${data.display_name}`;stripeElements=stripe.elements({clientSecret:piData.client_secret,locale:'fr'});const pEl=stripeElements.create('payment');document.getElementById('payment-element').innerHTML='';pEl.mount('#payment-element');document.getElementById('payment-overlay').classList.add('active');document.getElementById('payment-submit').onclick=async()=>{const payBtn=document.getElementById('payment-submit'),errEl=document.getElementById('payment-error');payBtn.disabled=true;payBtn.textContent='Autorisation en cours...';errEl.textContent='';const{error}=await stripe.confirmPayment({elements:stripeElements,confirmParams:{return_url:window.location.href},redirect:'if_required'});if(error){errEl.textContent=error.message;payBtn.disabled=false;payBtn.textContent='Autoriser le paiement';return;}payBtn.textContent='Création du rendez-vous...';await createBookingItem(token);};}catch{alert('Une erreur est survenue, veuillez réessayer.');}
      if(btn){btn.disabled=false;btn.textContent='💳 Payer et réserver';}return;
    }
    if(btn){btn.disabled=true;btn.textContent='Envoi...';}await createBookingItem(token);if(btn){btn.disabled=false;btn.textContent='Confirmer le rendez-vous';}
  }

  async function createBookingItem(token){
    const payload={freelancer_profile_id:data.id,booking_type:bs.type,duration_min:bs.duration||(bs.slot.endMin-bs.slot.startMin),price_cents:bs.type==='coaching'?(data.price_cents||0):0,currency:'EUR',start_at:bs.slot.startUtcMs,end_at:bs.slot.endUtcMs,client_phone:bs.phone||'',client_note:bs.note||'',reference_url:bs.url||'',attachment_1_url:bs.attachment1_url||'',attachment_1_name:bs.attachment1_url?bs.attachment1_name||'':'',attachment_2_url:bs.attachment2_url||'',attachment_2_name:bs.attachment2_url?bs.attachment2_name||'':'',payment_intent_id:currentPI||''};
    try{const res=await fetch('https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_booking_item',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(payload)});if(res.ok){document.getElementById('payment-overlay')?.classList.remove('active');overlay.classList.remove('active');showConfirmation(bs.type,bs.slot,bs.duration||(bs.slot.endMin-bs.slot.startMin),data.display_name);}else{const e=await res.json().catch(()=>({}));alert(e?.message||'Une erreur est survenue, veuillez réessayer.');}}catch{alert('Erreur réseau, veuillez réessayer.');}
  }

  function openBooking(type){
    const token=getToken();if(!token){const n=[...document.querySelectorAll(".abo-nonco-container")].pop();if(n)n.style.cssText="display:flex!important";return;}
    bs={type,date:null,slot:null,duration:type==='coaching'?coachingDurations[0]:null,currentMonth:new Date(),phone:'',note:'',url:'',attachment1_url:'',attachment1_name:'',attachment2_url:'',attachment2_name:''};currentPI=null;
    modalTitle.textContent=type==='coaching'?'Réserver une session consulting':'Prendre rendez-vous';
    overlay.classList.add('active');renderStep1();
  }

  document.querySelector('#coaching-book-btn')?.addEventListener('click',()=>openBooking('coaching'));
  document.querySelector('#freelance-book-btn')?.addEventListener('click',()=>openBooking('freelance'));
  closeBtn?.addEventListener('click',()=>overlay.classList.remove('active'));
  overlay?.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('active');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')overlay.classList.remove('active');});
}
