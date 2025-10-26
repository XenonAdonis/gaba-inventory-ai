/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  safelist: [
    "from-lime-400","to-lime-600",
    "from-sky-400","to-sky-600",
    "text-lime-300","text-sky-300","text-amber-300"
  ],
  plugins: [],
};
