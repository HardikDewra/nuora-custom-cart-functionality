# Nuora Custom Cart - Technical Implementation Brief

**For:** Tomide (Developer)
**From:** Hardik (CRO)
**Date:** March 2026
**Scope:** Custom cart drawer + custom /cart page, sitewide (theme + Replo pages)

---

## 1. What We're Building

Two interconnected components that share the same JS module and data layer:

**Component A - Cart Drawer (slide-out panel)**
Triggers when user clicks the cart icon anywhere on the site. Slides in from the right. Contains line items, cross-sells, free shipping bar, bundle upsells, and checkout CTA.

**Component B - Custom /cart Page**
Full-page cart experience at `/pages/cart`. The default Shopify `/cart` route should redirect here (via theme Liquid or JS redirect). Same features as the drawer but with more room for cross-sell cards, trust badges, and detailed subscription info.

Both must work on:
- Theme pages (homepage, collection pages, blog)
- Replo-built pages (PDPs, presell pages, listicles)
- Any page where a product gets added to cart

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  nuora-cart.js                        │
│              (single vanilla JS module)               │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Cart State   │  │ Cart Drawer  │  │ /cart Page   │ │
│  │ Manager      │  │ Component    │  │ Component    │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                │                  │         │
│         └────── Shopify Cart AJAX API ──────┘         │
│                                                       │
│  Endpoints used:                                      │
│  GET  /cart.js          (fetch current cart)           │
│  POST /cart/add.js      (add items w/ selling_plan)   │
│  POST /cart/change.js   (update qty, selling_plan)    │
│  POST /cart/update.js   (bulk updates, cart attrs)    │
│  POST /cart/clear.js    (clear cart)                  │
└──────────────────────────────────────────────────────┘
```

### Injection Strategy

**On theme pages:**
Load `nuora-cart.js` via `theme.liquid` before `</body>`. This gives it sitewide coverage. The script should:
1. Intercept all `[data-add-to-cart]` form submissions and Shopify theme add-to-cart events
2. Inject the cart drawer HTML into the DOM on load
3. Listen for the custom event `cart:open` to trigger the drawer
4. Hijack the theme's cart icon click to open the drawer instead of navigating to `/cart`

**On Replo pages:**
Replo pages load inside the theme layout, so `theme.liquid` injection covers them automatically. But Replo's add-to-cart actions use their own JS - Tomide needs to ensure Replo's add-to-cart fires a `cart:refresh` custom event that the cart module listens to.

```javascript
// After any add-to-cart action (theme or Replo), fire this:
document.dispatchEvent(new CustomEvent('cart:refresh'));

// The cart module listens:
document.addEventListener('cart:refresh', async () => {
  const cart = await fetch(window.Shopify.routes.root + 'cart.js').then(r => r.json());
  updateCartState(cart);
  renderCartDrawer(cart);
  openDrawer();
});
```

---

## 3. Cart Drawer - Specs

### Layout (Mobile-First, 375px base)

```
┌─────────────────────────────────────┐
│  YOUR CART (3)              [X]     │  <- Header w/ item count + close
├─────────────────────────────────────┤
│  ████████ $32 away from FREE ship!  │  <- Free shipping progress bar
├─────────────────────────────────────┤
│  ┌─────┐                            │
│  │ IMG │  Product Title             │
│  │     │  Variant: 3 Bottles        │
│  └─────┘  Subscribe & Save - 30 Day │  <- SKIO selling plan name
│           Saves 35% every order     │  <- Discount percentage
│           [-] 1 [+]      $99.00     │  <- Qty adjuster + line price
│           Strikethrough: $152.00    │  <- Compare at price
│           [Remove]                  │
├─────────────────────────────────────┤
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  <- Divider
│                                     │
│  COMPLETE YOUR ROUTINE              │  <- Cross-sell header
│  ┌─────────────────────────────┐    │
│  │ Gut Ritual Capsules         │    │
│  │ $29.99  ~~$51.00~~          │    │
│  │ [+ ADD TO CART]             │    │
│  └─────────────────────────────┘    │
│                                     │
│  UPGRADE & SAVE                     │  <- Bundle upsell header
│  ┌─────────────────────────────┐    │
│  │ Switch to 3-Pack: Save 42%  │    │
│  │ $99/quarter vs $152         │    │
│  │ [UPGRADE]                   │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  Subtotal:              $99.00      │
│  Shipping:              FREE        │
│  You save:              $53.00      │  <- Total savings callout
│                                     │
│  ┌─────────────────────────────┐    │
│  │      CHECKOUT - $99.00      │    │  <- Primary CTA
│  └─────────────────────────────┘    │
│  🔒 Secure checkout by Shopify     │
│  30-day money back guarantee        │
└─────────────────────────────────────┘
```

### Drawer Behavior

- Width: 420px desktop, 100% mobile (with 16px padding)
- Slides in from right with overlay backdrop (rgba black, 0.5 opacity)
- Body scroll locks when drawer is open
- Close on: X button, overlay click, Escape key
- Cart icon badge updates with item count globally

---

## 4. SKIO Subscription Details in Cart

When a line item has a `selling_plan` attached, the cart response from `/cart.js` includes selling plan allocation data. Here's how to extract and display it:

### Reading Selling Plan Data from Cart API

```javascript
// Fetch cart
const cart = await fetch(window.Shopify.routes.root + 'cart.js').then(r => r.json());

