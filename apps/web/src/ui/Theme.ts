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
  card: '28px',
  button: '22px',
  pill: '999px',
  input: '18px',
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

      --shadow-soft: 0 12px 34px rgba(7, 27, 51, 0.07);
      --shadow-medium: 0 18px 44px rgba(7, 27, 51, 0.11);
      --shadow-button: 0 12px 24px rgba(0, 151, 167, 0.24);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: var(--color-bg);
      background-image:
        radial-gradient(circle at 15% 8%, rgba(35, 199, 201, 0.12), transparent 28%),
        linear-gradient(180deg, #FFFFFF 0%, var(--color-bg) 42%, #FFFFFF 100%);
      color: var(--color-text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    h1, h2, h3 {
      color: var(--color-navy);
      margin: 0;
      font-weight: 700;
    }

    h1 { font-size: 44px; letter-spacing: 0; line-height: 1.08; }
    h2 { font-size: 24px; }
    h3 { font-size: 18px; }

    .text-muted { color: var(--color-muted); }
    .text-small { font-size: 14px; }

    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .gap-4 { gap: 16px; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .grid { display: grid; }

    a { color: inherit; }
    button, input, select, textarea { font: inherit; }

    @media (max-width: 600px) {
      h1 { font-size: 34px; }
    }
  `;
}
