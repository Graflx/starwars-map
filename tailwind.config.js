/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display:       ['Cinzel', 'Times New Roman', 'serif'],
        'display-deco':['Cinzel Decorative', 'serif'],
        sans:          ['Rajdhani', 'system-ui', 'sans-serif'],
        serif:         ['EB Garamond', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