cart.items.forEach(item => {
  // Check if item has a selling plan (subscription)
  if (item.selling_plan_allocation) {
    const plan = item.selling_plan_allocation.selling_plan;

    // plan.name = "Delivery every 30 Days" or "Delivery every 90 Days"
    // plan.id = selling plan ID (number)

    // Price data
    const priceAdj = item.selling_plan_allocation.price_adjustments[0];
    // priceAdj.price = subscription price in cents
    // priceAdj.compare_at_price = original price in cents
    // priceAdj.position = adjustment position (0 = first)

    // Per delivery price
    const perDeliveryPrice = item.selling_plan_allocation.per_delivery_price; // cents

    // Display example:
    // "Subscribe & Save - Every 30 Days"
    // "$99.00/delivery (Save 35%)"
  }
});
```

### Additional SKIO Data (Optional)

If Shopify's cart response doesn't give enough selling plan detail (like billing interval vs delivery interval), hit SKIO's storefront API:

```javascript
// POST https://api.skio.com/storefront-v2-http/get-product-variant-selling-plans
// Body: { "productVariantPlatformId": "gid://shopify/ProductVariant/VARIANT_ID" }
// Returns full selling plan groups with billing/delivery intervals
```

This is optional - the Shopify cart API should have enough for display purposes. Only use this if you need to show billing cadence separately from delivery cadence (e.g., "Billed quarterly, delivered every 90 days").

### What to Display Per Subscription Line Item

| Element | Source | Example |
|---------|--------|---------|
| Plan name | `selling_plan_allocation.selling_plan.name` | "Delivery every 30 Days" |
| Subscription price | `selling_plan_allocation.per_delivery_price` | $99.00 |
| Compare at price | `selling_plan_allocation.price_adjustments[0].compare_at_price` | $152.00 |
| Savings % | Calculate: `(1 - price/compare_at_price) * 100` | Save 35% |
| Cadence badge | Parse from plan name or use SKIO API | "Monthly" / "Quarterly" |

---

## 5. Cross-Sell Logic

### Product Mapping (Hardcoded for Now)

```javascript
const CROSS_SELL_MAP = {
  // If cart contains any gummies product, offer capsules
  'gummies': {
    triggerHandles: [
      'feminine-balance-gummies-1',
      'nuora-vaginal-probiotic-gummies',
      // Add all gummy product handles here
    ],
    offer: {
      handle: 'gut-ritual-capsules',        // Product handle to fetch
      variantId: null,                       // Fetch dynamically from product.js
      headline: 'Complete Your Routine',
      subline: 'Support your gut health alongside vaginal balance',
      discountPrice: 2999,                   // $29.99 in cents (or fetch from variant)
      compareAtPrice: 5100,                  // $51.00 in cents
    }
  },
  // If cart contains capsules, offer gummies
  'capsules': {
    triggerHandles: [
      'gut-ritual-capsules',
    ],
    offer: {
      handle: 'feminine-balance-gummies-1',
      variantId: null,
      headline: 'Complete Your Routine',
      subline: 'Balance your vaginal pH with our probiotic gummies',
      discountPrice: null,                   // Fetch from product
      compareAtPrice: null,
    }
  }
};
```

### Cross-Sell Fetch Logic

```javascript
async function getCrossSellOffer(cartItems) {
  // Check what's in the cart
  const cartHandles = cartItems.map(item => item.handle);

  for (const [key, config] of Object.entries(CROSS_SELL_MAP)) {
    const hasTrigger = config.triggerHandles.some(h => cartHandles.includes(h));
    const alreadyInCart = cartHandles.includes(config.offer.handle);

    if (hasTrigger && !alreadyInCart) {
      // Fetch product data for the cross-sell
      const product = await fetch(
        window.Shopify.routes.root + `products/${config.offer.handle}.js`
      ).then(r => r.json());

      return {
        ...config.offer,
        product,
        variantId: product.variants[0].id,
        image: product.featured_image,
        price: config.offer.discountPrice || product.variants[0].price,
        compareAt: config.offer.compareAtPrice || product.variants[0].compare_at_price,
      };
    }
  }
  return null; // No cross-sell to show
}
```

### Adding Cross-Sell to Cart

```javascript
async function addCrossSellToCart(variantId, sellingPlanId = null) {
  const body = {
    id: variantId,
    quantity: 1,
  };
  if (sellingPlanId) body.selling_plan = sellingPlanId;

  await fetch(window.Shopify.routes.root + 'cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [body] }),
  });

  document.dispatchEvent(new CustomEvent('cart:refresh'));
}
```

---

## 6. Free Shipping Progress Bar

### Configuration

```javascript
const FREE_SHIPPING_THRESHOLD = 10000; // $100.00 in cents (adjust as needed)
```

### Logic

```javascript
function getShippingProgress(cartTotal) {
  const remaining = FREE_SHIPPING_THRESHOLD - cartTotal;

  if (remaining <= 0) {
    return {
      qualified: true,
      percentage: 100,
      message: "You've unlocked FREE shipping!",
      remaining: 0,
    };
  }

  return {
    qualified: false,
    percentage: Math.round((cartTotal / FREE_SHIPPING_THRESHOLD) * 100),
    message: `$${(remaining / 100).toFixed(2)} away from FREE shipping!`,
    remaining,
  };
}
```

### Visual

- Progress bar background: light gray (#F0F0F0)
- Progress fill: Nuora brand brown
- Animate width on cart update (CSS transition, 300ms ease)
- When threshold is met, change text color to green and add a checkmark icon
- Bar sits at the top of the cart drawer, always visible

---

## 7. Bundle Upsell (Upgrade to Higher Pack)

### Logic

When someone has a 1-bottle variant in the cart, show the upgrade prompt to 3-pack.

```javascript
function getBundleUpsell(cartItems) {
  for (const item of cartItems) {
    // Check if this is a 1-pack variant (by variant title or option)
    const variantTitle = item.variant_title?.toLowerCase() || '';
    const is1Pack = variantTitle.includes('1 bottle') || variantTitle.includes('1 pack');

    if (is1Pack) {
      // Fetch the same product to get the 3-pack variant
      return {
        currentItem: item,
        upgradeMessage: 'Switch to 3-Pack & Save 42%',
        // The 3-pack variant ID needs to be mapped per product
        // Fetch from product.js dynamically
      };
    }
  }
  return null;
}
```

### Upgrade Action

When user clicks "UPGRADE":
1. Remove the current 1-pack line item via `/cart/change.js` (set quantity to 0)
2. Add the 3-pack variant via `/cart/add.js` (with selling_plan if they had a subscription)
3. Refresh cart state

```javascript
async function upgradeToPack(currentItemKey, newVariantId, sellingPlanId) {
  // Remove current item
  await fetch(window.Shopify.routes.root + 'cart/change.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: currentItemKey, quantity: 0 }),
  });

  // Add upgraded variant
  const addBody = { id: newVariantId, quantity: 1 };
  if (sellingPlanId) addBody.selling_plan = sellingPlanId;

  await fetch(window.Shopify.routes.root + 'cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [addBody] }),
  });

  document.dispatchEvent(new CustomEvent('cart:refresh'));
}
```

---

## 8. Quantity Upsell

When the quantity adjuster is used, show dynamic savings messaging:

```javascript
function getQuantityMessage(quantity, unitPrice) {
  // Example tiered discount messaging
  if (quantity >= 3) return { badge: 'Best Value', savings: '42% OFF' };
  if (quantity >= 2) return { badge: 'Popular', savings: '25% OFF' };
  return null;
}
```

Alternatively, if the product has separate multi-pack variants (1 Bottle, 3 Bottles), the quantity adjuster on the cart should NOT increment quantity of the same variant - it should prompt the bundle upsell instead. This avoids someone ordering qty 3 of a 1-bottle variant (which ships 3 separate bottles with no discount) vs qty 1 of a 3-bottle variant (which ships the bundle at discount).

**Decision for Hardik:** Do you want the quantity adjuster to:
- **(A)** Increment qty normally and show savings messaging, OR
- **(B)** Hide qty adjuster entirely and only show bundle upgrade prompts?

Option B is safer given the SKIO/Ka-ching SKU mapping issues you've had with quantity logic.

---

## 9. Custom /cart Page

### Route Setup

**Option 1 (Recommended): Replo page at `/pages/cart`**
Build the cart page in Replo as a custom page. Add a JS redirect in `theme.liquid`:

```javascript
// Redirect /cart to custom cart page
if (window.location.pathname === '/cart') {
  window.location.replace('/pages/cart');
}
```

**Option 2: Override theme cart template**
Edit the theme's `templates/cart.liquid` (or `cart.json` for JSON templates) to render a completely custom layout. More tightly integrated but harder to A/B test.

### /cart Page Layout

Same features as the drawer but expanded:

```
┌──────────────────────────────────────────────────────────────┐
│  NUORA LOGO                                    [Continue  ]  │
│                                                [Shopping  ]  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  YOUR CART (3 items)                                          │
│                                                               │
│  ████████████████████ FREE shipping unlocked! ████████████   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [IMG]  Feminine Balance Gummies - 3 Bottles           │  │
│  │         Subscribe & Save - Every 90 Days               │  │
│  │         Saves 42% every delivery                       │  │
│  │         [-] 1 [+]                           $99.00     │  │
│  │                                    was: $152.00        │  │
│  │         [Remove]                                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────── COMPLETE YOUR ROUTINE ────────────────────┐   │
│  │                                                        │  │
│  │  [IMG] Gut Ritual Capsules                             │  │
│  │  One-time: $29.99 (was $51)                            │  │
│  │  ★★★★★ 2,400+ reviews                                 │  │
│  │  "Cleared my bloating in 2 weeks"                      │  │
│  │  [+ ADD TO ORDER]                                      │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────── ORDER SUMMARY ────────────────────────────┐   │
│  │  Subtotal:                                $99.00       │  │
│  │  Shipping:                                FREE         │  │
│  │  Estimated Tax:                           $0.00        │  │
│  │  ─────────────────────────────────────────────         │  │
│  │  Total:                                   $99.00       │  │
│  │  You're saving $53.00 on this order                    │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐      │  │
│  │  │           CHECKOUT - $99.00                  │      │  │
│  │  └──────────────────────────────────────────────┘      │  │
│  │  🔒 Secure checkout  |  Free returns  |  Cancel anytime│  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ★★★★★ Trusted by 50,000+ women                              │
│  As seen in: [logos]                                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. Cart State Manager (Core Module)

