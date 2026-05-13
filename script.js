/* ============================================================
   LOANTRACK — SCRIPT.JS
   Complete app logic: state, UI, charts, PWA
============================================================ */

'use strict';

// ============================================================
// STATE
// ============================================================
let APP = {
  loans: [],
  settings: {
    theme: 'midnight',
    accent: '#4f8ef7',
    currency: '₹'
  }
};

const THEMES = [
  { id: 'midnight', name: 'Midnight', swatch: 'linear-gradient(135deg,#0a0f1e,#1e40af)' },
  { id: 'emerald',  name: 'Emerald',  swatch: 'linear-gradient(135deg,#071a14,#059669)' },
  { id: 'purple',   name: 'Purple',   swatch: 'linear-gradient(135deg,#0d0a1e,#7c3aed)' },
  { id: 'matte',    name: 'Matte',    swatch: 'linear-gradient(135deg,#0a0a0a,#374151)' },
  { id: 'rose',     name: 'Rose Gold',swatch: 'linear-gradient(135deg,#1a0810,#e11d48)' },
  { id: 'ocean',    name: 'Ocean',    swatch: 'linear-gradient(135deg,#020f1a,#0891b2)' }
];

const LOAN_TYPES = {
  personal:    'Personal',
  credit_card: 'Credit Card',
  debit_card:  'Debit Card',
  consumer:    'Consumer',
  vehicle:     'Vehicle',
  other:       'Other'
};

const EMI_STATUS_ICONS = {
  paid:    '✅',
  missed:  '❌',
  partial: '🔶',
  pending: '⏳'
};

let currentFilterType = 'all';
let currentSort = 'date_asc';
let searchQuery = '';
let currentDetailLoanId = null;
let monthlyChartInstance = null;
let deferredInstallPrompt = null;

// ============================================================
// STORAGE
// ============================================================
function saveData() {
  try {
    localStorage.setItem('loantrack_loans', JSON.stringify(APP.loans));
    localStorage.setItem('loantrack_settings', JSON.stringify(APP.settings));
  } catch (e) {
    showToast('⚠️ Storage full — clear some data');
  }
}

function loadData() {
  try {
    const loans = localStorage.getItem('loantrack_loans');
    const settings = localStorage.getItem('loantrack_settings');
    if (loans) APP.loans = JSON.parse(loans);
    if (settings) APP.settings = Object.assign(APP.settings, JSON.parse(settings));
  } catch (e) {
    APP.loans = [];
  }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  applySettings();
  buildThemeGrids();

  // Splash → App
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.remove();
      document.getElementById('app').classList.remove('hidden');
      renderAll();
    }, 500);
  }, 2000);

  bindEvents();
  registerServiceWorker();
});

// ============================================================
// APPLY SETTINGS
// ============================================================
function applySettings() {
  const body = document.body;
  body.setAttribute('data-theme', APP.settings.theme);

  // Apply accent
  document.documentElement.style.setProperty('--accent', APP.settings.accent);
  const rgb = hexToRgb(APP.settings.accent);
  if (rgb) document.documentElement.style.setProperty('--accent-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${rgb?.r||79},${rgb?.g||142},${rgb?.b||247},0.35)`);

  // Meta theme color
  const metaTheme = document.getElementById('meta-theme-color');
  if (metaTheme) metaTheme.setAttribute('content', APP.settings.accent);

  // Currency labels
  document.querySelectorAll('.currency-label').forEach(el => el.textContent = APP.settings.currency);

  // Sync pickers
  const ap1 = document.getElementById('accent-picker');
  const ap2 = document.getElementById('settings-accent-picker');
  if (ap1) ap1.value = APP.settings.accent;
  if (ap2) ap2.value = APP.settings.accent;

  const ci1 = document.getElementById('currency-input');
  const ci2 = document.getElementById('settings-currency-input');
  if (ci1) ci1.value = APP.settings.currency;
  if (ci2) ci2.value = APP.settings.currency;
}

function buildThemeGrids() {
  ['theme-grid', 'settings-theme-grid'].forEach(gridId => {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    THEMES.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'theme-btn' + (APP.settings.theme === t.id ? ' selected' : '');
      btn.dataset.themeId = t.id;
      btn.innerHTML = `
        <div class="theme-swatch" style="background:${t.swatch}"></div>
        <span class="theme-name">${t.name}</span>
      `;
      btn.addEventListener('click', () => {
        APP.settings.theme = t.id;
        saveData();
        applySettings();
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll(`[data-theme-id="${t.id}"]`).forEach(b => b.classList.add('selected'));
        showToast(`Theme: ${t.name}`);
      });
      grid.appendChild(btn);
    });
  });
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
  renderDashboard();
  renderLoansPage();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const activeLoans = APP.loans.filter(l => l.status !== 'completed');
  const totalBorrowed = APP.loans.reduce((s, l) => s + (l.amount || 0), 0);

  // Calc pending/paid
  let totalPaid = 0, totalPending = 0;
  let totalEMIsDone = 0, totalEMIsLeft = 0;

  APP.loans.forEach(loan => {
    const {paid, remaining, emiPaid, emiLeft} = calcLoanStats(loan);
    totalPaid += paid;
    totalPending += remaining;
    totalEMIsDone += emiPaid;
    totalEMIsLeft += emiLeft;
  });

  setText('sc-val-loans', activeLoans.length);
  setText('sc-val-borrowed', fmt(totalBorrowed));
  setText('sc-val-pending', fmt(totalPending));
  setText('sc-val-paid', fmt(totalPaid));
  setText('sp-completed', totalEMIsDone);
  setText('sp-remaining', totalEMIsLeft);

  // Monthly payment (sum of EMIs due this month)
  const thisMonth = new Date();
  const monthlyTotal = APP.loans
    .filter(l => l.status !== 'completed')
    .reduce((s, l) => s + (l.emi || 0), 0);
  setText('sp-monthly', fmt(monthlyTotal));

  // Upcoming EMI
  renderUpcomingBanner();

  // Monthly chart
  renderMonthlyChart();

  // Loan list preview
  const container = document.getElementById('dashboard-loan-list');
  const emptyEl = document.getElementById('dashboard-empty');
  if (APP.loans.length === 0) {
    container.innerHTML = '';
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
    container.innerHTML = '';
    APP.loans.slice(0, 5).forEach((loan, i) => {
      const card = buildLoanCard(loan, i);
      container.appendChild(card);
    });
  }
}

