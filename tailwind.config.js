/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F5F0",
        foreground: "#242820",
        surface: {
          DEFAULT: "#FFFFFF",
          warm: "#FCFBF9",
          muted: "#F0EEE8",
          sage: "#E6EDE3",
        },
        border: {
          DEFAULT: "#E6E3DB",
          light: "#F0EEE8",
          dark: "#D4D0C5",
        },
        muted: {
          DEFAULT: "#F0EEE8",
          foreground: "#77786F",
        },
        forest: {
          50: "#F1F6F2",
          100: "#DEEBE0",
          200: "#BFDAC4",
          500: "#456B50",
          600: "#3A5C44",
          700: "#2E4A36",
          800: "#243B2B",
          900: "#1A2A1F",
        },
        terracotta: {
          50: "#FDF6F3",
          100: "#FBECE5",
          200: "#F6D7C8",
          400: "#E5A88C",
          500: "#DB9475",
          600: "#C47959",
          700: "#A65F42",
        },
        sage: {
          50: "#F4F7F3",
          100: "#E6EDE3",
          200: "#D1DFC9",
          300: "#B8CCA9",
          500: "#6E8F60",
        },
        finance: {
          income: "#366E4E",
          incomeBg: "#EBF5EE",
          expense: "#B84A39",
          expenseBg: "#FDF0ED",
          transfer: "#4F6B72",
          transferBg: "#EFF4F5",
          warning: "#C27A23",
          warningBg: "#FEF7EC",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "10px",
        btn: "8px",
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(36, 40, 32, 0.04), 0 1px 2px -1px rgba(36, 40, 32, 0.04)",
        card: "0 2px 8px -2px rgba(36, 40, 32, 0.06), 0 1px 3px -1px rgba(36, 40, 32, 0.04)",
        elevated: "0 10px 25px -5px rgba(36, 40, 32, 0.08), 0 8px 10px -6px rgba(36, 40, 32, 0.04)",
      },
    },
  },
  plugins: [],
};
