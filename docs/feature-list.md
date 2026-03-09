1. Scaffold WXT + React + TypeScript project, load empty extension in Chrome — pipeline confirmed
2. `f` key activates hint mode on any page — keydown listener in content script
3. Scan viewport for all interactive elements using `tabbable` — returns filtered list
4. Generate prefix-free labels from charset `sadfjklewcmpgh` — trie algorithm, no label is prefix of another
5. Render hint overlays as yellow labels at each element's top-left bounding rect position
6. Typing chars filters hints in real time — non-matching hints hidden immediately
7. Exact match triggers native click on element — hint mode dismissed, all overlays removed
8. `Escape` clears hint mode, `Backspace` removes last typed char, re-pressing `f` rescans fresh
9. Move hint DOM into Shadow DOM container — page CSS cannot bleed in, `aria-hidden="true"` on host
10. Shift held during match → if target is `a[href]`, send `OPEN_NEW_TAB` message to background → `chrome.tabs.create`
11. Background service worker receives `OPEN_NEW_TAB` and `ACTIVATE` messages, relays commands to active tab
12. Overlap detection via `rbush` R-tree — intersecting rects grouped into stacks, sorted by z-index then DOM order
13. `Space` cycles to next layer — shows next element in each stack, rerenders labels for that layer's count
14. Layer indicator shows `"Layer 2/4"` in viewport corner — hidden when only one layer exists
15. After deepest layer, `Space` wraps back to Layer 1
16. Guard: if `document.activeElement` is input/textarea/contenteditable, suppress `f` key entirely
17. "No hints" toast rendered if scan returns zero elements — auto-dismisses after 1 second
18. Options page reads/writes all 9 settings via `chrome.storage.sync` — hotkey, charset, colors, font size, opacity
19. Content script listens to `chrome.storage.onChanged` — settings update live without page reload
20. Hint matched chars rendered in `matchColor` — typed prefix visually distinguished from remaining chars
21. Scan open shadow roots on the page — best-effort detection of elements inside third-party shadow DOMs
22. Content script runs per-frame in iframes — hints appear independently inside each frame
23. On page navigation during hint mode — all overlays removed cleanly, no residual listeners or DOM artifacts
24. Performance: scan + render under 100ms for 500 elements, keystroke filter under 16ms, layer switch under 50ms