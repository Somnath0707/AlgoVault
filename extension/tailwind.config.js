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
        lc: {
          bg: {
            base: "#1a1a1a",
            card: "#282828",
            subtle: "#262626",
            hover: "#333333",
            elevated: "#2d2d2d"
          },
          border: {
            DEFAULT: "rgba(255, 255, 255, 0.08)",
            subtle: "rgba(255, 255, 255, 0.05)",
            focus: "rgba(255, 255, 255, 0.16)"
          },
          text: {
            primary: "#ffffff",
            secondary: "#9ca3af",
            muted: "#6b7280"
          },
          easy: "#00b8a3",
          medium: "#ffc01e",
          hard: "#ef4743",
          brand: "#ffa116",
          rank: {
            newbie: "#94a3b8",
            pupil: "#3b82f6",
            specialist: "#06b6d4",
            expert: "#84cc16",
            master: "#c084fc",
            grandmaster: "#fb4f63"
          }
        },
        av: {
          bg: {
            primary: "#1a1a1a", // LeetCode page base
            secondary: "#262626", // LeetCode secondary container
            card: "#282828", // LeetCode card
            panel: "#303030" // LeetCode elevated
          },
          accent: {
            primary: "#ffa116", // LeetCode brand orange
            secondary: "#ffb84d",
            glow: "rgba(255, 161, 22, 0.12)"
          },
          text: {
            primary: "#ffffff",
            secondary: "#9ca3af"
          }
        }
      }
    }
  },
  plugins: []
}
