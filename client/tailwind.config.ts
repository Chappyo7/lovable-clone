import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0b0f1a',
        surface: '#0e1525',
        card: '#111d33',
        border: '#1c2d47',
        primary: '#5b9cf5',
        accent: '#f5c542',
        success: '#4ade80',
        'text-primary': '#c8cdd8',
        'text-secondary': '#5a6578',
      },
    },
  },
  plugins: [],
} satisfies Config
