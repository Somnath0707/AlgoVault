/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./**/*.tsx"],
  theme: {
    extend: {
      colors: {
        av: {
          bg: {
            primary: "#1a1a2e",
            secondary: "#16213e",
            card: "rgba(30, 41, 59, 0.8)"
          },
          accent: {
            primary: "#00d4aa",
            secondary: "#ffa116"
          },
          text: {
            primary: "#eff1f6",
            secondary: "#9ca3af"
          }
        }
      }
    }
  },
  plugins: []
}
