/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "lv-bg": "var(--lv-bg)",
        "lv-surface": "var(--lv-surface)",
        "lv-surface2": "var(--lv-surface2)",
        "lv-border": "var(--lv-border)",
        "lv-fg": "var(--lv-fg)",
        "lv-muted": "var(--lv-muted)",
        "lv-green": "var(--lv-green)",
        "lv-gold": "var(--lv-gold)",
      },
      boxShadow: {
        soft: "0 18px 40px rgba(31,26,19,0.12)",
      },
    },
  },
  plugins: [],
};
