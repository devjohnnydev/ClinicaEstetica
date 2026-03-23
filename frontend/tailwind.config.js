/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#F5EDE6',
        secondary: '#E8D5C4',
        accent: '#C6A77D',
        'accent-dark': '#A8874F',
        nail: '#E8A0BF',
        'nail-dark': '#D484A8',
        dark: '#3A3A3A',
        soft: '#F8F8F8',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'elegant': '0 4px 20px rgba(0, 0, 0, 0.06)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.04)',
        'hover': '0 8px 30px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
