document.addEventListener('DOMContentLoaded', function () {

  const auth           = JSON.parse(localStorage.getItem('auth') || 'null');
  const token          = auth?.token;
  const rawBookings    = auth?.freelance?.booking    || [];
  const rawAttachments = auth?.freelance?.attachment || [];

  const attachmentsByBookingId = {};
  rawAttachments.forEach(a => {
    if (a.booking_id) attachmentsByBookingId[a.booking_id] = a.attachments || [];
  });

  const bookings = rawBookings.map(b => ({
    ...b,
    attachments: attachmentsByBookingId[b.id] || [],
  }));

  const ENDPOINT_STATUS  = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/update_booking_status';
  const ENDPOINT_VISIO   = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/update_booking_visio';
  const ENDPOINT_DISPUTE = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/reply_dispute';
  const ENDPOINT_UPLOAD  = 'https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/upload-proof';
  const REFRESH_URL      = 'https://xmot-l3ir-7kuj.p7.xano.io/api:uFugjjm6/user_full_data';
  const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
    #rdv-container * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }

    /* ── TABS style "room-front" ── */
    #rdv-tabs-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 0;
    }
    #rdv-tabs {
      display: flex;
      gap: 0;
      border-bottom: none;
    }
    .rdv-tab {
      padding: 10px 20px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      color: #6b7280;
      cursor: pointer;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: 0;
      transition: all .15s;
      background: none;
      position: relative;
      white-space: nowrap;
    }
    .rdv-tab.active { color: #2563eb; border-bottom-color: #2563eb; }
    .rdv-tab:hover:not(.active) { color: #374151; }
    .rdv-tab-dot {
      position: absolute; top: 6px; right: 6px;
      width: 7px; height: 7px; border-radius: 50%;
      background: #dc2626; border: 1.5px solid #fff; display: none;
    }
    .rdv-tab-dot.visible { display: block; }

    /* Séparateur sous les tabs */
    .rdv-tabs-divider {
      height: 1px;
      background: #e8e8e4;
      margin-bottom: 20px;
    }

    /* Bouton actualiser — refait */
    #rdv-refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 14px;
      border-radius: 10px;
      border: 1.5px solid #e0e7ff;
      background: #eff6ff;
      color: #2563eb;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all .15s;
    }
    #rdv-refresh-btn:hover { background: #dbeafe; border-color: #bfdbfe; }
    #rdv-refresh-btn:disabled { opacity: .6; cursor: not-allowed; }
    #rdv-refresh-btn svg { width: 14px; height: 14px; flex-shrink: 0; }

    /* ── BANNERS ── */
    .rdv-hold-banner {
      background: #FEF3C7; border: 1px solid #FDE68A;
      border-radius: 12px; padding: 13px 18px;
      font-size: 0.83rem; color: #92400E; margin-bottom: 16px;
      display: flex; align-items: flex-start; gap: 10px; line-height: 1.6;
    }
    .rdv-dispute-alert {
      background: #FEE2E2; border: 1px solid #FCA5A5;
      border-radius: 12px; padding: 13px 18px;
      font-size: 0.83rem; color: #991B1B; margin-bottom: 16px;
      display: flex; align-items: flex-start; gap: 10px; line-height: 1.6;
    }

    /* ── EMPTY STATE ── */
    .rdv-empty-box {
      background: #fff;
      border: 1.5px solid #eef0f3;
      border-radius: 18px;
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      text-align: center;
      box-shadow: 0 1px 6px rgba(0,0,0,.04);
    }
    .rdv-empty-icon-wrap {
      width: 68px; height: 68px; border-radius: 50%;
      background: #eff6ff; border: 1.5px solid #bfdbfe;
      display: flex; align-items: center; justify-content: center;
      color: #2563eb; font-size: 26px;
    }
    .rdv-empty-title {
      font-size: 0.95rem; font-weight: 600; color: #111112;
    }
    .rdv-empty-sub {
      font-size: 0.82rem; color: #6b7280; line-height: 1.6;
      max-width: 340px;
    }
    .rdv-empty-actions {
      display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
      margin-top: 4px;
    }
    .rdv-empty-btn-primary {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: 10px;
      background: #2563eb; color: #fff;
      font-size: 0.82rem; font-weight: 600;
      border: none; cursor: pointer; text-decoration: none;
      transition: opacity .15s;
    }
    .rdv-empty-btn-primary:hover { opacity: .88; }
    .rdv-empty-btn-ghost {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 18px; border-radius: 10px;
      background: #f8f9fa; color: #374151;
      font-size: 0.82rem; font-weight: 600;
      border: 1.5px solid #e8e8e4; cursor: pointer; text-decoration: none;
      transition: background .15s;
    }
    .rdv-empty-btn-ghost:hover { background: #e8e8e4; }
    .rdv-empty-tips {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 10px; margin-top: 20px; width: 100%;
    }
    .rdv-empty-tip {
      background: #f8f9fc; border: 1px solid #eef0f3;
      border-radius: 12px; padding: 14px;
      display: flex; flex-direction: column; gap: 6px;
      text-align: left;
    }
    .rdv-empty-tip-icon {
      width: 30px; height: 30px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
    }
    .rdv-empty-tip-title { font-size: 0.78rem; font-weight: 600; color: #111112; }
    .rdv-empty-tip-desc  { font-size: 0.72rem; color: #6b7280; line-height: 1.5; }

    /* ── CARDS RDV ── */
    .rdv-card {
      background: #fff; border-radius: 16px;
      border: 1.5px solid #BFDBFE; overflow: hidden; margin-bottom: 16px;
      box-shadow: 0 1px 6px rgba(37,99,235,.05);
    }
    .rdv-card-header {
      background: #EFF6FF; padding: 14px 20px;
      border-bottom: 1px solid #BFDBFE;
      display: flex; align-items: center;
      justify-content: space-between; gap: 12px; flex-wrap: wrap;
    }
    .rdv-card-header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .rdv-client-name { font-size: 0.95rem; font-weight: 600; color: #0f0f0f; }

    .rdv-badge {
      font-size: 0.72rem; font-weight: 600;
      padding: 3px 10px; border-radius: 999px;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .rdv-badge-hold      { background: #FEF3C7; color: #92400E; }
    .rdv-badge-confirmed { background: #D1FAE5; color: #065F46; }
    .rdv-badge-completed { background: #F3F4F6; color: #374151; }
    .rdv-badge-cancelled { background: #FEE2E2; color: #991B1B; }
    .rdv-badge-expired   { background: #F3F4F6; color: #6B7280; }
    .rdv-badge-dispute   { background: #FEE2E2; color: #991B1B; }

    .rdv-deadline-badge {
      font-size: 0.68rem; font-weight: 600;
      padding: 3px 10px; border-radius: 999px;
      background: #FEF3C7; color: #92400E;
      border: 1px solid #FDE68A; white-space: nowrap;
    }
    .rdv-type-badge {
      font-size: 0.72rem; font-weight: 500;
      padding: 3px 10px; border-radius: 999px;
      background: #eff6ff; color: #2563eb; border: 1px solid #BFDBFE;
    }

    .rdv-card-body {
      padding: 16px 20px;
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
    }
    @media (max-width: 600px) { .rdv-card-body { grid-template-columns: 1fr 1fr; } }

    .rdv-info-item { display: flex; flex-direction: column; gap: 3px; }
    .rdv-info-label { font-size: 0.72rem; color: #9a9a9a; font-weight: 500; }
    .rdv-info-value { font-size: 0.85rem; font-weight: 600; color: #0f0f0f; }

    .rdv-detail-panel {
      padding: 16px 20px; border-top: 1px solid #BFDBFE;
      background: #fafafa; display: none;
    }
    .rdv-detail-panel.open { display: block; }
    .rdv-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 600px) { .rdv-detail-grid { grid-template-columns: 1fr; } }
    .rdv-detail-section-title {
      font-size: 0.72rem; font-weight: 600; color: #2563eb;
      text-transform: uppercase; letter-spacing: 0.08em;
      margin-bottom: 10px; margin-top: 14px;
    }
    .rdv-detail-section-title:first-child { margin-top: 0; }
    .rdv-note-box {
      background: #f8f9ff; border: 1px solid #BFDBFE;
      border-radius: 10px; padding: 12px; font-size: 0.82rem;
      color: #0f0f0f; line-height: 1.5;
    }
    .rdv-dispute-box {
      background: #FEE2E2; border: 1px solid #FCA5A5;
      border-radius: 10px; padding: 12px; font-size: 0.82rem;
      color: #991B1B; line-height: 1.5; margin-bottom: 12px;
    }
    .rdv-attachment {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 8px;
      background: #eff6ff; border: 1px solid #BFDBFE;
      color: #2563eb; font-size: 0.8rem; font-weight: 500;
      text-decoration: none; margin-right: 8px; margin-bottom: 8px;
    }
    .rdv-attachment:hover { background: #BFDBFE; }

    .rdv-card-footer {
      padding: 12px 20px; border-top: 1px solid #BFDBFE;
      display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
    }
    .rdv-btn {
      padding: 7px 14px; border-radius: 8px;
      font-size: 0.8rem; font-weight: 600;
      cursor: pointer; border: none; transition: all 0.15s;
    }
    .rdv-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .rdv-btn-primary   { background: #2563eb; color: #fff; }
    .rdv-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
    .rdv-btn-secondary { background: #f4f4f0; color: #0f0f0f; border: 1.5px solid #e8e8e4; }
    .rdv-btn-secondary:hover:not(:disabled) { background: #e8e8e4; }
    .rdv-btn-danger    { background: #fff; color: #dc2626; border: 1.5px solid #fca5a5; }
    .rdv-btn-danger:hover:not(:disabled) { background: #FEE2E2; }
    .rdv-btn-success   { background: #059669; color: #fff; }
    .rdv-btn-success:hover:not(:disabled) { background: #047857; }

    /* Dispute reply */
    .rdv-dispute-reply {
      background: #fff8f8; border: 1px solid #FCA5A5;
      border-radius: 12px; padding: 16px; margin-top: 12px;
    }
    .rdv-dispute-reply-title {
      font-size: 0.78rem; font-weight: 700; color: #991B1B;
      margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .rdv-dispute-textarea {
      width: 100%; padding: 10px 12px;
      border: 1.5px solid #BFDBFE; border-radius: 10px;
      font-family: 'DM Sans', sans-serif; font-size: 0.85rem;
      resize: none; height: 90px; outline: none;
      box-sizing: border-box; transition: border-color 0.15s; margin-bottom: 10px;
    }
    .rdv-dispute-textarea:focus { border-color: #2563eb; }
    .rdv-proof-zone {
      border: 2px dashed #BFDBFE; border-radius: 10px;
      background: #F8FAFF; padding: 14px;
      display: flex; flex-direction: column;
      align-items: center; gap: 6px;
      cursor: pointer; transition: all 0.2s;
      text-align: center; margin-bottom: 10px;
    }
    .rdv-proof-zone:hover { border-color: #2563eb; background: #EFF6FF; }
    .rdv-proof-zone.has-file { border-style: solid; border-color: #86efac; background: #f0fdf4; }
    .rdv-proof-zone-icon { font-size: 1.4rem; }
    .rdv-proof-zone-title { font-size: 0.78rem; font-weight: 700; color: #111; }
    .rdv-proof-zone-sub { font-size: 0.68rem; color: #9ca3af; }
    .rdv-proof-zone-success { font-size: 0.72rem; color: #15803d; font-weight: 600; display: none; }
    .rdv-proof-zone.has-file .rdv-proof-zone-icon,
    .rdv-proof-zone.has-file .rdv-proof-zone-title,
    .rdv-proof-zone.has-file .rdv-proof-zone-sub { display: none; }
    .rdv-proof-zone.has-file .rdv-proof-zone-success { display: block; }

    /* Modales */
    .rdv-modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.5); z-index: 9999;
      align-items: center; justify-content: center; padding: 20px;
    }
    .rdv-modal-overlay.active { display: flex; }
    .rdv-modal {
      background: #fff; border-radius: 20px;
      padding: 28px; max-width: 440px; width: 100%;
      position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .rdv-modal-title { font-size: 1.05rem; font-weight: 700; color: #0f0f0f; margin-bottom: 8px; }
    .rdv-modal-text  { font-size: 0.85rem; color: #555; line-height: 1.6; margin-bottom: 20px; }
    .rdv-modal-warning {
      background: #FEF3C7; border: 1px solid #FDE68A;
      border-radius: 10px; padding: 12px; font-size: 0.8rem;
      color: #92400E; margin-bottom: 20px; line-height: 1.5;
    }
    .rdv-modal-info {
      background: #EFF6FF; border: 1px solid #BFDBFE;
      border-radius: 10px; padding: 12px; font-size: 0.8rem;
      color: #1d4ed8; margin-bottom: 20px; line-height: 1.5;
    }
    .rdv-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .rdv-modal-close {
      position: absolute; top: 14px; right: 14px;
      background: #f4f4f0; border: none; border-radius: 50%;
      width: 30px; height: 30px; cursor: pointer; font-size: 14px;
      display: flex; align-items: center; justify-content: center; color: #666;
    }
    .rdv-modal-close:hover { background: #e8e8e4; }
    .rdv-modal-input {
      width: 100%; padding: 9px 12px; border: 1.5px solid #e8e8e4;
      border-radius: 8px; font-size: 0.85rem; font-family: 'DM Sans', sans-serif;
      outline: none; margin-bottom: 10px; transition: border-color 0.15s;
    }
    .rdv-modal-input:focus { border-color: #2563eb; }
    .rdv-modal-label { font-size: 0.78rem; font-weight: 600; color: #0f0f0f; margin-bottom: 5px; display: block; }
    .rdv-modal-select {
      width: 100%; padding: 9px 12px; border: 1.5px solid #e8e8e4;
      border-radius: 8px; font-size: 0.85rem; font-family: 'DM Sans', sans-serif;
      outline: none; margin-bottom: 14px; background: #fff; cursor: pointer;
    }
    .rdv-modal-select:focus { border-color: #2563eb; }
  `;
  document.head.appendChild(style);

  function formatDateTime(ms) {
    if (!ms) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(ms));
  }
  function formatDate(ms) {
    if (!ms) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: TZ, day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(ms));
  }
  function isPast(ms) { return ms && new Date(ms) < new Date(); }
  function statusLabel(status) {
    const map = {
      hold:                    { label: 'En attente',        cls: 'rdv-badge-hold' },
      confirmed:               { label: 'Confirmé',          cls: 'rdv-badge-confirmed' },
      completed:               { label: 'Terminé',           cls: 'rdv-badge-completed' },
      cancelled_by_client:     { label: 'Annulé (client)',   cls: 'rdv-badge-cancelled' },
      cancelled_by_freelancer: { label: 'Annulé (vous)',     cls: 'rdv-badge-cancelled' },
      expired:                 { label: 'Expiré',            cls: 'rdv-badge-expired' },
      dispute:                 { label: 'Litige',            cls: 'rdv-badge-dispute' },
    };
    return map[status] || { label: status, cls: 'rdv-badge-hold' };
  }
  function providerLabel(p) {
    const map = { google_meet: 'Google Meet', zoom: 'Zoom', teams: 'Microsoft Teams', whereby: 'Whereby', other: 'Autre' };
    return map[p] || p || '—';
  }

  const UPCOMING_STATUSES = ['hold', 'confirmed'];
  const PAST_STATUSES     = ['completed', 'cancelled_by_client', 'cancelled_by_freelancer', 'expired'];
  const DISPUTE_STATUSES  = ['dispute'];

  const upcoming = bookings.filter(b => UPCOMING_STATUSES.includes(b.status)).sort((a,b) => a.start_at - b.start_at);
  const past     = bookings.filter(b => PAST_STATUSES.includes(b.status)).sort((a,b) => b.start_at - a.start_at);
  const disputes = bookings.filter(b => DISPUTE_STATUSES.includes(b.status)).sort((a,b) => a.start_at - b.start_at);
  const holdCount = upcoming.filter(b => b.status === 'hold').length;

  const container = document.getElementById('rdv-container');
  if (!container) return;

  container.innerHTML = `
    <div id="rdv-tabs-wrap">
      <div id="rdv-tabs">
        <button class="rdv-tab active" data-tab="upcoming">À venir (${upcoming.length})</button>
        <button class="rdv-tab" data-tab="past">Passés (${past.length})</button>
        <button class="rdv-tab" data-tab="disputes" style="position:relative;">
          Litiges (${disputes.length})
          <span class="rdv-tab-dot ${disputes.length > 0 ? 'visible' : ''}"></span>
        </button>
      </div>
      <button id="rdv-refresh-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Actualiser
      </button>
    </div>
    <div class="rdv-tabs-divider"></div>

    ${holdCount > 0 ? `
      <div class="rdv-hold-banner" id="rdv-hold-banner">
        <span>⏳</span>
        <div>
          Vous avez <strong id="rdv-hold-count">${holdCount} rendez-vous en attente de confirmation</strong>. Vérifiez vos disponibilités et confirmez chaque RDV pour que vos clients soient notifiés.
          <br><strong>Attention :</strong> tout RDV non confirmé avant sa date limite sera automatiquement annulé.
        </div>
      </div>
    ` : ''}

    ${disputes.length > 0 ? `
      <div class="rdv-dispute-alert">
        <span>⚠️</span>
        <div>
          Vous avez <strong>${disputes.length} litige(s) en cours</strong>. Répondez avant la date limite avec vos preuves.
        </div>
      </div>
    ` : ''}

    <div id="rdv-list-upcoming"></div>
    <div id="rdv-list-past"     style="display:none;"></div>
    <div id="rdv-list-disputes" style="display:none;"></div>

    <!-- Modale annulation -->
    <div class="rdv-modal-overlay" id="modal-cancel">
      <div class="rdv-modal">
        <button class="rdv-modal-close" id="modal-cancel-close">✕</button>
        <div class="rdv-modal-title" id="modal-cancel-title"></div>
        <div class="rdv-modal-text"  id="modal-cancel-text"></div>
        <div id="modal-cancel-warning" style="display:none;"></div>
        <div class="rdv-modal-actions">
          <button class="rdv-btn rdv-btn-secondary" id="modal-cancel-abort">Fermer</button>
          <button class="rdv-btn rdv-btn-danger"    id="modal-cancel-confirm">Confirmer l'annulation</button>
        </div>
      </div>
    </div>

    <!-- Modale visio -->
    <div class="rdv-modal-overlay" id="modal-visio">
      <div class="rdv-modal">
        <button class="rdv-modal-close" id="modal-visio-close">✕</button>
        <div class="rdv-modal-title">Modifier la visioconférence</div>
        <label class="rdv-modal-label">Plateforme</label>
        <select class="rdv-modal-select" id="modal-visio-provider">
          <option value="">Sélectionner</option>
          <option value="google_meet">Google Meet</option>
          <option value="zoom">Zoom</option>
          <option value="teams">Microsoft Teams</option>
          <option value="whereby">Whereby</option>
          <option value="other">Autre</option>
        </select>
        <label class="rdv-modal-label">Lien de la réunion</label>
        <input type="url" class="rdv-modal-input" id="modal-visio-url" placeholder="https://meet.google.com/..." />
        <div class="rdv-modal-actions">
          <button class="rdv-btn rdv-btn-secondary" id="modal-visio-abort">Annuler</button>
          <button class="rdv-btn rdv-btn-primary"   id="modal-visio-confirm">Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Modale séance effectuée -->
    <div class="rdv-modal-overlay" id="modal-done">
      <div class="rdv-modal">
        <button class="rdv-modal-close" id="modal-done-close">✕</button>
        <div class="rdv-modal-title">Confirmer la séance</div>
        <div class="rdv-modal-text" id="modal-done-text"></div>
        <div class="rdv-modal-actions">
          <button class="rdv-btn rdv-btn-secondary" id="modal-done-abort">Annuler</button>
          <button class="rdv-btn rdv-btn-success"   id="modal-done-confirm">Oui, séance effectuée ✓</button>
        </div>
      </div>
    </div>
  `;

  let _cancelId = null, _visioId = null, _doneId = null, _doneType = null;
  const bookingMap = {};
  bookings.forEach(b => { bookingMap[b.id] = b; });

  function updateHoldBanner() {
    const remainingHold = document.querySelectorAll('#rdv-list-upcoming .rdv-badge-hold').length;
    const banner = document.getElementById('rdv-hold-banner');
    if (!banner) return;
    if (remainingHold === 0) { banner.remove(); return; }
    const countEl = document.getElementById('rdv-hold-count');
    if (countEl) countEl.textContent = `${remainingHold} rendez-vous en attente de confirmation`;
  }

  /* ── EMPTY STATE par type ── */
  function renderEmptyState(type) {
    if (type === 'upcoming') {
      return `
        <div class="rdv-empty-box">
          <div class="rdv-empty-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="rdv-empty-title">Aucun rendez-vous à venir</div>
          <p class="rdv-empty-sub">Configurez vos disponibilités pour que les clients puissent vous réserver en ligne.</p>
          <div class="rdv-empty-actions">
<button class="rdv-empty-btn-primary" id="rdv-goto-params-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Configurer mes disponibilités
            </button>
<button class="rdv-empty-btn-ghost" id="rdv-share-profile-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Partager mon profil
            </button>
          </div>
          <div class="rdv-empty-tips">
            <div class="rdv-empty-tip">
              <div class="rdv-empty-tip-icon" style="background:#eff6ff;color:#2563eb;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div class="rdv-empty-tip-title">Définissez vos créneaux</div>
              <div class="rdv-empty-tip-desc">Indiquez vos jours et horaires dans l'onglet Paramètres.</div>
            </div>
            <div class="rdv-empty-tip">
              <div class="rdv-empty-tip-icon" style="background:#f0fdf4;color:#15803d;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </div>
              <div class="rdv-empty-tip-title">Partagez votre lien</div>
              <div class="rdv-empty-tip-desc">Envoyez votre profil à vos clients ou publiez-le sur vos réseaux.</div>
            </div>
            <div class="rdv-empty-tip">
              <div class="rdv-empty-tip-icon" style="background:#fdf4ff;color:#7c3aed;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div class="rdv-empty-tip-title">Notifications activées</div>
              <div class="rdv-empty-tip-desc">Vous serez alerté par email à chaque nouvelle réservation.</div>
            </div>
          </div>
        </div>`;
    }
    if (type === 'past') {
      return `
        <div class="rdv-empty-box">
          <div class="rdv-empty-icon-wrap" style="background:#f9fafb;border-color:#e5e7eb;color:#6b7280;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="rdv-empty-title">Aucun rendez-vous passé</div>
          <p class="rdv-empty-sub">L'historique de vos séances apparaîtra ici une fois vos premiers RDV terminés.</p>
        </div>`;
    }
    if (type === 'dispute') {
      return `
        <div class="rdv-empty-box">
          <div class="rdv-empty-icon-wrap" style="background:#f0fdf4;border-color:#86efac;color:#15803d;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="rdv-empty-title">Aucun litige en cours</div>
          <p class="rdv-empty-sub">Vos transactions se déroulent sans contestation. Continuez comme ça !</p>
        </div>`;
    }
    return '';
  }

  function renderCards(list, targetId, emptyType) {
    const el = document.getElementById(targetId);
    if (!el) return;
    if (list.length === 0) { el.innerHTML = renderEmptyState(emptyType); return; }
    el.innerHTML = '';

    list.forEach(booking => {
      const client    = booking._user_2 || {};
      const firstName = client.first_name || '';
      const lastName  = client.name       || '';
      const fullName  = `${firstName} ${lastName}`.trim() || '—';
      const email     = client.email || '—';
      const phone     = booking.client_phone || '—';
      const dateTime  = formatDateTime(booking.start_at);
      const duration  = booking.duration_min ? `${booking.duration_min} min` : '—';
      const isCoach   = booking.booking_type === 'coaching';
      const type      = isCoach ? '🤝 Coaching' : '💼 Freelance';
      const status    = statusLabel(booking.status);
      const attachments = booking.attachments || [];
      const showDoneBtn = isPast(booking.end_at) && booking.status === 'confirmed';
      const doneBtnLabel = isCoach ? '🎯 Séance effectuée' : '✅ Clôturer le RDV';
      const hoursUntilStart = booking.start_at ? (booking.start_at - Date.now()) / 3600000 : 999;
      const showScreenshotBanner = booking.status === 'confirmed' && hoursUntilStart > 0 && hoursUntilStart <= 3;
      const deadlineLabel = booking.status === 'hold' && booking.confirmation_deadline
        ? `Confirmer avant le ${formatDate(booking.confirmation_deadline)}` : null;
      const disputeDeadlineLabel = booking.status === 'dispute' && booking.dispute_deadline_freelance
        ? `Répondre avant le ${formatDate(booking.dispute_deadline_freelance)}` : null;

      const card = document.createElement('div');
      card.className = 'rdv-card';
      card.dataset.id = booking.id;
      card.dataset.userId = booking.user_id || '';

      card.innerHTML = `
        ${showScreenshotBanner ? `
          <div style="background:#EFF6FF;border-bottom:1px solid #BFDBFE;padding:12px 20px;display:flex;align-items:flex-start;gap:10px;">
            <span style="font-size:1.1rem;flex-shrink:0;">📸</span>
            <div>
              <div style="font-size:0.82rem;font-weight:700;color:#1d4ed8;margin-bottom:3px;">Votre rendez-vous commence bientôt !</div>
              <div style="font-size:0.75rem;color:#4b5563;line-height:1.5;">Pensez à prendre une <strong>capture d'écran de votre visioconférence</strong> en début de séance.</div>
            </div>
          </div>
        ` : ''}
        ${booking.status === 'dispute' ? `
          <div style="background:#FEE2E2;border-bottom:1px solid #FCA5A5;padding:12px 20px;display:flex;align-items:flex-start;gap:10px;">
            <span style="font-size:1.1rem;flex-shrink:0;">⚠️</span>
            <div>
              <div style="font-size:0.82rem;font-weight:700;color:#991B1B;margin-bottom:3px;">Litige en cours</div>
              <div style="font-size:0.75rem;color:#7f1d1d;line-height:1.5;">
                Le client conteste cette séance. Répondez avant le <strong>${disputeDeadlineLabel ? formatDate(booking.dispute_deadline_freelance) : '—'}</strong>.
              </div>
            </div>
          </div>
        ` : ''}
        <div class="rdv-card-header">
          <div class="rdv-card-header-left">
            <span class="rdv-client-name">${fullName}</span>
            <span class="rdv-badge ${status.cls}">${status.label}</span>
            <span class="rdv-type-badge">${type}</span>
            ${deadlineLabel ? `<span class="rdv-deadline-badge">⏱ ${deadlineLabel}</span>` : ''}
            ${disputeDeadlineLabel ? `<span class="rdv-deadline-badge" style="background:#FEE2E2;color:#991B1B;border-color:#FCA5A5;">⚠️ ${disputeDeadlineLabel}</span>` : ''}
          </div>
        </div>
        <div class="rdv-card-body">
          <div class="rdv-info-item">
            <span class="rdv-info-label">📅 Date & heure</span>
            <span class="rdv-info-value">${dateTime}</span>
          </div>
          <div class="rdv-info-item">
            <span class="rdv-info-label">⏱️ Durée</span>
            <span class="rdv-info-value">${duration}</span>
          </div>
          <div class="rdv-info-item">
            <span class="rdv-info-label">💻 Visio</span>
            <span class="rdv-info-value rdv-visio-provider">${providerLabel(booking.booking_meeting_provider)}</span>
          </div>
        </div>
        <div class="rdv-detail-panel" id="detail-${booking.id}">
          <div class="rdv-detail-section-title">Informations client</div>
          <div class="rdv-detail-grid">
            <div class="rdv-info-item">
              <span class="rdv-info-label">📧 Email</span>
              <span class="rdv-info-value">${email}</span>
            </div>
            <div class="rdv-info-item">
              <span class="rdv-info-label">📞 Téléphone</span>
              <span class="rdv-info-value">${phone}</span>
            </div>
          </div>
          ${booking.client_note ? `<div class="rdv-detail-section-title">Note du client</div><div class="rdv-note-box">${booking.client_note}</div>` : ''}
          ${booking.dispute_message_client ? `<div class="rdv-detail-section-title">Message du client (litige)</div><div class="rdv-dispute-box">💬 ${booking.dispute_message_client}</div>` : ''}
          ${booking.reference_url ? `<div class="rdv-detail-section-title">URL de référence</div><a href="${booking.reference_url}" target="_blank" class="rdv-attachment">🔗 ${booking.reference_url}</a>` : ''}
          ${attachments.length > 0 ? `<div class="rdv-detail-section-title">Pièces jointes</div><div>${attachments.map(a => `<a href="${a.file_url}" target="_blank" class="rdv-attachment">📎 ${a.file_name || 'Fichier'}</a>`).join('')}</div>` : ''}
          <div class="rdv-detail-section-title">Visioconférence</div>
          <div class="rdv-detail-grid">
            <div class="rdv-info-item">
              <span class="rdv-info-label">Plateforme</span>
              <span class="rdv-info-value rdv-detail-provider">${providerLabel(booking.booking_meeting_provider)}</span>
            </div>
            <div class="rdv-info-item">
              <span class="rdv-info-label">Lien</span>
              <span class="rdv-info-value rdv-detail-url">
                ${booking.bookingsmeeting_url ? `<a href="${booking.bookingsmeeting_url}" target="_blank" style="color:#2563eb;">${booking.bookingsmeeting_url}</a>` : '—'}
              </span>
            </div>
          </div>
          ${booking.status === 'dispute' && !booking.dispute_message_freelance ? `
            <div class="rdv-dispute-reply">
              <div class="rdv-dispute-reply-title">🛡️ Répondre au litige</div>
              <textarea class="rdv-dispute-textarea" id="dispute-msg-${booking.id}" placeholder="Expliquez votre version des faits…"></textarea>
              <div class="rdv-proof-zone" id="proof-zone-${booking.id}" onclick="document.getElementById('proof-file-${booking.id}').click()">
                <div class="rdv-proof-zone-icon">📸</div>
                <div class="rdv-proof-zone-title">Ajouter une capture d'écran</div>
                <div class="rdv-proof-zone-sub">JPG, PNG — preuve de votre présence</div>
                <div class="rdv-proof-zone-success" id="proof-success-${booking.id}"></div>
              </div>
              <input type="file" id="proof-file-${booking.id}" style="display:none" accept=".jpg,.jpeg,.png,.webp" />
              <button class="rdv-btn rdv-btn-danger btn-submit-dispute" data-id="${booking.id}" style="width:100%;">Envoyer ma réponse</button>
            </div>
          ` : booking.dispute_message_freelance ? `
            <div class="rdv-detail-section-title">Votre réponse au litige</div>
            <div class="rdv-note-box">✅ ${booking.dispute_message_freelance}</div>
            ${booking.dispute_proof_url ? `<a href="${booking.dispute_proof_url}" target="_blank" class="rdv-attachment" style="margin-top:8px;">📸 Voir la preuve</a>` : ''}
          ` : ''}
        </div>
        <div class="rdv-card-footer">
          <button class="rdv-btn rdv-btn-secondary btn-toggle-detail">Voir le détail ↓</button>
          ${booking.status === 'hold' ? `<button class="rdv-btn rdv-btn-primary btn-confirm-rdv">✅ Confirmer le RDV</button>` : ''}
          ${['hold','confirmed'].includes(booking.status) ? `
            <button class="rdv-btn rdv-btn-secondary btn-edit-visio">🔗 Modifier la visio</button>
            <button class="rdv-btn rdv-btn-danger btn-cancel-rdv">Annuler</button>
          ` : ''}
          ${showDoneBtn ? `<button class="rdv-btn rdv-btn-success btn-done-rdv">${doneBtnLabel}</button>` : ''}
        </div>
      `;

      el.appendChild(card);

      card.querySelector('.btn-toggle-detail')?.addEventListener('click', function () {
        const panel = document.getElementById(`detail-${booking.id}`);
        panel?.classList.toggle('open');
        this.textContent = panel?.classList.contains('open') ? 'Masquer le détail ↑' : 'Voir le détail ↓';
      });
      card.querySelector('.btn-confirm-rdv')?.addEventListener('click', function () { updateStatus(booking.id, 'confirmed', this); });
      card.querySelector('.btn-edit-visio')?.addEventListener('click', () => openVisioModal(booking.id));
      card.querySelector('.btn-cancel-rdv')?.addEventListener('click', () => openCancelModal(booking.id, booking.booking_type, booking.status, fullName));
      card.querySelector('.btn-done-rdv')?.addEventListener('click', () => openDoneModal(booking.id, fullName, booking.booking_type));

      const proofFile = card.querySelector(`#proof-file-${booking.id}`);
      proofFile?.addEventListener('change', async function () {
        if (!this.files[0]) return;
        const zone = document.getElementById(`proof-zone-${booking.id}`);
        const success = document.getElementById(`proof-success-${booking.id}`);
        success.textContent = '⏳ Upload en cours...';
        zone?.classList.add('has-file');
        const formData = new FormData();
        formData.append('file', this.files[0]);
        try {
          const res = await fetch(ENDPOINT_UPLOAD, { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: formData });
          const d = await res.json();
          const url = d?.path ? 'https://xmot-l3ir-7kuj.p7.xano.io' + d.path : null;
          if (url) { success.textContent = '✅ ' + this.files[0].name; proofFile.dataset.url = url; }
          else { success.textContent = '❌ Erreur upload'; zone?.classList.remove('has-file'); }
        } catch { success.textContent = '❌ Erreur upload'; zone?.classList.remove('has-file'); }
      });

      card.querySelector('.btn-submit-dispute')?.addEventListener('click', async function () {
        const id = this.dataset.id;
        const msg = document.getElementById(`dispute-msg-${id}`)?.value?.trim();
        const proofUrl = document.getElementById(`proof-file-${id}`)?.dataset?.url || '';
        const msgEl = document.getElementById(`dispute-msg-${id}`);
        if (!msg) { if (msgEl) msgEl.style.borderColor = '#ef4444'; return; }
        if (msgEl) msgEl.style.borderColor = '#BFDBFE';
        this.disabled = true; this.textContent = '⏳ Envoi...';
        try {
          const res = await fetch(ENDPOINT_DISPUTE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ booking_id: parseInt(id), dispute_message_freelance: msg, dispute_proof_url: proofUrl })
          });
          if (res.ok) {
            const replyZone = this.closest('.rdv-dispute-reply');
            if (replyZone) replyZone.innerHTML = `<div style="font-size:0.82rem;color:#059669;font-weight:600;">✅ Votre réponse a bien été envoyée.</div>`;
          } else { alert('Erreur lors de l\'envoi.'); this.disabled = false; this.textContent = 'Envoyer ma réponse'; }
        } catch { alert('Erreur réseau.'); this.disabled = false; this.textContent = 'Envoyer ma réponse'; }
      });
    });
  }

  renderCards(upcoming,  'rdv-list-upcoming',  'upcoming');
  renderCards(past,      'rdv-list-past',       'past');
  renderCards(disputes,  'rdv-list-disputes',   'dispute');

  /* ── Tabs ── */
  document.querySelectorAll('.rdv-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.rdv-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('rdv-list-upcoming').style.display  = this.dataset.tab === 'upcoming'  ? '' : 'none';
      document.getElementById('rdv-list-past').style.display      = this.dataset.tab === 'past'      ? '' : 'none';
      document.getElementById('rdv-list-disputes').style.display  = this.dataset.tab === 'disputes'  ? '' : 'none';
    });
  });

  /* ── API ── */
  async function updateStatus(bookingId, status, triggerBtn) {
    if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.textContent = '...'; }
    try {
      const res = await fetch(ENDPOINT_STATUS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ booking_id: bookingId, status }),
      });
      if (res.ok) {
        const card = document.querySelector(`.rdv-card[data-id="${bookingId}"]`);
        if (card) {
          const s = statusLabel(status);
          const badge = card.querySelector('.rdv-badge');
          if (badge) { badge.className = `rdv-badge ${s.cls}`; badge.textContent = s.label; }
          card.querySelectorAll('.btn-confirm-rdv, .btn-cancel-rdv, .btn-edit-visio, .btn-done-rdv').forEach(b => b.remove());
          card.querySelectorAll('.rdv-deadline-badge').forEach(b => b.remove());
          if (status === 'completed' || status.startsWith('cancelled')) {
            document.getElementById('rdv-list-past')?.prepend(card);
          }
        }
        if (bookingMap[bookingId]) bookingMap[bookingId].status = status;
        updateHoldBanner();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d?.message || 'Erreur lors de la mise à jour.');
        if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = 'Confirmer le RDV'; }
      }
    } catch { alert('Erreur réseau.'); if (triggerBtn) triggerBtn.disabled = false; }
  }

  async function updateVisio(bookingId, provider, url) {
    const confirmBtn = document.getElementById('modal-visio-confirm');
    confirmBtn.disabled = true; confirmBtn.textContent = '...';
    try {
      const res = await fetch(ENDPOINT_VISIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ booking_id: bookingId, bookingsmeeting_url: url, booking_meeting_provider: provider }),
      });
      if (res.ok) {
        const card = document.querySelector(`.rdv-card[data-id="${bookingId}"]`);
        if (card) {
          const bp = card.querySelector('.rdv-visio-provider'); if (bp) bp.textContent = providerLabel(provider);
          const dp = card.querySelector('.rdv-detail-provider'); if (dp) dp.textContent = providerLabel(provider);
          const du = card.querySelector('.rdv-detail-url'); if (du) du.innerHTML = url ? `<a href="${url}" target="_blank" style="color:#2563eb;">${url}</a>` : '—';
        }
        if (bookingMap[bookingId]) { bookingMap[bookingId].booking_meeting_provider = provider; bookingMap[bookingId].bookingsmeeting_url = url; }
        closeModal('modal-visio');
      } else { const d = await res.json().catch(() => ({})); alert(d?.message || 'Erreur.'); }
    } catch { alert('Erreur réseau.'); }
    confirmBtn.disabled = false; confirmBtn.textContent = 'Enregistrer';
  }

  /* ── Modales ── */
  function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

  function openCancelModal(bookingId, type, status, name) {
    _cancelId = bookingId;
    const isCoach = type === 'coaching', isHold = status === 'hold';
    document.getElementById('modal-cancel-title').textContent = `Annuler le rendez-vous avec ${name}`;
    const textEl = document.getElementById('modal-cancel-text');
    const warningEl = document.getElementById('modal-cancel-warning');
    warningEl.className = ''; warningEl.style.display = 'none';
    if (!isCoach) {
      textEl.textContent = `Vous êtes sur le point d'annuler ce rendez-vous freelance avec ${name}.`;
      warningEl.style.display = ''; warningEl.className = 'rdv-modal-info';
      warningEl.textContent = 'ℹ️ Ce rendez-vous est gratuit pour le client, aucun remboursement n\'est nécessaire.';
    } else if (isCoach && isHold) {
      textEl.textContent = `Vous êtes sur le point d'annuler cette session coaching avec ${name}.`;
      warningEl.style.display = ''; warningEl.className = 'rdv-modal-info';
      warningEl.textContent = '✅ Ce client n\'a pas encore été débité. L\'annulation est gratuite.';
    } else {
      textEl.textContent = `Vous êtes sur le point d'annuler cette session coaching confirmée avec ${name}.`;
      warningEl.style.display = ''; warningEl.className = 'rdv-modal-warning';
      warningEl.textContent = '⚠️ Attention : ce client a déjà été débité. Il sera remboursé intégralement et les frais Stripe seront à votre charge.';
    }
    document.getElementById('modal-cancel').classList.add('active');
  }

  document.getElementById('modal-cancel-close')?.addEventListener('click',   () => closeModal('modal-cancel'));
  document.getElementById('modal-cancel-abort')?.addEventListener('click',   () => closeModal('modal-cancel'));
  document.getElementById('modal-cancel-confirm')?.addEventListener('click', async () => {
    if (!_cancelId) return;
    const btn = document.getElementById('modal-cancel-confirm');
    btn.disabled = true; btn.textContent = '...';
    await updateStatus(_cancelId, 'cancelled_by_freelancer', null);
    closeModal('modal-cancel'); btn.disabled = false; btn.textContent = "Confirmer l'annulation"; _cancelId = null;
  });

  function openVisioModal(bookingId) {
    _visioId = bookingId;
    const b = bookingMap[bookingId] || {};
    document.getElementById('modal-visio-provider').value = b.booking_meeting_provider || '';
    document.getElementById('modal-visio-url').value      = b.bookingsmeeting_url      || '';
    document.getElementById('modal-visio').classList.add('active');
  }
  document.getElementById('modal-visio-close')?.addEventListener('click', () => closeModal('modal-visio'));
  document.getElementById('modal-visio-abort')?.addEventListener('click', () => closeModal('modal-visio'));
  document.getElementById('modal-visio-confirm')?.addEventListener('click', async () => {
    if (!_visioId) return;
    const provider = document.getElementById('modal-visio-provider').value;
    const url      = document.getElementById('modal-visio-url').value.trim();
    if (!url) { document.getElementById('modal-visio-url').style.borderColor = '#ef4444'; return; }
    document.getElementById('modal-visio-url').style.borderColor = '#e8e8e4';
    await updateVisio(_visioId, provider, url); _visioId = null;
  });

  function openDoneModal(bookingId, name, type) {
    _doneId = bookingId; _doneType = type;
    const isCoach = type === 'coaching';
    document.getElementById('modal-done-text').innerHTML = isCoach
      ? `Confirmez-vous que la session coaching avec <strong>${name}</strong> a bien eu lieu ? Le client disposera de 24h pour ouvrir un litige.`
      : `Confirmez-vous que le rendez-vous avec <strong>${name}</strong> a bien eu lieu ?`;
    document.getElementById('modal-done').classList.add('active');
  }
  document.getElementById('modal-done-close')?.addEventListener('click',   () => closeModal('modal-done'));
  document.getElementById('modal-done-abort')?.addEventListener('click',   () => closeModal('modal-done'));
  document.getElementById('modal-done-confirm')?.addEventListener('click', async () => {
    if (!_doneId) return;
    const btn = document.getElementById('modal-done-confirm');
    btn.disabled = true; btn.textContent = '...';
    await updateStatus(_doneId, 'completed', null);
    closeModal('modal-done'); btn.disabled = false; btn.textContent = 'Oui, séance effectuée ✓'; _doneId = null; _doneType = null;
  });

  ['modal-cancel', 'modal-visio', 'modal-done'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', function (e) { if (e.target === this) closeModal(id); });
  });

  document.getElementById('rdv-refresh-btn')?.addEventListener('click', async function () {
    this.disabled = true; this.innerHTML = `<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="animation:rdv-spin .8s linear infinite;width:14px;height:14px;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Actualisation…`;
    try {
      const res = await fetch(REFRESH_URL, { headers: { 'Authorization': 'Bearer ' + token } });
      if (res.ok) {
        const freshData = await res.json();
        localStorage.setItem('auth', JSON.stringify(Object.assign({}, JSON.parse(localStorage.getItem('auth') || '{}'), freshData)));
        location.reload();
      }
    } catch(e) { console.error('Erreur refresh:', e); }
    this.disabled = false; this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Actualiser`;
  });


  /* ── Bouton partager profil ── */
  document.addEventListener('click', function(e) {
    if (e.target.closest('#rdv-share-profile-btn')) {
      var slug = auth && auth.freelance && auth.freelance.profile && auth.freelance.profile.slug;
      if (!slug) { alert('Slug introuvable dans votre profil.'); return; }
      var url = 'https://www.digitools-room.com/freelances/' + slug;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function() { showToast('🔗 Lien copié dans le presse-papier !'); });
      } else {
        /* Fallback ancien navigateur */
        var ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        showToast('🔗 Lien copié !');
      }
    }
    /* ── Bouton configurer disponibilités ── */
    if (e.target.closest('#rdv-goto-params-btn')) {
      /* Cherche le lien de tab Webflow "params" et simule un clic */
      var tabLink = document.querySelector('[data-w-tab="params"]') ||
                    document.querySelector('.w-tab-link:nth-child(2)');
      if (tabLink) {
        tabLink.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });

  /* ── Toast helper ── */
  function showToast(msg) {
    var existing = document.getElementById('rdv-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'rdv-toast';
    toast.textContent = msg;
    toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#111112;color:#fff;padding:10px 22px;border-radius:10px;font-family:DM Sans,sans-serif;font-size:.82rem;font-weight:500;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.2);animation:rdv-toast-in .2s ease;';
    document.body.appendChild(toast);
    var s = document.createElement('style');
    s.textContent = '@keyframes rdv-toast-in{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(s);
    setTimeout(function() { toast.style.opacity='0'; toast.style.transition='opacity .3s'; setTimeout(function(){ toast.remove(); }, 300); }, 2500);
  }

  /* Animation rotation bouton refresh */
  const spinStyle = document.createElement('style');
  spinStyle.textContent = `@keyframes rdv-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(spinStyle);
});



document.addEventListener("DOMContentLoaded", function () {
  const MSG_URL = "https://www.digitools-room.com/freelance/messagerie";
  if (!document.getElementById("contact-user-overlay")) {
    document.body.insertAdjacentHTML("beforeend", `
      <div id="contact-user-overlay" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.45);backdrop-filter:blur(4px);align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:20px;border:1.5px solid #bfdbfe;box-shadow:0 24px 64px rgba(37,99,235,0.15);width:100%;max-width:460px;margin:20px;font-family:'DM Sans',sans-serif;overflow:hidden;">
          <div style="padding:22px 26px 18px;background:#eff6ff;border-bottom:1.5px solid #bfdbfe;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:1.05rem;font-weight:700;color:#0f172a;margin-bottom:3px;">💬 Contacter le client</div>
              <div id="contact-user-subtitle" style="font-size:0.78rem;color:#94a3b8;">Envoyez votre premier message</div>
            </div>
            <button onclick="document.getElementById('contact-user-overlay').style.display='none'" style="width:32px;height:32px;border-radius:8px;border:1.5px solid #bfdbfe;background:#fff;cursor:pointer;font-size:1rem;color:#94a3b8;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>
          <div style="padding:22px 26px;display:flex;flex-direction:column;gap:14px;">
            <div>
              <label style="font-size:0.73rem;font-weight:700;color:#475569;letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:6px;">Votre message</label>
              <textarea id="contact-user-content" placeholder="Bonjour, je reviens vers vous concernant notre session…" style="width:100%;min-height:120px;padding:11px 13px;border:1.5px solid #bfdbfe;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:0.84rem;color:#0f172a;background:#f8fafc;outline:none;resize:none;line-height:1.6;" onfocus="this.style.borderColor='#2563eb';this.style.background='#fff'" onblur="this.style.borderColor='#bfdbfe';this.style.background='#f8fafc'"></textarea>
            </div>
            <div id="contact-user-error" style="display:none;font-size:0.77rem;color:#ef4444;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 12px;"></div>
            <button id="contact-user-submit" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2563eb;color:#fff;font-family:'DM Sans',sans-serif;font-size:0.86rem;font-weight:600;cursor:pointer;">Envoyer et ouvrir la discussion →</button>
            <div style="font-size:0.72rem;color:#94a3b8;text-align:center;">Vous serez redirigé vers votre messagerie après l'envoi</div>
          </div>
        </div>
      </div>
    `);
    document.getElementById("contact-user-overlay").addEventListener("click", function(e) { if (e.target === this) this.style.display = "none"; });
    document.getElementById("contact-user-submit").addEventListener("click", submitContactUser);
  }

  function injectContactBtns() {
    document.querySelectorAll(".rdv-card").forEach(card => {
      const headerLeft = card.querySelector(".rdv-card-header-left");
      if (!headerLeft || headerLeft.querySelector(".btn-contact-user")) return;
      const userId = card.dataset.userId || "";
      const clientName = card.querySelector(".rdv-client-name")?.textContent?.trim() || "ce client";
      const btn = document.createElement("button");
      btn.className = "rdv-btn rdv-btn-primary btn-contact-user";
      btn.innerHTML = "Contacter 💬";
      btn.style.cssText = "background:#2563eb;border-radius:5px;font-size:0.72rem;padding:5px 11px;cursor:pointer;";
      btn.dataset.userId = userId; btn.dataset.clientName = clientName;
      headerLeft.appendChild(btn);
      btn.addEventListener("click", () => openContactUser(btn));
    });
  }
  injectContactBtns(); setTimeout(injectContactBtns, 300); setTimeout(injectContactBtns, 800);

  function openContactUser(btn) {
    window._contactUserId = btn.dataset.userId;
    document.getElementById("contact-user-subtitle").textContent = `Envoyer un message à ${btn.dataset.clientName}`;
    document.getElementById("contact-user-content").value = "";
    document.getElementById("contact-user-error").style.display = "none";
    document.getElementById("contact-user-submit").textContent = "Envoyer et ouvrir la discussion →";
    document.getElementById("contact-user-submit").style.opacity = "1";
    document.getElementById("contact-user-submit").disabled = false;
    document.getElementById("contact-user-overlay").style.display = "flex";
  }

  async function submitContactUser() {
    const content = document.getElementById("contact-user-content").value.trim();
    const errorEl = document.getElementById("contact-user-error");
    const submitBtn = document.getElementById("contact-user-submit");
    errorEl.style.display = "none";
    if (!content) { errorEl.textContent = "Merci d'écrire un message avant d'envoyer."; errorEl.style.display = "block"; return; }
    const auth = JSON.parse(localStorage.getItem("auth") || "{}");
    const token = auth?.token || "";
    const userId = parseInt(window._contactUserId);
    const freelanceId = auth?.user?.id;
    if (!userId || !freelanceId) { errorEl.textContent = "Impossible d'identifier les participants."; errorEl.style.display = "block"; return; }
    submitBtn.textContent = "Envoi en cours…"; submitBtn.style.opacity = "0.7"; submitBtn.disabled = true;
    try {
      const res = await fetch("https://xmot-l3ir-7kuj.p7.xano.io/api:_NUnyuKi/create_direct_conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ user_id: userId, freelance_id: freelanceId, content, initiative: "freelance" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Erreur");
      if (data === "already exist" || data?.message === "already exist") {
        errorEl.innerHTML = `Vous avez déjà une conversation avec ce client. <a href="${MSG_URL}" style="color:#2563eb;font-weight:700;text-decoration:underline;">Accéder à ma messagerie →</a>`;
        errorEl.style.cssText = "display:block;font-size:0.77rem;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;";
        submitBtn.textContent = "Envoyer et ouvrir la discussion →"; submitBtn.style.opacity = "1"; submitBtn.disabled = false;
        return;
      }
      window.location.href = MSG_URL;
    } catch(err) {
      errorEl.textContent = "Une erreur est survenue, veuillez réessayer.";
      errorEl.style.cssText = "display:block;font-size:0.77rem;color:#ef4444;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 12px;";
      submitBtn.textContent = "Envoyer et ouvrir la discussion →"; submitBtn.style.opacity = "1"; submitBtn.disabled = false;
    }
  }
});
