type Label = string
type Pixels = number
type CssColor = string
type Milliseconds = number

const SHADOW_HOST_ID = 'link-hinter-shadow-host'
const MAX_Z_INDEX = 2147483647
const TOAST_DURATION: Milliseconds = 1000
const MONOSPACE_CHAR_WIDTH_RATIO = 0.6
const LABEL_GAP: Pixels = 2

export interface HintStyle {
    background: CssColor
    textColor: CssColor
    matchColor: CssColor
    fontSize: Pixels
    padding: Pixels
    opacity: number
    fontFamily: string
}

interface HintOverlay {
    overlayEl: HTMLDivElement
    targetEl: HTMLElement | SVGElement
    label: Label
}

interface RendererState {
    host: HTMLDivElement
    shadowRoot: ShadowRoot
    overlayContainer: HTMLDivElement
    overlays: Map<Label, HintOverlay>
    toastTimeout: number | null
}

let state: RendererState | null = null

// -- Public API --

export function createShadowContainer(): void {
    if (state) return

    const host = document.createElement('div')
    host.id = SHADOW_HOST_ID
    host.setAttribute('aria-hidden', 'true')
    host.style.position = 'fixed'
    host.style.top = '0'
    host.style.left = '0'
    host.style.width = '0'
    host.style.height = '0'
    host.style.overflow = 'visible'
    host.style.zIndex = String(MAX_Z_INDEX)
    host.style.pointerEvents = 'none'

    const shadowRoot = host.attachShadow({ mode: 'open' })

    const overlayContainer = document.createElement('div')
    shadowRoot.appendChild(overlayContainer)

    document.documentElement.appendChild(host)

    state = {
        host,
        shadowRoot,
        overlayContainer,
        overlays: new Map(),
        toastTimeout: null,
    }
}

export function renderHints(
    elements: Array<{ element: HTMLElement | SVGElement; label: Label }>,
    style: HintStyle,
): void {
    if (!state) return

    clearOverlays()

    const placed: Array<{ left: Pixels; top: Pixels; right: Pixels; bottom: Pixels }> = []
    const labelHeight = style.fontSize + style.padding * 2
    const charWidth = style.fontSize * MONOSPACE_CHAR_WIDTH_RATIO

    for (const { element, label } of elements) {
        const pos = getElementPosition(element)
        const labelWidth = label.length * charWidth + style.padding * 2

        let left = pos.left
        const top = pos.top

        for (const box of placed) {
            if (rectsOverlap(left, top, left + labelWidth, top + labelHeight, box)) {
                left = box.right + LABEL_GAP
            }
        }

        placed.push({ left, top, right: left + labelWidth, bottom: top + labelHeight })

        const overlayEl = createOverlayDiv(left, top, label, style)
        state.overlayContainer.appendChild(overlayEl)
        state.overlays.set(label, { overlayEl, targetEl: element, label })
    }
}

export function repositionOverlays(style: HintStyle): void {
    if (!state) return

    const placed: Array<{ left: Pixels; top: Pixels; right: Pixels; bottom: Pixels }> = []
    const labelHeight = style.fontSize + style.padding * 2
    const charWidth = style.fontSize * MONOSPACE_CHAR_WIDTH_RATIO

    for (const overlay of state.overlays.values()) {
        if (overlay.overlayEl.style.display === 'none') continue

        const pos = getElementPosition(overlay.targetEl)
        const labelWidth = overlay.label.length * charWidth + style.padding * 2

        let left = pos.left
        const top = pos.top

        for (const box of placed) {
            if (rectsOverlap(left, top, left + labelWidth, top + labelHeight, box)) {
                left = box.right + LABEL_GAP
            }
        }

        placed.push({ left, top, right: left + labelWidth, bottom: top + labelHeight })

        overlay.overlayEl.style.left = left + 'px'
        overlay.overlayEl.style.top = top + 'px'
    }
}

