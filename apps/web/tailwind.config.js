/** Theme colour backed by a CSS variable holding an "r g b" triplet (see src/ui/theme/tokens.css). */
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Setting-aware design tokens.
        bg: { DEFAULT: token('bg'), deep: token('bg-deep') },
        surface: { DEFAULT: token('surface'), 2: token('surface-2') },
        inset: token('inset'),
        line: token('line'),
        frame: { DEFAULT: token('frame'), bright: token('frame-bright') },
        ink: { DEFAULT: token('ink'), muted: token('ink-muted'), faint: token('ink-faint') },
        accent: { DEFAULT: token('accent'), ink: token('accent-ink') },
        paper: { DEFAULT: token('paper'), ink: token('paper-ink'), muted: token('paper-muted') },
        hp: token('hp'),
        'temp-hp': token('temp-hp'),
        sanity: token('sanity'),
        xp: token('xp'),
        armor: token('armor'),
        success: token('success'),
        danger: token('danger'),
        warning: token('warning'),
        act: {
          action: token('act-action'),
          bonus: token('act-bonus'),
          reaction: token('act-reaction'),
          passive: token('act-passive'),
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        numeric: ['var(--font-numeric)'],
      },
      borderRadius: {
        theme: 'var(--radius)',
      },
    },
  },
  plugins: [],
};
