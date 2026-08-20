/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Libre Baskerville"', 'Baskerville', 'Georgia', 'serif'],
        mono: ['"Source Code Pro"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        maroon: {
          50:  '#fdf2f5',
          100: '#fbe6ec',
          200: '#f5c2d0',
          300: '#ec8fa6',
          400: '#de5373',
          500: '#c42f52',
          600: '#a3203f',
          700: '#7a1533',  // PMS 216 approximation
          800: '#601028',
          900: '#4a0d1f',
          950: '#2e0813',
        },
        stone: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          150: '#ededed',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
      },
    },
  },
  plugins: [],
};
