/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand ──
        brand: {
          50:  '#f0f4f1',
          100: '#d6e8dd',
          200: '#a8ccbb',
          300: '#7ba897',
          400: '#4a7c59',
          500: '#2f5a3f',
          600: '#234530',
          700: '#1a3324',
          800: '#122218',
          900: '#0a110b',
        },
        // ── Neutral (warm paper) ──
        neutral: {
          50:  '#fdfcf8',
          100: '#f7f4ee',
          200: '#ece7dc',
          300: '#e0d9c8',
          400: '#c9bfae',
          500: '#a89780',
          600: '#7d6e5c',
          700: '#5a4e40',
          800: '#3a3329',
          900: '#1d1914',
        },
        // ── Semantic ──
        success: {
          50:  '#f0faf4',
          500: '#2f855a',
          600: '#276749',
        },
        warning: {
          50:  '#fffaf0',
          500: '#d69e2e',
          600: '#b7791f',
        },
        danger: {
          50:  '#fff5f5',
          500: '#e53e3e',
          600: '#c53030',
        },
        info: {
          50:  '#ebf8ff',
          500: '#3182ce',
          600: '#2b6cb0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        'xs':  ['0.75rem',   { lineHeight: '1rem' }],
        'sm':  ['0.875rem',  { lineHeight: '1.25rem' }],
        'base': ['1rem',     { lineHeight: '1.5rem' }],
        'lg':  ['1.125rem',  { lineHeight: '1.75rem' }],
        'xl':  ['1.25rem',   { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem',    { lineHeight: '2rem' }],
        '3xl': ['1.875rem',  { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem',   { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        'content': '1280px',
      },
      borderRadius: {
        'xs':  '0.25rem',
        'sm':  '0.375rem',
        'md':  '0.5rem',
        'lg':  '0.75rem',
        'xl':  '1rem',
        '2xl': '1.5rem',
        'full': '9999px',
      },
      boxShadow: {
        'xs':  '0 1px 2px 0 rgba(0,0,0,0.04)',
        'sm':  '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'md':  '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
        'lg':  '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 8px -4px rgba(0,0,0,0.04)',
        'xl':  '0 25px 50px -12px rgba(0,0,0,0.10)',
      },
      transitionDuration: {
        'fast': '100ms',
        'base': '150ms',
        'slow': '250ms',
      },
    },
  },
  plugins: [],
};