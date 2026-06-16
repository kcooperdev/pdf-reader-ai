import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  "#fdfcfb",
          100: "#faf8f4",
          200: "#f3ede3",
          300: "#e8e0d2",
          400: "#d6cbba",
          500: "#b8a994",
        },
        midnight: {
          50:  "#eeeef8",
          100: "#d0d0e8",
          200: "#9090c0",
          700: "#1a1a32",
          800: "#0e0e1e",
          900: "#090914",
          950: "#04040c",
        },
      },
      keyframes: {
        "shimmer-slide": {
          to: { transform: "translate(calc(100cqw - 100%), 0)" },
        },
      },
      animation: {
        "shimmer-slide": "shimmer-slide var(--speed, 3s) ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
