



<!-- Affiche stats visitors -->
<script>
document.addEventListener("DOMContentLoaded", function () {
  const API_URL =
    "https://xmot-l3ir-7kuj.p7.xano.io/api:sfoT-uEe/stats_interne_visitors";

  const token = localStorage.getItem("adminAuthToken");
  if (!token) {
    window.location.href = "/admin/connexion";
    return;
  }

  // UI Elements
  const form = document.getElementById("dashboard-seo-interne-period-form");
  const dateFilterSelect = document.getElementById("date_filter_seo_interne");

  // Visiteurs uniques
  const uniqCountEl = document.getElementById("count-uniq-visitor");
  const chartWrapper = document.querySelector(".seo-interne-uniq-user-graph-wrapperopy");

  // Taux de conversion visiteur
  const convVisitorsNbEl = document.getElementById("conv-visitors-nb");
  const convVisitorsSignupEl = document.getElementById("conv-visitors-signup");
  const convVisitorsTxEl = document.getElementById("conv-visitors-tx");
  const convVisitorsDeltaEl = document.getElementById("conv-visitors-delta");

  if (form) form.addEventListener("submit", (e) => e.preventDefault());

  // Chart instance
  let chartInstance = null;

  // Colors
  const COLOR_CURRENT = "#2629E4";
  const COLOR_PREVIOUS = "#E426B8";

  // ---- Helpers ----
  function loadChartJsIfNeeded() {
    return new Promise((resolve, reject) => {
      if (window.Chart) return resolve();
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Impossible de charger Chart.js"));
      document.head.appendChild(s);
    });
  }

  function safeGet(obj, path, fallback = null) {
    try {
      return path.split(".").reduce((acc, k) => acc && acc[k], obj) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  function floorToHour(ts) {
    const d = new Date(ts);
    d.setMinutes(0, 0, 0);
    return d.getTime();
  }

  function floorToDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function floorToMonth(ts) {
    const d = new Date(ts);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function floorToBucket(ts, groupBy) {
    if (groupBy === "hour") return floorToHour(ts);
    if (groupBy === "day") return floorToDay(ts);
    if (groupBy === "month") return floorToMonth(ts);
    return floorToDay(ts);
  }

  function formatLabel(ts, groupBy, period) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");

    if (period === "today" && groupBy === "hour") {
      return `${pad(d.getHours())}h`;
    }

    if (groupBy === "hour") {
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}h`;
    }
    if (groupBy === "day") {
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    }
    if (groupBy === "month") {
      return `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    }
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  }

  function buildBucketTimeline(fromTs, toTs, groupBy) {
    const buckets = [];

    if (groupBy === "month") {
      let cur = new Date(floorToMonth(fromTs));
      const end = new Date(floorToMonth(toTs));
      while (cur.getTime() <= end.getTime()) {
        buckets.push(cur.getTime());
        cur.setMonth(cur.getMonth() + 1);
      }
      return buckets;
    }

    const step = groupBy === "hour" ? 3600000 : 86400000;
    let cur = floorToBucket(fromTs, groupBy);
    const end = floorToBucket(toTs, groupBy);

    const maxSteps = 5000;
    let i = 0;
    while (cur <= end && i < maxSteps) {
      buckets.push(cur);
      cur += step;
      i++;
    }
    return buckets;
  }

  function buildCountsByBucket(uniqueVisitorsList, groupBy) {
    const map = new Map();
    (uniqueVisitorsList || []).forEach((row) => {
      const ts = Number(row?.first_ts);
      if (!ts || Number.isNaN(ts)) return;
      const b = floorToBucket(ts, groupBy);
      map.set(b, (map.get(b) || 0) + 1);
    });
    return map;
  }

  function ensureChartCanvas() {
    if (!chartWrapper) return null;

    chartWrapper.style.height = "17rem";
    chartWrapper.style.position = "relative";

    let canvas = chartWrapper.querySelector("canvas[data-dr-chart='uniq-visitors']");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("data-dr-chart", "uniq-visitors");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      chartWrapper.innerHTML = "";
      chartWrapper.appendChild(canvas);
    }
    return canvas;
  }

  function destroyChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  // ✅ Afficher le graphique Taux Sessions Membres/Non-Membres
  function renderMembersChart(kpis) {
    const container = document.getElementById("seo-interne-txusermemberorno");
    if (!container) {
      console.warn("Container #seo-interne-txusermemberorno introuvable");
      return;
    }

    const membersCount = safeGet(kpis, "tx_membersvsnon.members_current", 0);
    const nonMembersCount = safeGet(kpis, "tx_membersvsnon.non_members_current", 0);
    const total = membersCount + nonMembersCount;

    const membersPercent = total > 0 ? Math.round((membersCount / total) * 100) : 0;
    const nonMembersPercent = total > 0 ? Math.round((nonMembersCount / total) * 100) : 0;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
        
        <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
          <div style="min-width: 100px; font-size: 14px; font-weight: 500; color: #1a1a1a;">
            Membres
          </div>
          <div style="flex: 1; position: relative; height: 32px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; height: 100%; background: #8B5CF6; width: ${membersPercent}%; transition: width 0.3s ease;"></div>
          </div>
          <div style="min-width: 60px; text-align: right; font-size: 16px; font-weight: 600; color: #8B5CF6;">
            ${membersPercent}%
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
          <div style="min-width: 100px; font-size: 14px; font-weight: 500; color: #1a1a1a;">
            Non Membres
          </div>
          <div style="flex: 1; position: relative; height: 32px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; height: 100%; background: #FF6B6B; width: ${nonMembersPercent}%; transition: width 0.3s ease;"></div>
          </div>
          <div style="min-width: 60px; text-align: right; font-size: 16px; font-weight: 600; color: #FF6B6B;">
            ${nonMembersPercent}%
          </div>
        </div>

      </div>
    `;
  }

  // ✅ NOUVELLE FONCTION : Afficher le Taux de Conversion Visiteur
  function renderConversionRate(kpis, period) {
    // Récupérer les données
    const visitorsCurrent = safeGet(kpis, "convert_visitors.current", 0);
    const visitorsPrevious = safeGet(kpis, "convert_visitors.previous", 0);
    const inscriptionsCurrent = safeGet(kpis, "convert_visitors.total_unique_inscription_current", 0);
    const inscriptionsPrevious = safeGet(kpis, "convert_visitors.total_unique_inscription_previous", 0);

    // Calculer les taux de conversion
    const txCurrent = visitorsCurrent > 0 ? (inscriptionsCurrent / visitorsCurrent) * 100 : 0;
    const txPrevious = visitorsPrevious > 0 ? (inscriptionsPrevious / visitorsPrevious) * 100 : 0;

    // Calculer le delta
    const delta = txCurrent - txPrevious;
    const hasDelta = (period !== "today" && period !== "all_time");

    // Afficher Visiteurs
    if (convVisitorsNbEl) {
      convVisitorsNbEl.textContent = visitorsCurrent;
    }

    // Afficher Inscriptions
    if (convVisitorsSignupEl) {
      convVisitorsSignupEl.textContent = inscriptionsCurrent;
    }

    // Afficher Taux de conversion
    if (convVisitorsTxEl) {
      convVisitorsTxEl.textContent = txCurrent.toFixed(1) + " %";
    }

    // Afficher Delta
    if (convVisitorsDeltaEl) {
      if (hasDelta) {
        const deltaText = delta >= 0 ? `+${delta.toFixed(1)} %` : `${delta.toFixed(1)} %`;
        const deltaColor = delta >= 0 ? "#10b981" : "#ef4444"; // vert si +, rouge si -
        convVisitorsDeltaEl.textContent = deltaText;
        convVisitorsDeltaEl.style.color = deltaColor;
        convVisitorsDeltaEl.style.fontWeight = "600";
      } else {
        convVisitorsDeltaEl.textContent = "_";
        convVisitorsDeltaEl.style.color = "#999"; // gris pour le tiret
      }
    }
  }

  function renderChart({ meta, lists, kpis, period }) {
    const groupBy = meta?.group_by || "day";

    const serverHasDelta = meta?.has_delta === true;
    const forceNoDelta = (period === "today" || period === "all_time");
    const hasDelta = forceNoDelta ? false : serverHasDelta;

    const currentFrom = Number(meta?.current_from);
    const currentTo = Number(meta?.current_to);
    const previousFrom = Number(meta?.previous_from);
    const previousTo = Number(meta?.previous_to);

    const currentList = safeGet(lists, "unique_visitors_list.current", []);
    const previousList = safeGet(lists, "unique_visitors_list.previous", []);

    // ✅ KPI visiteurs uniques (CURRENT seulement, pas le total !)
    const uniqCurrent = safeGet(kpis, "unique_visitors.current", null);
    if (uniqCountEl) {
      uniqCountEl.textContent = (uniqCurrent ?? "--");
    }

    // ✅ Afficher le graphique Taux Sessions
    renderMembersChart(kpis);

    // ✅ Afficher le Taux de Conversion Visiteur
    renderConversionRate(kpis, period);

    const canvas = ensureChartCanvas();
    if (!canvas) return;

    // Timeline current
    const buckets = buildBucketTimeline(currentFrom, currentTo, groupBy);
    const labels = buckets.map((b) => formatLabel(b, groupBy, period));

    const currentMap = buildCountsByBucket(currentList, groupBy);
    const currentData = buckets.map((b) => currentMap.get(b) || 0);

    // Previous only if hasDelta
    let previousData = null;
    if (hasDelta && previousFrom && previousTo) {
      const prevBuckets = buildBucketTimeline(previousFrom, previousTo, groupBy);
      const prevMap = buildCountsByBucket(previousList, groupBy);
      previousData = prevBuckets.map((b) => prevMap.get(b) || 0);

      if (previousData.length !== currentData.length) {
        const resized = new Array(currentData.length).fill(0);
        const minLen = Math.min(previousData.length, resized.length);
        for (let i = 0; i < minLen; i++) resized[i] = previousData[i];
        previousData = resized;
      }
    }

    const datasets = [
      {
        label: "Actuel",
        data: currentData,
        borderColor: COLOR_CURRENT,
        backgroundColor: "transparent",
        tension: 0,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        hitRadius: 10,
      }
    ];

    if (hasDelta && previousData) {
      datasets.push({
        label: "Précédente",
        data: previousData,
        borderColor: COLOR_PREVIOUS,
        backgroundColor: "transparent",
        tension: 0,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        hitRadius: 10,
      });
    }

    destroyChart();

    chartInstance = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              label: function (ctx) {
                const v = ctx.parsed.y ?? 0;
                return `${ctx.dataset.label} : ${v}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: groupBy === "hour" ? 8 : 10
            },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { display: true },
            ticks: { maxTicksLimit: 4 },
            border: { display: false }
          }
        }
      }
    });
  }

  async function fetchSeoInterneDashboard(period) {
    const url = `${API_URL}?period=${encodeURIComponent(period)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem("adminAuthToken");
      window.location.href = "/admin/connexion";
      return null;
    }

    const data = await res.json();

    if (data?.status === "not admin") {
      console.warn("Accès refusé (not admin).");
      return null;
    }

    return data;
  }

  async function updateSeoInterne(period) {
    try {
      await loadChartJsIfNeeded();
      const data = await fetchSeoInterneDashboard(period);
      if (!data) return;

      const meta = safeGet(data, "stats-site.meta", {});
      const kpis = safeGet(data, "stats-site.kpis", {});
      const lists = safeGet(data, "stats-site.lists", {});

      if (!meta?.current_from || !meta?.current_to || !meta?.group_by) {
        if (chartWrapper) {
          chartWrapper.style.height = "17rem";
          chartWrapper.innerHTML = `<div style="color:#d20000;font-size:12px;">Meta (timestamps) manquante pour dessiner le graphique.</div>`;
        }
        return;
      }

      renderChart({ meta, lists, kpis, period });

    } catch (e) {
      console.error("SEO interne dashboard error:", e);
    }
  }

  if (dateFilterSelect) {
    dateFilterSelect.addEventListener("change", (e) => {
      updateSeoInterne(e.target.value || "today");
    });
  }

  updateSeoInterne(dateFilterSelect ? (dateFilterSelect.value || "today") : "today");
});
</script>










<!-- Affiche stats sessions -->
<script>
document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:sfoT-uEe/stats_interne_sessions";

  const token = localStorage.getItem("adminAuthToken");
  if (!token) {
    window.location.href = "/admin/connexion";
    return;
  }

  // UI Elements - Nombres
  const mbSessionNbEl = document.getElementById("mb-session-nb");
  const nombSessionNbEl = document.getElementById("nomb-session-nb");
  const mbSessionPageVueEl = document.getElementById("mb-session-page-vue");
  const nombSessionPageVueEl = document.getElementById("nomb-session-page-vue");
  const mbSessionNbActionEl = document.getElementById("mb-session-nb-action");
  const nombSessionNbActionEl = document.getElementById("nomb-session-nb-action");

  // UI Element - Graphique
  const chartWrapper = document.getElementById("sessions-average-second-graph");

  let chartInstance = null;

  // Couleurs
  const COLOR_MEMBERS = "#A259FF";
  const COLOR_NON_MEMBERS = "#FF7262";

  // ===== Helpers =====
  function safeGet(obj, path, fallback = null) {
    try {
      return path.split(".").reduce((acc, k) => acc && acc[k], obj) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  }

  function destroyChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  function ensureChartCanvas() {
    if (!chartWrapper) return null;

    chartWrapper.style.height = "10rem";
    chartWrapper.style.position = "relative";

    let canvas = chartWrapper.querySelector("canvas[data-dr-chart='sessions-duration']");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("data-dr-chart", "sessions-duration");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      chartWrapper.innerHTML = "";
      chartWrapper.appendChild(canvas);
    }
    return canvas;
  }

  // ===== Affichage des données =====
  function renderSessionStats(data) {
    const members = safeGet(data, "stats-session.session_members", {});
    const nonMembers = safeGet(data, "stats-session.no_session_members", {});

    // Nombres de sessions
    if (mbSessionNbEl) {
      mbSessionNbEl.textContent = members.members_count_sessions || 0;
    }
    if (nombSessionNbEl) {
      nombSessionNbEl.textContent = nonMembers.no_members_count_sessions || 0;
    }

    // Pages vues moyennes
    if (mbSessionPageVueEl) {
      const avgPages = members.members_average_pages || 0;
      mbSessionPageVueEl.textContent = avgPages.toFixed(1);
    }
    if (nombSessionPageVueEl) {
      const avgPages = nonMembers.no_members_average_pages || 0;
      nombSessionPageVueEl.textContent = avgPages.toFixed(1);
    }

    // Actions moyennes
    if (mbSessionNbActionEl) {
      const avgActions = members.members_average_actions || 0;
      mbSessionNbActionEl.textContent = avgActions.toFixed(1);
    }
    if (nombSessionNbActionEl) {
      const avgActions = nonMembers.no_members_average_actions || 0;
      nombSessionNbActionEl.textContent = avgActions.toFixed(1);
    }

    // Graphique durée moyenne
    renderDurationChart(members, nonMembers);
  }

  function renderDurationChart(members, nonMembers) {
    // ✅ Chart.js est déjà chargé par le script visiteurs, on vérifie juste
    if (!window.Chart) {
      console.error("Chart.js non chargé !");
      return;
    }

    const canvas = ensureChartCanvas();
    if (!canvas) return;

    const membersAvgSeconds = members.members_average_seconds || 0;
    const nonMembersAvgSeconds = nonMembers.no_members_average_seconds || 0;

    destroyChart();

    chartInstance = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Membres", "Non Membres"],
        datasets: [
          {
            label: "Durée moyenne (secondes)",
            data: [membersAvgSeconds, nonMembersAvgSeconds],
            backgroundColor: [COLOR_MEMBERS, COLOR_NON_MEMBERS],
            borderWidth: 0,
            barThickness: 80,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              label: function (ctx) {
                const seconds = ctx.parsed.y || 0;
                const duration = formatDuration(seconds);
                return `Durée moyenne : ${duration}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: { display: true },
            border: { display: false },
            ticks: {
              callback: function (value) {
                const minutes = Math.floor(value / 60);
                const seconds = Math.round(value % 60);
                return `${minutes}m ${seconds}s`;
              },
            },
          },
        },
      },
    });
  }

  // ===== Fetch data =====
  async function fetchSessionStats(period) {
    const url = `${API_URL}?period=${encodeURIComponent(period)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("adminAuthToken");
      window.location.href = "/admin/connexion";
      return null;
    }

    const data = await res.json();

    if (data?.status === "not admin") {
      console.warn("Accès refusé (not admin).");
      return null;
    }

    return data;
  }

  async function updateSessionStats(period) {
    try {
      const data = await fetchSessionStats(period);
      if (!data) return;

      renderSessionStats(data);
    } catch (e) {
      console.error("Stats sessions error:", e);
    }
  }

  // ✅ IMPORTANT : Ajouter le listener AVANT le premier chargement
  const dateFilterSelect = document.getElementById("date_filter_seo_interne");
  
  if (dateFilterSelect) {
    dateFilterSelect.addEventListener("change", (e) => {
      console.log("🔄 Changement période sessions:", e.target.value); // Pour debug
      updateSessionStats(e.target.value || "today");
    });
  }

  // Premier chargement
  updateSessionStats(dateFilterSelect ? (dateFilterSelect.value || "today") : "today");
});
</script>




















<!-- Affichage pages clés -->
<script>
document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:sfoT-uEe/stats_interne_pages";

  const token = localStorage.getItem("adminAuthToken");
  if (!token) {
    window.location.href = "/admin/connexion";
    return;
  }

  // UI Element - Tableau
  const tableContainer = document.getElementById("top-page-graph");

  // ===== Helpers =====
  function safeGet(obj, path, fallback = null) {
    try {
      return path.split(".").reduce((acc, k) => acc && acc[k], obj) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  // ===== Affichage du tableau =====
  function renderTopPagesTable(data) {
    if (!tableContainer) {
      console.warn("Container #top-page-graph introuvable");
      return;
    }

    // ✅ Transformer l'objet en array et compter les visites
    const pagesArray = [];
    
    for (const pageName in data) {
      // Ignorer les clés qui ne sont pas des pages
      if (!Array.isArray(data[pageName])) continue;
      
      const pageEvents = data[pageName];
      
      // ✅ Le nombre de visites = longueur de l'array !
      const totalVisits = pageEvents.length;
      
      // Prendre le premier event pour l'URL
      const firstEvent = pageEvents[0] || {};
      const pageUrl = firstEvent.url || "#";
      
      pagesArray.push({
        page_name: pageName,
        url: pageUrl,
        visits: totalVisits
      });
    }
    
    // Trier par nombre de visites (décroissant)
    pagesArray.sort((a, b) => b.visits - a.visits);
    
    if (pagesArray.length === 0) {
      tableContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #999;">
          Aucune donnée disponible pour cette période
        </div>
      `;
      return;
    }

    // Calculer le total des visites
    const totalVisits = pagesArray.reduce((sum, page) => sum + page.visits, 0);

    // Limiter au top 7
    const top7Pages = pagesArray.slice(0, 7);

    // Construire le tableau HTML
    let tableHTML = `
      <style>
        .top-pages-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .top-pages-table thead {
          background: #f8f9fa;
          border-bottom: 2px solid #e0e0e0;
        }
        .top-pages-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #1a1a1a;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .top-pages-table tbody tr {
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.2s;
        }
        .top-pages-table tbody tr:hover {
          background: #f8f9fa;
        }
        .top-pages-table td {
          padding: 14px 16px;
          color: #333;
        }
        .top-pages-table .page-name {
          font-weight: 500;
          color: #1a1a1a;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .top-pages-table .page-url {
          color: #666;
          font-size: 12px;
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .top-pages-table .page-url a {
          color: #2629E4;
          text-decoration: none;
        }
        .top-pages-table .page-url a:hover {
          text-decoration: underline;
        }
        .top-pages-table .visits-count {
          font-weight: 600;
          color: #1a1a1a;
        }
        .top-pages-table .traffic-percentage {
          font-weight: 500;
          color: #2629E4;
        }
        .top-pages-table .top-rank {
          font-weight: 700;
          color: #999;
          font-size: 16px;
        }
      </style>
      
      <table class="top-pages-table">
        <thead>
          <tr>
            <th style="width: 60px;"></th>
            <th>Nom</th>
            <th style="width: 150px;">Nombre de visites</th>
            <th style="width: 150px;">Part du trafic total (%)</th>
          </tr>
        </thead>
        <tbody>
    `;

    top7Pages.forEach((page, index) => {
      const pageName = page.page_name || "Page sans nom";
      const pageUrl = page.url || "#";
      const visits = page.visits || 0;
      const trafficPercentage = totalVisits > 0 ? ((visits / totalVisits) * 100).toFixed(1) : 0;
      const rank = index + 1;

      tableHTML += `
        <tr>
          <td class="top-rank">Top ${rank}</td>
          <td>
            <div class="page-name" title="${pageName}">${pageName}</div>
            <div class="page-url"><a href="${pageUrl}" target="_blank" title="${pageUrl}">${pageUrl}</a></div>
          </td>
          <td class="visits-count">${visits}</td>
          <td class="traffic-percentage">${trafficPercentage}%</td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    tableContainer.innerHTML = tableHTML;
  }

  // ===== Fetch data =====
  async function fetchPagesStats(period) {
    const url = `${API_URL}?period=${encodeURIComponent(period)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("adminAuthToken");
      window.location.href = "/admin/connexion";
      return null;
    }

    const data = await res.json();

    if (data?.status === "not admin") {
      console.warn("Accès refusé (not admin).");
      return null;
    }

    return data;
  }

  async function updatePagesStats(period) {
    try {
      const data = await fetchPagesStats(period);
      if (!data) return;

      renderTopPagesTable(data);
    } catch (e) {
      console.error("Stats pages error:", e);
    }
  }

  // ===== Filtre période =====
  const dateFilterSelect = document.getElementById("date_filter_seo_interne");
  
  if (dateFilterSelect) {
    dateFilterSelect.addEventListener("change", (e) => {
      console.log("🔄 Changement période pages:", e.target.value);
      updatePagesStats(e.target.value || "today");
    });
  }

  // Premier chargement
  updatePagesStats(dateFilterSelect ? (dateFilterSelect.value || "today") : "today");
});
</script>










