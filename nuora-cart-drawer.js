/**
 * Nuora Cart Drawer - Production JS
 *
 * Upload to: /assets/nuora-cart-drawer.js
 * Load in theme.liquid before </body>:
 *   <script src="{{ 'nuora-cart-drawer.js' | asset_url }}" defer></script>
 *
 * This is the COMPLETE cart drawer logic:
 * - Cart state management (single source of truth)
 * - Drawer open/close with body scroll lock
 * - Free shipping progress bar
 * - Cross-sell logic (gummies <-> capsules)
 * - Bundle upsell (1-pack -> 3-pack upgrade)
 * - SKIO selling plan display
 * - Currency formatting via Shopify.currency.active
 * - Cart icon badge updates
 * - Event listeners for theme forms + Replo ATC
 *
 * IMPORTANT:
 * - Uses line item KEY (not variant_id) for cart/change.js
 * - Prices from Cart API are in CENTS (divide by 100)
 * - Currency code from Shopify.currency.active (don't hardcode $)
 */

const NuoraCartDrawer = (() => {
  'use strict';

  // ==================== CONFIG ====================
  // FREE SHIPPING LOGIC:
  // Nuora ships free when total physical bottles/packs > 1.
  // Only single-bottle/single-pack orders pay for shipping.
  // This is NOT a dollar threshold - it's based on pack count.

  const CROSS_SELL_MAP = {
    gummies: {
      triggerHandles: [
        'feminine-balance-gummies-1',
        'nuora-vaginal-probiotic-gummies',
      ],
      offer: {
        handle: 'gut-capsule',
        headline: 'Women Who Added Capsules Saw Better Results',
        subline: '87% of women reported improved digestion within 2 weeks when combining both',
      }
    },
    capsules: {
      triggerHandles: [
        'gut-capsule',
        'gut-ritual-capsules',
      ],
      offer: {
        handle: 'feminine-balance-gummies-1',
        headline: 'Women Who Added Gummies Saw Better Results',
        subline: '92% of women reported faster vaginal pH balance when combining both',
      }
    }
  };

  // ==================== STATE ====================
  let cart = null;

  // ==================== HELPERS ====================

  /**
   * Format price using Shopify's active currency
   * IMPORTANT: Cart API returns prices in CENTS
   * Uses Shopify.currency.active for currency code
   */
  function formatMoney(cents) {
    const amount = cents / 100;
    try {
      const currencyCode = window.Shopify && window.Shopify.currency
        ? window.Shopify.currency.active
        : 'USD';
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch (e) {
      // Fallback if Intl fails
      return '$' + amount.toFixed(2);
    }
  }

  function getRoot() {
    return window.Shopify && window.Shopify.routes
      ? window.Shopify.routes.root
      : '/';
  }

  // ==================== CART API ====================

  async function fetchCart() {
    const res = await fetch(getRoot() + 'cart.js');
    cart = await res.json();
    return cart;
  }

  async function addToCart(variantId, quantity, sellingPlanId) {
    const item = { id: variantId, quantity: quantity || 1 };
    if (sellingPlanId) item.selling_plan = sellingPlanId;

    await fetch(getRoot() + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [item] }),
    });

    await fetchCart();
    render();
    openDrawer();
  }

  /**
   * IMPORTANT: Use line item KEY, not variant_id
   * Multiple items can share variant_id with different selling plans
   */
  async function changeItem(lineItemKey, quantity) {
    await fetch(getRoot() + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lineItemKey, quantity: quantity }),
    });

    await fetchCart();
    render();
  }

  async function removeItem(lineItemKey) {
    await changeItem(lineItemKey, 0);
  }

  /**
   * Bundle upgrade: remove 1-pack, add 3-pack
   * Preserves selling plan if subscription
   */
  async function upgradeToPack(currentItemKey, newVariantId, sellingPlanId) {
    // Remove current 1-pack
    await fetch(getRoot() + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentItemKey, quantity: 0 }),
    });

    // Add 3-pack
    const addBody = { id: newVariantId, quantity: 1 };
    if (sellingPlanId) addBody.selling_plan = sellingPlanId;

    await fetch(getRoot() + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [addBody] }),
    });

    await fetchCart();
    render();
  }

  // ==================== CROSS-SELL LOGIC ====================

  async function getCrossSellOffer() {
    if (!cart || !cart.items.length) return null;

    const cartHandles = cart.items.map(item => item.handle);

    for (const [key, config] of Object.entries(CROSS_SELL_MAP)) {
      const hasTrigger = config.triggerHandles.some(h => cartHandles.includes(h));
      const alreadyInCart = cartHandles.includes(config.offer.handle);

      if (hasTrigger && !alreadyInCart) {
        try {
          const product = await fetch(
            getRoot() + 'products/' + config.offer.handle + '.js'
          ).then(r => r.json());

          return {
            ...config.offer,
            product: product,
            variantId: product.variants[0].id,
            image: product.featured_image,
            title: product.title,
            price: product.variants[0].price,
            compareAtPrice: product.variants[0].compare_at_price,
          };
        } catch (e) {
          console.warn('[NuoraCart] Cross-sell product fetch failed:', e);
          return null;
        }
      }
    }
    return null;
  }

  // ==================== BUNDLE UPSELL LOGIC ====================

  function getBundleUpsell() {
    if (!cart || !cart.items.length) return null;

    for (const item of cart.items) {
      const variantTitle = (item.variant_title || '').toLowerCase();
      const is1Pack = variantTitle.includes('1 bottle')
        || variantTitle.includes('1 pack')
        || variantTitle.includes('1-pack');

      if (is1Pack) {
        return {
          currentItem: item,
          message: 'Switch to 3-Pack & Save 42%',
          // NOTE: Tomide - fetch the 3-pack variant ID dynamically
          // from the same product via /products/HANDLE.js
          // Find the variant where title includes '3 bottle' or '3 pack'
        };
      }
    }
    return null;
  }

  // ==================== SHIPPING PROGRESS ====================

  /**
   * Free shipping when total physical bottles/packs in cart > 1.
   * Only 1-bottle/1-pack orders pay for shipping.
   *
   * How it works:
   * - Parse variant_title for pack count ("3 Bottles", "2 Pack", etc.)
   * - Multiply by quantity
   * - If total physical units >= 2, shipping is free
   */
  function getPhysicalUnitCount() {
    if (!cart || !cart.items.length) return 0;

    let totalUnits = 0;

    cart.items.forEach(item => {
      const variantTitle = (item.variant_title || '').toLowerCase();

      // Extract pack/bottle count from variant title
      // Matches patterns like "3 bottles", "2 pack", "3 packs", "1 bottle"
      const match = variantTitle.match(/(\d+)\s*(bottle|pack|capsule)/);
      const unitsPerVariant = match ? parseInt(match[1]) : 1;

      totalUnits += unitsPerVariant * item.quantity;
    });

    return totalUnits;
  }

  function getShippingProgress() {
    if (!cart) return { qualified: false, percentage: 0, message: '' };

    const totalUnits = getPhysicalUnitCount();
    const qualified = totalUnits >= 2;

    if (qualified) {
      return {
        qualified: true,
        percentage: 100,
        message: "You've unlocked FREE shipping!",
      };
    }

    return {
      qualified: false,
      percentage: 50, // 1 out of 2 minimum units
      message: 'Add 1 more pack for FREE shipping!',
    };
  }

  // ==================== DRAWER OPEN/CLOSE ====================

  function openDrawer() {
    const drawer = document.getElementById('nuora-cart-drawer');
    const overlay = document.getElementById('nuora-cart-overlay');
    if (!drawer) return;

    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (overlay) {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('nuora-cart-open');
  }

  function closeDrawer() {
    const drawer = document.getElementById('nuora-cart-drawer');
    const overlay = document.getElementById('nuora-cart-overlay');
    if (!drawer) return;

    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('nuora-cart-open');
  }

  // ==================== EMPTY STATE PRODUCT SUGGESTIONS ====================

  const SUGGESTED_PRODUCTS = [
    {
      handle: 'feminine-balance-gummies-1',
      fallbackTitle: 'Vaginal Probiotic Gummies',
      fallbackPrice: 3499, // cents
      fallbackCompare: 5799,
      stars: 4.6,
      reviews: '11,800+',
      colorClass: 'is-yellow',
      tagline: 'Our #1 bestseller',
    },
    {
      handle: 'gut-capsule',
      fallbackTitle: 'Gut Ritual Capsules',
      fallbackPrice: 4900, // cents
      fallbackCompare: 6500,
      stars: 4.6,
      reviews: '11,800+',
      colorClass: 'is-rose',
      tagline: 'For bloating & gut health',
    },
  ];

  async function renderEmptyState() {
    const container = document.getElementById('drawerEmptyProducts');
    if (!container) return;

    let html = '';

    for (const item of SUGGESTED_PRODUCTS) {
      let title = item.fallbackTitle;
      let price = item.fallbackPrice;
      let compareAt = item.fallbackCompare;
      let image = '';
      let variantId = null;

      // Try to fetch live product data
      try {
        const product = await fetch(getRoot() + 'products/' + item.handle + '.js')
          .then(r => r.json());
        title = product.title;
        price = product.variants[0].price;
        compareAt = product.variants[0].compare_at_price || compareAt;
        image = product.featured_image
          ? product.featured_image.replace(/(\.[^.]+)$/, '_180x$1')
          : '';
        variantId = product.variants[0].id;
      } catch (e) {
        // Use fallbacks
      }

      html += '<div class="nuora-cart-drawer__suggest-card ' + item.colorClass + '">';

      // Image
      html += '<div class="nuora-cart-drawer__suggest-img ' + (item.colorClass === 'is-rose' ? 'is-rose' : '') + '">';
      if (image) {
        html += '<img src="' + image + '" alt="' + title + '" loading="lazy">';
      }
      html += '</div>';

      // Info
      html += '<div class="nuora-cart-drawer__suggest-info">';
      html += '<p class="nuora-cart-drawer__suggest-name">' + title + '</p>';
      html += '<p class="nuora-cart-drawer__suggest-meta">' + item.tagline + '</p>';
      html += '<p class="nuora-cart-drawer__suggest-stars">';
      // Star rating
      const fullStars = Math.floor(item.stars);
      for (let i = 0; i < fullStars; i++) html += '&#9733;';
      if (item.stars % 1 >= 0.5) html += '&#9733;';
      html += ' ' + item.reviews + ' reviews</p>';

      // Price
      html += '<div class="nuora-cart-drawer__suggest-price">';
      html += '<span class="nuora-cart-drawer__suggest-price-current">' + formatMoney(price) + '</span>';
      if (compareAt && compareAt > price) {
        html += '<span class="nuora-cart-drawer__suggest-price-compare">' + formatMoney(compareAt) + '</span>';
      }
      html += '</div>';

      // Add button
      if (variantId) {
        html += '<button class="nuora-cart-drawer__suggest-add ' + item.colorClass + '" data-variant-id="' + variantId + '">+ Add to Cart</button>';
      } else {
        html += '<a href="/products/' + item.handle + '" class="nuora-cart-drawer__suggest-add ' + item.colorClass + '" style="text-decoration:none;text-align:center;display:inline-block;">View Product</a>';
      }

      html += '</div>'; // info
      html += '</div>'; // card
    }

    html += '<a href="/collections/all" class="nuora-cart-drawer__empty-browse">Browse all products</a>';

    container.innerHTML = html;

    // Bind add buttons
    container.querySelectorAll('[data-variant-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const vid = parseInt(btn.dataset.variantId);
        btn.textContent = 'Adding...';
        await addToCart(vid, 1, null);
      });
    });
  }

  // ==================== RENDER ====================

  async function render() {
    if (!cart) return;

    const isEmpty = cart.item_count === 0;

    // Toggle empty state
    const emptyEl = document.getElementById('drawerEmpty');
    const itemsEl = document.getElementById('drawerItems');
    const scrollableEl = document.getElementById('drawerScrollable');
    const footerEl = document.querySelector('.nuora-cart-drawer__footer');
    const crossSellEl = document.getElementById('drawerCrossSell');
    const bundleEl = document.getElementById('drawerBundle');
    const shippingEl = document.getElementById('drawerShipping');

    if (emptyEl) emptyEl.style.display = isEmpty ? '' : 'none';
    if (scrollableEl) scrollableEl.style.display = isEmpty ? 'none' : '';
    if (footerEl) footerEl.style.display = isEmpty ? 'none' : '';
    if (shippingEl) shippingEl.style.display = isEmpty ? 'none' : '';

    // Cart count
    const countEl = document.getElementById('drawerCartCount');
    if (countEl) countEl.textContent = '(' + cart.item_count + ')';

    // Update all cart badges sitewide
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = cart.item_count;
      el.style.display = cart.item_count > 0 ? '' : 'none';
    });

    if (isEmpty) {
      if (crossSellEl) crossSellEl.style.display = 'none';
      if (bundleEl) bundleEl.style.display = 'none';
      renderEmptyState();
      return;
    }

    // ---- Line Items ----
    if (itemsEl) {
      let html = '';
      cart.items.forEach(item => {
        const hasSubscription = !!item.selling_plan_allocation;
        let planName = '';
        let savingsText = '';

        if (hasSubscription) {
          const plan = item.selling_plan_allocation.selling_plan;
          planName = plan.name || 'Subscription';
          const priceAdj = item.selling_plan_allocation.price_adjustments[0];
          if (priceAdj && priceAdj.compare_at_price > priceAdj.price) {
            const savingsPct = Math.round((1 - priceAdj.price / priceAdj.compare_at_price) * 100);
            savingsText = 'Saves ' + savingsPct + '% every order';
          }
        }

        const linePrice = item.final_line_price;
        const comparePrice = item.original_line_price;
        const imgSrc = item.image
          ? item.image.replace(/(\.[^.]+)$/, '_180x$1')
          : '';

        html += '<div class="nuora-cart-drawer__item">';

        // Image
        html += '<div class="nuora-cart-drawer__item-img">';
        if (imgSrc) {
          html += '<img src="' + imgSrc + '" alt="' + item.product_title + '" loading="lazy">';
        }
        html += '</div>';

        // Details
        html += '<div class="nuora-cart-drawer__item-details">';
        html += '<p class="nuora-cart-drawer__item-name">' + item.product_title + '</p>';
        if (item.variant_title) {
          html += '<p class="nuora-cart-drawer__item-variant">Variant: ' + item.variant_title + '</p>';
        }
        if (planName) {
          html += '<p class="nuora-cart-drawer__item-plan">' + planName + '</p>';
        }
        if (savingsText) {
          html += '<p class="nuora-cart-drawer__item-savings">' + savingsText + '</p>';
        }

        // Bottom row: qty + price
        html += '<div class="nuora-cart-drawer__item-bottom">';
        html += '<div class="nuora-cart-drawer__item-actions">';

        // Qty control
        html += '<div class="nuora-cart-drawer__qty">';
        html += '<button class="nuora-cart-drawer__qty-btn" data-action="decrease" data-key="' + item.key + '">-</button>';
        html += '<span class="nuora-cart-drawer__qty-value">' + item.quantity + '</span>';
        html += '<button class="nuora-cart-drawer__qty-btn" data-action="increase" data-key="' + item.key + '">+</button>';
        html += '</div>';

        // Remove
        html += '<button class="nuora-cart-drawer__remove" data-action="remove" data-key="' + item.key + '">Remove</button>';
        html += '</div>'; // actions

        // Price
        html += '<div class="nuora-cart-drawer__item-price">';
        html += '<div class="nuora-cart-drawer__price-current">' + formatMoney(linePrice) + '</div>';
        if (comparePrice > linePrice) {
          html += '<div class="nuora-cart-drawer__price-compare">' + formatMoney(comparePrice) + '</div>';
        }
        html += '</div>'; // price

        html += '</div>'; // bottom
        html += '</div>'; // details
        html += '</div>'; // item
      });

      itemsEl.innerHTML = html;

      // Bind qty/remove buttons
      itemsEl.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const key = btn.dataset.key;
          const action = btn.dataset.action;
          const item = cart.items.find(i => i.key === key);
          if (!item) return;

          if (action === 'remove') {
            await removeItem(key);
          } else if (action === 'decrease' && item.quantity > 1) {
            await changeItem(key, item.quantity - 1);
          } else if (action === 'increase') {
            await changeItem(key, item.quantity + 1);
          }
        });
      });
    }

    // ---- Shipping Bar ----
    const shipping = getShippingProgress();
    const shippingTextEl = document.getElementById('drawerShippingText');
    const shippingFillEl = document.getElementById('drawerShippingFill');

    if (shippingTextEl) {
      shippingTextEl.textContent = shipping.message;
      shippingTextEl.classList.toggle('is-qualified', shipping.qualified);
    }
    if (shippingFillEl) {
      shippingFillEl.style.width = shipping.percentage + '%';
      shippingFillEl.classList.toggle('is-qualified', shipping.qualified);
    }

    // ---- Subtotal / Total ----
    const subtotalEl = document.getElementById('drawerSubtotal');
    const totalEl = document.getElementById('drawerTotal');
    const checkoutTotalEl = document.getElementById('drawerCheckoutTotal');
    const shippingCostEl = document.getElementById('drawerShippingCost');
    const savingsEl = document.getElementById('drawerSavings');

    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
    if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
    if (checkoutTotalEl) checkoutTotalEl.textContent = formatMoney(cart.total_price);
    if (shippingCostEl) {
      shippingCostEl.textContent = shipping.qualified ? 'FREE' : 'Calculated at checkout';
    }

    // Savings
    const totalSavings = cart.original_total_price - cart.total_price;
    if (savingsEl) {
      if (totalSavings > 0) {
        savingsEl.textContent = 'You save ' + formatMoney(totalSavings) + ' on this order';
        savingsEl.style.display = '';
      } else {
        savingsEl.style.display = 'none';
      }
    }

    // ---- Cross-sell ----
    const offer = await getCrossSellOffer();
    if (crossSellEl) {
      if (offer) {
        crossSellEl.style.display = '';
        const cardEl = document.getElementById('drawerCrossSellCard');
        if (cardEl) {
          let csHtml = '';
          csHtml += '<div class="nuora-cart-drawer__cross-sell-img">';
          if (offer.image) csHtml += '<img src="' + offer.image + '" alt="' + offer.title + '" loading="lazy">';
          csHtml += '</div>';
          csHtml += '<div class="nuora-cart-drawer__cross-sell-info">';
          csHtml += '<p class="nuora-cart-drawer__cross-sell-name">' + offer.title + '</p>';
          csHtml += '<p class="nuora-cart-drawer__cross-sell-price">' + formatMoney(offer.price);
          if (offer.compareAtPrice && offer.compareAtPrice > offer.price) {
            csHtml += ' <span class="strike">' + formatMoney(offer.compareAtPrice) + '</span>';
          }
          csHtml += '</p></div>';
          csHtml += '<button class="nuora-cart-drawer__cross-sell-add" id="crossSellAddBtn">+ Add</button>';
          cardEl.innerHTML = csHtml;

          // Bind add button
          const addBtn = document.getElementById('crossSellAddBtn');
          if (addBtn) {
            addBtn.addEventListener('click', () => {
              addToCart(offer.variantId, 1, null);
            });
          }
        }
      } else {
        crossSellEl.style.display = 'none';
      }
    }

    // ---- Bundle Upsell ----
    const bundle = getBundleUpsell();
    if (bundleEl) {
      if (bundle) {
        bundleEl.style.display = '';
        // NOTE: Tomide needs to wire up the upgrade button
        // with the actual 3-pack variant ID fetched from the product
      } else {
        bundleEl.style.display = 'none';
      }
    }
  }

  // ==================== CHECKOUT ====================

  function goToCheckout() {
    window.location.href = '/checkout';
  }

  // ==================== EVENT LISTENERS ====================

  function bindEvents() {
    // Close button
    const closeBtn = document.getElementById('drawerClose');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    // Overlay click
    const overlay = document.getElementById('nuora-cart-overlay');
    if (overlay) overlay.addEventListener('click', closeDrawer);

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });

    // Checkout button
    const checkoutBtn = document.getElementById('drawerCheckout');
    if (checkoutBtn) checkoutBtn.addEventListener('click', goToCheckout);

    // Hijack cart icon clicks sitewide
    document.querySelectorAll(
      'a[href="/cart"], a[href="/cart/"], .cart-icon, [data-cart-trigger]'
    ).forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
      });
    });

    // Intercept theme add-to-cart form submissions
    document.addEventListener('submit', async (e) => {
      const form = e.target.closest('form[action="/cart/add"]');
      if (!form) return;
      e.preventDefault();

      const formData = new FormData(form);
      const variantId = formData.get('id');
      const qty = formData.get('quantity') || 1;
      const sellingPlan = formData.get('selling_plan');

      if (variantId) {
        await addToCart(
          parseInt(variantId),
          parseInt(qty),
          sellingPlan ? parseInt(sellingPlan) : null
        );
      }
    });

    // Listen for custom events (from Replo, custom scripts, etc.)
    document.addEventListener('cart:refresh', async () => {
      await fetchCart();
      render();
      openDrawer();
    });

    document.addEventListener('cart:open', openDrawer);
    document.addEventListener('cart:close', closeDrawer);
  }

  // ==================== INIT ====================

  async function init() {
    await fetchCart();
    render();
    bindEvents();
    console.log('[NuoraCart] Drawer initialized. Items:', cart ? cart.item_count : 0);
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return {
    init,
    openDrawer,
    closeDrawer,
    addToCart,
    changeItem,
    removeItem,
    upgradeToPack,
    fetchCart,
    render,
    getCart: () => cart,
    formatMoney,
  };
})();
