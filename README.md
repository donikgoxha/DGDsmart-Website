# DGDsmart — Website

Single-page site for DGDsmart, a computer store and electronics repair service in
Gostivar, North Macedonia. Plain HTML, CSS and JavaScript — no build step, no dependencies.

## Files

| File | What's in it |
|------|--------------|
| `index.html` | All page content, plus the `LocalBusiness` structured data in `<head>` |
| `style.css` | Design tokens (light + dark) and every component style |
| `script.js` | Spring engine, gestures, tabs, FAQ, theme, repair form |
| `images/` | Logo, favicon and photography |

## Running it locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Design system

**Two accent families, each with a meaning.** Blue is the store — products,
navigation, primary buttons. Orange is the workshop — repairs, service, "book"
labels. Everything else is neutral, which is what lets those two read as
information rather than decoration.

**Light and dark.** The page follows the operating system by default, and the
switch in the header overrides it and remembers the choice. All colours come from
the CSS variables in `:root` (and the `[data-theme="dark"]` block) at the top of
`style.css` — change a token and the whole site follows.

**Type.** Apple platforms get SF Pro from the system stack; everything else falls
back to Inter. Tracking is size-specific: large headings tighten (`-0.028em`),
body sits near zero. Spacing is in `rem`, so the layout grows with the reader's
text-size setting instead of breaking.

**Materials.** The header, the mobile sheet and the quick-action buttons are
translucent layers with content scrolling underneath, not opaque bars. The sheet
uses a thicker material than the small buttons, because a bigger surface should
read as heavier glass.

## Motion

Anything a finger can touch is driven by a spring in `script.js`, not by a CSS
transition. Springs animate from wherever a value currently is, so a gesture can
grab a moving element mid-flight and reverse it with no jump and no waiting.

The `Spring` class is parameterised the way Apple exposes it — `damping` (1.0
settles without overshoot, ~0.8 adds a little bounce) and `response` (roughly how
long it takes to arrive) rather than mass/stiffness/damping. One shared
`requestAnimationFrame` ticker drives every spring on the page.

The mobile menu is the clearest example: it tracks the finger 1:1, resists with a
rubber-band if you pull it above its open position, projects where a flick would
come to rest (the same exponential decay scroll uses) to decide whether to close,
hands the finger's release velocity straight to the spring so there is no seam
between dragging and animating, and can be caught again while it is closing.

`prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast`
are all honoured — reduced motion keeps the feedback and drops the travel rather
than removing the response.

## Editing the things that change most

**Contact details** appear in several places — update them together: the
structured data in `<head>`, the Book and Contact sections, the footer, and the
floating quick actions. The phone number and email also live in `script.js` as
`SHOP.whatsapp` and `SHOP.email`.

**Opening hours** are in two places: the Contact section text, and `SHOP` in
`script.js` (`openHour`, `closeHour`, `openDays`), which drives the Open/Closed
badge. The badge reads the shop's clock, not the visitor's.

**Repair prices and turnaround times** are deliberately left out of the repair
catalog so nothing inaccurate goes live. To add them, follow the comment above
`#repairPanels` in `index.html` — the `.pill` and `.pill-accent` styles are
already written.

**Customer reviews**: the Reviews section links to Google and Instagram rather
than showing quotes. There is a commented-out `.quote` template in that section —
paste real reviews into it when you have them.

## The repair form

The form has no backend and stores nothing. It validates the fields, then opens
either WhatsApp or the visitor's mail app with the details already written out,
and the visitor presses send.
