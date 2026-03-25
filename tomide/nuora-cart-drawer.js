/**
 * Nuora Cart Drawer — Production JS
 * ===================================
 * Merged: Our battle-tested fixes + Hardik's new features
 *
 * New from Hardik:
 *   - Free shipping based on multi-pack variant (not dollar threshold)
 *   - Social proof cross-sell headlines
 *   - Urgency timer (visual only, resets at 0)
 *   - Empty cart state with product suggestions
 *   - Savings text: "You're saving $X on your wellness routine"
 *   - Bundle upsell includes "+ FREE shipping" note
 *
 * Our fixes preserved:
 *   - compare_at_price from selling_plan_allocation level (not price_adjustments)
 *   - Dynamic SKIO plan names
 *   - Currency formatting (en-US for USD)
 *   - Fetch/XHR interceptors for Replo
 *   - Shipping bar !important for theme CSS conflicts
 *   - body.nuora-cart-open class for scroll lock
 *
 * Upload to: /assets/nuora-cart-drawer.js
 */

const NuoraCartDrawer = (() => {
    'use strict';
  
    // =========================================================================
    // EARLY INTERCEPTS — run before any other script
    // =========================================================================
    let _drawerReady = false;
    let _refreshFn = null;
    let _openFn = null;
  
    function _onCartAdd() {
      if (_drawerReady && _refreshFn && _openFn) {
        _openFn();
        _refreshFn();
      }
    }
  
    const _origFetch = window.fetch;
    window.fetch = function() {
      var url = arguments[0];
      var result = _origFetch.apply(this, arguments);
      if (typeof url === 'string' && url.includes('/cart/add')) {
        result.then(_onCartAdd).catch(function() {});
      }
      return result;
    };
  
    const _origXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      if (typeof url === 'string' && url.includes('/cart/add')) {
        this.addEventListener('load', _onCartAdd);
      }
      return _origXHROpen.apply(this, arguments);
    };
  
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href="/cart"], a[href*="/cart?"], a[href$="/cart"]');
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        if (_drawerReady && _refreshFn && _openFn) {
          _openFn();
          _refreshFn();
        }
      }
    }, true);
  
    // =========================================================================
    // CROSS-SELL MAP — social proof headlines (Hardik update)
    // =========================================================================
    const CROSS_SELL_MAP = {
      gummies: {
        triggerHandles: ['feminine-balance-gummies-1'],
        offer: {
          handle: 'gut-capsule',
          headline: 'Women Who Added Capsules Saw Better Results',
          subline: '87% reported improved digestion within 2 weeks when combining both',
        },
      },
      capsules: {
        triggerHandles: ['gut-capsule'],
        offer: {
          handle: 'feminine-balance-gummies-1',
          headline: 'Women Who Added Gummies Saw Better Results',
          subline: '92% reported faster vaginal pH balance when combining both',
        },
      },
    };
  
    // =========================================================================
    // EMPTY STATE PRODUCT SUGGESTIONS (Hardik update)
    // =========================================================================
    const SUGGESTED_PRODUCTS = [
      {
        handle: 'feminine-balance-gummies-1',
        fallbackTitle: 'Vaginal Probiotic Gummies',
        fallbackPrice: 3499,
        fallbackCompare: 5799,
        stars: 4.6,
        reviews: '11,800+',
        colorClass: 'is-yellow',
        tagline: 'Our #1 bestseller',
      },
      {
        handle: 'gut-capsule',
        fallbackTitle: 'Gut Ritual Capsules',
        fallbackPrice: 4900,
        fallbackCompare: 6500,
        stars: 4.5,
        reviews: '4,200+',
        colorClass: 'is-rose',
        tagline: 'For bloating & gut health',
      },
    ];
  
    // =========================================================================
    // STATE
    // =========================================================================
    let state = {
      cart: null,
      isDrawerOpen: false,
      isLoading: false,
      crossSellOffer: null,
      bundleUpsell: null,
      shippingProgress: null,
    };
  
    const productCache = {};
    const listeners = [];
  
    // =========================================================================
    // PUB/SUB
    // =========================================================================
    function subscribe(fn) {
      listeners.push(fn);
      return () => {
        const idx = listeners.indexOf(fn);
        if (idx > -1) listeners.splice(idx, 1);
      };
    }
  
    function notify() {
      listeners.forEach((fn) => {
        try { fn({ ...state }); }
        catch (err) { console.error('[NuoraCart] Listener error:', err); }
      });
    }
  
    // =========================================================================
    // HELPERS
    // =========================================================================
    const root = () => window.Shopify?.routes?.root || '/';
  
    async function shopifyFetch(endpoint, options = {}) {
      const url = root() + endpoint;
      const res = await _origFetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`[NuoraCart] ${endpoint} failed (${res.status}): ${text}`);
      }
      return res.json();
    }
  
    async function fetchProduct(handle) {
      if (productCache[handle]) return productCache[handle];
      const product = await shopifyFetch(`products/${handle}.js`);
      productCache[handle] = product;
      return product;
    }
  
    function formatMoney(cents) {
      if (cents == null) return '';
      const code = window.Shopify?.currency?.active || 'USD';
      try {
        const locale = code === 'USD' ? 'en-US' : undefined;
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: code,
        }).format(cents / 100);
      } catch {
        return `${code} ${(cents / 100).toFixed(2)}`;
      }
    }
  
    function getProductImageUrl(url, size) {
      if (!url) return '';
      size = size || '180x';
      return url.replace(/(\.[^.]+)$/, '_' + size + '$1');
    }
  
    // =========================================================================
    // SELLING PLAN — reads compare_at_price from allocation level (our fix)
    // =========================================================================
    function getSellingPlanInfo(item) {
      if (!item.selling_plan_allocation) return null;
  
      const spa = item.selling_plan_allocation;
      const plan = spa.selling_plan;
      const perDelivery = spa.per_delivery_price;
      const compareAt = spa.compare_at_price || 0;
  
      let savingsPercent = 0;
      if (compareAt > 0 && perDelivery < compareAt) {
        savingsPercent = Math.round((1 - perDelivery / compareAt) * 100);
      }
  
      let displayName = plan.name || '';
      displayName = displayName.replace(/^Delivery:?\s*/i, '').trim();
      if (!displayName) displayName = plan.name;
  
      return {
        planName: plan.name,
        planId: plan.id,
        displayName,
        perDeliveryPrice: perDelivery,
        compareAtPrice: compareAt,
        savingsPercent,
      };
    }
  
    // =========================================================================
    // FREE SHIPPING — multi-pack variant logic (Hardik update)
    // NOT dollar-based. Free when any variant is 2+ packs/bottles.
    // =========================================================================
    function hasMultiPackVariant(cartItems) {
      if (!cartItems || !cartItems.length) return false;
      return cartItems.some(function(item) {
        var vt = (item.variant_title || '').toLowerCase();
        var match = vt.match(/(\d+)\s*(bottle|pack|capsule)/);
        var units = match ? parseInt(match[1]) : 1;
        return units >= 2;
      });
    }
  
    function getShippingProgress(cartItems) {
      if (hasMultiPackVariant(cartItems)) {
        return {
          qualified: true,
          percentage: 100,
          message: "You've unlocked FREE shipping!",
        };
      }
      return {
        qualified: false,
        percentage: 50,
        message: 'Upgrade to 2+ packs for FREE shipping!',
      };
    }
  
    // =========================================================================
    // CROSS-SELL
    // =========================================================================
    async function getCrossSellOffer(cartItems) {
      var cartHandles = cartItems.map(function(item) { return item.handle; });
      for (var key in CROSS_SELL_MAP) {
        var config = CROSS_SELL_MAP[key];
        var hasTrigger = config.triggerHandles.some(function(h) { return cartHandles.indexOf(h) !== -1; });
        var alreadyInCart = cartHandles.indexOf(config.offer.handle) !== -1;
        if (hasTrigger && !alreadyInCart) {
          try {
            var product = await fetchProduct(config.offer.handle);
            var variant = product.variants[0];
            return {
              headline: config.offer.headline,
              subline: config.offer.subline,
              handle: config.offer.handle,
              product: product,
              variantId: variant.id,
              image: product.featured_image,
              title: product.title,
              price: variant.price,
              compareAtPrice: variant.compare_at_price,
            };
          } catch (err) {
            console.warn('[NuoraCart] Cross-sell fetch failed:', err);
            return null;
          }
        }
      }
      return null;
    }
  
    // =========================================================================
    // BUNDLE UPSELL — works for ALL products, includes free shipping note
    // =========================================================================
    async function getBundleUpsell(cartItems) {
      for (var i = 0; i < cartItems.length; i++) {
        var item = cartItems[i];
        var vt = (item.variant_title || '').toLowerCase();
        var is1Unit = vt.includes('1 bottle') || vt.includes('1 pack') || vt.includes('1-pack') || vt.includes('1-bottle') || vt === '1 packs';
  
        if (is1Unit) {
          try {
            var product = await fetchProduct(item.handle);
            var upgradeVariant = product.variants.find(function(v) {
              var t = (v.title || '').toLowerCase();
              return t.includes('3 bottle') || t.includes('3 pack') || t.includes('3-pack') || t.includes('3-bottle') || t === '3 packs';
            });
  
            if (upgradeVariant) {
              var savingsPct = upgradeVariant.compare_at_price
                ? Math.round((1 - upgradeVariant.price / upgradeVariant.compare_at_price) * 100)
                : 0;
  
              // Check if upgrade variant qualifies for free shipping
              var upgradeTitle = (upgradeVariant.title || '').toLowerCase();
              var upgradeMatch = upgradeTitle.match(/(\d+)\s*(bottle|pack|capsule)/);
              var upgradeUnits = upgradeMatch ? parseInt(upgradeMatch[1]) : 1;
              var freeShipNote = upgradeUnits >= 2 ? ' + FREE shipping' : '';
  
              return {
                currentItem: item,
                currentItemKey: item.key,
                upgradeVariantId: upgradeVariant.id,
                sellingPlanId: item.selling_plan_allocation
                  ? item.selling_plan_allocation.selling_plan.id
                  : null,
                message: 'Switch to ' + upgradeVariant.title + (savingsPct > 0 ? ' & Save ' + savingsPct + '%' : ''),
                subMessage: formatMoney(upgradeVariant.price) + ' vs ' + formatMoney(upgradeVariant.compare_at_price || item.final_price * 3) + freeShipNote,
              };
            }
          } catch (err) {
            console.warn('[NuoraCart] Bundle fetch failed:', err);
          }
        }
      }
      return null;
    }
  
    // =========================================================================
    // TOTAL SAVINGS — uses allocation-level compare_at_price (our fix)
    // =========================================================================
    function calculateTotalSavings(cart) {
      var savings = 0;
      cart.items.forEach(function(item) {
        if (item.original_line_price > item.final_line_price) {
          savings += item.original_line_price - item.final_line_price;
        } else if (item.selling_plan_allocation) {
          var compareAt = item.selling_plan_allocation.compare_at_price || 0;
          var perDelivery = item.selling_plan_allocation.per_delivery_price || 0;
          if (compareAt > perDelivery) {
            savings += (compareAt - perDelivery) * item.quantity;
          }
        }
      });
      return savings;
    }
  
    // =========================================================================
    // CART BADGE
    // =========================================================================
    function updateCartBadge(count) {
      document.querySelectorAll('[data-cart-count]').forEach(function(el) {
        el.textContent = count;
        el.style.display = count > 0 ? '' : 'none';
      });
    }
  
    // =========================================================================
    // CORE CART ACTIONS
    // =========================================================================
    async function refresh() {
      try {
        state.cart = await shopifyFetch('cart.js');
        state.crossSellOffer = await getCrossSellOffer(state.cart.items);
        state.bundleUpsell = await getBundleUpsell(state.cart.items);
        state.shippingProgress = getShippingProgress(state.cart.items);
        updateCartBadge(state.cart.item_count);
        notify();
      } catch (err) {
        console.error('[NuoraCart] Refresh failed:', err);
      }
    }
  
    async function addToCart(variantId, quantity, sellingPlan) {
      state.isLoading = true;
      notify();
      try {
        var body = { items: [{ id: variantId, quantity: quantity || 1 }] };
        if (sellingPlan) body.items[0].selling_plan = sellingPlan;
        await shopifyFetch('cart/add.js', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        await refresh();
      } catch (err) {
        console.error('[NuoraCart] addToCart failed:', err);
      } finally {
        state.isLoading = false;
        notify();
      }
    }
  
    async function changeItem(lineItemKey, quantity) {
      state.isLoading = true;
      notify();
      try {
        await shopifyFetch('cart/change.js', {
          method: 'POST',
          body: JSON.stringify({ id: lineItemKey, quantity: quantity }),
        });
        await refresh();
      } catch (err) {
        console.error('[NuoraCart] changeItem failed:', err);
      } finally {
        state.isLoading = false;
        notify();
      }
    }
  
    async function removeItem(lineItemKey) {
      return changeItem(lineItemKey, 0);
    }
  
    async function upgradeToPack(currentItemKey, newVariantId, sellingPlanId) {
      state.isLoading = true;
      notify();
      try {
        await shopifyFetch('cart/change.js', {
          method: 'POST',
          body: JSON.stringify({ id: currentItemKey, quantity: 0 }),
        });
        var body = { items: [{ id: newVariantId, quantity: 1 }] };
        if (sellingPlanId) body.items[0].selling_plan = sellingPlanId;
        await shopifyFetch('cart/add.js', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        await refresh();
      } catch (err) {
        console.error('[NuoraCart] upgradeToPack failed:', err);
      } finally {
        state.isLoading = false;
        notify();
      }
    }
  
    // =========================================================================
    // DRAWER CONTROLS
    // =========================================================================
    function openDrawer() {
      state.isDrawerOpen = true;
      document.body.classList.add('nuora-cart-open');
      var overlay = document.getElementById('nuora-cart-overlay');
      var drawer = document.getElementById('nuora-cart-drawer');
      if (overlay) { overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false'); }
      if (drawer) { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); }
      notify();
    }
  
    function closeDrawer() {
      state.isDrawerOpen = false;
      document.body.classList.remove('nuora-cart-open');
      var overlay = document.getElementById('nuora-cart-overlay');
      var drawer = document.getElementById('nuora-cart-drawer');
      if (overlay) { overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true'); }
      if (drawer) { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); }
      notify();
    }
  
    function goToCheckout() {
      window.location.href = '/checkout';
    }
  
    // =========================================================================
    // RENDER — LINE ITEM
    // =========================================================================
    function renderLineItem(item) {
      var planInfo = getSellingPlanInfo(item);
      var imgSrc = getProductImageUrl(item.image || (item.featured_image && item.featured_image.url), '180x');
      var linePrice = item.final_line_price;
  
      var comparePrice = 0;
      if (item.selling_plan_allocation && item.selling_plan_allocation.compare_at_price > 0) {
        comparePrice = item.selling_plan_allocation.compare_at_price * item.quantity;
      } else if (item.original_line_price > linePrice) {
        comparePrice = item.original_line_price;
      }
  
      var planHtml = '';
      if (planInfo) {
        planHtml = '<p class="nuora-cart-drawer__item-plan">' + planInfo.displayName + '</p>';
        if (planInfo.savingsPercent > 0) {
          planHtml += '<p class="nuora-cart-drawer__item-savings">Saves ' + planInfo.savingsPercent + '% every order</p>';
        }
      }
  
      var html = '<div class="nuora-cart-drawer__item">';
      html += '<div class="nuora-cart-drawer__item-img"><img src="' + imgSrc + '" alt="' + item.product_title + '" loading="lazy"></div>';
      html += '<div class="nuora-cart-drawer__item-details">';
      html += '<p class="nuora-cart-drawer__item-name">' + item.product_title + '</p>';
      if (item.variant_title) {
        html += '<p class="nuora-cart-drawer__item-variant">Variant: ' + item.variant_title + '</p>';
      }
      html += planHtml;
      html += '<div class="nuora-cart-drawer__item-bottom">';
      html += '<div class="nuora-cart-drawer__item-actions">';
      html += '<div class="nuora-cart-drawer__qty">';
      html += '<button class="nuora-cart-drawer__qty-btn" data-action="decrease" data-key="' + item.key + '">-</button>';
      html += '<span class="nuora-cart-drawer__qty-value">' + item.quantity + '</span>';
      html += '<button class="nuora-cart-drawer__qty-btn" data-action="increase" data-key="' + item.key + '">+</button>';
      html += '</div>';
      html += '<button class="nuora-cart-drawer__remove" data-action="remove" data-key="' + item.key + '">Remove</button>';
      html += '</div>';
      html += '<div class="nuora-cart-drawer__item-price">';
      html += '<div class="nuora-cart-drawer__price-current">' + formatMoney(linePrice) + '</div>';
      if (comparePrice > 0) {
        html += '<div class="nuora-cart-drawer__price-compare">' + formatMoney(comparePrice) + '</div>';
      }
      html += '</div></div></div></div>';
      return html;
    }
  
    // =========================================================================
    // RENDER — EMPTY STATE with product suggestions (Hardik update)
    // =========================================================================
    async function renderEmptyState() {
      var container = document.getElementById('drawerEmptyProducts');
      if (!container) return;
  
      var html = '';
      for (var i = 0; i < SUGGESTED_PRODUCTS.length; i++) {
        var item = SUGGESTED_PRODUCTS[i];
        var title = item.fallbackTitle;
        var price = item.fallbackPrice;
        var compareAt = item.fallbackCompare;
        var image = '';
        var variantId = null;
  
        try {
          var product = await fetchProduct(item.handle);
          title = product.title;
          price = product.variants[0].price;
          compareAt = product.variants[0].compare_at_price || compareAt;
          image = product.featured_image ? getProductImageUrl(product.featured_image, '180x') : '';
          variantId = product.variants[0].id;
        } catch (e) {}
  
        html += '<div class="nuora-cart-drawer__suggest-card ' + item.colorClass + '">';
        html += '<div class="nuora-cart-drawer__suggest-img ' + (item.colorClass === 'is-rose' ? 'is-rose' : '') + '">';
        if (image) html += '<img src="' + image + '" alt="' + title + '" loading="lazy">';
        html += '</div>';
        html += '<div class="nuora-cart-drawer__suggest-info">';
        html += '<p class="nuora-cart-drawer__suggest-name">' + title + '</p>';
        html += '<p class="nuora-cart-drawer__suggest-meta">' + item.tagline + '</p>';
        html += '<p class="nuora-cart-drawer__suggest-stars">';
        var fullStars = Math.floor(item.stars);
        for (var s = 0; s < fullStars; s++) html += '&#9733;';
        if (item.stars % 1 >= 0.5) html += '&#9733;';
        html += ' ' + item.reviews + ' reviews</p>';
        html += '<div class="nuora-cart-drawer__suggest-price">';
        html += '<span class="nuora-cart-drawer__suggest-price-current">' + formatMoney(price) + '</span>';
        if (compareAt && compareAt > price) {
          html += '<span class="nuora-cart-drawer__suggest-price-compare">' + formatMoney(compareAt) + '</span>';
        }
        html += '</div>';
        if (variantId) {
          html += '<button class="nuora-cart-drawer__suggest-add ' + item.colorClass + '" data-variant-id="' + variantId + '">+ Add to Cart</button>';
        }
        html += '</div></div>';
      }
  
      html += '<a href="/pages/shop-all" class="nuora-cart-drawer__empty-browse">Browse all products</a>';
      container.innerHTML = html;
  
      container.querySelectorAll('[data-variant-id]').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var vid = parseInt(btn.dataset.variantId);
          btn.textContent = 'Adding...';
          await addToCart(vid, 1, null);
        });
      });
    }
  
    // =========================================================================
    // MASTER RENDER
    // =========================================================================
    async function renderDrawer(currentState) {
      var cart = currentState.cart;
      if (!cart) return;
  
      var drawer = document.getElementById('nuora-cart-drawer');
      if (!drawer) return;
  
      drawer.classList.toggle('is-loading', currentState.isLoading);
      var isEmpty = cart.item_count === 0;
  
      // Toggle sections
      var emptyEl = document.getElementById('drawerEmpty');
      var scrollableEl = document.getElementById('drawerScrollable');
      var footerEl = drawer.querySelector('.nuora-cart-drawer__footer');
      var shippingEl = document.getElementById('drawerShipping');
      var urgencyEl = document.getElementById('drawerUrgency');
      var crossSellEl = document.getElementById('drawerCrossSell');
      var bundleEl = document.getElementById('drawerBundle');
  
      if (emptyEl) emptyEl.style.display = isEmpty ? '' : 'none';
      if (scrollableEl) scrollableEl.style.display = isEmpty ? 'none' : '';
      if (footerEl) footerEl.style.display = isEmpty ? 'none' : '';
      if (shippingEl) shippingEl.style.display = isEmpty ? 'none' : '';
      if (urgencyEl) urgencyEl.style.display = isEmpty ? 'none' : '';
  
      // Cart count
      var countEl = document.getElementById('drawerCartCount');
      if (countEl) countEl.textContent = '(' + cart.item_count + ')';
      updateCartBadge(cart.item_count);
  
      if (isEmpty) {
        if (crossSellEl) crossSellEl.style.display = 'none';
        if (bundleEl) bundleEl.style.display = 'none';
        renderEmptyState();
        return;
      }
  
      // Line items
      var itemsEl = document.getElementById('drawerItems');
      if (itemsEl) {
        itemsEl.innerHTML = cart.items.map(renderLineItem).join('');
  
        itemsEl.querySelectorAll('[data-action]').forEach(function(btn) {
          btn.addEventListener('click', async function() {
            var key = btn.dataset.key;
            var action = btn.dataset.action;
            var item = cart.items.find(function(i) { return i.key === key; });
            if (!item) return;
            if (action === 'remove') await removeItem(key);
            else if (action === 'decrease' && item.quantity > 1) await changeItem(key, item.quantity - 1);
            else if (action === 'increase') await changeItem(key, item.quantity + 1);
          });
        });
      }
  
      // Shipping bar
      var shipping = currentState.shippingProgress;
      var shippingTextEl = document.getElementById('drawerShippingText');
      var shippingFillEl = document.getElementById('drawerShippingFill');
      if (shippingTextEl) {
        shippingTextEl.textContent = shipping.message;
        shippingTextEl.classList.toggle('is-qualified', shipping.qualified);
      }
      if (shippingFillEl) {
        shippingFillEl.style.width = shipping.percentage + '%';
        shippingFillEl.classList.toggle('is-qualified', shipping.qualified);
      }
  
      // Footer
      var subtotalEl = document.getElementById('drawerSubtotal');
      var totalEl = document.getElementById('drawerTotal');
      var checkoutTotalEl = document.getElementById('drawerCheckoutTotal');
      var shippingCostEl = document.getElementById('drawerShippingCost');
      var savingsEl = document.getElementById('drawerSavings');
  
      if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
      if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
      if (checkoutTotalEl) checkoutTotalEl.textContent = formatMoney(cart.total_price);
      if (shippingCostEl) shippingCostEl.textContent = shipping.qualified ? 'FREE' : 'Calculated at checkout';
  
      var totalSavings = calculateTotalSavings(cart);
      if (savingsEl) {
        if (totalSavings > 0) {
          savingsEl.textContent = "You're saving " + formatMoney(totalSavings) + ' on your wellness routine';
          savingsEl.style.display = '';
        } else {
          savingsEl.style.display = 'none';
        }
      }
  
      // Cross-sell
      var offer = currentState.crossSellOffer;
      if (crossSellEl) {
        if (offer) {
          crossSellEl.style.display = '';
          var headlineEl = crossSellEl.querySelector('.nuora-cart-drawer__section-title');
          if (headlineEl) headlineEl.textContent = offer.headline;
          var cardEl = document.getElementById('drawerCrossSellCard');
          if (cardEl) {
            var csImg = offer.image ? getProductImageUrl(offer.image, '120x') : '';
            var csHtml = '<div class="nuora-cart-drawer__cross-sell-img">';
            if (csImg) csHtml += '<img src="' + csImg + '" alt="' + offer.title + '" loading="lazy">';
            csHtml += '</div>';
            csHtml += '<div class="nuora-cart-drawer__cross-sell-info">';
            csHtml += '<p class="nuora-cart-drawer__cross-sell-name">' + offer.title + '</p>';
            csHtml += '<p class="nuora-cart-drawer__cross-sell-price">' + formatMoney(offer.price);
            if (offer.compareAtPrice && offer.compareAtPrice > offer.price) {
              csHtml += ' <span class="strike">' + formatMoney(offer.compareAtPrice) + '</span>';
            }
            csHtml += '</p></div>';
            csHtml += '<button class="nuora-cart-drawer__cross-sell-add" id="crossSellAddBtn">+ ADD</button>';
            cardEl.innerHTML = csHtml;
  
            var addBtn = document.getElementById('crossSellAddBtn');
            if (addBtn) {
              addBtn.addEventListener('click', function() {
                addToCart(offer.variantId, 1, null);
              });
            }
          }
        } else {
          crossSellEl.style.display = 'none';
        }
      }
  
      // Bundle upsell
      var bundle = currentState.bundleUpsell;
      if (bundleEl) {
        if (bundle && bundle.upgradeVariantId) {
          bundleEl.style.display = '';
          var bundleCardEl = document.getElementById('drawerBundleCard');
          if (bundleCardEl) {
            var bHtml = '<div>';
            bHtml += '<p class="nuora-cart-drawer__bundle-title">' + bundle.message + '</p>';
            if (bundle.subMessage) bHtml += '<p class="nuora-cart-drawer__bundle-sub">' + bundle.subMessage + '</p>';
            bHtml += '</div>';
            bHtml += '<button class="nuora-cart-drawer__bundle-btn" id="bundleUpgradeBtn">Upgrade</button>';
            bundleCardEl.innerHTML = bHtml;
  
            var upgradeBtn = document.getElementById('bundleUpgradeBtn');
            if (upgradeBtn) {
              upgradeBtn.addEventListener('click', async function() {
                upgradeBtn.textContent = 'Upgrading...';
                await upgradeToPack(bundle.currentItemKey, bundle.upgradeVariantId, bundle.sellingPlanId);
              });
            }
          }
        } else {
          bundleEl.style.display = 'none';
        }
      }
    }
  
    // =========================================================================
    // URGENCY TIMER (Hardik update) — visual only, resets at 0
    // =========================================================================
    function initUrgencyTimer() {
      var timerEl = document.getElementById('drawerUrgencyTime');
      if (!timerEl) return;
  
      var seconds = 7 * 60;
      function tick() {
        if (seconds <= 0) seconds = 7 * 60;
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        timerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
        seconds--;
      }
      tick();
      setInterval(tick, 1000);
    }
  
    // =========================================================================
    // EVENT BINDING
    // =========================================================================
    function initDrawerEvents() {
      var drawer = document.getElementById('nuora-cart-drawer');
      var overlay = document.getElementById('nuora-cart-overlay');
      if (!drawer) return;
  
      var closeBtn = document.getElementById('drawerClose');
      if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
      if (overlay) overlay.addEventListener('click', closeDrawer);
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && state.isDrawerOpen) closeDrawer();
      });
  
      var checkoutBtn = document.getElementById('drawerCheckout');
      if (checkoutBtn) checkoutBtn.addEventListener('click', goToCheckout);
    }
  
    // =========================================================================
    // INIT
    // =========================================================================
    async function init() {
      subscribe(renderDrawer);
      initDrawerEvents();
      initUrgencyTimer();
      await refresh();
  
      // Intercept theme add-to-cart forms
      document.addEventListener('submit', async function(e) {
        var form = e.target.closest('form[action="/cart/add"], form[data-add-to-cart]');
        if (!form) return;
        e.preventDefault();
        var fd = new FormData(form);
        var id = fd.get('id');
        var qty = fd.get('quantity') || 1;
        var sp = fd.get('selling_plan');
        await addToCart(parseInt(id, 10), parseInt(qty, 10), sp ? parseInt(sp, 10) : null);
        openDrawer();
      });
  
      // Theme AJAX events
      document.addEventListener('ajaxProduct:added', function() { refresh(); openDrawer(); });
      document.addEventListener('cart:item-added', function() { refresh(); openDrawer(); });
      document.addEventListener('theme:cart:change', function() { refresh(); });
  
      // Custom events (Replo bridge)
      document.addEventListener('cart:refresh', function() { refresh(); openDrawer(); });
      document.addEventListener('cart:open', function() { openDrawer(); });
      document.addEventListener('cart:close', function() { closeDrawer(); });
  
      // Hijack cart icon clicks
      document.querySelectorAll('a[href="/cart"], a[href="/cart/"], .cart-icon, [data-cart-trigger]').forEach(function(el) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          openDrawer();
        });
      });
  
      // Wire early intercepts
      _refreshFn = refresh;
      _openFn = openDrawer;
      _drawerReady = true;
  
      console.log('[NuoraCart] Drawer initialized. Items:', state.cart ? state.cart.item_count : 0);
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
    return {
      init: init,
      openDrawer: openDrawer,
      closeDrawer: closeDrawer,
      addToCart: addToCart,
      changeItem: changeItem,
      removeItem: removeItem,
      upgradeToPack: upgradeToPack,
      refresh: refresh,
      subscribe: subscribe,
      getState: function() { return { ...state }; },
      getCart: function() { return state.cart; },
      formatMoney: formatMoney,
      goToCheckout: goToCheckout,
    };
  })();