function renderUpcomingBanner() {
  const activeLoans = APP.loans.filter(l => l.status !== 'completed' && l.emi);
  if (activeLoans.length === 0) {
    setText('ub-name', 'No upcoming EMIs');
    setText('ub-amount', '—');
    setText('ub-date', '—');
    return;
  }

  // Find soonest due date
  let soonest = null;
  activeLoans.forEach(loan => {
    const dueDate = calcNextDue(loan);
    if (!soonest || dueDate < soonest.dueDate) {
      soonest = { loan, dueDate };
    }
  });

  if (soonest) {
    setText('ub-name', soonest.loan.bank || soonest.loan.nickname || 'Loan');
    setText('ub-amount', fmt(soonest.loan.emi));
    setText('ub-date', formatDate(soonest.dueDate));
  }
}

function calcNextDue(loan) {
  if (!loan.startDate) return new Date();
  const start = new Date(loan.startDate);
  const paidMonths = loan.payments?.filter(p => p.status === 'paid' || p.status === 'partial').length || 0;
  const next = new Date(start);
  next.setMonth(next.getMonth() + paidMonths);
  return next;
}

function renderMonthlyChart() {
  const canvas = document.getElementById('monthly-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Generate last 6 months of payment data
  const months = [];
  const amounts = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString('default', { month: 'short' }));
    let total = 0;
    APP.loans.forEach(loan => {
      if (!loan.startDate) return;
      const start = new Date(loan.startDate);
      loan.payments?.forEach(p => {
        if (!p.date) return;
        const pd = new Date(p.date);
        if (pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()) {
          total += p.amount || loan.emi || 0;
        }
      });
    });
    amounts.push(total);
  }

  const w = canvas.offsetWidth || 320;
  const h = 160;
  canvas.width = w;
  canvas.height = h;

  const maxAmt = Math.max(...amounts, 1);
  const padX = 8, padY = 16, barW = Math.floor((w - padX * 2) / months.length) - 8;
  const accent = APP.settings.accent;

  ctx.clearRect(0, 0, w, h);

  months.forEach((m, i) => {
    const barH = ((amounts[i] / maxAmt) * (h - padY * 2 - 24));
    const x = padX + i * ((w - padX * 2) / months.length) + 4;
    const y = h - padY - 20 - barH;

    // Bar
    const grad = ctx.createLinearGradient(0, y, 0, h - padY - 20);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, accent + '30');
    ctx.fillStyle = amounts[i] > 0 ? grad : 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]) : ctx.rect(x, y, barW, barH);
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m, x + barW / 2, h - 4);

    // Amount on top if nonzero
    if (amounts[i] > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '9px DM Sans, sans-serif';
      ctx.fillText(fmtShort(amounts[i]), x + barW / 2, y - 4);
    }
  });
}

// ============================================================
// LOANS PAGE
// ============================================================
function renderLoansPage() {
  const container = document.getElementById('loans-list');
  const emptyEl = document.getElementById('loans-empty');

  let filtered = APP.loans.filter(loan => {
    if (currentFilterType !== 'all' && loan.type !== currentFilterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (loan.bank || '').toLowerCase().includes(q) ||
             (loan.nickname || '').toLowerCase().includes(q) ||
             (loan.type || '').toLowerCase().includes(q);
    }
    return true;
  });

  filtered = sortLoans(filtered, currentSort);

  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
    container.innerHTML = '';
    filtered.forEach((loan, i) => {
      const card = buildLoanCard(loan, i);
      container.appendChild(card);
    });
  }
}

