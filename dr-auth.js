<!-- Gère le système de connexion / inscription AVEC GOOGLE (avec visitor_id + session_id + campaign_slug + metadata origin) -->

// ============================================
// CONFIG
// ============================================
const OAUTH_INIT_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:YO83U1DX/oauth/google/init";
const OAUTH_CONTINUE_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:YO83U1DX/oauth/google/continue";

const FIND_CAMPAIGN_ID_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:ZfDXioLx/find_campaign_id";

const REDIRECT_LOGIN_HARD  = "https://www.digitools-room.com/oauth/mes-cours";
const REDIRECT_SIGNUP_HARD = "https://www.digitools-room.com/google-inscription";
const REDIRECT_SIGNUP_POPUP= "https://www.digitools-room.com/google-inscription-popup";
const REDIRECT_LOGIN_POPUP = "https://www.digitools-room.com/google-login-popup";

// ============================================
// HELPERS
// ============================================
function getSessionIdSafe() {
  try { return localStorage.getItem("session_id") || null; } catch(e) { return null; }
}

function getVisitorIdSafe() {
  try {
    const vid = localStorage.getItem("visitor_id");
    if (vid) return vid;

    const m = document.cookie.match(/(?:^|;\s*)dr_vid=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch (e) {
    return null;
  }
}

// ✅ CORRECTION: Récupère le campaign_slug depuis sessionStorage (stocké par events-tracking.js)
function getCampaignSlugStored() {
  // Utilise le helper exposé par le script events
  if (window.DR?.campaign?.getSlug) {
    return window.DR.campaign.getSlug();
  }
  
  // Fallback si le script events n'est pas chargé
  try {
    const slug = sessionStorage.getItem("campaign_slug");
    const ts = parseInt(sessionStorage.getItem("campaign_slug_ts") || "0", 10);
    
    const ageMs = ts ? Date.now() - ts : null;
    if (ageMs !== null && ageMs > 30 * 60 * 1000) {
      return null;
    }
    
    return slug;
  } catch(e) {
    return null;
  }
}

async function findCampaignIdFromSlug(slug) {
  if (!slug) return 0;
  try {
    const url = new URL(FIND_CAMPAIGN_ID_URL);
    url.searchParams.set("slug", slug);

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) return 0;

    const data = await res.json();
    const id = data?.id ?? data?.campaign_id ?? data?.campaign?.id ?? data?.campaigns1?.id ?? null;
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch (e) {
    return 0;
  }
}

function buildMetadataFromSignupOrigin() {
  const origin = window.DR?.signupOrigin?.get ? window.DR.signupOrigin.get() : null;

  const url = origin?.url || sessionStorage.getItem("signup_origin_url") || null;
  const pageName = origin?.page_name || sessionStorage.getItem("signup_origin_page_name") || null;
  const pageType = origin?.page_type || sessionStorage.getItem("signup_origin_page_type") || null;
  const tsRaw = origin?.ts || sessionStorage.getItem("signup_origin_ts") || null;

  return {
    signup_origin_url: url,
    signup_origin_page_name: pageName,
    signup_origin_page_type: pageType,
    signup_origin_ts: tsRaw ? Number(tsRaw) : null
  };
}

function clearSignupOriginIfPossible() {
  try { window.DR?.signupOrigin?.clear?.(); } catch(e) {}
}

function removeCodeFromUrl() {
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("code");
    window.history.replaceState({}, "", u.toString());
  } catch(e) {}
}

// ============================================
// INITIAL OAUTH LAUNCH
// ============================================
function startGoogleOAuth(type) {
  const url = new URL(OAUTH_INIT_URL);

  if (type === "login_popup") {
    sessionStorage.setItem("post_oauth_redirect", window.location.href);
    url.searchParams.set("redirect_uri", REDIRECT_LOGIN_POPUP);
  }
  else if (type === "signup_popup") {
    sessionStorage.setItem("post_oauth_redirect", REDIRECT_SIGNUP_POPUP);
    url.searchParams.set("redirect_uri", REDIRECT_SIGNUP_POPUP);
  }
  else if (type === "signup_hard") {
    url.searchParams.set("redirect_uri", REDIRECT_SIGNUP_HARD);
  }
  else {
    url.searchParams.set("redirect_uri", REDIRECT_LOGIN_HARD);
  }

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data?.authUrl) window.location.href = data.authUrl;
    });
}

