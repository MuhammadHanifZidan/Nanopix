/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Space Mono"', 'monospace'],
      },
      colors: {
        cli: {
          bg: '#000000',      /* Hitam pekat */
          panel: '#0a0a0a',   /* Hitam sedikit terang untuk panel */
          border: '#333333',  /* Abu-abu gelap untuk garis batas */
          text: '#e5e5e5',    /* Putih pudar untuk teks utama */
          dim: '#666666',     /* Abu-abu redup untuk teks sekunder */
          accent: '#ffffff'   /* Putih solid */
        }
      }
    },
  },
  plugins: [],
}