function sortLoans(loans, sortKey) {
  return [...loans].sort((a, b) => {
    const { remaining: ra } = calcLoanStats(a);
    const { remaining: rb } = calcLoanStats(b);
    switch (sortKey) {
      case 'date_asc':    return new Date(a.startDate || 0) - new Date(b.startDate || 0);
      case 'date_desc':   return new Date(b.startDate || 0) - new Date(a.startDate || 0);
      case 'pending_desc':return rb - ra;
      case 'pending_asc': return ra - rb;
      case 'progress_desc': {
        const pa = calcProgress(a), pb = calcProgress(b);
        return pb - pa;
      }
      default: return 0;
    }
  });
}

// ============================================================
// BUILD LOAN CARD
// ============================================================
function buildLoanCard(loan, index) {
  const stats = calcLoanStats(loan);
  const progress = calcProgress(loan);
  const status = getLoanStatus(loan, progress);
  const typeLabel = LOAN_TYPES[loan.type] || loan.type || 'Loan';
  const nextDue = calcNextDue(loan);

  const card = document.createElement('div');
  card.className = 'loan-card card-anim';
  card.style.animationDelay = `${index * 0.06}s`;
  card.dataset.loanId = loan.id;

  const badgeClass = status === 'Active' ? 'badge-active' : status === 'Near Completion' ? 'badge-near' : 'badge-completed';

  card.innerHTML = `
    <div class="lc-header">
      <div class="lc-header-left">
        <div class="lc-bank">${escHtml(loan.bank || loan.nickname || 'Unnamed Loan')}</div>
        ${loan.nickname && loan.bank ? `<div class="lc-nick">${escHtml(loan.nickname)}</div>` : ''}
      </div>
      <div class="lc-badges">
        <span class="badge badge-type">${typeLabel}</span>
        <span class="badge ${badgeClass}">${status}</span>
      </div>
    </div>
    <div class="lc-stats">
      <div class="lcs-item">
        <span class="lcs-label">EMI</span>
        <span class="lcs-val">${fmt(loan.emi)}</span>
      </div>
      <div class="lcs-item">
        <span class="lcs-label">Paid</span>
        <span class="lcs-val">${fmt(stats.paid)}</span>
      </div>
      <div class="lcs-item">
        <span class="lcs-label">Pending</span>
        <span class="lcs-val">${fmt(stats.remaining)}</span>
      </div>
    </div>
    <div class="lc-progress-wrap">
      <div class="progress-header">
        <span>${stats.emiPaid} / ${loan.tenure || '?'} EMIs</span>
        <span class="progress-pct">${Math.round(progress)}%</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width:${progress}%"></div>
      </div>
    </div>
    <div class="lc-footer">
      <div class="lc-emi-due">Next: <strong>${formatDate(nextDue)}</strong></div>
      <div class="lc-actions">
        <button class="lc-action-btn secondary" data-action="edit" data-id="${loan.id}">Edit</button>
        <button class="lc-action-btn primary" data-action="detail" data-id="${loan.id}">Details</button>
      </div>
    </div>
  `;

  card.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'edit') openLoanModal(id);
      if (action === 'detail') openDetailModal(id);
    });
  });

  card.addEventListener('click', () => openDetailModal(loan.id));
  return card;
}

// ============================================================
// LOAN CALCULATIONS
// ============================================================
function calcLoanStats(loan) {
  const tenure = loan.tenure || 0;
  const emi = loan.emi || 0;
  const amount = loan.amount || 0;
  const payments = loan.payments || [];

  const emiPaid = payments.filter(p => p.status === 'paid' || p.status === 'partial').length;
  const emiLeft = Math.max(0, tenure - emiPaid);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || emi || 0), 0);
  const totalRepayment = emi * tenure || amount;
  const remaining = Math.max(0, totalRepayment - totalPaid);

  return { emiPaid, emiLeft, paid: totalPaid, remaining, totalRepayment };
}

function calcProgress(loan) {
  const tenure = loan.tenure || 1;
  const payments = loan.payments || [];
  const paid = payments.filter(p => p.status === 'paid' || p.status === 'partial').length;
  return Math.min(100, (paid / tenure) * 100);
}

function getLoanStatus(loan, progress) {
  if (progress >= 100) return 'Completed';
  if (progress >= 75) return 'Near Completion';
  return 'Active';
}

function calcEMI(principal, rate, tenure) {
  if (!principal || !tenure) return 0;
  if (!rate) return principal / tenure;
  const r = rate / 12 / 100;
  return principal * r * Math.pow(1 + r, tenure) / (Math.pow(1 + r, tenure) - 1);
}

