/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nature: {
          900: '#06130B',
          800: '#0B2215',
          700: '#143823',
          600: '#1C5233',
          500: '#267347',
          400: '#34A564',
          100: '#E1F5EA',
          50: '#F2FAF5'
        }
      }
    },
  },
  plugins: [],
}
