<script>
// ============================================
// SCRIPT 1 — Connexion / inscription AVEC GOOGLE
// ============================================
const OAUTH_INIT_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:YO83U1DX/oauth/google/init";
const OAUTH_CONTINUE_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:YO83U1DX/oauth/google/continue";

const FIND_CAMPAIGN_ID_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:ZfDXioLx/find_campaign_id";

const REDIRECT_LOGIN_HARD  = "https://www.digitools-room.com/oauth/mes-cours";
const REDIRECT_SIGNUP_HARD = "https://www.digitools-room.com/google-inscription";
const REDIRECT_SIGNUP_POPUP= "https://www.digitools-room.com/google-inscription-popup";
const REDIRECT_LOGIN_POPUP = "https://www.digitools-room.com/google-login-popup";

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

function getCampaignSlugStored() {
  if (window.DR?.campaign?.getSlug) {
    return window.DR.campaign.getSlug();
  }
  try {
    const slug = sessionStorage.getItem("campaign_slug");
    const ts = parseInt(sessionStorage.getItem("campaign_slug_ts") || "0", 10);
    const ageMs = ts ? Date.now() - ts : null;
    if (ageMs !== null && ageMs > 30 * 60 * 1000) return null;
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

function startGoogleOAuth(type) {
  const url = new URL(OAUTH_INIT_URL);
  if (type === "login_popup") {
    sessionStorage.setItem("post_oauth_redirect", window.location.href);
    url.searchParams.set("redirect_uri", REDIRECT_LOGIN_POPUP);
  } else if (type === "signup_popup") {
    sessionStorage.setItem("post_oauth_redirect", REDIRECT_SIGNUP_POPUP);
    url.searchParams.set("redirect_uri", REDIRECT_SIGNUP_POPUP);
  } else if (type === "signup_hard") {
    url.searchParams.set("redirect_uri", REDIRECT_SIGNUP_HARD);
  } else {
    url.searchParams.set("redirect_uri", REDIRECT_LOGIN_HARD);
  }
  fetch(url)
    .then(res => res.json())
    .then(data => { if (data?.authUrl) window.location.href = data.authUrl; });
}

async function continueOauth(code) {
  const guardKey = "oauth_continue_done_" + String(code).slice(0, 30);
  if (sessionStorage.getItem(guardKey)) return;
  sessionStorage.setItem(guardKey, "1");

  removeCodeFromUrl();

  const url = new URL(OAUTH_CONTINUE_URL);
  const savedRedirect = sessionStorage.getItem("post_oauth_redirect");

  if (savedRedirect && savedRedirect.includes("/google-login-popup")) {
    url.searchParams.set("redirect_uri", REDIRECT_LOGIN_POPUP);
  } else if (window.location.pathname.includes("/google-inscription-popup")) {
    url.searchParams.set("redirect_uri", REDIRECT_SIGNUP_POPUP);
  } else if (window.location.pathname.includes("/google-inscription")) {
    url.searchParams.set("redirect_uri", REDIRECT_SIGNUP_HARD);
  } else {
    url.searchParams.set("redirect_uri", REDIRECT_LOGIN_HARD);
  }

  const sessionId  = getSessionIdSafe();
  const visitorId  = getVisitorIdSafe();
  const slug       = getCampaignSlugStored();
  const campaignId = await findCampaignIdFromSlug(slug);
  const metadataObj = buildMetadataFromSignupOrigin();
  const metadataStr = JSON.stringify(metadataObj);

  url.searchParams.set("code", code);
  if (sessionId) url.searchParams.set("session_id", sessionId);
  if (visitorId) url.searchParams.set("visitor_id", visitorId);
  url.searchParams.set("campaign_id", String(campaignId || 0));
  url.searchParams.set("metadata", metadataStr);

  console.log("DEBUG Google OAuth campaignSlug:", slug);
  console.log("DEBUG Google OAuth campaignId:", campaignId);

  fetch(url.toString())
    .then(res => res.json())
    .then(saveNormalizedToken)
    .catch(err => console.error("Erreur OAuth continue:", err));
}

function saveNormalizedToken(data) {
  if (!data?.token) return console.error("Pas de token Google");
  if (data.newSessionId) localStorage.setItem("session_id", data.newSessionId);

  localStorage.setItem("auth", JSON.stringify({
    token: data.token,
    user: { email: data.email, name: data.name, avatar_url: data.avatar_url },
    fetchedAt: Date.now()
  }));

  clearSignupOriginIfPossible();

  if (window.DR?.Session?.refresh) {
    DR.Session.refresh({ force: true }).then(afterGoogleLogin);
  } else {
    afterGoogleLogin();
  }
}

function afterGoogleLogin() {
  const savedRedirect = sessionStorage.getItem("post_oauth_redirect");

  if (savedRedirect && !savedRedirect.includes("/google-inscription-popup") && !savedRedirect.includes("/google-login-popup")) {
    sessionStorage.removeItem("post_oauth_redirect");
    document.dispatchEvent(new Event("user-updated"));
    window.location.href = savedRedirect;
    return;
  }
  if (savedRedirect && savedRedirect.includes("/google-inscription-popup")) {
    sessionStorage.removeItem("post_oauth_redirect");
    document.dispatchEvent(new Event("user-updated"));
    window.location.href = REDIRECT_SIGNUP_POPUP;
    return;
  }
  if (window.location.pathname.includes("/google-inscription")) {
    document.dispatchEvent(new Event("user-updated"));
    window.location.href = REDIRECT_SIGNUP_HARD;
    return;
  }
  document.dispatchEvent(new Event("user-updated"));
  window.location.href = REDIRECT_LOGIN_HARD;
}

window.addEventListener("load", () => {
  const url  = new URL(location.href);
  const code = url.searchParams.get("code");
  if (code) { continueOauth(code); return; }
  const stored = localStorage.getItem("auth");
  if (stored) {
    try { if (JSON.parse(stored)?.token) document.dispatchEvent(new Event("user-updated")); } catch {}
  }
});

document.querySelector("#googleLoginBtn")?.addEventListener("click",      () => startGoogleOAuth("login_hard"));
document.querySelector("#googleSignupBtn")?.addEventListener("click",     () => startGoogleOAuth("signup_hard"));
document.querySelector("#googleLoginPopupBtn")?.addEventListener("click", () => startGoogleOAuth("login_popup"));
document.querySelector("#googleSignupPopupBtn")?.addEventListener("click",() => startGoogleOAuth("signup_popup"));


// ============================================
// SCRIPT 2 — Affichage en fonction de la connexion
// + Badge En ligne / Hors ligne
// + Logout via data-action="logout"
// ============================================
(function() {
    const API_ME       = 'https://xmot-l3ir-7kuj.p7.xano.io/api:iEppGvhy/auth/me';
    const CACHE_TTL_MS = 15 * 60 * 1000;
    const LOGOUT_REDIRECT = '/oauth/login';

    const $  = id       => document.getElementById(id);
    const $$ = selector => document.querySelectorAll(selector);

    const setText = (selector, txt) => {
        $$(selector).forEach(el => {
            if (el) { el.textContent = txt || ''; el.style.visibility = 'visible'; }
        });
    };

    const setImg = (selector, url) => {
        $$(selector).forEach(el => {
            if (el) { el.src = url || ''; el.alt = 'Avatar'; el.style.visibility = 'visible'; }
        });
    };

    // ── Badge En ligne / Hors ligne ──
    function setOnlineBadge(isOnline) {
        $$('.online-dot').forEach(dot => {
            dot.classList.remove('online', 'offline');
            dot.classList.add(isOnline ? 'online' : 'offline');
        });
        $$('.online-label').forEach(label => {
            label.classList.remove('online', 'offline');
            label.classList.add(isOnline ? 'online' : 'offline');
            label.textContent = isOnline ? 'En ligne' : 'Hors ligne';
        });
    }

    function showLoggedIn(user) {
        document.body.classList.add('auth-ready', 'auth-in');
        document.body.classList.remove('auth-out', 'auth-booting');
        setText('.display-first-name', (user?.first_name || '').trim());
        setText('.display-name',       (user?.name || '').trim());
        setText('displayEmail',         user?.email || '');
        setImg('.avatar-img',           user?.avatar_url || '');
        setOnlineBadge(true);
    }

    function showLoggedOut() {
        document.body.classList.add('auth-ready', 'auth-out');
        document.body.classList.remove('auth-in', 'auth-booting');
        setText('.display-first-name', '');
        setText('.display-name',       '');
        setText('displayEmail',        '');
        setImg('.avatar-img',          '');
        setOnlineBadge(false);
    }

    function readAuth() {
        try { return JSON.parse(localStorage.getItem('auth') || 'null'); } catch { return null; }
    }
    function writeAuth(obj) {
        try { localStorage.setItem('auth', JSON.stringify(obj)); } catch {}
    }
    function nukeAuth() {
        try { localStorage.removeItem('auth'); } catch {}
    }

    async function fetchMe(token) {
        const r = await fetch(API_ME, { headers: { Authorization: 'Bearer ' + token } });
        if (!r.ok) throw new Error('ME ' + r.status);
        return r.json();
    }

    async function renderAuthUI() {
        const auth = readAuth();
        const isLoginPage = location.pathname.includes('/oauth/login') || location.pathname.includes('/oauth/connexion');
        if (isLoginPage) { nukeAuth(); showLoggedOut(); return; }
        if (!auth || !auth.token) { showLoggedOut(); return; }

        if (auth.user && (Date.now() - (auth.fetchedAt || 0) < CACHE_TTL_MS)) {
            showLoggedIn(auth.user);
            refreshFromServer(auth.token);
            return;
        }
        try {
            const me = await fetchMe(auth.token);
            auth.user = me; auth.fetchedAt = Date.now();
            writeAuth(auth); showLoggedIn(me);
        } catch { nukeAuth(); showLoggedOut(); }
    }

    async function refreshFromServer(token) {
        try {
            const me   = await fetchMe(token);
            const auth = readAuth() || {};
            auth.user  = me; auth.fetchedAt = Date.now();
            writeAuth(auth);
        } catch { nukeAuth(); }
    }

    function doLogout(e) {
        e.preventDefault();
        nukeAuth();
        window.location.assign(LOGOUT_REDIRECT);
        return false;
    }

    function bindLogout() {
        // ✅ Tous les boutons avec data-action="logout"
        $$('[data-action="logout"]').forEach(btn => {
            btn.addEventListener('click', doLogout);
            btn.addEventListener('touchstart', doLogout);
        });
        // ✅ Rétrocompatibilité avec l'ancien id="logoutBtn"
        const legacyBtn = $('logoutBtn');
        if (legacyBtn && !legacyBtn.dataset.action) {
            legacyBtn.addEventListener('click', doLogout);
            legacyBtn.addEventListener('touchstart', doLogout);
        }
    }

    document.addEventListener('DOMContentLoaded', () => { renderAuthUI(); bindLogout(); });
    document.addEventListener('user-updated', () => { renderAuthUI(); });

})();


// ============================================
// SCRIPT 3 — Stockage des données user en local (DR.Session)
// ============================================
window.DR = window.DR || {};
DR.Session = (function () {
  const KEY_AUTH         = "auth";
  const KEY_LAST_REFRESH = "auth_user_refreshed_at";
  const REFRESH_TTL_MS   = 10 * 60 * 1000;
  let inflight = null;

  function getAuth() {
    try { return JSON.parse(localStorage.getItem(KEY_AUTH) || "null"); } catch { return null; }
  }
  function setAuth(a) {
    try { localStorage.setItem(KEY_AUTH, JSON.stringify(a)); } catch {}
  }
  function getToken() {
    const a = getAuth();
    return a?.token || a?.authToken || a?.jwt || null;
  }
  function getUser() { return getAuth()?.user || null; }
  function dispatchUserUpdated() {
    try { document.dispatchEvent(new Event("user-updated")); } catch {}
  }

  async function fetchUserFullData() {
    const token = getToken();
    if (!token) return null;
    const res = await fetch("https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) return null;
    try { return await res.json(); } catch { return null; }
  }

  async function refresh({ force = false } = {}) {
    const token = getToken();
    if (!token) return null;
    const last       = parseInt(localStorage.getItem(KEY_LAST_REFRESH) || "0", 10) || 0;
    const freshEnough = Date.now() - last < REFRESH_TTL_MS;
    if (freshEnough && !force) return getUser();
    if (inflight) return inflight;
    inflight = (async () => {
      const data = await fetchUserFullData();
      if (data) {
        const current = getAuth() || {};
        const updated = { token: current.token, fetchedAt: Date.now(), ...data };
        setAuth(updated);
        localStorage.setItem(KEY_LAST_REFRESH, String(Date.now()));
        dispatchUserUpdated();
        return updated.user;
      }
      return null;
    })();
    try { return await inflight; } finally { inflight = null; }
  }

  async function init() {
    if (location.pathname.includes('/freelance/')) return;
    const auth = getAuth();
    if (!auth?.token) return;
    refresh({ force: true }).catch(() => {});
  }

  function updateUserLocal(changes) {
    const auth = getAuth() || {};
    auth.user  = { ...(auth.user || {}), ...(changes || {}) };
    setAuth(auth);
    dispatchUserUpdated();
  }

  function logout() {
    localStorage.removeItem(KEY_AUTH);
    localStorage.removeItem(KEY_LAST_REFRESH);
    dispatchUserUpdated();
  }

  return { init, refresh, getAuth, getUser, updateUserLocal, logout };
})();

DR.Session.init();


// ============================================
// SCRIPT 4 — Connexion email / mot de passe
// ============================================
document.addEventListener('DOMContentLoaded', function() {

  const form          = document.getElementById('loginForm-Xano');
  const emailInput    = document.getElementById('email-Xano');
  const passwordInput = document.getElementById('password-Xano');
  const messageBox    = document.getElementById('loginMessage-Xano');
  const submitButton  = form ? (form.querySelector('[type="submit"]') || form.querySelector('button')) : null;

  const LOGIN_URL          = 'https://xmot-l3ir-7kuj.p7.xano.io/api:iEppGvhy/auth/login';
  const RESEND_URL         = 'https://xmot-l3ir-7kuj.p7.xano.io/api:iEppGvhy/auth_resend_from_login';
  const REDIRECT_AFTER_LOGIN = 'https://www.digitools-room.com/oauth/mes-cours';

  if (!form || !emailInput || !passwordInput || !messageBox) return;

  function setMsg(text, variant) {
    messageBox.classList.remove('is-success', 'is-warn', 'is-error');
    if (variant) messageBox.classList.add(variant);
    messageBox.innerHTML = text ? `<span>${text}</span>` : '';
  }

  function updateAuthUI() {
    const auth     = JSON.parse(localStorage.getItem("auth") || "null");
    const isLogged = !!auth?.token;

    document.body.classList.remove("auth-in", "auth-out", "auth-booting");
    document.body.classList.add(isLogged ? "auth-in" : "auth-out");

    const icon = document.getElementById("navbarProfileIcon");
    if (icon) icon.style.display = isLogged ? "flex" : "none";

    const avatarUrl = auth?.user?.avatar_url || auth?.user?.profile_picture || null;
    document.querySelectorAll(".avatar-img").forEach(el => {
      if (isLogged && avatarUrl) { el.src = avatarUrl; el.style.display = "block"; }
      else { el.style.display = "none"; }
    });
  }

  form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const email    = (emailInput.value || '').trim();
    const password = passwordInput.value || '';
    const stayHere = form.hasAttribute("data-stay-here");

    setMsg('', null);
    if (submitButton) { submitButton.disabled = true; submitButton.innerText = "Veuillez patienter..."; }

    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      let data = null;
      try { data = await res.json(); } catch {}

      if (res.ok && (data?.authToken || data?.token)) {
        if (data?.newSessionId) localStorage.setItem("session_id", data.newSessionId);

        const token = data.authToken || data.token;
        localStorage.setItem('auth', JSON.stringify({ token, user: null, fetchedAt: Date.now() }));

        try { if (window.DR?.Session?.refresh) await DR.Session.refresh({ force: true }); } catch {}

        updateAuthUI();

        if (stayHere) {
          setMsg("Connexion réussie ✅", "is-success");
          const popup = document.querySelector(".add-resource-nonco-container");
          if (popup) popup.style.display = "none";
          submitButton.disabled  = false;
          submitButton.innerText = "Se connecter";
          return;
        }

        window.location.href = REDIRECT_AFTER_LOGIN;
        return;
      }

      switch (data?.status) {
        case 'google-oauth':
          setMsg("Ce compte a été créé avec Google. Cliquez sur « Continuer avec Google » pour vous connecter.", 'is-warn');
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

    } catch(err) {
      setMsg("Erreur réseau. Réessayez.", 'is-error');
    } finally {
      if (submitButton) { submitButton.disabled = false; submitButton.innerText = "Se connecter"; }
    }
  });

  updateAuthUI();
});
</script>

