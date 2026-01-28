/* Digitools Room — Events tracking (Xano) */
(function () {
  // Évite double chargement (si tu laisses par erreur l’ancien script dans Webflow sur une page)
  if (window.__DR_EVENTS_LOADED__) return;
  window.__DR_EVENTS_LOADED__ = true;

  // 1) session_id
  try {
    if (!localStorage.getItem("session_id")) {
      localStorage.setItem("session_id", crypto.randomUUID());
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

  // (Optionnel mais pratique) exposer pour debug
  window.DR = window.DR || {};
  window.DR.sendEvent = sendEvent;

  // 0) Helpers referrer / campaign (pour session_start)
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

    // ===== A) session_start (1 fois / session_id) =====
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

    // ===== B) page_view + previous page name =====
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

    // ===== C) tracking durée active (idle > 15s pause) =====
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

    // ===== D) envoi durée (beacon) =====
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

