# Accessible Tabs Component

An accessible, responsive, dependency-free tabs component built with **vanilla HTML, CSS and JavaScript**.
Week 2 task: *Developing Interactive UI Components*.

## Features
- WAI-ARIA Tabs pattern: `tablist`, `tab`, `tabpanel`, `aria-selected`, `aria-controls`, `aria-labelledby`
- Keyboard navigation: `←` `→` (wrapping), `Home`, `End`, `Enter` / `Space`
- Two activation modes: **auto** (default) and **manual**
- Animated panel transition and sliding indicator (disabled for `prefers-reduced-motion`)
- Deep linking through the URL hash (`index.html#pricing`)
- Responsive: tab list scrolls horizontally on small screens, 44px touch targets
- Light and dark theme via CSS custom properties
- Reusable: any number of instances per page, plus `destroy()`
- Error handling and fallbacks (see below)

## Project structure
```
accessible-tabs/
├── index.html        Demo page (two instances)
├── css/tabs.css      Styles, tokens, states, responsive, motion, no-JS fallback
├── js/tabs.js        Tabs class (public API: Tabs, Tabs.initAll, select, destroy)
├── docs/             Project documentation (Word)
├── README.md
└── .gitignore
```

## Quick start
1. Open `index.html` in a browser (no build step or server needed).
2. Or embed it in your own page:

```html
<link rel="stylesheet" href="css/tabs.css">

<div class="tabs" data-tabs>
  <ul class="tabs__list" data-tabs-list aria-label="Example">
    <li><a href="#one">One</a></li>
    <li><a href="#two">Two</a></li>
  </ul>
  <div class="tabs__panel" id="one" data-tabs-panel>First panel</div>
  <div class="tabs__panel" id="two" data-tabs-panel>Second panel</div>
</div>

<script src="js/tabs.js"></script>
<script>Tabs.initAll();</script>
```
Also add `class="no-js"` on `<html>` and the one-line script from `index.html` that swaps it to `js`.

## Options
Set as data attributes on the `[data-tabs]` element, or pass an object: `new Tabs(el, { activation: 'manual' })`.

| Option | Attribute | Default | Description |
|---|---|---|---|
| `activation` | `data-tabs-activation` | `auto` | `auto` shows a panel on focus; `manual` needs Enter/Space |
| `animate` | `data-tabs-animate` | `true` | Panel enter animation (`"false"` to disable) |
| `deepLink` | `data-tabs-deep-link` | `true` | Sync active tab with `location.hash` |

## API
- `Tabs.initAll([scope])` – initialise all `[data-tabs]` elements
- `instance.select(index)` – activate a tab programmatically
- `instance.destroy()` – remove listeners/ARIA and restore original markup
- Event `tabs:change` (bubbles) – `event.detail = { index, tab, panel }`

## How to test
**Mouse / touch:** click each tab; the panel, underline and URL hash update.

**Keyboard (Demo 1):** press `Tab` to focus the active tab, then `→`, `←`, `Home`, `End`. Focus wraps at the ends. Press `Tab` again to move into the panel.

**Keyboard (Demo 2, manual):** arrows move focus only; `Enter` or `Space` opens the panel.

**Deep link:** open `index.html#pricing`; the Pricing tab is selected. Change the hash and the tab follows.

**Responsive:** narrow the window below 480px, or use DevTools device mode; the tab list scrolls sideways.

**Reduced motion:** enable "Reduce motion" in the OS (or DevTools > Rendering > Emulate); animations stop.

**No-JS fallback:** disable JavaScript in DevTools; all panels appear stacked and the links jump to them.

**Screen reader:** with NVDA, VoiceOver or JAWS, the tab list should announce "tab, 1 of 4, selected".

**Error handling:** in DevTools, edit a tab link to `href="#missing"` and reload; a console warning appears and all content stays visible.

## Error handling and fallbacks
- Feature detection prevents initialisation in browsers lacking required APIs.
- Invalid markup (missing list or panel) throws inside `try/catch`, warns in the console, and reverts to fully visible content.
- Double initialisation is prevented.
- `history.replaceState` and `CustomEvent` have guarded fallbacks.
- CSS keeps a readable layout when custom properties or JavaScript are unavailable.

## Browser support
Current Chrome, Edge, Firefox and Safari. Degrades to the no-JS layout in older browsers.

## Upload to GitHub
```bash
cd accessible-tabs
git init
git add .
git commit -m "Add accessible tabs component"
git branch -M main
git remote add origin https://github.com/sohamvrawool1910/accessible-tabs.git
git push -u origin main
```
(Create an empty repository named `accessible-tabs` on GitHub first.)

## License
MIT