<!-- Affichage origine trafic/inscription -->
<script>
document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:sfoT-uEe/stats_interne_traffic_source";

  const token = localStorage.getItem("adminAuthToken");
  if (!token) {
    window.location.href = "/admin/connexion";
    return;
  }

  // UI Elements
  const trafficChartContainer = document.getElementById("graph-origin-trafic");
  const signupChartContainer = document.getElementById("graph-origin-signup");
  const signupTableContainer = document.getElementById("top-page-signup");

  let trafficChartInstance = null;
  let signupChartInstance = null;

  // Couleurs pour les camemberts
  const COLORS = {
    search: "#FF8A65",
    campaign: "#42A5F5",
    direct: "#AB47BC",
    referral: "#66BB6A",
    internal: "#EC407A"
  };

  // ===== Helpers =====
  function safeGet(obj, path, fallback = null) {
    try {
      return path.split(".").reduce((acc, k) => acc && acc[k], obj) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  function destroyChart(chartInstance) {
    if (chartInstance) {
      chartInstance.destroy();
      return null;
    }
    return chartInstance;
  }

  // ===== Camembert : Répartition du trafic par source =====
  function renderTrafficChart(data) {
    if (!trafficChartContainer) return;
    if (!window.Chart) {
      console.error("Chart.js non chargé !");
      return;
    }

    trafficChartContainer.style.height = "20rem";
    trafficChartContainer.style.position = "relative";

    let canvas = trafficChartContainer.querySelector("canvas[data-dr-chart='traffic-source']");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("data-dr-chart", "traffic-source");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      trafficChartContainer.innerHTML = "";
      trafficChartContainer.appendChild(canvas);
    }

    const originTraffic = safeGet(data, "origine_traffic", {});
    
    const labels = [];
    const values = [];
    const colors = [];

    for (const source in originTraffic) {
      if (Array.isArray(originTraffic[source])) {
        const count = originTraffic[source].length;
        if (count > 0) {
          labels.push(source.charAt(0).toUpperCase() + source.slice(1));
          values.push(count);
          colors.push(COLORS[source] || "#999");
        }
      }
    }

    trafficChartInstance = destroyChart(trafficChartInstance);

    trafficChartInstance = new Chart(canvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "right",
            labels: {
              padding: 15,
              font: { size: 13 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const total = values.reduce((a, b) => a + b, 0);
                const percentage = ((ctx.parsed / total) * 100).toFixed(0);
                return `${ctx.label}: ${percentage}%`;
              }
            }
          }
        }
      }
    });
  }

  // ===== Camembert : Origine des inscriptions =====
  function renderSignupChart(data) {
    if (!signupChartContainer) return;
    if (!window.Chart) return;

    signupChartContainer.style.height = "20rem";
    signupChartContainer.style.position = "relative";

    let canvas = signupChartContainer.querySelector("canvas[data-dr-chart='signup-source']");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("data-dr-chart", "signup-source");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      signupChartContainer.innerHTML = "";
      signupChartContainer.appendChild(canvas);
    }

    const originInscription = safeGet(data, "origine_inscription", {});
    
    const labels = [];
    const values = [];
    const colors = [];

    for (const source in originInscription) {
      if (Array.isArray(originInscription[source])) {
        const count = originInscription[source].length;
        if (count > 0) {
          labels.push(source.charAt(0).toUpperCase() + source.slice(1));
          values.push(count);
          colors.push(COLORS[source] || "#999");
        }
      }
    }

    signupChartInstance = destroyChart(signupChartInstance);

    signupChartInstance = new Chart(canvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "right",
            labels: {
              padding: 15,
              font: { size: 13 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const total = values.reduce((a, b) => a + b, 0);
                const percentage = ((ctx.parsed / total) * 100).toFixed(0);
                return `${ctx.label}: ${percentage}%`;
              }
            }
          }
        }
      }
    });
  }

  // ===== Tableau : Top 10 pages génératrices d'inscriptions =====
  function renderSignupPagesTable(data) {
    if (!signupTableContainer) return;

    const topPageInscription = safeGet(data, "top_page_inscription", {});
    
    // Transformer l'objet en array
    const pagesArray = [];
    for (const pageName in topPageInscription) {
      if (Array.isArray(topPageInscription[pageName])) {
        const count = topPageInscription[pageName].length;
        const firstEvent = topPageInscription[pageName][0] || {};
        const url = firstEvent.url || "#";
        
        pagesArray.push({
          page_name: pageName,
          url: url,
          inscriptions: count
        });
      }
    }

    // Trier par nombre d'inscriptions (décroissant)
    pagesArray.sort((a, b) => b.inscriptions - a.inscriptions);

    // Limiter au top 10
    const top10 = pagesArray.slice(0, 10);

    if (top10.length === 0) {
      signupTableContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #999;">
          Aucune donnée disponible
        </div>
      `;
      return;
    }

    // Construire le tableau HTML
    let tableHTML = `
      <style>
        .signup-pages-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .signup-pages-table thead {
          background: #f8f9fa;
          border-bottom: 2px solid #e0e0e0;
        }
        .signup-pages-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #1a1a1a;
          font-size: 13px;
        }
        .signup-pages-table tbody tr {
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.2s;
        }
        .signup-pages-table tbody tr:hover {
          background: #f8f9fa;
        }
        .signup-pages-table td {
          padding: 14px 16px;
          color: #333;
        }
        .signup-pages-table .page-name {
          font-weight: 500;
          color: #1a1a1a;
        }
        .signup-pages-table .page-url {
          color: #666;
          font-size: 12px;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .signup-pages-table .page-url a {
          color: #2629E4;
          text-decoration: none;
        }
        .signup-pages-table .page-url a:hover {
          text-decoration: underline;
        }
        .signup-pages-table .inscriptions-count {
          font-weight: 600;
          color: #1a1a1a;
          text-align: center;
        }
      </style>
      
      <table class="signup-pages-table">
        <thead>
          <tr>
            <th>Page name</th>
            <th style="width: 150px; text-align: center;">Inscriptions</th>
            <th style="width: 250px;">URL</th>
          </tr>
        </thead>
        <tbody>
    `;

    top10.forEach((page) => {
      tableHTML += `
        <tr>
          <td class="page-name">${page.page_name}</td>
          <td class="inscriptions-count">${page.inscriptions}</td>
          <td class="page-url"><a href="${page.url}" target="_blank" title="${page.url}">${page.url}</a></td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    signupTableContainer.innerHTML = tableHTML;
  }

  // ===== Fetch data =====
  async function fetchTrafficSourceStats(period) {
    const url = `${API_URL}?period=${encodeURIComponent(period)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("adminAuthToken");
      window.location.href = "/admin/connexion";
      return null;
    }

    const data = await res.json();

    if (data?.status === "not admin") {
      console.warn("Accès refusé (not admin).");
      return null;
    }

    return data;
  }

  async function updateTrafficSourceStats(period) {
    try {
      const data = await fetchTrafficSourceStats(period);
      if (!data) return;

      renderTrafficChart(data);
      renderSignupChart(data);
      renderSignupPagesTable(data);
    } catch (e) {
      console.error("Stats traffic source error:", e);
    }
  }

  // ===== Filtre période =====
  const dateFilterSelect = document.getElementById("date_filter_seo_interne");
  
  if (dateFilterSelect) {
    dateFilterSelect.addEventListener("change", (e) => {
      console.log("🔄 Changement période traffic source:", e.target.value);
      updateTrafficSourceStats(e.target.value || "today");
    });
  }

  // Premier chargement
  updateTrafficSourceStats(dateFilterSelect ? (dateFilterSelect.value || "today") : "today");
});
</script>






<!-- Affichage page match freelance -->
<script>
document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:sfoT-uEe/stats_interne_freelance";

  const token = localStorage.getItem("adminAuthToken");
  if (!token) {
    window.location.href = "/admin/connexion";
    return;
  }

  // UI Elements
  const visitorsNbEl = document.getElementById("freelance-visitors-nb");
  const formSendEl = document.getElementById("freelance-form-send");
  const txConvEl = document.getElementById("freelance-tx-conv");

  // ===== Helpers =====
  function safeGet(obj, path, fallback = null) {
    try {
      return path.split(".").reduce((acc, k) => acc && acc[k], obj) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  // ===== Affichage des stats =====
  function renderFreelanceStats(data) {
    const pageView = safeGet(data, "page_view", 0);
    const submit = safeGet(data, "submit", 0);

    // Calculer le taux de conversion
    const txConv = pageView > 0 ? ((submit / pageView) * 100).toFixed(0) : 0;

    // Afficher Nb de visites
    if (visitorsNbEl) {
      visitorsNbEl.textContent = pageView;
    }

    // Afficher Nb form envoyés
    if (formSendEl) {
      formSendEl.textContent = submit;
    }

    // Afficher Taux de conversion
    if (txConvEl) {
      txConvEl.textContent = txConv + "%";
    }
  }

  // ===== Fetch data =====
  async function fetchFreelanceStats(period) {
    const url = `${API_URL}?period=${encodeURIComponent(period)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("adminAuthToken");
      window.location.href = "/admin/connexion";
      return null;
    }

    const data = await res.json();

    if (data?.status === "not admin") {
      console.warn("Accès refusé (not admin).");
      return null;
    }

    return data;
  }

  async function updateFreelanceStats(period) {
    try {
      const data = await fetchFreelanceStats(period);
      if (!data) return;

      renderFreelanceStats(data);
    } catch (e) {
      console.error("Stats freelance error:", e);
    }
  }

  // ===== Filtre période =====
  const dateFilterSelect = document.getElementById("date_filter_seo_interne");
  
  if (dateFilterSelect) {
    dateFilterSelect.addEventListener("change", (e) => {
      console.log("🔄 Changement période freelance:", e.target.value);
      updateFreelanceStats(e.target.value || "today");
    });
  }

  // Premier chargement
  updateFreelanceStats(dateFilterSelect ? (dateFilterSelect.value || "today") : "today");
});
</script>