// ============================================================
// DETAIL MODAL
// ============================================================
function openDetailModal(loanId) {
  const loan = APP.loans.find(l => l.id === loanId);
  if (!loan) return;
  currentDetailLoanId = loanId;

  const stats = calcLoanStats(loan);
  const progress = calcProgress(loan);
  const status = getLoanStatus(loan, progress);
  const typeLabel = LOAN_TYPES[loan.type] || 'Loan';
  const tenure = loan.tenure || 0;

  document.getElementById('detail-modal-title').textContent = loan.bank || loan.nickname || 'Loan';

  const body = document.getElementById('detail-modal-body');
  const totalRepayment = stats.totalRepayment;
  const totalInterest = Math.max(0, totalRepayment - (loan.amount || 0));

  // Build payment grid
  let emiGrid = '';
  const months = Math.max(tenure, loan.payments?.length || 0);
  for (let i = 0; i < months; i++) {
    const p = loan.payments?.[i];
    const statusClass = p ? p.status : 'pending';
    const icon = p ? (EMI_STATUS_ICONS[p.status] || '⏳') : '⏳';
    const startDate = loan.startDate ? new Date(loan.startDate) : new Date();
    const mDate = new Date(startDate);
    mDate.setMonth(mDate.getMonth() + i);
    const mLabel = mDate.toLocaleString('default', { month: 'short', year: '2-digit' });
    const amt = p?.amount ? fmtShort(p.amount) : '';
    emiGrid += `
      <div class="emi-month-chip ${statusClass}" data-month-index="${i}" data-loan-id="${loanId}">
        <span class="emc-month">${mLabel}</span>
        <span class="emc-icon">${icon}</span>
        ${amt ? `<span class="emc-amount">${amt}</span>` : ''}
      </div>
    `;
  }

  body.innerHTML = `
    <div class="detail-hero">
      <div class="detail-bank">${escHtml(loan.bank || loan.nickname || 'Loan')}</div>
      ${loan.nickname && loan.bank ? `<div class="detail-nick">${escHtml(loan.nickname)}</div>` : ''}
      <div class="detail-amount">${fmt(loan.amount)}</div>
      <div class="detail-sub">${typeLabel} · ${tenure} months</div>
    </div>

    <div class="detail-progress-wrap">
      <div class="detail-progress-pct">${Math.round(progress)}% Complete</div>
      <div class="detail-progress-bg">
        <div class="detail-progress-fill" style="width:${progress}%"></div>
      </div>
    </div>

    <div class="detail-stats-grid">
      <div class="dsg-item">
        <div class="dsg-label">EMI Amount</div>
        <div class="dsg-val">${fmt(loan.emi)}</div>
      </div>
      <div class="dsg-item">
        <div class="dsg-label">Interest Rate</div>
        <div class="dsg-val">${loan.rate ? loan.rate + '%' : '—'}</div>
      </div>
      <div class="dsg-item">
        <div class="dsg-label">Amount Paid</div>
        <div class="dsg-val" style="color:var(--green)">${fmt(stats.paid)}</div>
      </div>
      <div class="dsg-item">
        <div class="dsg-label">Pending</div>
        <div class="dsg-val" style="color:var(--yellow)">${fmt(stats.remaining)}</div>
      </div>
      <div class="dsg-item">
        <div class="dsg-label">EMIs Done</div>
        <div class="dsg-val">${stats.emiPaid} / ${tenure}</div>
      </div>
      <div class="dsg-item">
        <div class="dsg-label">EMIs Left</div>
        <div class="dsg-val">${stats.emiLeft}</div>
      </div>
      <div class="dsg-item">
        <div class="dsg-label">Total Repayment</div>
        <div class="dsg-val">${fmt(totalRepayment)}</div>
      </div>
      <div class="dsg-item">
        <div class="dsg-label">Total Interest</div>
        <div class="dsg-val" style="color:var(--orange)">${fmt(totalInterest)}</div>
      </div>
    </div>

    ${loan.startDate ? `
    <div class="dsg-item" style="margin-bottom:12px;">
      <div class="dsg-label">Start Date</div>
      <div class="dsg-val">${formatDate(new Date(loan.startDate))}</div>
    </div>` : ''}

    ${loan.notes ? `
    <div class="dsg-item" style="margin-bottom:16px;">
      <div class="dsg-label">Notes</div>
      <div class="dsg-val" style="font-weight:400;font-size:14px;color:var(--text-secondary)">${escHtml(loan.notes)}</div>
    </div>` : ''}

    <div class="detail-emi-section">
      <div class="detail-emi-header">
        <span class="detail-emi-title">Monthly EMIs</span>
        <button class="detail-emi-add-btn" id="detail-add-emi">+ Mark EMI</button>
      </div>
      <div class="emi-months-grid">${emiGrid}</div>
    </div>

    <button class="danger-btn" id="detail-delete-btn">Delete Loan</button>
  `;

  // Bind EMI chip clicks
  body.querySelectorAll('.emi-month-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      openEmiModal(chip.dataset.loanId, parseInt(chip.dataset.monthIndex));
    });
  });

  document.getElementById('detail-add-emi')?.addEventListener('click', () => {
    const nextUnpaid = (loan.payments || []).length;
    openEmiModal(loanId, nextUnpaid);
  });

  document.getElementById('detail-delete-btn')?.addEventListener('click', () => {
    if (confirm('Delete this loan? This cannot be undone.')) {
      APP.loans = APP.loans.filter(l => l.id !== loanId);
      saveData();
      closeModal('detail-modal-backdrop');
      renderAll();
      showToast('Loan deleted');
    }
  });

  document.getElementById('detail-edit-btn').onclick = () => {
    closeModal('detail-modal-backdrop');
    openLoanModal(loanId);
  };

  showModal('detail-modal-backdrop');
}

