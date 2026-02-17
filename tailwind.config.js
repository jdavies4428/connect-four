/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Silkscreen"', 'monospace'],
      },
      colors: {
        red: { piece: '#ff4757', light: '#ff6b81', dark: '#c0392b' },
        yellow: { piece: '#ffd32a', light: '#ffe066', dark: '#d4a017' },
        board: { bg: '#1a237e', dark: '#0d1557', cell: '#0a0e3d', border: '#283593' },
        bg: { primary: '#0a0a1a', secondary: '#121230', tertiary: '#0d0d25' },
      },
      animation: {
        shimmer: 'shimmer 3s linear infinite',
        glow: 'glow 2s ease-in-out infinite',
        slideUp: 'slideUp 0.4s ease-out',
        boardEntry: 'boardEntry 0.5s ease-out',
        pulse: 'pulse 1s ease-in-out infinite',
        previewBlink: 'previewBlink 1s ease-in-out infinite',
        thinkDot: 'thinkDot 1s infinite',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
        glow: { '0%, 100%': { opacity: '0.7' }, '50%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(30px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        boardEntry: { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        pulse: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' } },
        previewBlink: { '0%, 100%': { opacity: '0.3' }, '50%': { opacity: '0.6' } },
        thinkDot: { '0%, 100%': { opacity: '0.3' }, '50%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
};
