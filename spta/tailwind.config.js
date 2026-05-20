/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './config/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './styles/**/*.css',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--md-sys-color-primary)',
        onPrimary: 'var(--md-sys-color-on-primary)',
        primaryContainer: 'var(--md-sys-color-primary-container)',
        onPrimaryContainer: 'var(--md-sys-color-on-primary-container)',
        secondary: 'var(--md-sys-color-secondary)',
        surface: 'var(--md-sys-color-surface)',
        surfaceContainer: 'var(--md-sys-color-surface-container)',
        outline: 'var(--md-sys-color-outline)',
        background: 'var(--md-sys-color-background)',
      },
      borderRadius: {
        'm3-sm': '8px',
        'm3-md': '12px',
        'm3-lg': '16px',
        'm3-xl': '28px',
        'm3-full': '9999px',
      },
      fontFamily: {
        sans: ['Segoe UI', 'sans-serif'],
        display: ['Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'elevation-1': '0px 2px 8px 0px rgba(0, 0, 0, 0.05)',
        'elevation-2': '0px 4px 16px 0px rgba(0, 0, 0, 0.08)',
        'elevation-3': '0px 8px 24px 0px rgba(0, 0, 0, 0.12)',
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
        glow: '0 0 20px rgba(60, 91, 169, 0.15)',
      },
      animation: {
        blob: 'blob 7s infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        mesh: 'mesh 20s ease infinite',
      },
      keyframes: {
        mesh: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  }
};
