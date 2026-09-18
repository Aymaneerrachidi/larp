import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'

export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'local-studio-api',
    async configureServer(server) {
      Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
      process.env.DEV_MEMORY_STORE ??= 'true'
      if (!process.env.CHROME_EXECUTABLE_PATH && existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')) process.env.CHROME_EXECUTABLE_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      const { default: handler } = await import('./api/studio.js')
      server.middlewares.use('/api/studio', handler)
    },
  }],
  build: { rollupOptions: { input: { main: 'index.html', render: 'render.html' } } },
}))
