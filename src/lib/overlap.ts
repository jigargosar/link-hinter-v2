import RBush from 'rbush'

type InteractiveElement = HTMLElement | SVGElement
type DomIndex = number
type ZIndex = number
type LayerIndex = number

export interface ElementEntry {
    element: InteractiveElement
    rect: DOMRect
    domIndex: DomIndex
    minX: number
    minY: number
    maxX: number
    maxY: number
}

export interface LayeredElements {
    /** layers[layerIndex] contains the elements visible on that layer */
    layers: InteractiveElement[][]
    layerCount: number
}

/**
 * Detect overlapping elements via R-tree spatial index, group into stacks,
 * and assign layers so each layer shows at most one element per stack.
 *
 * Elements whose bounding rects intersect are grouped into a stack.
 * Within each stack, elements are sorted by z-index (descending), then DOM order.
 * Layer 0 gets the top element from each stack, layer 1 gets the second, etc.
 */
export function computeLayers(elements: InteractiveElement[]): LayeredElements {
    if (elements.length === 0) {
        return { layers: [], layerCount: 0 }
    }

    const entries = buildEntries(elements)
    const tree = new RBush<ElementEntry>()
    tree.load(entries)

    const stacks = findOverlapStacks(entries, tree)
    return assignLayers(stacks)
}

function buildEntries(elements: InteractiveElement[]): ElementEntry[] {
    return elements.map((element, domIndex) => {
        const rect = element.getBoundingClientRect()
        return {
            element,
            rect,
            domIndex,
            minX: rect.left,
            minY: rect.top,
            maxX: rect.right,
            maxY: rect.bottom,
        }
    })
}

/**
 * Find groups of overlapping elements using union-find over R-tree search results.
 * Returns stacks sorted internally by z-index (desc) then DOM order (asc).
 */
function findOverlapStacks(entries: ElementEntry[], tree: RBush<ElementEntry>): ElementEntry[][] {
    const parent = new Map<ElementEntry, ElementEntry>()

    function find(entry: ElementEntry): ElementEntry {
        let root = entry
        while (parent.get(root) !== root) {
            root = parent.get(root)!
        }
        // Path compression
        let current = entry
        while (current !== root) {
            const next = parent.get(current)!
            parent.set(current, root)
            current = next
        }
        return root
    }

    function union(a: ElementEntry, b: ElementEntry): void {
        const rootA = find(a)
        const rootB = find(b)
        if (rootA !== rootB) {
            parent.set(rootA, rootB)
        }
    }

    // Initialize union-find
    for (const entry of entries) {
        parent.set(entry, entry)
    }

    // For each entry, find overlapping entries and union them
    for (const entry of entries) {
        const overlapping = tree.search(entry)
        for (const other of overlapping) {
            if (other !== entry) {
                union(entry, other)
            }
        }
    }

    // Group by root
    const groups = new Map<ElementEntry, ElementEntry[]>()
    for (const entry of entries) {
        const root = find(entry)
        let group = groups.get(root)
        if (!group) {
            group = []
            groups.set(root, group)
        }
        group.push(entry)
    }

    // Sort each group by z-index (descending) then DOM order (ascending)
    for (const group of groups.values()) {
        group.sort(compareByZIndexThenDomOrder)
    }

    return Array.from(groups.values())
}

function compareByZIndexThenDomOrder(a: ElementEntry, b: ElementEntry): number {
    const zA = getComputedZIndex(a.element)
    const zB = getComputedZIndex(b.element)

    // Higher z-index first (descending)
    if (zA !== zB) return zB - zA

    // Lower DOM index first (ascending)
    return a.domIndex - b.domIndex
}

function getComputedZIndex(element: InteractiveElement): ZIndex {
    const value = window.getComputedStyle(element).zIndex
    const parsed = parseInt(value, 10)
    return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Assign elements to layers. Layer 0 gets the first element from each stack,
 * layer 1 gets the second, etc.
 */
function assignLayers(stacks: ElementEntry[][]): LayeredElements {
    const maxStackDepth = Math.max(...stacks.map(stack => stack.length))
    const layers: InteractiveElement[][] = []

    for (let layerIndex: LayerIndex = 0; layerIndex < maxStackDepth; layerIndex++) {
        const layerElements: InteractiveElement[] = []

        for (const stack of stacks) {
            if (layerIndex < stack.length) {
                layerElements.push(stack[layerIndex].element)
            }
        }

        layers.push(layerElements)
    }

    return { layers, layerCount: layers.length }
}
