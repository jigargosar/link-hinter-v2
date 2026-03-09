import { handleKeyDown, deactivate, updateSettings } from '@/lib/hint-mode'
import { loadSettings, watchSettings } from '@/lib/settings'

export default defineContentScript({
    matches: ['<all_urls>'],
    allFrames: true,
    async main(ctx) {
        const settings = await loadSettings()
        updateSettings(settings)

        const unwatch = watchSettings((updated) => {
            updateSettings(updated)
        })

        ctx.addEventListener(document, 'keydown', handleKeyDown, { capture: true })

        ctx.addEventListener(window, 'wxt:locationchange', () => {
            deactivate()
        })

        ctx.onInvalidated(() => {
            deactivate()
            unwatch()
        })
    },
})
