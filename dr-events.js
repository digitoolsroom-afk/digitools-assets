/* Digitools Room — Events tracking (Xano) */
(function () {
  // Évite double chargement (si tu laisses par erreur l’ancien script dans Webflow sur une page)
  if (window.__DR_EVENTS_LOADED__) return;
  window.__DR_EVENTS_LOADED__ = true;

  // 1) session_id
  try {
    if (!localStorage.getItem("session_id")) {
      // fallback si randomUUID pas dispo (rare)
      const sid =
        window.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : (Date.now() + "-" + Math.random()).replace(".", "");
      localStorage.setItem("session_id", sid);
    }
  } catch (e) {
    // si localStorage bloqué (rare), on ne casse pas la page
  }

  // 2) sendEvent (global)
  async function sendEvent(eventData) {
    let sessionId = null;
    try {
      sessionId = localStorage.getItem("session_id");
    } catch (e) {}

    let userId = 0;
    try {
      const auth = JSON.parse(localStorage.getItem("auth") || "null");
      userId = auth?.user?.id || 0;
    } catch (e) {}

    const payload = {
      ...eventData,
      session_id: sessionId,
      user_id: userId,
    };

    const res = await fetch(
      "https://xmot-l3ir-7kuj.p7.xano.io/api:ZfDXioLx/events",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    // On protège le parsing JSON pour ne pas casser le site si Xano renvoie un truc inattendu
    try {
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  // Exposer DR pour debug + usages externes (signup script, etc.)
  window.DR = window.DR || {};
  window.DR.sendEvent = sendEvent;

  // ===== Helpers data-dr (multi actions) =====
  function getDataDrActions(el) {
    if (!el) return "";
    const v = el.getAttribute("data-dr");
    return v ? String(v) : "";
  }
  function hasAction(el, action) {
    const actions = getDataDrActions(el);
    return actions.includes(action);
  }

  // ===== Helpers origin (signup) =====
  function storeSignupOrigin() {
    const pageName =
      document.body?.dataset?.page || document.title || window.location.pathname;
    const pageType = document.body?.dataset?.type || "unknown";

    sessionStorage.setItem("signup_origin_page_name", pageName);
    sessionStorage.setItem("signup_origin_page_type", pageType);
    sessionStorage.setItem("signup_origin_url", window.location.href);
    sessionStorage.setItem("signup_origin_ts", String(Date.now()));
  }

  function clearSignupOrigin() {
    sessionStorage.removeItem("signup_origin_page_name");
    sessionStorage.removeItem("signup_origin_page_type");
    sessionStorage.removeItem("signup_origin_url");
    sessionStorage.removeItem("signup_origin_ts");
  }

  function getSignupOrigin() {
    const originName =
      sessionStorage.getItem("signup_origin_page_name") ||
      document.body?.dataset?.page ||
      document.title ||
      window.location.pathname;

    const originType =
      sessionStorage.getItem("signup_origin_page_type") ||
      document.body?.dataset?.type ||
      "unknown";

    const originUrl =
      sessionStorage.getItem("signup_origin_url") || window.location.href;

    const ts = parseInt(sessionStorage.getItem("signup_origin_ts") || "0", 10);
    const ageMs = ts ? Date.now() - ts : null;

    // Si l'origin date de +30 min, on considère que ce n’est plus fiable
    if (ageMs !== null && ageMs > 30 * 60 * 1000) {
      return {
        page_name:
          document.body?.dataset?.page ||
          originName ||
          document.title ||
          window.location.pathname,
        page_type: document.body?.dataset?.type || originType || "unknown",
        url: window.location.href,
        ts: ts || null,
      };
    }

    return { page_name: originName, page_type: originType, url: originUrl, ts: ts || null };
  }

  // Exposer les helpers origin pour que ton script signup puisse les lire/clear
  window.DR.signupOrigin = {
    store: storeSignupOrigin,
    get: getSignupOrigin,
    clear: clearSignupOrigin,
  };

  // ===== A) Click tracking: store origin + signup_intent =====
  // IMPORTANT: on NE clear PLUS l'origin ici.
  // On clear UNIQUEMENT après un signup réussi (dans le script d'inscription).
  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-dr]");
    if (!el) return;

    // 1) Si l'élément demande de stocker l'origine, on le fait
    if (hasAction(el, "store_signup_origin")) {
      storeSignupOrigin();
      // IMPORTANT: pas de return (un même clic peut être aussi signup_intent)
    }

    // 2) Si l'élément est une intention d'inscription, on envoie l'event
    if (hasAction(el, "signup_intent")) {
      const origin = getSignupOrigin();

      // Si c'est un lien (A), on retarde la navigation pour laisser partir le fetch
      const link = el.tagName === "A" ? el : el.closest("a");
      const isLink = !!(link && link.href);

      if (isLink) {
        e.preventDefault();

        sendEvent({
          type: "signup_intent",
          url: origin.url,
          metadata: {
            page_name: origin.page_name,
            page_type: origin.page_type,
          },
        }).finally(() => {
          setTimeout(() => {
            window.location.href = link.href;
          }, 150);
        });

        return;
      }

      // Bouton non-lien
      sendEvent({
        type: "signup_intent",
        url: origin.url,
        metadata: {
          page_name: origin.page_name,
          page_type: origin.page_type,
        },
      });

      return;
    }
  });

  // ===== Helpers referrer / campaign (pour session_start) =====
  function getCampaignSlug() {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    return c && c.trim() ? c.trim() : null;
  }

  function getReferrerRaw() {
    const r = document.referrer;
    return r && r.trim() ? r.trim() : null;
  }

  function getHost(u) {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function isSearchEngine(refHost) {
    const engines = [
      "google.",
      "bing.com",
      "duckduckgo.com",
      "yahoo.",
      "ecosia.org",
      "qwant.com",
      "search.brave.com",
    ];
    return engines.some((x) => refHost.includes(x));
  }

  function computeReferrerType({ campaignSlug, referrerRaw }) {
    if (campaignSlug) return "campaign";
    if (!referrerRaw) return "direct";

    const refHost = getHost(referrerRaw);
    const myHost = getHost(window.location.href);

    if (refHost && myHost && refHost === myHost) return "internal";
    if (isSearchEngine(refHost)) return "search";
    return "referral";
  }

  // 3 + 4) session_start + page_view + durée
  document.addEventListener("DOMContentLoaded", async function () {
    // Métadonnées page (communes)
    const pageName = document.body?.dataset?.page || null;
    const pageType = document.body?.dataset?.type || null;

    // ===== B) session_start (1 fois / session_id) =====
    try {
      let sessionId = null;
      try {
        sessionId = localStorage.getItem("session_id");
      } catch (e) {}

      const sentKey = "session_start_sent_" + (sessionId || "noid");

      if (!sessionStorage.getItem(sentKey)) {
        sessionStorage.setItem(sentKey, "1");

        const campaignSlug = getCampaignSlug();
        const referrerRaw = getReferrerRaw();
        const referrerType = computeReferrerType({ campaignSlug, referrerRaw });

        await sendEvent({
          type: "session_start",
          url: window.location.href,
          referrer: referrerRaw,
          referrer_type: referrerType,
          campaign_slug: campaignSlug,
          metadata: {
            page_name: pageName,
            page_type: pageType,
            referrer_page_name: null,
          },
        });
      }
    } catch (e) {
      // on ne casse jamais la page
    }

    // ===== C) page_view + previous page name =====
    const referrerName = sessionStorage.getItem("previous_page_name") || null;
    sessionStorage.setItem("previous_page_name", pageName);

    let eventId = null;
    try {
      const result = await sendEvent({
        type: "page_view",
        url: window.location.href,
        metadata: {
          page_name: pageName,
          page_type: pageType,
          referrer_page_name: referrerName,
        },
      });

      eventId = result?.event_return?.id || null;
      if (eventId) sessionStorage.setItem("current_page_view_id", eventId);
    } catch (e) {}

    // ===== D) tracking durée active (idle > 15s pause) =====
    let activeSeconds = 0;
    let lastActivity = Date.now();
    let isActive = true;

    function markActivity() {
      lastActivity = Date.now();
      if (!isActive) isActive = true;
    }

    ["mousemove", "scroll", "keydown", "click", "touchstart"].forEach((evt) => {
      window.addEventListener(evt, markActivity, { passive: true });
    });

    setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActivity;

      if (idleTime > 15000) {
        isActive = false;
      }

      if (isActive) activeSeconds++;
    }, 1000);

    // ===== E) envoi durée (beacon) =====
    window.addEventListener("beforeunload", () => {
      const id = sessionStorage.getItem("current_page_view_id");
      if (!id) return;

      const url =
        "https://xmot-l3ir-7kuj.p7.xano.io/api:ZfDXioLx/events_duration" +
        "?event_id=" +
        encodeURIComponent(id) +
        "&duration_seconds=" +
        encodeURIComponent(activeSeconds);

      try {
        navigator.sendBeacon(url);
      } catch (e) {
        // fallback silencieux
      }
    });
  });
})();
