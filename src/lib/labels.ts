type Label = string
type HintChar = string

const DEFAULT_CHARSET: HintChar = 'sadfjklewcmpgh'

/**
 * Generate `count` prefix-free labels from the given charset.
 *
 * Prefix-free means no label is a prefix of another label.
 * This is achieved by generating labels from a complete k-ary tree,
 * where k = charset length. All labels are leaf nodes at the same depth,
 * or distributed across leaf nodes to minimize label length.
 *
 * Algorithm: We build a k-ary tree where each internal node has k children.
 * We assign labels to leaves, ensuring all labels are at the same or adjacent depths.
 * This guarantees the prefix-free property since no leaf is an ancestor of another.
 */
export function generateLabels(count: number, charset: HintChar = DEFAULT_CHARSET): Label[] {
    if (count <= 0) return []

    const chars = charset.split('')
    const base = chars.length

    if (count <= base) {
        return chars.slice(0, count)
    }

    // For prefix-free codes, we need to distribute `count` labels across a tree.
    // We use a "Huffman-like" approach:
    // Start with `base` single-char slots. Each slot can be "expanded" into `base` children.
    // Expanding a slot removes 1 label and adds `base` labels (net gain: base - 1).
    // We expand slots (shortest first) until we have enough.

    // Each slot is represented as a prefix string.
    // Unexpanded slots are our final labels.
    const prefixes: Label[] = chars.slice()
    let available = base

    while (available < count) {
        // Take the first (shortest) prefix and expand it
        const prefix = prefixes.shift()!
        available-- // removing the parent

        for (const char of chars) {
            prefixes.push(prefix + char)
        }
        available += base
    }

    // Return exactly `count` labels from the available pool
    return prefixes.slice(0, count)
}
