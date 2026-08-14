/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#04070f",
        navy: "#0b1230",
        navy2: "#101a44",
        gold: "#d4af37",
        gold2: "#f3d675",
        ember: "#8a2be2",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