// ============================================================
// LOAN MODAL (ADD / EDIT)
// ============================================================
function openLoanModal(loanId = null) {
  const isEdit = !!loanId;
  const loan = isEdit ? APP.loans.find(l => l.id === loanId) : null;

  document.getElementById('loan-modal-title').textContent = isEdit ? 'Edit Loan' : 'Add Loan';
  document.getElementById('lf-id').value = loanId || '';
  document.getElementById('lf-bank').value = loan?.bank || '';
  document.getElementById('lf-nickname').value = loan?.nickname || '';
  document.getElementById('lf-type').value = loan?.type || 'personal';
  document.getElementById('lf-amount').value = loan?.amount || '';
  document.getElementById('lf-emi').value = loan?.emi || '';
  document.getElementById('lf-rate').value = loan?.rate || '';
  document.getElementById('lf-tenure').value = loan?.tenure || '';
  document.getElementById('lf-start').value = loan?.startDate || '';
  document.getElementById('lf-notes').value = loan?.notes || '';

  const editSection = document.getElementById('edit-emi-section');
  if (isEdit) {
    editSection.style.display = 'block';
    document.getElementById('lf-months-paid').value = loan?.payments?.filter(p => p.status === 'paid' || p.status === 'partial').length || 0;
  } else {
    editSection.style.display = 'none';
  }

  updateCalcBox();
  showModal('loan-modal-backdrop');
}

function updateCalcBox() {
  const amount = parseFloat(document.getElementById('lf-amount').value) || 0;
  const rate = parseFloat(document.getElementById('lf-rate').value) || 0;
  const tenure = parseInt(document.getElementById('lf-tenure').value) || 0;
  const manualEmi = parseFloat(document.getElementById('lf-emi').value) || 0;

  const emi = manualEmi || calcEMI(amount, rate, tenure);
  const total = emi * tenure;
  const interest = Math.max(0, total - amount);

  const cur = APP.settings.currency;
  setText('calc-emi', emi ? `${cur}${emi.toFixed(0)}` : '—');
  setText('calc-total', total ? `${cur}${total.toFixed(0)}` : '—');
  setText('calc-interest', interest ? `${cur}${interest.toFixed(0)}` : '—');
}

function saveLoanModal() {
  const id = document.getElementById('lf-id').value;
  const isEdit = !!id;

  const bank = document.getElementById('lf-bank').value.trim();
  const nickname = document.getElementById('lf-nickname').value.trim();
  const type = document.getElementById('lf-type').value;
  const amount = parseFloat(document.getElementById('lf-amount').value) || 0;
  const emi = parseFloat(document.getElementById('lf-emi').value) || 0;
  const rate = parseFloat(document.getElementById('lf-rate').value) || 0;
  const tenure = parseInt(document.getElementById('lf-tenure').value) || 0;
  const startDate = document.getElementById('lf-start').value;
  const notes = document.getElementById('lf-notes').value.trim();

  if (!bank && !nickname) {
    showToast('Please enter a bank name or nickname');
    return;
  }

  if (isEdit) {
    const loan = APP.loans.find(l => l.id === id);
    if (loan) {
      loan.bank = bank;
      loan.nickname = nickname;
      loan.type = type;
      loan.amount = amount;
      loan.emi = emi;
      loan.rate = rate;
      loan.tenure = tenure;
      loan.startDate = startDate;
      loan.notes = notes;

      // Sync months paid
      const monthsPaid = parseInt(document.getElementById('lf-months-paid').value) || 0;
      if (!loan.payments) loan.payments = [];
      // Backfill if needed
      while (loan.payments.length < monthsPaid) {
        const idx = loan.payments.length;
        const pDate = startDate ? new Date(startDate) : new Date();
        pDate.setMonth(pDate.getMonth() + idx);
        loan.payments.push({ status: 'paid', amount: emi, date: pDate.toISOString().slice(0, 10), note: '' });
      }

      showToast('Loan updated ✓');
    }
  } else {
    const loan = {
      id: uid(),
      bank, nickname, type, amount, emi, rate, tenure, startDate, notes,
      payments: [],
      createdAt: new Date().toISOString()
    };
    APP.loans.push(loan);
    showToast('Loan added ✓');
  }

  saveData();
  closeModal('loan-modal-backdrop');
  renderAll();

  // Check for completion
  checkCompletion();
}

