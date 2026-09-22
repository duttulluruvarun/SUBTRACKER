/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          crimson: '#D9222A',
          hover: '#B81B22',
          light: '#FDF2F2',
        },
        chart: {
          blue: '#3B82F6',
        },
        success: {
          emerald: '#16A34A',
        },
        surface: {
          gray: '#F7F7F8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
