import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use PORT when one is assigned (e.g. a second preview alongside a terminal dev server).
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {},
})