// ============================================================
// EMI MODAL
// ============================================================
function openEmiModal(loanId, monthIndex) {
  const loan = APP.loans.find(l => l.id === loanId);
  if (!loan) return;

  const existing = loan.payments?.[monthIndex];
  const startDate = loan.startDate ? new Date(loan.startDate) : new Date();
  const mDate = new Date(startDate);
  mDate.setMonth(mDate.getMonth() + monthIndex);
  const mLabel = mDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  document.getElementById('emi-modal-title').textContent = mLabel;
  document.getElementById('emf-loan-id').value = loanId;
  document.getElementById('emf-month-index').value = monthIndex;
  document.getElementById('emf-status').value = existing?.status || 'paid';
  document.getElementById('emf-amount').value = existing?.amount || loan.emi || '';
  document.getElementById('emf-date').value = existing?.date || mDate.toISOString().slice(0, 10);
  document.getElementById('emf-note').value = existing?.note || '';

  showModal('emi-modal-backdrop');
}

function saveEmiModal() {
  const loanId = document.getElementById('emf-loan-id').value;
  const monthIndex = parseInt(document.getElementById('emf-month-index').value);
  const status = document.getElementById('emf-status').value;
  const amount = parseFloat(document.getElementById('emf-amount').value) || 0;
  const date = document.getElementById('emf-date').value;
  const note = document.getElementById('emf-note').value.trim();

  const loan = APP.loans.find(l => l.id === loanId);
  if (!loan) return;
  if (!loan.payments) loan.payments = [];

  // Fill gaps
  while (loan.payments.length <= monthIndex) {
    loan.payments.push(null);
  }
  loan.payments[monthIndex] = { status, amount, date, note };

  saveData();
  closeModal('emi-modal-backdrop');
  showToast(`EMI marked as ${status}`);

  // Check completion
  const progress = calcProgress(loan);
  if (progress >= 100) {
    showCelebration(loan);
  } else {
    // Reopen detail to refresh
    if (currentDetailLoanId === loanId) {
      openDetailModal(loanId);
    }
  }

  renderAll();
}

// ============================================================
// HISTORY PAGE
// ============================================================
function renderHistoryPage(loanId) {
  const container = document.getElementById('history-timeline');
  const emptyEl = document.getElementById('history-empty');

  if (!loanId) {
    container.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  const loan = APP.loans.find(l => l.id === loanId);
  if (!loan || !loan.payments || loan.payments.length === 0) {
    container.innerHTML = '';
    emptyEl.classList.remove('hidden');
    emptyEl.querySelector('.es-title').textContent = 'No payments recorded';
    emptyEl.querySelector('.es-sub').textContent = 'Mark EMIs to see history';
    return;
  }

  emptyEl.classList.add('hidden');
  container.innerHTML = '';

  const startDate = loan.startDate ? new Date(loan.startDate) : new Date();

  loan.payments.forEach((p, i) => {
    if (!p) return;
    const mDate = new Date(startDate);
    mDate.setMonth(mDate.getMonth() + i);
    const mLabel = mDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const icon = EMI_STATUS_ICONS[p.status] || '⏳';

    const el = document.createElement('div');
    el.className = 'timeline-month';
    el.style.animationDelay = `${i * 0.05}s`;
    el.innerHTML = `
      <div class="tm-dot-wrap">
        <div class="tm-dot ${p.status}">${icon}</div>
      </div>
      <div class="tm-content">
        <div class="tm-month-label">${mLabel}</div>
        <div class="tm-amount">${fmt(p.amount || loan.emi)}</div>
        <div class="tm-meta">
          ${p.date ? `<span>📅 ${formatDate(new Date(p.date))}</span>` : ''}
          <span>${p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span>
        </div>
        ${p.note ? `<div class="tm-note">"${escHtml(p.note)}"</div>` : ''}
        <button class="tm-edit-btn" data-loan-id="${loan.id}" data-month-index="${i}">Edit</button>
      </div>
    `;
    el.querySelector('.tm-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openEmiModal(e.target.dataset.loanId, parseInt(e.target.dataset.monthIndex));
    });
    container.appendChild(el);
  });
}

