import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/DCHO_Docutrack/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    open: true 
  }
})

