/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // ─── LedgeIt design tokens ──────────────────────────────────────────────
      // Mirrors apps/web/src/app/globals.css (--ledge-* CSS variables) so both
      // platforms render the exact same palette. Keep these two files in sync.
      colors: {
        'ledge-bg': '#f8faf9',
        'ledge-surface': '#f0f4f2',
        'ledge-surface2': '#e7edeb',
        'ledge-surface-high': '#d4e4e0',
        'ledge-surface-highest': '#c1d9d4',
        'ledge-accent': '#00352e',
        'ledge-accent-dim': '#1f695d',
        'ledge-gain': '#1f6950',
        'ledge-danger': '#ba1a1a',
        'ledge-danger-bright': '#de3730',
        'ledge-data': '#191c1c',
        'ledge-data-var': '#3f4946',
        'ledge-muted': '#6e9990',
        'ledge-border': '#cde0db',
      },
      fontFamily: {
        // Loaded via @expo-google-fonts/plus-jakarta-sans in src/app/_layout.tsx
        sans: ['PlusJakartaSans_400Regular'],
        display: ['PlusJakartaSans_700Bold'],
        label: ['PlusJakartaSans_700Bold'],
        // Loaded via @expo-google-fonts/geist-mono in src/app/_layout.tsx —
        // matches the web app's next/font/google Geist_Mono exactly.
        mono: ['GeistMono_400Regular'],
        'mono-bold': ['GeistMono_700Bold'],
      },
      borderRadius: {
        pill: '9999px',
        hero: '24px',
        card: '16px',
        icon: '12px',
      },
    },
  },
  plugins: [],
};
