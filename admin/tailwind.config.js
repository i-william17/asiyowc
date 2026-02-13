/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx}"],
  darkMode: 'class',
  mode: "jit",
  theme: {
    fontFamily: {
      Roboto: ["Roboto", "sans-serif"],
      Poppins: ['Poppins', "sans-serif"],
    },
    extend: {
      backgroundImage: {
        'custom-bg': "url('./Assests/5.jpg')",
        'custom-bg2': "url('./Assests/7a.jpg')",
        'custom-bg3': "url('./Assests/11_aswasdas1.jpg')",
      },
      screens: {
        "1000px": "1050px",
        "1100px": "1110px",
        "800px": "800px",
        "1300px": "1300px",
        "400px":"400px"
      },
    },
  },
  plugins: [],
};
