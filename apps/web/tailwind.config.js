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

        // Legacy palette of screens not yet moved to the design system.
        dark: {
          bg: '#0a0a0a',
          card: '#1a1a1a',
          hover: '#2a2a2a',
          border: '#333333',
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
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