function populateHistorySelect() {
  const sel = document.getElementById('history-loan-select');
  const current = sel.value;
  sel.innerHTML = '<option value="">Select a Loan…</option>';
  APP.loans.forEach(loan => {
    const opt = document.createElement('option');
    opt.value = loan.id;
    opt.textContent = loan.bank || loan.nickname || 'Unnamed Loan';
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

// ============================================================
// BACKUP / RESTORE / EXPORT
// ============================================================
function backupData() {
  const data = JSON.stringify({ loans: APP.loans, settings: APP.settings, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loantrack-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Backup downloaded ✓');
}

function restoreData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.loans) {
        APP.loans = parsed.loans;
        if (parsed.settings) APP.settings = Object.assign(APP.settings, parsed.settings);
        saveData();
        applySettings();
        renderAll();
        showToast('Restored successfully ✓');
      } else {
        showToast('Invalid backup file');
      }
    } catch {
      showToast('Failed to parse backup');
    }
  };
  reader.readAsText(file);
}

function exportMonthlySummary() {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  let txt = `LoanTrack — Monthly Summary\n`;
  txt += `${month}\n`;
  txt += `${'='.repeat(40)}\n\n`;

  APP.loans.forEach(loan => {
    const stats = calcLoanStats(loan);
    const progress = Math.round(calcProgress(loan));
    txt += `${loan.bank || loan.nickname || 'Loan'}\n`;
    txt += `  Type: ${LOAN_TYPES[loan.type] || loan.type}\n`;
    txt += `  EMI: ${fmt(loan.emi)}\n`;
    txt += `  Progress: ${progress}% (${stats.emiPaid}/${loan.tenure} EMIs)\n`;
    txt += `  Paid: ${fmt(stats.paid)} | Pending: ${fmt(stats.remaining)}\n\n`;
  });

  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loantrack-summary-${now.toISOString().slice(0,7)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Summary exported ✓');
}

// ============================================================
// CELEBRATION
// ============================================================
function showCelebration(loan) {
  const cel = document.getElementById('celebration');
  document.getElementById('celebration-name').textContent = loan.bank || loan.nickname || 'Loan';
  cel.classList.remove('hidden');
  startConfetti();
}

function checkCompletion() {
  APP.loans.forEach(loan => {
    const progress = calcProgress(loan);
    if (progress >= 100 && loan.status !== 'celebrated') {
      loan.status = 'celebrated';
      saveData();
      showCelebration(loan);
    }
  });
}

function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#4f8ef7','#34d399','#fbbf24','#f87171','#a78bfa','#fb7185'];
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    w: Math.random() * 8 + 4,
    h: Math.random() * 12 + 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 3 + 2,
    rot: Math.random() * 360,
    vrot: (Math.random() - 0.5) * 6
  }));

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frame = requestAnimationFrame(draw);
  }
  draw();

  setTimeout(() => {
    cancelAnimationFrame(frame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 4000);
}

// ============================================================
// MODAL HELPERS
// ============================================================
function showModal(backdropId) {
  document.getElementById(backdropId).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal(backdropId) {
  document.getElementById(backdropId).classList.add('hidden');
  document.body.style.overflow = '';
}

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2500);
}

