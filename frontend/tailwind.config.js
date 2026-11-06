/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          dr1: '#e53e3e',
          kl: '#38a169',
          dr6: '#d53f8c',
          dr8: '#3182ce',
        }
      }
    },
  },
  plugins: [],
}
