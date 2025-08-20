/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',      // Next.js App Router
    './pages/**/*.{js,ts,jsx,tsx}',    // caso tenha pages
    './components/**/*.{js,ts,jsx,tsx}', // componentes
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};