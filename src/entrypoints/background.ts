import type { Message } from '@/lib/messages'

export default defineBackground(() => {
    browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
        switch (message.type) {
            case 'OPEN_NEW_TAB':
                browser.tabs.create({ url: message.url, active: false }).then(() => sendResponse())
                return true

            case 'ACTIVATE':
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