The single source of truth. Both the drawer and /cart page subscribe to this.

```javascript
// nuora-cart.js - Core module

const NuoraCart = (() => {
  let state = {
    cart: null,
    isDrawerOpen: false,
    crossSellOffer: null,
    bundleUpsell: null,
    shippingProgress: null,
  };

  const listeners = [];

  function subscribe(fn) {
    listeners.push(fn);
  }

  function notify() {
    listeners.forEach(fn => fn(state));
  }

  async function refresh() {
    const root = window.Shopify.routes.root;
    state.cart = await fetch(root + 'cart.js').then(r => r.json());
    state.crossSellOffer = await getCrossSellOffer(state.cart.items);
    state.bundleUpsell = getBundleUpsell(state.cart.items);
    state.shippingProgress = getShippingProgress(state.cart.total_price);
    notify();
    updateCartBadge(state.cart.item_count);
  }

  async function addItem(variantId, quantity = 1, sellingPlan = null) {
    const body = { items: [{ id: variantId, quantity }] };
    if (sellingPlan) body.items[0].selling_plan = sellingPlan;

    await fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await refresh();
  }

  async function updateItem(lineItemKey, quantity) {
    await fetch(window.Shopify.routes.root + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lineItemKey, quantity }),
    });
    await refresh();
  }

  async function removeItem(lineItemKey) {
    await updateItem(lineItemKey, 0);
  }

  function openDrawer() {
    state.isDrawerOpen = true;
    document.body.style.overflow = 'hidden';
    notify();
  }

  function closeDrawer() {
    state.isDrawerOpen = false;
    document.body.style.overflow = '';
    notify();
  }

  function updateCartBadge(count) {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? '' : 'none';
    });
  }

  // Initialize
  async function init() {
    await refresh();

    // Listen for add-to-cart events from theme forms
    document.addEventListener('submit', async (e) => {
      const form = e.target.closest('form[action="/cart/add"]');
      if (!form) return;
      e.preventDefault();

      const formData = new FormData(form);
      const id = formData.get('id');
      const qty = formData.get('quantity') || 1;
      const sellingPlan = formData.get('selling_plan');

      await addItem(parseInt(id), parseInt(qty), sellingPlan ? parseInt(sellingPlan) : null);
      openDrawer();
    });

    // Listen for custom refresh events (from Replo, etc.)
    document.addEventListener('cart:refresh', refresh);
    document.addEventListener('cart:open', openDrawer);
    document.addEventListener('cart:close', closeDrawer);

    // Hijack cart icon clicks
    document.querySelectorAll('a[href="/cart"], .cart-icon, [data-cart-trigger]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
      });
    });
  }

  return { init, subscribe, refresh, addItem, updateItem, removeItem, openDrawer, closeDrawer, getState: () => state };
})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', NuoraCart.init);
} else {
  NuoraCart.init();
}
```

