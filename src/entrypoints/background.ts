import type { Message } from '@/lib/messages'

export default defineBackground(() => {
    browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
        if (message.type === 'ACTIVATE') {
            sendActivateToActiveTab().then(() => sendResponse())
            return true
        }
    })
})

async function sendActivateToActiveTab(): Promise<void> {
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!activeTab?.id) return

    await browser.tabs.sendMessage(activeTab.id, { type: 'ACTIVATE' } satisfies Message)
}