// ============================================================
// BIND EVENTS
// ============================================================
function bindEvents() {
  // Bottom nav
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      switchPage(page);
    });
  });

  // FAB
  document.getElementById('add-loan-fab').addEventListener('click', () => openLoanModal());

  // Loan modal save
  document.getElementById('loan-modal-save').addEventListener('click', saveLoanModal);
  document.getElementById('loan-modal-close').addEventListener('click', () => closeModal('loan-modal-backdrop'));
  document.getElementById('loan-modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('loan-modal-backdrop');
  });

  // Detail modal close
  document.getElementById('detail-modal-close').addEventListener('click', () => closeModal('detail-modal-backdrop'));
  document.getElementById('detail-modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('detail-modal-backdrop');
  });

  // EMI modal
  document.getElementById('emi-modal-save').addEventListener('click', saveEmiModal);
  document.getElementById('emi-modal-close').addEventListener('click', () => closeModal('emi-modal-backdrop'));
  document.getElementById('emi-modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('emi-modal-backdrop');
  });

  // Settings modal
  document.getElementById('settings-btn').addEventListener('click', () => showModal('settings-modal-backdrop'));
  document.getElementById('settings-modal-close').addEventListener('click', () => closeModal('settings-modal-backdrop'));
  document.getElementById('settings-modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('settings-modal-backdrop');
  });

  // Calc inputs
  ['lf-amount','lf-rate','lf-tenure','lf-emi'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCalcBox);
  });

  // Search
  document.getElementById('search-btn').addEventListener('click', () => {
    const wrap = document.getElementById('search-bar-wrap');
    wrap.classList.toggle('hidden');
    if (!wrap.classList.contains('hidden')) {
      document.getElementById('search-input').focus();
    }
  });
  document.getElementById('search-close-btn').addEventListener('click', () => {
    document.getElementById('search-bar-wrap').classList.add('hidden');
    searchQuery = '';
    renderLoansPage();
  });
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderLoansPage();
    if (document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();
  });

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilterType = chip.dataset.filter;
      renderLoansPage();
    });
  });

  // Sort
  document.getElementById('sort-select').addEventListener('change', e => {
    currentSort = e.target.value;
    renderLoansPage();
  });

  // History loan select
  document.getElementById('history-loan-select').addEventListener('change', e => {
    renderHistoryPage(e.target.value);
  });

  // More page
  document.getElementById('backup-btn').addEventListener('click', backupData);
  document.getElementById('restore-btn').addEventListener('click', () => {
    document.getElementById('restore-input').click();
  });
  document.getElementById('restore-input').addEventListener('change', e => {
    if (e.target.files[0]) restoreData(e.target.files[0]);
  });
  document.getElementById('export-btn').addEventListener('click', exportMonthlySummary);

  // Settings theme / accent / currency
  document.getElementById('settings-accent-picker').addEventListener('input', e => {
    APP.settings.accent = e.target.value;
    saveData();
    applySettings();
  });
  document.getElementById('accent-picker').addEventListener('input', e => {
    APP.settings.accent = e.target.value;
    saveData();
    applySettings();
  });
  document.getElementById('settings-currency-input').addEventListener('input', e => {
    APP.settings.currency = e.target.value || '₹';
    saveData();
    applySettings();
  });
  document.getElementById('currency-input').addEventListener('input', e => {
    APP.settings.currency = e.target.value || '₹';
    saveData();
    applySettings();
  });

  // Celebration close
  document.getElementById('celebration-close').addEventListener('click', () => {
    document.getElementById('celebration').classList.add('hidden');
  });

  // Install banner
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('install-banner');
    if (!localStorage.getItem('install_dismissed')) {
      banner.classList.remove('hidden');
    }
  });
  document.getElementById('install-btn').addEventListener('click', () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(() => {
        deferredInstallPrompt = null;
        document.getElementById('install-banner').classList.add('hidden');
      });
    }
  });
  document.getElementById('install-dismiss').addEventListener('click', () => {
    document.getElementById('install-banner').classList.add('hidden');
    localStorage.setItem('install_dismissed', '1');
  });

  // Resize → re-render chart
  window.addEventListener('resize', () => {
    if (document.getElementById('page-dashboard').classList.contains('active')) {
      renderMonthlyChart();
    }
  });

  // Swipe to dismiss modals (basic)
  setupSwipeToDismiss('loan-modal', 'loan-modal-backdrop');
  setupSwipeToDismiss('detail-modal', 'detail-modal-backdrop');
  setupSwipeToDismiss('emi-modal', 'emi-modal-backdrop');
  setupSwipeToDismiss('settings-modal', 'settings-modal-backdrop');
}

// ============================================================
// PAGE SWITCHING
// ============================================================
function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${pageId}`)?.classList.add('active');
  document.querySelector(`.nav-btn[data-page="${pageId}"]`)?.classList.add('active');
  document.getElementById('page-title').textContent = {
    dashboard: 'Dashboard',
    loans: 'My Loans',
    history: 'History',
    more: 'More'
  }[pageId] || 'LoanTrack';

  if (pageId === 'history') {
    populateHistorySelect();
    const sel = document.getElementById('history-loan-select');
    if (sel.value) renderHistoryPage(sel.value);
  }
  if (pageId === 'dashboard') renderMonthlyChart();
}

// ============================================================
// SWIPE TO DISMISS
// ============================================================
function setupSwipeToDismiss(modalId, backdropId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  let startY = 0, currentY = 0;
  modal.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  modal.addEventListener('touchmove', e => {
    currentY = e.touches[0].clientY;
    const dy = currentY - startY;
    if (dy > 0) modal.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  modal.addEventListener('touchend', () => {
    const dy = currentY - startY;
    if (dy > 100) {
      modal.style.transform = '';
      closeModal(backdropId);
    } else {
      modal.style.transform = '';
    }
    startY = 0; currentY = 0;
  });
}

// ============================================================
// SERVICE WORKER
// ============================================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

// ============================================================
// UTILITIES
// ============================================================
function uid() {
  return 'lt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fmt(val) {
  if (val === null || val === undefined || val === '') return '—';
  const n = parseFloat(val) || 0;
  const cur = APP.settings.currency;
  if (n >= 1e7) return `${cur}${(n/1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `${cur}${(n/1e5).toFixed(2)}L`;
  if (n >= 1e3) return `${cur}${n.toLocaleString('en-IN')}`;
  return `${cur}${n}`;
}

function fmtShort(val) {
  const n = parseFloat(val) || 0;
  const cur = APP.settings.currency;
  if (n >= 1e7) return `${cur}${(n/1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${cur}${(n/1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${cur}${(n/1000).toFixed(0)}k`;
  return `${cur}${n}`;
}

function formatDate(date) {
  if (!date || isNaN(date)) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
