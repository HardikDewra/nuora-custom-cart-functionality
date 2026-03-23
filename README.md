# Nuora Custom Cart - Technical Spec

Technical implementation spec for Nuora's custom cart drawer and `/cart` page. This is a reference site for the dev team to follow during implementation.

## Live Site

**[View the spec site](https://hardikdewra.github.io/nuora-custom-cart-functionality/)**

## What This Is

An interactive documentation site covering:

- **Cart Drawer** - slide-out panel with line items, cross-sells, bundle upsells, free shipping bar
- **Custom /cart Page** - full-page cart at `/pages/cart` with expanded features
- **SKIO Integration** - selling plan data extraction and display
- **Architecture** - single vanilla JS module, Shopify Cart AJAX API
- **Testing Checklist** - 21-item interactive checklist with localStorage persistence

## Interactive Demo

The site includes a working cart demo where you can:

- Add/remove items and adjust quantities
- See cross-sells appear/disappear based on cart contents
- Upgrade from 1-pack to 3-pack (bundle upsell)
- Watch the free shipping progress bar update in real time
- Toggle between mobile and desktop viewport

## Team

| Role | Person | Responsibility |
|------|--------|----------------|
| CRO | Hardik | Spec author, decision maker |
| Dev | Tomide | Implementation |
| Design | Nikita | Brand guidelines, visual review |

## Brand Guidelines

All styling follows the Nuora Offer Engine brand config:

- **Heading font:** Americana BT Bold (fallback: Georgia, serif)
- **Body font:** Montserrat (Google Fonts)
- **Primary color:** Yellow (#FAC515)
- **Text color:** Brown-950 (#542C0D) - never pure black
- **Rules:** No shadows, no gradients, no glow effects, 1px border-radius max, light mode only

## Files

```
index.html    - Main spec site
styles.css    - All styles (Nuora brand system)
script.js     - Cart demo, checklist, code copy, nav
README.md     - This file
nuora-custom-cart-brief.md              - Full technical brief for Tomide
Claude-Custom checkout carts for Nuora brand.md  - Original conversation export
```

## Open Questions

Six decisions needed from Hardik before implementation starts - see the "Open Questions" section on the site.
