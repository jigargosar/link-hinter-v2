import { focusable } from 'tabbable'

type InteractiveElement = HTMLElement | SVGElement

const CLICKABLE_SELECTOR = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[onclick]',
    'summary',
].join(',')

/**
 * Scan the viewport for interactive elements, including those inside open shadow roots.
 * Combines focusable() results with a querySelector pass for clickable elements
 * that might not be natively focusable.
 */
export function scanViewport(): InteractiveElement[] {
    const seen = new Set<Element>()
    const results: InteractiveElement[] = []

    const container = document.documentElement

    // Pass 1: all focusable elements (superset of tabbable — includes tabindex="-1")
    for (const el of focusable(container, { getShadowRoot: openShadowRootOrSkip })) {
        if (!seen.has(el) && isInViewport(el)) {
            seen.add(el)
            results.push(el)
        }
    }

    // Pass 2: clickable elements that focusable() may miss
    for (const el of document.querySelectorAll<HTMLElement>(CLICKABLE_SELECTOR)) {
        if (!seen.has(el) && isInViewport(el)) {
            seen.add(el)
            results.push(el)
        }
    }

    // Pass 3: traverse open shadow roots for clickable elements
    collectFromShadowRoots(container, seen, results)

    return results
}

function collectFromShadowRoots(
    root: Element,
    seen: Set<Element>,
    results: InteractiveElement[],
): void {
    if (root.shadowRoot) {
        for (const el of root.shadowRoot.querySelectorAll<HTMLElement>(CLICKABLE_SELECTOR)) {
            if (!seen.has(el) && isInViewport(el)) {
                seen.add(el)
                results.push(el)
            }
        }
    }

    for (const child of root.children) {
        collectFromShadowRoots(child, seen, results)
    }
}

function openShadowRootOrSkip(node: HTMLElement | SVGElement): ShadowRoot | false {
    return node.shadowRoot ?? false
}

function isInViewport(element: InteractiveElement): boolean {
    const rect = element.getBoundingClientRect()

    if (rect.width === 0 && rect.height === 0) {
        // display:contents or zero-box elements — check individual client rects
        const clientRects = element.getClientRects()
        if (clientRects.length > 0) {
            return isRectInViewport(clientRects[0])
        }

        // Fallback: check first child's rect (e.g. <a> wrapping a block child)
        const firstChild = element.firstElementChild
        if (firstChild) {
            const childRect = firstChild.getBoundingClientRect()
            return childRect.width > 0 && childRect.height > 0 && isRectInViewport(childRect)
        }

        return false
    }

    return isRectInViewport(rect)
}

function isRectInViewport(rect: DOMRect): boolean {
    return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
    )
}
