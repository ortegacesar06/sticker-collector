/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light theme - Panini album aesthetic
        bg: '#FAFAFA',
        surface: '#F0F0F0',
        ink: '#1A1A1A',
        accent: '#E5007D',
        'accent-2': '#0066CC',
        gold: '#FFB800',
        pitch: '#00A651',
        missing: '#B0B0B0',
        danger: '#DC2626',
        // Album-specific colors
        album: {
          red: '#E5007D',
          blue: '#0066CC',
          gold: '#FFB800',
          green: '#00A651',
        },
      },
      fontFamily: {
        sans: ['Barlow Condensed', 'Inter', 'system-ui', 'sans-serif'],
        condensed: ['Barlow Condensed', 'sans-serif'],
        display: ['Barlow Condensed', 'sans-serif'],
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
