/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Base задається для GitHub Pages (/fuel-app/); HashRouter не залежить від підшляху.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/fuel-app/' : '/',
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.{ts,tsx}'] },
})
