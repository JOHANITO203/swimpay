export const Palette = {
  deepNavy: '#071B33',
  teal: '#0097A7',
  cyan: '#23C7C9',
  mintLight: '#E8FAF8',
  surface: '#FFFFFF',
  background: '#F7FBFC',
  warning: '#F5A623',
  success: '#22B573',
  danger: '#E5484D',
  mutedText: '#6B7C93',
  text: '#172026',
  border: '#E1E8ED',
};

export const Radii = {
  card: '24px',
  button: '18px',
  pill: '999px',
  input: '12px',
};

export function coreStyles(): string {
  return `
    :root {
      --color-navy: ${Palette.deepNavy};
      --color-teal: ${Palette.teal};
      --color-cyan: ${Palette.cyan};
      --color-mint: ${Palette.mintLight};
      --color-surface: ${Palette.surface};
      --color-bg: ${Palette.background};
      --color-warning: ${Palette.warning};
      --color-success: ${Palette.success};
      --color-danger: ${Palette.danger};
      --color-muted: ${Palette.mutedText};
      --color-text: ${Palette.text};
      --color-border: ${Palette.border};

      --radius-card: ${Radii.card};
      --radius-button: ${Radii.button};
      --radius-pill: ${Radii.pill};
      --radius-input: ${Radii.input};

      --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.05);
      --shadow-medium: 0 8px 30px rgba(7, 27, 51, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: var(--color-bg);
      color: var(--color-text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    h1, h2, h3 {
      color: var(--color-navy);
      margin: 0;
      font-weight: 700;
    }

    h1 { font-size: 32px; letter-spacing: -0.02em; }
    h2 { font-size: 24px; }
    h3 { font-size: 18px; }

    .text-muted { color: var(--color-muted); }
    .text-small { font-size: 14px; }

    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .gap-4 { gap: 16px; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }

    @media (max-width: 600px) {
      h1 { font-size: 28px; }
    }
  `;
}
