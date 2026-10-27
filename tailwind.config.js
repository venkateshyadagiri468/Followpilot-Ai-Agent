/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Muted green accents
        'brand-green': '#4a7c59',
        // Warm white background
        'warm-white': '#fdfcf8',
      },
    },
  },
  plugins: [],
}
