/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        violet: {
          50: "#f7f3ff",
          100: "#eee5ff",
          200: "#ddccff",
          300: "#c6a6ff",
          400: "#a970ff",
          500: "#8c3dff",
          600: "#7923f2",
          700: "#6618d4",
        },
      },
      boxShadow: {
        card: "0 24px 80px rgba(58, 28, 107, 0.14)",
        button: "0 12px 24px rgba(121, 35, 242, 0.28)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
