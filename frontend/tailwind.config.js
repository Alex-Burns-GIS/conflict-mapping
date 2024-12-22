/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    theme: {
      extend: {
        height: {
          '90vh': '90vh',
        },
        colors: {
          'custom-blue': '#1E40AF',
        },
      },
    },
    plugins: [],
  };
  