// ============================================
// AFTER GOOGLE REDIRECT
// ============================================
async function continueOauth(code) {
  const guardKey = "oauth_continue_done_" + String(code).slice(0, 30);
  if (sessionStorage.getItem(guardKey)) return;
  sessionStorage.setItem(guardKey, "1");

  removeCodeFromUrl();

  const url = new URL(OAUTH_CONTINUE_URL);

  const savedRedirect = sessionStorage.getItem("post_oauth_redirect");

  if (savedRedirect && savedRedirect.includes("/google-login-popup")) {
    url.searchParams.set("redirect_uri", REDIRECT_LOGIN_POPUP);
  }
  else if (window.location.pathname.includes("/google-inscription-popup")) {
    url.searchParams.set("redirect_uri", REDIRECT_SIGNUP_POPUP);
  }
  else if (window.location.pathname.includes("/google-inscription")) {
    url.searchParams.set("redirect_uri", REDIRECT_SIGNUP_HARD);
  }
  else {
    url.searchParams.set("redirect_uri", REDIRECT_LOGIN_HARD);
  }

  const sessionId = getSessionIdSafe();
  const visitorId = getVisitorIdSafe();
  const slug = getCampaignSlugStored(); // ✅ CORRECTION: récupère depuis sessionStorage
  const campaignId = await findCampaignIdFromSlug(slug);
  const metadataObj = buildMetadataFromSignupOrigin();
  const metadataStr = JSON.stringify(metadataObj);

  url.searchParams.set("code", code);

  if (sessionId) url.searchParams.set("session_id", sessionId);
  if (visitorId) url.searchParams.set("visitor_id", visitorId);
  url.searchParams.set("campaign_id", String(campaignId || 0));
  url.searchParams.set("metadata", metadataStr);

  // DEBUG utile
  console.log("DEBUG Google OAuth campaignSlug:", slug);
  console.log("DEBUG Google OAuth campaignId:", campaignId);

  fetch(url.toString())
    .then(res => res.json())
    .then(saveNormalizedToken)
    .catch(err => console.error("Erreur OAuth continue:", err));
}

// ============================================
// SAVE TOKEN
// ============================================
function saveNormalizedToken(data) {
  if (!data?.token) return console.error("Pas de token Google");

  if (data.newSessionId) {
    localStorage.setItem("session_id", data.newSessionId);
  }

  localStorage.setItem("auth", JSON.stringify({
    token: data.token,
    user: {
      email: data.email,
      name: data.name,
      avatar_url: data.avatar_url
    },
    fetchedAt: Date.now()
  }));

  clearSignupOriginIfPossible();

  if (window.DR?.Session?.refresh) {
    DR.Session.refresh({ force: true }).then(afterGoogleLogin);
  } else {
    afterGoogleLogin();
  }
}

// ============================================
// REDIRECTION FINALE
// ============================================
function afterGoogleLogin() {
  const savedRedirect = sessionStorage.getItem("post_oauth_redirect");

  // CAS 1: Login popup (retour direct sur page d'origine)
  if (savedRedirect && !savedRedirect.includes("/google-inscription-popup") && !savedRedirect.includes("/google-login-popup")) {
    sessionStorage.removeItem("post_oauth_redirect");
    document.dispatchEvent(new Event("user-updated"));
    window.location.href = savedRedirect;
    return;
  }

  // CAS 2: Signup popup (va sur page intermédiaire qui dispatch user-updated)
  if (savedRedirect && savedRedirect.includes("/google-inscription-popup")) {
    sessionStorage.removeItem("post_oauth_redirect");
    document.dispatchEvent(new Event("user-updated"));
    window.location.href = REDIRECT_SIGNUP_POPUP;
    return;
  }

  // CAS 3: Signup hard (page dédiée)
  if (window.location.pathname.includes("/google-inscription")) {
    document.dispatchEvent(new Event("user-updated"));
    window.location.href = REDIRECT_SIGNUP_HARD;
    return;
  }

  // CAS 4: Login hard par défaut
  document.dispatchEvent(new Event("user-updated"));
  window.location.href = REDIRECT_LOGIN_HARD;
}