<!-- Affichage CTA -->
<script>
document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "https://xmot-l3ir-7kuj.p7.xano.io/api:sfoT-uEe/stats_interne_cta";

  const token = localStorage.getItem("adminAuthToken");
  if (!token) {
    window.location.href = "/admin/connexion";
    return;
  }

  // UI Elements - Totaux
  const totalLandingViewEl = document.getElementById("cta-total-landing-view");
  const totalAddCartEl = document.getElementById("cta-total-add-cart");
  const totalTestCourseEl = document.getElementById("cta-total-test-course");

  // UI Elements - View Landing (%)
  const landingViewFromCourseEl = document.getElementById("cta-landing-view-from-course");
  const landingViewFromBlogEl = document.getElementById("cta-landing-view-from-blog");

  // UI Elements - Ajout Panier (%)
  const addCartFromCartEl = document.getElementById("cta-add-cart-from-cart");
  const addCartFromLandingEl = document.getElementById("cta-add-cart-from-landing");
  const addCartFromTestEl = document.getElementById("cta-add-cart-from-test");
  const addCartFromProfileEl = document.getElementById("cta-add-cart-from-profile");

  // UI Elements - Test Cours (%)
  const testCourseFromLandingEl = document.getElementById("cta-test-course-from-landing");
  const testCourseFromProfileEl = document.getElementById("cta-test-course-from-profile");
  const testCourseFromBlogEl = document.getElementById("cta-test-course-from-blog");

  // ===== Helpers =====
  function safeGet(obj, path, fallback = null) {
    try {
      return path.split(".").reduce((acc, k) => acc && acc[k], obj) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  // ===== Affichage des stats =====
  function renderCTAStats(data) {
    // Récupérer les données
    const viewLanding = safeGet(data, "view_landing_resum", {});
    const addToCart = safeGet(data, "add_to_cart_resum", {});
    const testCourse = safeGet(data, "test_course_resum", {});

    // === TOTAUX ===
    const totalLandingView = viewLanding.total || 0;
    const totalAddCart = addToCart.total || 0;
    const totalTestCourse = testCourse.total || 0;

    if (totalLandingViewEl) totalLandingViewEl.textContent = totalLandingView;
    if (totalAddCartEl) totalAddCartEl.textContent = totalAddCart;
    if (totalTestCourseEl) totalTestCourseEl.textContent = totalTestCourse;

    // === VIEW LANDING - Pourcentages ===
    const fromCourse = viewLanding.from_course || 0;
    const fromBlog = viewLanding.from_blog || 0;

    const pctCourse = totalLandingView > 0 ? ((fromCourse / totalLandingView) * 100).toFixed(0) : 0;
    const pctBlog = totalLandingView > 0 ? ((fromBlog / totalLandingView) * 100).toFixed(0) : 0;

    if (landingViewFromCourseEl) landingViewFromCourseEl.textContent = pctCourse + "%";
    if (landingViewFromBlogEl) landingViewFromBlogEl.textContent = pctBlog + "%";

    // === AJOUT PANIER - Pourcentages ===
    const fromPanier = addToCart.from_panier || 0;
    const fromLanding = addToCart.from_landing || 0;
    const fromTest = addToCart.from_test || 0;
    const fromProfile = addToCart.from_profile || 0;

    const pctPanier = totalAddCart > 0 ? ((fromPanier / totalAddCart) * 100).toFixed(0) : 0;
    const pctLanding = totalAddCart > 0 ? ((fromLanding / totalAddCart) * 100).toFixed(0) : 0;
    const pctTest = totalAddCart > 0 ? ((fromTest / totalAddCart) * 100).toFixed(0) : 0;
    const pctProfile = totalAddCart > 0 ? ((fromProfile / totalAddCart) * 100).toFixed(0) : 0;

    if (addCartFromCartEl) addCartFromCartEl.textContent = pctPanier + "%";
    if (addCartFromLandingEl) addCartFromLandingEl.textContent = pctLanding + "%";
    if (addCartFromTestEl) addCartFromTestEl.textContent = pctTest + "%";
    if (addCartFromProfileEl) addCartFromProfileEl.textContent = pctProfile + "%";

    // === TEST COURS - Pourcentages ===
    const testFromProfile = testCourse.from_profile || 0;
    const testFromBlog = testCourse.from_blog || 0;
    const testFromLanding = testCourse.from_landing || 0;

    const pctTestProfile = totalTestCourse > 0 ? ((testFromProfile / totalTestCourse) * 100).toFixed(0) : 0;
    const pctTestBlog = totalTestCourse > 0 ? ((testFromBlog / totalTestCourse) * 100).toFixed(0) : 0;
    const pctTestLanding = totalTestCourse > 0 ? ((testFromLanding / totalTestCourse) * 100).toFixed(0) : 0;

    if (testCourseFromLandingEl) testCourseFromLandingEl.textContent = pctTestLanding + "%";
    if (testCourseFromProfileEl) testCourseFromProfileEl.textContent = pctTestProfile + "%";
    if (testCourseFromBlogEl) testCourseFromBlogEl.textContent = pctTestBlog + "%";
  }

  // ===== Fetch data =====
  async function fetchCTAStats(period) {
    const url = `${API_URL}?period=${encodeURIComponent(period)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("adminAuthToken");
      window.location.href = "/admin/connexion";
      return null;
    }

    const data = await res.json();

    if (data?.status === "not admin") {
      console.warn("Accès refusé (not admin).");
      return null;
    }

    return data;
  }

  async function updateCTAStats(period) {
    try {
      const data = await fetchCTAStats(period);
      if (!data) return;

      renderCTAStats(data);
    } catch (e) {
      console.error("Stats CTA error:", e);
    }
  }

  // ===== Filtre période =====
  const dateFilterSelect = document.getElementById("date_filter_seo_interne");
  
  if (dateFilterSelect) {
    dateFilterSelect.addEventListener("change", (e) => {
      console.log("🔄 Changement période CTA:", e.target.value);
      updateCTAStats(e.target.value || "today");
    });
  }

  // Premier chargement
  updateCTAStats(dateFilterSelect ? (dateFilterSelect.value || "today") : "today");
});
</script>
