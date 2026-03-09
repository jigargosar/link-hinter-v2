type Hotkey = string
type Charset = string
type CssColor = string
type Pixels = number
type Opacity = number
type FontFamily = string

export type Settings = {
    hotkey: Hotkey
    charset: Charset
    hintBackground: CssColor
    hintText: CssColor
    matchColor: CssColor
    hintFontSize: Pixels
    hintPadding: Pixels
    hintOpacity: Opacity
    hintFontFamily: FontFamily
}

export const DEFAULT_SETTINGS: Settings = {
    hotkey: 'f',
    charset: 'sadfjklewcmpgh',
    hintBackground: '#FBBF24',
    hintText: '#1a1a1a',
    matchColor: '#EF4444',
    hintFontSize: 12,
    hintPadding: 2,
    hintOpacity: 0.95,
    hintFontFamily: 'monospace',
}

const STORAGE_KEY = 'settings'

export async function loadSettings(): Promise<Settings> {
    const result = await browser.storage.sync.get(STORAGE_KEY)
    const stored = result[STORAGE_KEY] as Partial<Settings> | undefined
    return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(partial: Partial<Settings>): Promise<void> {
    const current = await loadSettings()
    const updated = { ...current, ...partial }
    await browser.storage.sync.set({ [STORAGE_KEY]: updated })
}

export function watchSettings(callback: (settings: Settings) => void): () => void {
    const listener = (changes: Record<string, Browser.storage.StorageChange>) => {
        if (STORAGE_KEY in changes) {
            const stored = changes[STORAGE_KEY].newValue as Partial<Settings> | undefined
            callback({ ...DEFAULT_SETTINGS, ...stored })
        }
    }

    browser.storage.onChanged.addListener(listener)
    return () => browser.storage.onChanged.removeListener(listener)
}
