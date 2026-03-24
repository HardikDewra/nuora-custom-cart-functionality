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
- **Border radius:** 4px on all elements
- **Hover states:** Go lighter (rgba white overlay), never darker
- **Rules:** No shadows, no gradients, no glow effects, light mode only

## Files

### Spec Site (GitHub Pages)
```
index.html    - Main spec site
styles.css    - All styles (Nuora brand system)
script.js     - Cart demo, checklist, code copy, nav
```

### Production Code (for Shopify theme)
```
nuora-cart-drawer.liquid  - Drawer HTML (upload to /snippets/)
nuora-cart-drawer.css     - Drawer styles (upload to /assets/)
nuora-cart-drawer.js      - Drawer logic + cart state manager (upload to /assets/)
```

### Installation (Tomide)
1. Upload `nuora-cart-drawer.liquid` to `/snippets/`
2. Upload `nuora-cart-drawer.css` to `/assets/`
3. Upload `nuora-cart-drawer.js` to `/assets/`
4. In `layout/theme.liquid` `<head>`, add:
   ```liquid
   {{ 'nuora-cart-drawer.css' | asset_url | stylesheet_tag }}
   ```
5. In `layout/theme.liquid` before `</body>`, add:
   ```liquid
   {% render 'nuora-cart-drawer' %}
   <script src="{{ 'nuora-cart-drawer.js' | asset_url }}" defer></script>
   ```
6. The drawer auto-initializes and hijacks cart icon clicks + ATC forms sitewide
7. For Replo pages, fire `document.dispatchEvent(new CustomEvent('cart:refresh'))` after ATC

### Reference Docs
```
README.md                               - This file
nuora-custom-cart-brief.md              - Full technical brief
Claude-Custom checkout carts for Nuora brand.md  - Original conversation export
```

## Open Questions

Six decisions needed from Hardik before implementation starts - see the "Open Questions" section on the site.