---

## 11. Important SKIO/Selling Plan Gotchas

Based on past issues with Ka-ching and SKIO:

1. **Use `line item key` not `variant_id` for cart/change.js** - Multiple line items can share the same variant_id if they have different selling plans. Always use the unique `key` property from the cart item.

2. **Selling plan IDs are per selling plan group** - If you have duplicated products for A/B tests, each has its own selling plan group with different IDs. The cross-sell logic needs to know which variant+selling_plan combo to use.

3. **Don't mix Ka-ching bundles with cart AJAX** - If Ka-ching is still active on any products, its bundle logic may conflict with direct cart API calls. Confirm with Elliot which products are fully on SKIO selling plans only.

4. **cart/clear before subscription checkout (legacy pattern)** - The old Nuora buy boxes used `cart/clear → cart/add → /checkout` URLs for subscriptions. The new cart module should replace this pattern. Subscriptions added through the Cart AJAX API with `selling_plan` parameter will flow through Shopify checkout normally.

5. **Currency handling** - Cart API returns prices in the presentment currency. Use `Shopify.currency.active` to get the currency code and format prices accordingly. Don't hardcode `$`.

---

## 12. File Structure

```
/assets/
  nuora-cart.js          <- Core cart state manager + drawer component
  nuora-cart.css         <- All cart styles (drawer + /cart page)

/snippets/
  nuora-cart-drawer.liquid  <- Drawer HTML shell (rendered server-side, hydrated by JS)

/templates/
  (no changes if using Replo for /cart page)

/layout/
  theme.liquid           <- Add <script> tag for nuora-cart.js before </body>
                         <- Add /cart redirect JS if using Replo cart page
```

