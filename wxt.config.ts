import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/module-react'],
    vite: () => ({
        plugins: [tailwindcss()],
    }),
    manifest: {
        name: 'Link Hinter',
        description: 'Navigate pages with keyboard hints',
        permissions: ['storage'],
    },
})