// ============================================
// AUTO CONTINUE
// ============================================
window.addEventListener("load", () => {
  const url = new URL(location.href);
  const code = url.searchParams.get("code");

  if (code) {
    continueOauth(code);
    return;
  }

  const stored = localStorage.getItem("auth");
  if (stored) {
    try {
      if (JSON.parse(stored)?.token) {
        document.dispatchEvent(new Event("user-updated"));
      }
    } catch {}
  }
});

// ============================================
// BOUTONS GOOGLE
// ============================================
document.querySelector("#googleLoginBtn")?.addEventListener("click", () =>
  startGoogleOAuth("login_hard")
);

document.querySelector("#googleSignupBtn")?.addEventListener("click", () =>
  startGoogleOAuth("signup_hard")
);

document.querySelector("#googleLoginPopupBtn")?.addEventListener("click", () =>
  startGoogleOAuth("login_popup")
);

document.querySelector("#googleSignupPopupBtn")?.addEventListener("click", () =>
  startGoogleOAuth("signup_popup")
);








<!-- Gère l'affichage en fonction de la connexion -->

(function() {
    /* ====== PARAMS ====== */
    const API_ME = 'https://xmot-l3ir-7kuj.p7.xano.io/api:iEppGvhy/auth/me';
    const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes de cache
    const LOGOUT_REDIRECT = '/oauth/login';

    /* ====== HELPERS DOM (MISE À JOUR) ====== */
    // Helper pour les IDs uniques (inchangé)
    const $ = id => document.getElementById(id);
    
    // Helper pour cibler tous les éléments par sélecteur (classe ou ID)
    const $$ = selector => document.querySelectorAll(selector);

    // MODIFIÉ: setText utilise un sélecteur et applique à tous les éléments trouvés
    const setText = (selector, txt) => {
        const els = $$(selector);
        els.forEach(el => {
            if (el) {
                el.textContent = txt || '';
                el.style.visibility = 'visible';
            }
        });
    };

    // setImg utilise la CLASSE
    const setImg = (selector, url) => {
        const els = $$(selector);
        els.forEach(el => {
            if (el) {
                el.src = url || '';
                el.alt = 'Avatar';
                el.style.visibility = 'visible';
            }
        });
    };

    /* ====== ETAT UI (SÉLECTEURS AJUSTÉS) ====== */
    function showLoggedIn(user) {
        const body = document.body;
        body.classList.add('auth-ready', 'auth-in');
        body.classList.remove('auth-out', 'auth-booting');

        // LES NOUVELLES CLASSES :
        setText('.display-first-name', (user?.first_name || '').trim());
        setText('.display-name', (user?.name || '').trim());
        
        // L'ID pour l'email reste unique:
        setText('displayEmail', user?.email || ''); 
        
        // L'avatar devient une CLASSE :
        setImg('.avatar-img', user?.avatar_url || ''); 
    }

    function showLoggedOut() {
        const body = document.body;
        body.classList.add('auth-ready', 'auth-out');
        body.classList.remove('auth-in', 'auth-booting');

        // LES NOUVELLES CLASSES :
        setText('.display-first-name', '');
        setText('.display-name', '');
        
        // L'ID pour l'email reste unique:
        setText('displayEmail', '');
        
        // L'avatar devient une CLASSE :
        setImg('.avatar-img', '');
    }

    /* ====== LOCAL CACHE (inchangé) ====== */
    function readAuth() {
        try {
            return JSON.parse(localStorage.getItem('auth') || 'null');
        } catch {
            return null;
        }
    }

    function writeAuth(obj) {
        try {
            localStorage.setItem('auth', JSON.stringify(obj));
        } catch {}
    }

    function nukeAuth() {
        try {
            localStorage.removeItem('auth');
        } catch {}
    }

    /* ====== API + LOGIC (inchangé) ====== */
    async function fetchMe(token) {
        const r = await fetch(API_ME, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        if (!r.ok) throw new Error('ME ' + r.status);
        return r.json();
    }

    async function renderAuthUI() {
        const auth = readAuth();
        const isLoginPage = location.pathname.includes('/oauth/login') || location.pathname.includes('/oauth/connexion');

        if (isLoginPage) {
            nukeAuth();
            showLoggedOut();
            return;
        }

        if (!auth || !auth.token) {
            showLoggedOut();
            return;
        }

        // On vérifie le cache
        if (auth.user && (Date.now() - (auth.fetchedAt || 0) < CACHE_TTL_MS)) {
            showLoggedIn(auth.user);
            // On rafraîchit en arrière-plan pour avoir des données à jour pour la prochaine visite
            refreshFromServer(auth.token);
            return;
        }

        // On fetch les données si le cache est périmé
        try {
            const me = await fetchMe(auth.token);
            auth.user = me;
            auth.fetchedAt = Date.now();
            writeAuth(auth);
            showLoggedIn(me);
        } catch {
            nukeAuth();
            showLoggedOut();
        }
    }

    async function refreshFromServer(token) {
        try {
            const me = await fetchMe(token);
            const auth = readAuth() || {};
            auth.user = me;
            auth.fetchedAt = Date.now();
            writeAuth(auth);
        } catch {
            nukeAuth();
        }
    }

    /* ====== LOGOUT (reste en ID) ====== */
    function doLogout(e) {
        e.preventDefault();
        nukeAuth();
        window.location.assign(LOGOUT_REDIRECT);
        return false;
    }

    function bindLogout() {
        // Le bouton de déconnexion reste un ID unique:
        const btn = $('logoutBtn'); 
        if (btn) {
            btn.addEventListener('click', doLogout);
            btn.addEventListener('touchstart', doLogout);
        }
    }

    /* ====== INIT ====== */
    document.addEventListener('DOMContentLoaded', () => {
        renderAuthUI();
        bindLogout();
    });
})();








<!-- Gère le système de stockage des données user en local -->

window.DR = window.DR || {};

DR.Session = (function () {
  const KEY_AUTH = "auth";
  const KEY_LAST_REFRESH = "auth_user_refreshed_at";
  const REFRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes

  let inflight = null;

  // --- UTILS ---
  function getAuth() {
    try {
      return JSON.parse(localStorage.getItem(KEY_AUTH) || "null");
    } catch {
      return null;
    }
  }

  function setAuth(a) {
    try {
      localStorage.setItem(KEY_AUTH, JSON.stringify(a));
    } catch {}
  }

  function getToken() {
    const a = getAuth();
    return a?.token || a?.authToken || a?.jwt || null;
  }

  function getUser() {
    return getAuth()?.user || null;
  }

  function dispatchUserUpdated() {
    try {
      document.dispatchEvent(new Event("user-updated"));
    } catch {}
  }

  // --- API CALL ---
  async function fetchUserFullData() {
    const token = getToken();
    if (!token) return null;

    const res = await fetch("https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) return null;

    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  // --- REFRESH LOGIC ---
  async function refresh({ force = false } = {}) {
    const token = getToken();
    if (!token) return null;

    // TTL (évite de spammer l’API)
    const last = parseInt(localStorage.getItem(KEY_LAST_REFRESH) || "0", 10) || 0;
    const freshEnough = Date.now() - last < REFRESH_TTL_MS;
    if (freshEnough && !force) return getUser();

    if (inflight) return inflight;

    inflight = (async () => {
      const data = await fetchUserFullData();
      if (data) {
        const current = getAuth() || {};

        // ❗ Conserve exacte structure renvoyée par Xano
        const updated = {
          token: current.token,
          fetchedAt: Date.now(),
          ...data, // user, courses_owned, invoices, coupons, user_resources
        };

        setAuth(updated);
        localStorage.setItem(KEY_LAST_REFRESH, String(Date.now()));
        dispatchUserUpdated();
        return updated.user;
      }
      return null;
    })();

    try {
      return await inflight;
    } finally {
      inflight = null;
    }
  }

  // --- INIT (CORRIGÉ) ---
  async function init() {
    const auth = getAuth();
    if (!auth?.token) return;

    // ✅ Force le refresh pour récupérer toutes les données immédiatement
    refresh({ force: true }).catch(() => {});
  }

  // --- UPDATE USER LOCALLY ---
  function updateUserLocal(changes) {
    const auth = getAuth() || {};
    auth.user = { ...(auth.user || {}), ...(changes || {}) };
    setAuth(auth);
    dispatchUserUpdated();
  }

  // --- LOGOUT ---
  function logout() {
    localStorage.removeItem(KEY_AUTH);
    localStorage.removeItem(KEY_LAST_REFRESH);
    dispatchUserUpdated();
  }

  // --- EXPORT ---
  return {
    init,
    refresh,
    getAuth,
    getUser,
    updateUserLocal,
    logout,
  };
})();

// 🔄 Auto-init au chargement (version corrigée)
DR.Session.init();





<!-- Gère le système de conexion -->

document.addEventListener('DOMContentLoaded', function() {

  // === Sélecteurs ===
  const form          = document.getElementById('loginForm-Xano');
  const emailInput    = document.getElementById('email-Xano');
  const passwordInput = document.getElementById('password-Xano');
  const messageBox    = document.getElementById('loginMessage-Xano');
  const submitButton  = form ? (form.querySelector('[type="submit"]') || form.querySelector('button')) : null;

  const LOGIN_URL  = 'https://xmot-l3ir-7kuj.p7.xano.io/api:iEppGvhy/auth/login';
  const RESEND_URL = 'https://xmot-l3ir-7kuj.p7.xano.io/api:iEppGvhy/auth_resend_from_login';
  const REDIRECT_AFTER_LOGIN = 'https://www.digitools-room.com/oauth/mes-cours';

  if (!form || !emailInput || !passwordInput || !messageBox) return;

  // --- UI helpers ---
  function setMsg(text, variant){
    messageBox.classList.remove('is-success','is-warn','is-error');
    if (variant) messageBox.classList.add(variant);
    messageBox.innerHTML = text ? `<span>${text}</span>` : '';
  }

  // Fonction UI Auth
  function updateAuthUI() {
    const auth = JSON.parse(localStorage.getItem("auth") || "null");
    const isLogged = !!auth?.token;

    document.body.classList.remove("auth-in","auth-out","auth-booting");
    document.body.classList.add(isLogged ? "auth-in" : "auth-out");

    const icon = document.getElementById("navbarProfileIcon");
    if (icon) icon.style.display = isLogged ? "flex" : "none";

    const avatarEls = document.querySelectorAll(".avatar-img");
    const avatarUrl = auth?.user?.avatar_url || auth?.user?.profile_picture || null;

    avatarEls.forEach(el => {
      if (isLogged && avatarUrl) {
        el.src = avatarUrl;
        el.style.display = "block";
      } else {
        el.style.display = "none";
      }
    });
  }

  // --- SUBMIT LOGIN ---
  form.addEventListener('submit', async function(event){
    event.preventDefault();

    const email    = (emailInput.value || '').trim();
    const password = passwordInput.value || '';
    const stayHere = form.hasAttribute("data-stay-here");

    setMsg('', null);
    if (submitButton) { submitButton.disabled = true; submitButton.innerText = "Veuillez patienter..."; }

    try{
      const res = await fetch(LOGIN_URL, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });

      let data = null;
      try { data = await res.json(); } catch {}

      // LOGIN OK
      if (res.ok && (data?.authToken || data?.token)) {

        if (data?.newSessionId) {
          localStorage.setItem("session_id", data.newSessionId);
        }

        const token = data.authToken || data.token;

        localStorage.setItem('auth', JSON.stringify({
          token,
          user: null,
          fetchedAt: Date.now()
        }));

        try { if (window.DR?.Session?.refresh) await DR.Session.refresh({ force: true }); } catch {}

        updateAuthUI();

        if (stayHere) {
          setMsg("Connexion réussie ✅", "is-success");
          const popup = document.querySelector(".add-resource-nonco-container");
          if (popup) popup.style.display = "none";
          submitButton.disabled = false;
          submitButton.innerText = "Se connecter";
          return;
        }

        window.location.href = REDIRECT_AFTER_LOGIN;
        return;
      }

      // ❌ erreurs
      switch (data?.status) {

        case 'google-oauth':
          setMsg(
            "Ce compte a été créé avec Google. Cliquez sur « Continuer avec Google » pour vous connecter.",
            'is-warn'
          );
          break;

        case 'user-not-found':
          setMsg("Aucun compte trouvé avec cet email.", 'is-error');
          break;

        case 'invalid-password':
          setMsg("Mot de passe incorrect.", 'is-error');
          break;

        case 'account-not-verified':
          setMsg("Votre compte n'est pas encore vérifié.", 'is-warn');
          break;

        default:
          setMsg(data?.message || "Impossible de vous connecter.", 'is-error');
      }

    } catch(err){
      setMsg("Erreur réseau. Réessayez.", 'is-error');

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = "Se connecter";
      }
    }
  });

  updateAuthUI();
});

