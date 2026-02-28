/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        studio: {
          950: '#0a0a0b', // Deepest black
          900: '#121214', // Panel bg
          800: '#27272a', // Borders
          700: '#3f3f46', // Muted elements
          500: '#71717a', // Text muted
          accent: '#8b5cf6', // Violet
          accentHover: '#7c3aed',
          success: '#10b981', // Emerald
          danger: '#ef4444', // Red
          warning: '#f59e0b', // Amber
        }
      }
    },
  },
  plugins: [],
}
