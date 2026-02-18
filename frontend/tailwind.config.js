/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        muted: '#6B7280',
        brand: '#2563EB',
      },
    },
  },
  plugins: [],
}