export function updateHintFiltering(typedChars: string, style: HintStyle): Label | null {
    if (!state) return null

    let exactMatch: Label | null = null

    for (const [label, overlay] of state.overlays) {
        if (typedChars.length > 0 && !label.startsWith(typedChars)) {
            overlay.overlayEl.style.display = 'none'
        } else {
            overlay.overlayEl.style.display = ''
            updateOverlayText(overlay.overlayEl, label, typedChars, style)

            if (label === typedChars) {
                exactMatch = label
            }
        }
    }

    return exactMatch
}

export function showToast(message: string): void {
    if (!state) return

    const toast = document.createElement('div')
    applyStyles(toast, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '8px 16px',
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#ffffff',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        borderRadius: '6px',
        pointerEvents: 'none',
        zIndex: String(MAX_Z_INDEX),
    })
    toast.textContent = message

    state.shadowRoot.appendChild(toast)

    state.toastTimeout = window.setTimeout(() => {
        toast.remove()
        if (state) state.toastTimeout = null
    }, TOAST_DURATION)
}

export function clearOverlays(): void {
    if (!state) return

    for (const overlay of state.overlays.values()) {
        overlay.overlayEl.remove()
    }
    state.overlays.clear()
}

export function destroyShadowContainer(): void {
    if (!state) return

    if (state.toastTimeout !== null) {
        window.clearTimeout(state.toastTimeout)
    }

    state.host.remove()
    state = null
}

// -- Private helpers --

function rectsOverlap(
    aLeft: Pixels,
    aTop: Pixels,
    aRight: Pixels,
    aBottom: Pixels,
    b: { left: Pixels; top: Pixels; right: Pixels; bottom: Pixels },
): boolean {
    return aLeft < b.right && aRight > b.left && aTop < b.bottom && aBottom > b.top
}

function createOverlayDiv(left: Pixels, top: Pixels, label: Label, style: HintStyle): HTMLDivElement {
    const overlay = document.createElement('div')

    applyStyles(overlay, {
        position: 'fixed',
        left: left + 'px',
        top: top + 'px',
        background: style.background,
        color: style.textColor,
        fontSize: style.fontSize + 'px',
        fontFamily: style.fontFamily,
        padding: style.padding + 'px',
        borderRadius: '2px',
        lineHeight: '1',
        opacity: String(style.opacity),
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        zIndex: String(MAX_Z_INDEX),
        fontWeight: 'bold',
        textTransform: 'lowercase',
    })

    overlay.textContent = label

    return overlay
}

function updateOverlayText(
    overlayEl: HTMLDivElement,
    label: Label,
    typedChars: string,
    style: HintStyle,
): void {
    overlayEl.textContent = ''

    if (typedChars.length > 0 && label.startsWith(typedChars)) {
        const matchedSpan = document.createElement('span')
        matchedSpan.style.color = style.matchColor
        matchedSpan.textContent = label.slice(0, typedChars.length)
        overlayEl.appendChild(matchedSpan)

        const remainingText = label.slice(typedChars.length)
        if (remainingText) {
            const remainingSpan = document.createElement('span')
            remainingSpan.textContent = remainingText
            overlayEl.appendChild(remainingSpan)
        }
    } else {
        overlayEl.textContent = label
    }
}

function getElementPosition(element: HTMLElement | SVGElement): { left: Pixels; top: Pixels } {
    const rect = element.getBoundingClientRect()

    if (rect.width > 0 || rect.height > 0) {
        return { left: rect.left, top: rect.top }
    }

    const clientRects = element.getClientRects()
    if (clientRects.length > 0) {
        return { left: clientRects[0].left, top: clientRects[0].top }
    }

    const firstChild = element.firstElementChild
    if (firstChild) {
        const childRect = firstChild.getBoundingClientRect()
        return { left: childRect.left, top: childRect.top }
    }

    return { left: rect.left, top: rect.top }
}

function applyStyles(element: HTMLElement, styles: Record<string, string>): void {
    for (const [property, value] of Object.entries(styles)) {
        ;(element.style as unknown as Record<string, string>)[property] = value
    }
}
