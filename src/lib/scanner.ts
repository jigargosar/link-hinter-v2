import { tabbable } from 'tabbable'

type InteractiveElement = HTMLElement | SVGElement

/**
 * Scan the viewport for interactive elements, including those inside open shadow roots.
 * Returns only elements whose bounding rects are within (or partially within) the visible viewport.
 */
export function scanViewport(): InteractiveElement[] {
    const elements = collectTabbableElements(document)
    return elements.filter(isInViewport)
}

function collectTabbableElements(root: Document | ShadowRoot): InteractiveElement[] {
    const container = root instanceof Document ? root.documentElement : root.host
    const results = tabbable(container, {
        getShadowRoot: openShadowRootOrSkip,
    })
    return results
}

/**
 * Callback for tabbable's getShadowRoot option.
 * Returns the open shadow root if available, allowing tabbable to traverse it.
 * Returns false for closed shadow roots (skip them).
 */
function openShadowRootOrSkip(node: HTMLElement | SVGElement): ShadowRoot | false {
    return node.shadowRoot ?? false
}

function isInViewport(element: InteractiveElement): boolean {
    const rect = element.getBoundingClientRect()

    if (rect.width === 0 && rect.height === 0) return false

    return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
    )
}
