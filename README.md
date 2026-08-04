# DGDsmart — Website

Single-page site for DGDsmart, a computer store and electronics repair service in
Gostivar, North Macedonia. Plain HTML, CSS and JavaScript — no build step, no dependencies.

## Files

| File | What's in it |
|------|--------------|
| `index.html` | All page content, plus the `LocalBusiness` structured data in `<head>` |
| `style.css` | Design system (CSS variables at the top) and every component style |
| `script.js` | Navigation, scroll effects, repair tabs, repair form, open/closed badge |
| `images/` | Logo, favicon and photography |

## Running it locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>. (Opening `index.html` directly as a `file://` URL
also works, but a server matches production more closely.)

## Editing the things that change most

**Contact details** appear in several places — update all of them together:
`index.html` structured data (`<head>`), the Contact section, the footer, the
"Prefer to just talk?" card, and the floating buttons. Phone numbers also live in
`script.js` as `SHOP.whatsapp`.

**Opening hours** are set in two places: the Contact section text, and `SHOP` in
`script.js` (`openHour`, `closeHour`, `openDays`) which drives the Open/Closed badge.

**Repair prices and turnaround times** are deliberately left out of the repair
catalog so nothing inaccurate goes live. To add them, follow the comment above
`.repair-panels` in `index.html` — the `.repair-price` and `.repair-time` styles
are already written.

**Customer reviews**: the Reviews section currently links to Google and Instagram
rather than showing quotes. There is a commented-out testimonial card template in
that section — paste real reviews into it when you have them.

**Colours**: everything derives from the CSS variables in `:root` at the top of
`style.css`. Blue and cyan mark the store side (products, navigation); amber marks
the workshop side (repairs, "book" actions). Changing a variable updates the whole site.

## The repair form

The form does not send anything on its own and stores nothing — there is no backend.
It validates the fields, then opens either WhatsApp or the visitor's mail app with the
details already written out, and the visitor presses send.
