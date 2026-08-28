import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta escura com acento lima (identidade "Tropa Bets").
        ink: {
          950: '#070b07',
          900: '#0b110c',
          850: '#0f1710',
          800: '#131c14',
          700: '#1c2a1e',
          600: '#2a3d2c',
        },
        lime: {
          DEFAULT: '#c8f542',
          soft: '#e2ff8a',
          dark: '#9dc41f',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 32px -18px rgba(0,0,0,0.9)',
      },
    },
  },
  plugins: [],
};

export default config;
