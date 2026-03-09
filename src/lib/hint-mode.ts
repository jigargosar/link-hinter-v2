import { scanViewport } from './scanner'
import { generateLabels } from './labels'
import {
    createShadowContainer,
    renderHints,
    updateHintFiltering,
    showToast,
    clearOverlays,
    destroyShadowContainer,
    type HintStyle,
} from './hint-renderer'

type Label = string
type HintChar = string

interface HintSettings {
    hotkey: string
    charset: HintChar
    hintBackground: string
    hintText: string
    matchColor: string
    hintFontSize: number
    hintPadding: number
    hintOpacity: number
    hintFontFamily: string
}

const DEFAULT_SETTINGS: HintSettings = {
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

const TOAST_AUTO_DESTROY_DELAY = 1100

type HintModeState =
    | { status: 'inactive' }
    | {
          status: 'active'
          typedChars: string
          currentHints: Map<Label, HTMLElement | SVGElement>
      }

let modeState: HintModeState = { status: 'inactive' }
let settings: HintSettings = { ...DEFAULT_SETTINGS }

// -- Public API --

export function handleKeyDown(event: KeyboardEvent): void {
    if (modeState.status === 'inactive') {
        handleInactiveKey(event)
    } else {
        handleActiveKey(event)
    }
}

export function deactivate(): void {
    if (modeState.status === 'inactive') return

    modeState = { status: 'inactive' }
    clearOverlays()
    destroyShadowContainer()
}

export function isActive(): boolean {
    return modeState.status === 'active'
}

export function updateSettings(newSettings: Partial<HintSettings>): void {
    settings = { ...settings, ...newSettings }
}

// -- Private: key handling in inactive state --

function handleInactiveKey(event: KeyboardEvent): void {
    if (event.key !== settings.hotkey) return
    if (isEditableElementFocused()) return

    event.preventDefault()
    event.stopPropagation()

    activate()
}

// -- Private: key handling in active state --

function handleActiveKey(event: KeyboardEvent): void {
    if (modeState.status !== 'active') return

    // Let browser handle Ctrl/Alt/Meta combos (Ctrl+Shift+R, Ctrl+T, etc.)
    if (event.ctrlKey || event.altKey || event.metaKey) return

    if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        deactivate()
        return
    }

    if (event.key === 'Backspace') {
        event.preventDefault()
        event.stopPropagation()
        handleBackspace()
        return
    }

    // Re-pressing the hotkey rescans
    if (event.key === settings.hotkey && modeState.typedChars.length === 0) {
        event.preventDefault()
        event.stopPropagation()
        deactivate()
        activate()
        return
    }

    // Only process valid charset characters (lowercase to handle Shift)
    const key = event.key.toLowerCase()
    if (settings.charset.includes(key)) {
        event.preventDefault()
        event.stopPropagation()
        handleCharInput(key, event.shiftKey)
    }
}

// -- Private: activation --

function activate(): void {
    const elements = scanViewport()

    if (elements.length === 0) {
        createShadowContainer()
        showToast('No hints')
        window.setTimeout(() => {
            if (modeState.status === 'inactive') {
                destroyShadowContainer()
            }
        }, TOAST_AUTO_DESTROY_DELAY)
        return
    }

    const charsetWithoutHotkey = settings.charset.replace(settings.hotkey, '')
    const labels = generateLabels(elements.length, charsetWithoutHotkey)

    const currentHints = new Map<Label, HTMLElement | SVGElement>()
    const hintPairs: Array<{ element: HTMLElement | SVGElement; label: Label }> = []

    for (let i = 0; i < elements.length; i++) {
        const label = labels[i]
        const element = elements[i]
        currentHints.set(label, element)
        hintPairs.push({ element, label })
    }

    modeState = {
        status: 'active',
        typedChars: '',
        currentHints,
    }

    createShadowContainer()
    renderHints(hintPairs, buildHintStyle())
}

// -- Private: char input --

function handleCharInput(char: HintChar, shiftHeld: boolean): void {
    if (modeState.status !== 'active') return

    const newTyped = modeState.typedChars + char
    modeState.typedChars = newTyped

    const matchedLabel = updateHintFiltering(newTyped, buildHintStyle())

    if (matchedLabel !== null) {
        const targetElement = modeState.currentHints.get(matchedLabel)
        if (targetElement) {
            triggerMatch(targetElement, shiftHeld)
        }
    }
}

// -- Private: backspace --

function handleBackspace(): void {
    if (modeState.status !== 'active') return

    if (modeState.typedChars.length === 0) return

    modeState.typedChars = modeState.typedChars.slice(0, -1)
    updateHintFiltering(modeState.typedChars, buildHintStyle())
}

// -- Private: match trigger --

function triggerMatch(element: HTMLElement | SVGElement, shiftHeld: boolean): void {
    const anchor = findAnchorAncestor(element)

    if (shiftHeld && anchor) {
        const originalTarget = anchor.target
        anchor.target = '_blank'
        anchor.click()
        anchor.target = originalTarget
    } else {
        ;(element as HTMLElement).click()
    }

    deactivate()
}

function findAnchorAncestor(element: Element): HTMLAnchorElement | null {
    let current: Element | null = element
    while (current) {
        if (current.tagName === 'A' && (current as HTMLAnchorElement).hasAttribute('href')) {
            return current as HTMLAnchorElement
        }
        current = current.parentElement
    }
    return null
}

// -- Private: guards --

function isEditableElementFocused(): boolean {
    const active = document.activeElement
    if (!active) return false

    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        return true
    }

    if (active instanceof HTMLElement && active.isContentEditable) {
        return true
    }

    return false
}

// -- Private: style builder --

function buildHintStyle(): HintStyle {
    return {
        background: settings.hintBackground,
        textColor: settings.hintText,
        matchColor: settings.matchColor,
        fontSize: settings.hintFontSize,
        padding: settings.hintPadding,
        opacity: settings.hintOpacity,
        fontFamily: settings.hintFontFamily,
    }
}
