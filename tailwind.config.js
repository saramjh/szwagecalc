/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // 브랜드 컬러
        'mint-green': '#4ED6B8',
        'mint-green-dark': '#3CA08A', // mint-green의 어두운 버전
        'lemon-yellow': '#FFE27A',
        'lemon-yellow-dark': '#CCB562', // lemon-yellow의 어두운 버전
        'coral-pink': '#FF8C94',
        'coral-pink-light': '#FFD1D4', // coral-pink의 밝은 버전

        // 라이트 모드
        'cream-white': '#FFFDF7',
        'dark-navy': '#2D3142',
        'medium-gray': '#6B7280',

        // 다크 모드
        'deep-navy': '#000000',
        'charcoal-gray': '#2C313C',
        'light-gray': '#A1A6B2',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}