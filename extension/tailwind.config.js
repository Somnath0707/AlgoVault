/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: [
    "./sidepanel.tsx",
    "./components/**/*.{ts,tsx}",
    "./contents/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        av: {
          bg: {
            primary: "#09090b", // Deep zinc-950
            secondary: "#121214", // Elevated graphite
            card: "#141416", // Level 2 container
            panel: "#1e1e21" // Level 3 container
          },
          accent: {
            primary: "#dfa054", // Warm brass/gold
            secondary: "#c5944e", // Muted brass
            glow: "rgba(223, 160, 84, 0.12)"
          },
          text: {
            primary: "#f4f4f5", // Zinc-100
            secondary: "#a1a1aa" // Zinc-400
          }
        }
      }
    }
  },
  plugins: []
}
