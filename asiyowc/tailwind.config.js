module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins-Regular"],
        poppins: ["Poppins-Regular"],
        "poppins-light": ["Poppins-Light"],
        "poppins-medium": ["Poppins-Medium"],
        "poppins-semibold": ["Poppins-SemiBold"],
        "poppins-bold": ["Poppins-Bold"],
        "poppins-extrabold": ["Poppins-ExtraBold"],
      },
    },
  },
  plugins: [],
};
