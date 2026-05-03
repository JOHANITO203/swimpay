import { Palette, coreStyles } from './Theme.js';

export function escapeHtml(value: string | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function AppShell(params: { title: string; children: string; bodyClass?: string }): string {
  return `<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${params.title} - SwimPay</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        ${coreStyles()}

        .app-shell {
            display: flex;
            min-height: 100vh;
        }

        .main-content {
            flex: 1;
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }

        @media (max-width: 768px) {
            .main-content {
                padding: 20px;
            }
        }
    </style>
</head>
<body class="${params.bodyClass ?? ''}">
    <div class="app-shell">
        <main class="main-content">
            ${params.children}
        </main>
    </div>
</body>
</html>`;
}

export function Button(params: {
  text: string;
  variant?: 'primary' | 'secondary' | 'danger';
  id?: string;
  type?: 'button' | 'submit';
  class?: string;
  attr?: string;
}): string {
  const variantClass = params.variant ?? 'primary';
  return `
    <button
        ${params.id ? `id="${params.id}"` : ''}
        type="${params.type ?? 'button'}"
        class="btn btn-${variantClass} ${params.class ?? ''}"
        ${params.attr ?? ''}
    >
        ${params.text}
    </button>
    <style>
        .btn {
            font-family: inherit;
            font-weight: 600;
            font-size: 16px;
            padding: 12px 24px;
            border-radius: var(--radius-button);
            border: none;
            cursor: pointer;
            transition: transform 0.1s ease, opacity 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 48px;
        }
        .btn:active { transform: scale(0.98); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-primary { background-color: var(--color-teal); color: white; }
        .btn-secondary { background-color: var(--color-mint); color: var(--color-navy); }
        .btn-danger { background-color: var(--color-danger); color: white; }
    </style>
  `;
}

export function Card(params: { children: string; class?: string }): string {
  return `
    <div class="card ${params.class ?? ''}">
        ${params.children}
    </div>
    <style>
        .card {
            background: var(--color-surface);
            border-radius: var(--radius-card);
            padding: 32px;
            box-shadow: var(--shadow-soft);
            border: 1px solid var(--color-border);
        }
    </style>
  `;
}

export function StatusChip(params: { text: string | undefined; variant?: 'success' | 'warning' | 'danger' | 'info' }): string {
  const variant = params.variant ?? 'info';
  const text = params.text ?? 'unknown';
  return `
    <span class="status-chip status-${variant}">${text}</span>
    <style>
        .status-chip {
            display: inline-flex;
            padding: 4px 12px;
            border-radius: var(--radius-pill);
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .status-success { background: #E7F7EF; color: var(--color-success); }
        .status-warning { background: #FFF4E5; color: var(--color-warning); }
        .status-danger { background: #FDECEC; color: var(--color-danger); }
        .status-info { background: var(--color-mint); color: var(--color-navy); }
    </style>
  `;
}

export function PageHeader(params: { title: string; subtitle?: string; eyebrow?: string }): string {
  return `
    <header class="page-header">
        ${params.eyebrow ? `<p class="eyebrow">${params.eyebrow}</p>` : ''}
        <h1>${params.title}</h1>
        ${params.subtitle ? `<p class="subtitle">${params.subtitle}</p>` : ''}
    </header>
    <style>
        .page-header { margin-bottom: 32px; }
        .eyebrow {
            color: var(--color-cyan);
            font-weight: 700;
            text-transform: uppercase;
            font-size: 12px;
            margin-bottom: 8px;
            letter-spacing: 0.05em;
        }
        .subtitle { color: var(--color-muted); font-size: 18px; margin-top: 8px; max-width: 600px; }
    </style>
  `;
}

export function CopyField(params: { label: string; value: string; masked?: boolean }): string {
  return `
    <div class="copy-field">
        <label>${params.label}</label>
        <div class="copy-box">
            <span class="copy-value">${params.masked ? '•••• ' + params.value.slice(-4) : params.value}</span>
            <button class="copy-btn" onclick="navigator.clipboard.writeText('${params.value}')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.586-1.414l-3.242-3.242A2 2 0 0014.758 2H10a2 2 0 00-2 2z"></path><path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2"></path></svg>
            </button>
        </div>
    </div>
    <style>
        .copy-field label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--color-muted); }
        .copy-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--color-bg);
            border: 1px solid var(--color-border);
            padding: 12px 16px;
            border-radius: var(--radius-input);
        }
        .copy-value { font-family: monospace; font-size: 16px; color: var(--color-navy); }
        .copy-btn { background: none; border: none; color: var(--color-teal); cursor: pointer; padding: 4px; border-radius: 4px; }
        .copy-btn:hover { background: var(--color-mint); }
    </style>
  `;
}

export function MetricCard(params: { label: string; value: string; variant?: 'default' | 'primary' }): string {
  return `
    <div class="metric-card metric-${params.variant ?? 'default'}">
        <span class="metric-label">${params.label}</span>
        <strong class="metric-value">${params.value}</strong>
    </div>
    <style>
        .metric-card {
            background: var(--color-surface);
            border-radius: var(--radius-card);
            padding: 24px;
            border: 1px solid var(--color-border);
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .metric-label { color: var(--color-muted); font-size: 14px; font-weight: 600; }
        .metric-value { color: var(--color-navy); font-size: 24px; font-weight: 700; }
        .metric-primary { border-color: var(--color-teal); background: var(--color-mint); }
    </style>
  `;
}

export function OptionButton(params: {
  title: string;
  subtitle?: string;
  detail?: string;
  selected?: boolean;
  attr?: string;
}): string {
  return `
    <button class="option-button ${params.selected ? 'selected' : ''}" type="button" ${params.attr ?? ''}>
        <div class="option-content">
            <strong class="option-title">${params.title}</strong>
            ${params.subtitle ? `<span class="option-subtitle">${params.subtitle}</span>` : ''}
            ${params.detail ? `<small class="option-detail">${params.detail}</small>` : ''}
        </div>
        <div class="option-indicator"></div>
    </button>
    <style>
        .option-button {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 20px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-input);
            cursor: pointer;
            text-align: left;
            transition: all 0.2s ease;
        }
        .option-button:hover { border-color: var(--color-teal); background: var(--color-mint); }
        .option-button.selected {
            border-color: var(--color-teal);
            background: var(--color-mint);
            box-shadow: 0 0 0 1px var(--color-teal);
        }
        .option-content { display: flex; flex-direction: column; gap: 4px; }
        .option-title { color: var(--color-navy); font-size: 16px; }
        .option-subtitle { color: var(--color-text); font-size: 14px; }
        .option-detail { color: var(--color-muted); font-size: 12px; }
        .option-indicator {
            width: 20px;
            height: 20px;
            border: 2px solid var(--color-border);
            border-radius: 50%;
            position: relative;
        }
        .selected .option-indicator { border-color: var(--color-teal); background: var(--color-teal); }
        .selected .option-indicator::after {
            content: '';
            position: absolute;
            top: 5px;
            left: 5px;
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
        }
    </style>
  `;
}