---

## 13. Checkout Flow

**Checkout CTA in the cart should use:**

```javascript
// Standard Shopify checkout redirect
window.location.href = '/checkout';
```

Since items are already in the Shopify cart with selling plans attached via the Cart AJAX API, the checkout will automatically:
- Show subscription details
- Apply selling plan pricing
- Create the SKIO subscription on order completion

No more `cart/clear → cart/add` URL hacks needed. The cart IS the source of truth now.

---

## 14. Testing Checklist for Tomide

- [ ] Cart drawer opens on add-to-cart from theme product pages
- [ ] Cart drawer opens on add-to-cart from Replo pages
- [ ] Cart drawer shows correct selling plan name for subscription items
- [ ] Cart drawer shows savings % for subscription vs one-time
- [ ] Cross-sell shows when gummies are in cart (offers capsules)
- [ ] Cross-sell shows when capsules are in cart (offers gummies)
- [ ] Cross-sell disappears when the offered product is already in cart
- [ ] Free shipping bar calculates correctly and animates
- [ ] Free shipping bar updates on item add/remove
- [ ] Bundle upsell shows for 1-pack variants
- [ ] Bundle upgrade swaps variant correctly (preserves selling plan)
- [ ] Quantity adjuster works and refreshes totals
- [ ] Remove item works
- [ ] Cart icon badge updates globally
- [ ] `/cart` redirects to custom cart page
- [ ] Custom cart page renders same data as drawer
- [ ] Checkout button goes to Shopify checkout with all items + selling plans
- [ ] Works on mobile (375px - 428px viewport)
- [ ] Works on desktop (1280px+)
- [ ] Currency formatting works for international visitors
- [ ] No conflicts with Ka-ching on any active product
- [ ] No conflicts with SKIO widget on PDPs

---

## 15. Open Questions for Hardik

1. **Free shipping threshold** - What's the current free shipping minimum? Or is shipping always free?
2. **Cross-sell pricing** - Is $29.99 for capsules still the correct cross-sell price? Should it be a one-time purchase or subscription add?
3. **Quantity adjuster behavior** - Increment qty normally OR hide it and only show bundle upgrades? (See Section 8)
4. **Empty cart state** - What should the drawer show when cart is empty? Recommended products? CTA to shop?
5. **Cart icon animation** - Shake/bounce on add-to-cart?
6. **A/B testing** - Do we want to test the cart drawer design with Elevate? If so, we may need to support a `cart:variant` flag.
