/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Warm paper / ink neutrals (replaces the cold default slate).
        slate: {
          50: "#F5F0E6", 100: "#EAE3D2", 200: "#DAD0BC", 300: "#C4B9A1",
          400: "#998F79", 500: "#6B6351", 600: "#534B3B", 700: "#3E382C",
          800: "#2A2519", 900: "#1B1812", 950: "#14110C",
        },
        // Signature coral/vermilion accent (replaces indigo).
        indigo: {
          50: "#FFEEE9", 100: "#FFD8CC", 200: "#FFBCA8", 300: "#FF9A7E",
          400: "#FF7B58", 500: "#FF6038", 600: "#F5491F", 700: "#D63A14",
          800: "#B22F0E", 900: "#7C2410", 950: "#451307",
        },
        // Teal secondary for the "wants" section (replaces purple).
        purple: {
          50: "#E8F5F2", 100: "#C8E9E3", 200: "#9FD8CE", 300: "#6FC4B6",
          400: "#3AAB99", 500: "#16A394", 600: "#0E8B7D", 700: "#0C7165",
          800: "#0A574F", 900: "#063F39", 950: "#03211E",
        },
      },
      boxShadow: {
        sm: "0 1px 0 0 rgba(27,24,18,0.04), 0 14px 30px -18px rgba(27,24,18,0.30)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
