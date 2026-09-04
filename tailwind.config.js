/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neu: {
          base: '#0e1420',
          dark: '#060910',
          light: '#162032',
          surface: '#111827',
          sunken: '#0a0e17',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          800: '#151d2e',
          850: '#111827',
          900: '#0e1420',
          950: '#080c14',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'neu-flat': '8px 8px 18px #060910, -8px -8px 18px #162032',
        'neu-flat-sm': '4px 4px 10px #060910, -4px -4px 10px #162032',
        'neu-pressed': 'inset 4px 4px 8px #060910, inset -4px -4px 8px #162032',
        'neu-pressed-sm': 'inset 2px 2px 5px #060910, inset -2px -2px 5px #162032',
        'neu-convex': '6px 6px 14px #060910, -6px -6px 14px #162032',
        'glow-brand': '0 0 25px -5px rgba(99, 102, 241, 0.4)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.4)',
      }
    },
  },
  plugins: [],
}
