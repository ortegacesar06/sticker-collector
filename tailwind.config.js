/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        surface: '#F4F5F7',
        ink: '#0E1116',
        accent: '#E5007D',
        'accent-2': '#0057FF',
        gold: '#F5B301',
        pitch: '#00A86B',
        missing: '#9AA0A6',
        danger: '#E23636',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
