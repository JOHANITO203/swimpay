import { coreStyles } from './Theme.js';

export function escapeHtml(value: string | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function attr(value: string | undefined): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export function AppShell(params: { title: string; children: string; bodyClass?: string; chrome?: 'merchant' | 'checkout' | 'plain' }): string {
  const chrome = params.chrome ?? 'merchant';
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(params.title)} - SwimPay</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${coreStyles()}${layoutStyles()}${componentStyles()}</style>
</head>
<body class="${params.bodyClass ?? ''}">
  <main class="app-shell app-shell-${chrome}">
    ${params.children}
  </main>
</body>
</html>`;
}

function layoutStyles(): string {
  return `
    .app-shell {
      min-height: 100vh;
      width: 100%;
      padding: 28px;
    }

    .screen {
      position: relative;
      max-width: 980px;
      margin: 0 auto;
      overflow: hidden;
    }

    .merchant-screen {
      min-height: calc(100vh - 56px);
      padding: 34px;
      border-radius: 36px;
      background: rgba(255, 255, 255, 0.82);
      box-shadow: 0 24px 80px rgba(7, 27, 51, 0.08);
      border: 1px solid rgba(225, 232, 237, 0.82);
    }

    .merchant-screen::before {
      content: '';
      position: absolute;
      top: 118px;
      left: -8%;
      width: 116%;
      height: 110px;
      pointer-events: none;
      background:
        radial-gradient(ellipse at center, rgba(35, 199, 201, 0.16), transparent 62%),
        linear-gradient(165deg, transparent 18%, rgba(35, 199, 201, 0.15) 19%, rgba(35, 199, 201, 0.04) 46%, transparent 47%);
      opacity: 0.72;
      transform: rotate(-2deg);
    }

    .screen-content {
      position: relative;
      z-index: 1;
      max-width: 820px;
      margin: 0 auto;
    }

    .mobile-narrow {
      max-width: 760px;
    }

    .stack { display: flex; flex-direction: column; gap: 18px; }
    .stack-lg { display: flex; flex-direction: column; gap: 28px; }
    .cluster { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .split { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
    .payment-list { display: flex; flex-direction: column; gap: 14px; }
    .section-title { margin: 32px 0 16px; font-size: 24px; color: var(--color-navy); }
    .safe-note { color: var(--color-muted); font-size: 15px; display: flex; gap: 12px; align-items: center; }
    .muted { color: var(--color-muted); }

    @media (max-width: 820px) {
      .app-shell { padding: 0; }
      .merchant-screen {
        min-height: 100vh;
        border-radius: 0;
        padding: 26px 18px 92px;
        border: none;
      }
      .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .two-col { grid-template-columns: 1fr; }
      .screen-content { max-width: none; }
    }
  `;
}

export function SwimPayBrand(): string {
  return `<div class="brand" aria-label="SwimPay">
    <div class="brand-mark">S</div>
    <div class="brand-word">SwimPay</div>
  </div>
  <style>
    .brand { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 56px; }
    .brand-mark {
      width: 58px; height: 42px; border-radius: 24px;
      display: grid; place-items: center;
      color: white; font-size: 30px; font-weight: 800;
      background: linear-gradient(135deg, var(--color-cyan), var(--color-teal));
      box-shadow: 0 12px 28px rgba(35, 199, 201, 0.22);
      font-style: italic;
    }
    .brand-word { font-size: 40px; font-weight: 800; color: var(--color-navy); letter-spacing: 0; }
    @media (max-width: 600px) {
      .brand { margin-bottom: 48px; }
      .brand-word { font-size: 34px; }
      .brand-mark { width: 52px; height: 38px; font-size: 26px; }
    }
  </style>`;
}

export function PageHeader(params: { title: string; subtitle?: string; eyebrow?: string; align?: 'center' | 'left' }): string {
  const align = params.align ?? 'center';
  return `<header class="page-header page-header-${align}">
    ${params.eyebrow ? `<p class="eyebrow">${escapeHtml(params.eyebrow)}</p>` : ''}
    <h1>${escapeHtml(params.title)}</h1>
    ${params.subtitle ? `<p class="subtitle">${escapeHtml(params.subtitle)}</p>` : ''}
  </header>
  <style>
    .page-header { margin-bottom: 30px; }
    .page-header-center { text-align: center; }
    .page-header-left { text-align: left; }
    .page-header .eyebrow {
      color: var(--color-teal);
      font-weight: 800;
      text-transform: uppercase;
      font-size: 12px;
      margin: 0 0 8px;
      letter-spacing: 0.08em;
    }
    .page-header .subtitle {
      color: var(--color-muted);
      font-size: 20px;
      margin: 16px auto 0;
      max-width: 620px;
      line-height: 1.42;
    }
    .page-header-left .subtitle { margin-left: 0; }
    @media (max-width: 600px) {
      .page-header .subtitle { font-size: 18px; }
    }
  </style>`;
}

export function Button(params: {
  text: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  id?: string;
  type?: 'button' | 'submit';
  class?: string;
  attr?: string;
}): string {
  const variantClass = params.variant ?? 'primary';
  return `<button
    ${params.id ? `id="${attr(params.id)}"` : ''}
    type="${params.type ?? 'button'}"
    class="btn btn-${variantClass} ${params.class ?? ''}"
    ${params.attr ?? ''}
  >${escapeHtml(params.text)}</button>`;
}

export function Card(params: { children: string; class?: string }): string {
  return `<section class="card ${params.class ?? ''}">${params.children}</section>`;
}

export function IconBubble(params: { icon: string; tone?: 'teal' | 'success' | 'warning' | 'danger' | 'muted' }): string {
  return `<span class="icon-bubble icon-${params.tone ?? 'teal'}">${params.icon}</span>`;
}

export function StatusChip(params: { text: string | undefined; variant?: 'success' | 'warning' | 'danger' | 'info' | 'muted' }): string {
  const variant = params.variant ?? 'info';
  return `<span class="status-chip status-${variant}">${escapeHtml(params.text ?? 'En attente')}</span>`;
}

export function StatusPanel(params: { title: string; text: string; variant?: 'success' | 'warning' | 'danger' | 'info'; icon?: string }): string {
  const variant = params.variant ?? 'info';
  const icon = params.icon ?? (variant === 'success' ? '✓' : variant === 'warning' ? '!' : 'i');
  return Card({
    class: `status-panel status-panel-${variant}`,
    children: `<div class="status-panel-inner">
      ${IconBubble({ icon, tone: variant === 'info' ? 'teal' : variant })}
      <div><h3>${escapeHtml(params.title)}</h3><p>${escapeHtml(params.text)}</p></div>
    </div>`
  });
}

export function StepProgress(params: { current: number; total: number; numbered?: boolean; completeText?: string }): string {
  const items = Array.from({ length: params.total }, (_, index) => {
    const step = index + 1;
    return `<span class="step-dot ${step <= params.current ? 'active' : ''}">${params.numbered ? step : ''}</span>`;
  }).join('');
  return `<div class="step-progress">${items}</div>${params.completeText ? `<p class="step-complete">✓ ${escapeHtml(params.completeText)}</p>` : ''}`;
}

export function OptionButton(params: {
  title: string;
  subtitle?: string;
  detail?: string;
  selected?: boolean;
  attr?: string;
  icon?: string;
  square?: boolean;
}): string {
  return `<button class="option-button ${params.selected ? 'selected' : ''}" type="button" ${params.attr ?? ''}>
    ${params.icon ? IconBubble({ icon: params.icon }) : ''}
    <span class="option-content">
      <strong class="option-title">${escapeHtml(params.title)}</strong>
      ${params.subtitle ? `<span class="option-subtitle">${escapeHtml(params.subtitle)}</span>` : ''}
      ${params.detail ? `<small class="option-detail">${escapeHtml(params.detail)}</small>` : ''}
    </span>
    <span class="${params.square ? 'option-square' : 'option-indicator'}">${params.selected ? '✓' : ''}</span>
  </button>`;
}

export function MetricCard(params: { label: string; value: string; icon?: string; variant?: 'default' | 'primary' }): string {
  return `<article class="metric-card metric-${params.variant ?? 'default'}">
    ${params.icon ? IconBubble({ icon: params.icon }) : ''}
    <span class="metric-label">${escapeHtml(params.label)}</span>
    <strong class="metric-value">${escapeHtml(params.value)}</strong>
  </article>`;
}

export function CopyField(params: { label: string; value: string; masked?: boolean }): string {
  const displayValue = params.masked ? `•••• ${params.value.slice(-4)}` : params.value;
  return `<div class="copy-field">
    <label>${escapeHtml(params.label)}</label>
    <div class="copy-box">
      <span class="copy-value">${escapeHtml(displayValue)}</span>
      <button class="copy-btn" type="button" onclick="navigator.clipboard.writeText('${attr(params.value)}')" aria-label="Copier">Copier</button>
    </div>
  </div>`;
}

export function ReviewPaymentCard(params: {
  amount: string;
  bank: string;
  helper: string;
  status: string;
  action: string;
  variant?: 'warning' | 'success' | 'info' | 'danger';
}): string {
  return Card({
    class: 'review-payment-card',
    children: `<div class="review-payment-main">
      ${IconBubble({ icon: bankInitial(params.bank), tone: params.variant === 'success' ? 'success' : 'teal' })}
      <div class="review-payment-copy">
        <strong>${escapeHtml(params.amount)}</strong>
        <span>${escapeHtml(params.bank)}</span>
        <small>${escapeHtml(params.helper)}</small>
      </div>
    </div>
    <div class="review-payment-actions">
      ${StatusChip({ text: params.status, variant: params.variant ?? 'warning' })}
      ${Button({ text: params.action, variant: params.action === 'Voir' ? 'secondary' : 'primary', class: 'btn-small' })}
    </div>`
  });
}

function bankInitial(bank: string): string {
  if (bank.includes('T-Bank')) return 'T';
  if (bank.includes('Alfa')) return 'A';
  if (bank.includes('VTB')) return 'V';
  if (bank.includes('Gazprom')) return 'G';
  return 'S';
}

export function PaymentAmountBlock(params: { label: string; value: string; icon?: string }): string {
  return `<div class="detail-row">
    ${IconBubble({ icon: params.icon ?? '•' })}
    <span>${escapeHtml(params.label)}</span>
    <strong>${escapeHtml(params.value)}</strong>
  </div>`;
}

export function BottomNav(params: { active: 'home' | 'review' | 'orders' | 'more' }): string {
  const items = [
    ['home', 'Accueil', '⌂'],
    ['review', 'Revue', '▤'],
    ['orders', 'Commandes', '⌁'],
    ['more', 'Plus', '•••']
  ] as const;
  return `<nav class="bottom-nav">${items.map(([id, label, icon]) =>
    `<a class="${params.active === id ? 'active' : ''}" href="${id === 'home' ? '/merchant/dashboard' : id === 'review' ? '/merchant/review-queue' : id === 'more' ? '/merchant/settings' : '#'}"><span>${icon}</span>${label}</a>`
  ).join('')}</nav>`;
}

export function EmptyState(params: { title: string; text: string; cta?: string }): string {
  return Card({
    class: 'empty-state',
    children: `<h3>${escapeHtml(params.title)}</h3><p>${escapeHtml(params.text)}</p>${params.cta ? Button({ text: params.cta, variant: 'primary' }) : ''}`
  });
}

export function componentStyles(): string {
  return `
    .btn {
      min-height: 50px;
      border: none;
      border-radius: var(--radius-button);
      padding: 13px 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: 800;
      font-size: 16px;
      cursor: pointer;
      transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
      text-decoration: none;
    }
    .btn:active { transform: translateY(1px) scale(0.99); }
    .btn-primary {
      color: white;
      background: linear-gradient(135deg, var(--color-teal), #00698B);
      box-shadow: var(--shadow-button);
    }
    .btn-secondary {
      color: var(--color-teal);
      background: white;
      border: 1px solid rgba(0, 151, 167, 0.28);
      box-shadow: 0 8px 20px rgba(7, 27, 51, 0.04);
    }
    .btn-danger { color: white; background: var(--color-danger); }
    .btn-ghost { color: var(--color-teal); background: transparent; }
    .btn-small { min-height: 42px; padding: 10px 18px; font-size: 15px; }
    .btn-wide { width: 100%; min-height: 66px; font-size: 22px; }
    .danger-text { color: var(--color-danger); }

    .card {
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid rgba(225, 232, 237, 0.78);
      border-radius: var(--radius-card);
      padding: 24px;
      box-shadow: var(--shadow-soft);
    }

    .icon-bubble {
      width: 58px;
      height: 58px;
      flex: 0 0 58px;
      display: inline-grid;
      place-items: center;
      border-radius: 50%;
      font-weight: 800;
      color: var(--color-teal);
      background: var(--color-mint);
      font-size: 25px;
    }
    .icon-success { color: var(--color-success); background: #E7F7EF; }
    .icon-warning { color: var(--color-warning); background: #FFF4E5; }
    .icon-danger { color: var(--color-danger); background: #FDECEC; }
    .icon-muted { color: var(--color-muted); background: #F3F7F9; }

    .status-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: var(--radius-pill);
      font-size: 14px;
      font-weight: 800;
      white-space: nowrap;
    }
    .status-success { background: #DDF8ED; color: #079B55; }
    .status-warning { background: #FFF2D7; color: #C57A00; }
    .status-danger { background: #FDECEC; color: var(--color-danger); }
    .status-info { background: var(--color-mint); color: var(--color-teal); }
    .status-muted { background: #EEF4F6; color: var(--color-muted); }

    .status-panel-inner { display: flex; align-items: center; gap: 20px; }
    .status-panel h3 { font-size: 24px; margin-bottom: 4px; }
    .status-panel p { margin: 0; color: var(--color-muted); font-size: 18px; }
    .status-panel-success { border-color: rgba(34, 181, 115, 0.26); background: linear-gradient(135deg, rgba(232, 250, 248, 0.88), rgba(255,255,255,0.95)); }
    .status-panel-warning { border-color: rgba(245, 166, 35, 0.26); }
    .status-panel-danger { border-color: rgba(229, 72, 77, 0.26); }

    .option-button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 18px;
      min-height: 92px;
      padding: 18px 22px;
      border-radius: 22px;
      border: 1px solid rgba(225, 232, 237, 0.9);
      background: rgba(255,255,255,0.96);
      box-shadow: 0 10px 28px rgba(7, 27, 51, 0.05);
      cursor: pointer;
      text-align: left;
    }
    .option-button:hover, .option-button.selected {
      border-color: var(--color-teal);
      background: linear-gradient(135deg, rgba(232, 250, 248, 0.98), white);
    }
    .option-content { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .option-title { color: var(--color-navy); font-size: 22px; }
    .option-subtitle { color: var(--color-muted); font-size: 17px; }
    .option-detail { color: var(--color-muted); font-size: 14px; }
    .option-indicator, .option-square {
      width: 30px; height: 30px;
      border: 2px solid #B7C2CC;
      display: grid; place-items: center;
      color: white;
      font-weight: 900;
    }
    .option-indicator { border-radius: 50%; }
    .option-square { border-radius: 8px; }
    .selected .option-indicator, .selected .option-square { background: var(--color-teal); border-color: var(--color-teal); }

    .metric-card {
      min-height: 138px;
      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-rows: auto auto;
      column-gap: 14px;
      align-items: center;
      background: white;
      border-radius: 22px;
      border: 1px solid rgba(225,232,237,0.82);
      padding: 20px;
      box-shadow: var(--shadow-soft);
    }
    .metric-card .icon-bubble { grid-row: 1 / span 2; width: 54px; height: 54px; flex-basis: 54px; }
    .metric-label { color: var(--color-navy); font-size: 16px; font-weight: 800; }
    .metric-value { color: var(--color-navy); font-size: 38px; line-height: 1; }

    .copy-field label { display: block; color: var(--color-muted); font-weight: 700; margin-bottom: 8px; }
    .copy-box {
      display: flex; justify-content: space-between; align-items: center; gap: 12px;
      border: 1px solid rgba(225, 232, 237, 0.9);
      background: var(--color-bg);
      border-radius: var(--radius-input);
      padding: 14px 16px;
    }
    .copy-value { color: var(--color-navy); font-weight: 800; }
    .copy-btn { border: none; color: var(--color-teal); background: transparent; font-weight: 800; cursor: pointer; }

    .review-payment-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }
    .review-payment-main { display: flex; align-items: center; gap: 18px; min-width: 0; }
    .review-payment-copy { display: flex; flex-direction: column; gap: 4px; }
    .review-payment-copy strong { font-size: 34px; color: var(--color-navy); line-height: 1; }
    .review-payment-copy span { color: var(--color-navy); font-size: 21px; }
    .review-payment-copy small { color: var(--color-muted); font-size: 15px; }
    .review-payment-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 18px; }

    .detail-row {
      display: grid;
      grid-template-columns: 42px 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(225,232,237,0.9);
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-row .icon-bubble { width: 38px; height: 38px; flex-basis: 38px; font-size: 16px; }
    .detail-row span { color: var(--color-muted); font-size: 17px; }
    .detail-row strong { color: var(--color-navy); font-size: 18px; text-align: right; }

    .step-progress { display: flex; align-items: center; justify-content: center; gap: 13px; margin-top: 24px; }
    .step-dot {
      width: 14px; height: 14px; border-radius: 50%;
      background: #D6DCE2;
      color: white;
      display: grid; place-items: center;
      font-size: 14px;
      font-weight: 800;
    }
    .step-dot.active { width: 36px; height: 36px; background: var(--color-teal); }
    .step-complete { text-align: center; color: var(--color-success); font-weight: 800; }

    .bottom-nav {
      position: fixed;
      z-index: 20;
      left: 0;
      right: 0;
      bottom: 0;
      display: none;
      grid-template-columns: repeat(4, 1fr);
      background: rgba(255,255,255,0.96);
      border-top: 1px solid rgba(225,232,237,0.9);
      padding: 8px 8px 12px;
      box-shadow: 0 -12px 32px rgba(7,27,51,0.06);
    }
    .bottom-nav a {
      text-decoration: none;
      color: var(--color-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-weight: 700;
      font-size: 13px;
    }
    .bottom-nav a span { font-size: 24px; line-height: 1; }
    .bottom-nav a.active { color: var(--color-teal); }

    .empty-state { text-align: center; color: var(--color-muted); }
    .empty-state p { margin: 8px 0 18px; }
    .route-create-form { margin: -8px 0 22px; }
    .route-create-form input {
      width: 100%;
      border: 1px solid rgba(225,232,237,0.9);
      border-radius: var(--radius-input);
      padding: 14px 16px;
      color: var(--color-navy);
      background: white;
    }

    @media (max-width: 820px) {
      .bottom-nav { display: grid; }
      .review-payment-card { align-items: stretch; }
      .review-payment-actions { align-items: stretch; }
    }

    @media (max-width: 620px) {
      .status-panel-inner, .review-payment-card { flex-direction: column; align-items: flex-start; }
      .metrics-grid { gap: 12px; }
      .metric-card { min-height: 126px; padding: 16px; grid-template-columns: 1fr; }
      .metric-card .icon-bubble { display: none; }
      .metric-value { font-size: 32px; }
      .review-payment-copy strong { font-size: 30px; }
      .detail-row { grid-template-columns: 34px 1fr; }
      .detail-row strong { grid-column: 2; text-align: left; }
    }
  `;
}
