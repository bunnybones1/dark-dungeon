import { defineConfig, PluginOption } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: './dist',
    sourcemap: true,
    minify: true
  },
  plugins: [
    htmlPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: './assets/*',
          dest: './assets/'
        }
      ]
    })
  ]
})

function htmlPlugin(): PluginOption {
  return {
    name: 'html-transform',
    transformIndexHtml(html, ctx) {
        return html.replace('src="/assets',  'src="assets')
    }
  }
}
