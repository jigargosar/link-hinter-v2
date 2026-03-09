type Label = string
type Pixels = number
type CssColor = string
type Milliseconds = number

const SHADOW_HOST_ID = 'link-hinter-shadow-host'
const MAX_Z_INDEX = 2147483647
const TOAST_DURATION: Milliseconds = 1000

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
    element: HTMLDivElement
    label: Label
}

interface RendererState {
    host: HTMLDivElement
    shadowRoot: ShadowRoot
    overlayContainer: HTMLDivElement
    overlays: Map<Label, HintOverlay>
    layerIndicator: HTMLDivElement | null
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
        layerIndicator: null,
        toastTimeout: null,
    }
}

export function renderHints(
    elements: Array<{ element: HTMLElement | SVGElement; label: Label }>,
    style: HintStyle,
): void {
    if (!state) return

    clearOverlays()

    for (const { element, label } of elements) {
        const overlay = createOverlayElement(element, label, style)
        state.overlayContainer.appendChild(overlay.element)
        state.overlays.set(label, overlay)
    }
}

export function updateHintFiltering(typedChars: string, style: HintStyle): Label | null {
    if (!state) return null

    let exactMatch: Label | null = null

    for (const [label, overlay] of state.overlays) {
        if (typedChars.length > 0 && !label.startsWith(typedChars)) {
            overlay.element.style.display = 'none'
        } else {
            overlay.element.style.display = ''
            updateOverlayText(overlay.element, label, typedChars, style)

            if (label === typedChars) {
                exactMatch = label
            }
        }
    }

    return exactMatch
}

export function showLayerIndicator(currentLayer: number, totalLayers: number): void {
    if (!state) return

    hideLayerIndicator()

    if (totalLayers <= 1) return

    const indicator = document.createElement('div')
    applyStyles(indicator, {
        position: 'fixed',
        bottom: '12px',
        right: '12px',
        padding: '4px 10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#ffffff',
        fontSize: '12px',
        fontFamily: 'sans-serif',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: String(MAX_Z_INDEX),
    })
    indicator.textContent = 'Layer ' + currentLayer + '/' + totalLayers

    state.shadowRoot.appendChild(indicator)
    state.layerIndicator = indicator
}

export function hideLayerIndicator(): void {
    if (!state || !state.layerIndicator) return
    state.layerIndicator.remove()
    state.layerIndicator = null
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
        overlay.element.remove()
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

export function getOverlayForLabel(label: Label): HintOverlay | undefined {
    return state?.overlays.get(label)
}

// -- Private helpers --

function createOverlayElement(
    target: HTMLElement | SVGElement,
    label: Label,
    style: HintStyle,
): HintOverlay {
    const rect = target.getBoundingClientRect()
    const overlay = document.createElement('div')

    applyStyles(overlay, {
        position: 'fixed',
        left: rect.left + 'px',
        top: rect.top + 'px',
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

    return { element: overlay, label }
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

function applyStyles(element: HTMLElement, styles: Record<string, string>): void {
    for (const [property, value] of Object.entries(styles)) {
        ;(element.style as unknown as Record<string, string>)[property] = value
    }
}
