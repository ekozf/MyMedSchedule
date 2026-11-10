const { hairlineWidth } = require('nativewind/theme');

const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** "Pill Box" tokens (docs/DESIGN.md §3) — keep in sync with lib/theme.ts and global.css. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        field: c('field'),
        field2: c('field2'),
        ink: c('ink'),
        ink2: c('ink2'),
        line: c('line'),
        line2: c('line2'),
        accent: c('accent'),
        'on-accent': c('on-accent'),
        done: c('done'),
        'done-ink': c('done-ink'),
        now: c('now'),
        'now-ink': c('now-ink'),
        late: c('late'),
        danger: c('danger'),
        'danger-soft': c('danger-soft'),
        inverse: c('inverse'),
        'on-inverse': c('on-inverse'),
        backdrop: 'var(--backdrop)',
      },
      fontFamily: {
        regular: ['AtkinsonHyperlegibleNext_400Regular'],
        medium: ['AtkinsonHyperlegibleNext_500Medium'],
        semibold: ['AtkinsonHyperlegibleNext_600SemiBold'],
        bold: ['AtkinsonHyperlegibleNext_700Bold'],
        extrabold: ['AtkinsonHyperlegibleNext_800ExtraBold'],
      },
      fontSize: {
        display: ['46px', { lineHeight: '48px' }],
        title1: ['34px', { lineHeight: '38px' }],
        title2: ['28px', { lineHeight: '32px' }],
        title3: ['22px', { lineHeight: '27px' }],
        headline: ['19px', { lineHeight: '25px' }],
        body: ['18px', { lineHeight: '25px' }],
        callout: ['17px', { lineHeight: '23px' }],
        subhead: ['16px', { lineHeight: '22px' }],
        footnote: ['15px', { lineHeight: '20px' }],
        caption: ['13px', { lineHeight: '18px' }],
      },
      borderRadius: {
        card: '22px',
        group: '20px',
        field: '18px',
        button: '16px',
        tile: '14px',
        sheet: '28px',
      },
      spacing: {
        gutter: '20px',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require('tailwindcss-animate')],
};
