/**
 * Nuora Custom Cart - Interactive Spec Site
 * Handles: cart demo interactivity, checklist, code copy, nav highlighting
 */

(function () {
  'use strict';

  // ==================== CART DEMO STATE ====================
  const PRODUCTS = {
    gummies: {
      name: 'Feminine Balance Gummies',
      variant: '1 Pack',
      plan: 'Subscribe & Save - Monthly',
      savings: 'Saves 15% every order',
      price: 34.99,
      compare: 40.99,
      emoji: '\uD83C\uDF4D',
      type: 'yellow',
      physicalUnits: 1,
    },
    gummies3: {
      name: 'Feminine Balance Gummies',
      variant: '3 Packs',
      plan: 'Subscribe & Save - Quarterly',
      savings: 'Saves 42% every order',
      price: 58.99,
      compare: 101.97,
      emoji: '\uD83C\uDF4D',
      type: 'yellow',
      physicalUnits: 3,
    },
    capsules: {
      name: 'Gut Ritual Capsules',
      variant: '1 Bottle',
      plan: null,
      savings: null,
      price: 29.99,
      compare: 51.00,
      emoji: '\uD83D\uDC8A',
      type: 'rose',
      physicalUnits: 1,
    },
  };

  // FREE SHIPPING: ships free when total physical bottles/packs > 1
  // Only single-bottle/single-pack orders pay for shipping

  let cart = [
    { id: 'gummies', qty: 1 },
  ];

  // ==================== RENDER CART ====================
  function renderCart() {
    const cartItemsEl = document.getElementById('cartItems');
    const cartCountEl = document.getElementById('cartCount');
    const subtotalEl = document.getElementById('subtotal');
    const totalPriceEl = document.getElementById('totalPrice');
    const checkoutTotalEl = document.getElementById('checkoutTotal');
    const savingsEl = document.getElementById('savingsText');
    const shippingTextEl = document.getElementById('shippingText');
    const shippingFillEl = document.getElementById('shippingFill');
    const shippingCostEl = document.getElementById('shippingCost');
    const crossSellEl = document.getElementById('crossSell');
    const bundleUpsellEl = document.getElementById('bundleUpsell');

    if (!cartItemsEl) return;

    // Calculate totals
    let subtotal = 0;
    let totalCompare = 0;
    let totalQty = 0;

    cart.forEach(item => {
      const product = PRODUCTS[item.id];
      subtotal += product.price * item.qty;
      totalCompare += product.compare * item.qty;
      totalQty += item.qty;
    });

    const savings = totalCompare - subtotal;

    // Cart count
    cartCountEl.textContent = '(' + totalQty + ')';

    // Subtotal / total
    subtotalEl.textContent = '$' + subtotal.toFixed(2);
    totalPriceEl.textContent = '$' + subtotal.toFixed(2);
    checkoutTotalEl.textContent = '$' + subtotal.toFixed(2);

    // Savings
    if (savings > 0) {
      savingsEl.textContent = 'You save $' + savings.toFixed(2) + ' on this order';
      savingsEl.style.display = '';
    } else {
      savingsEl.style.display = 'none';
    }

    // Free shipping - only if ANY variant in cart is a 2+ pack/bottle
    // Two separate 1-unit products do NOT qualify
    const hasMultiPack = cart.some(item => PRODUCTS[item.id].physicalUnits >= 2);

    if (hasMultiPack) {
      shippingTextEl.textContent = "\u2705 You've unlocked FREE shipping!";
      shippingTextEl.classList.add('qualified');
      shippingFillEl.style.width = '100%';
      shippingFillEl.classList.add('qualified');
      shippingCostEl.textContent = 'FREE';
    } else {
      shippingTextEl.textContent = 'Upgrade to 2+ packs for FREE shipping!';
      shippingTextEl.classList.remove('qualified');
      shippingFillEl.style.width = '50%';
      shippingFillEl.classList.remove('qualified');
      shippingCostEl.textContent = 'Calculated at checkout';
    }

    // Cart items
    let itemsHTML = '';
    cart.forEach(item => {
      const product = PRODUCTS[item.id];
      itemsHTML += '<div class="cart-item">';
      itemsHTML += '<div class="cart-item-img ' + product.type + '">' + product.emoji + '</div>';
      itemsHTML += '<div class="cart-item-details">';
      itemsHTML += '<div class="cart-item-name">' + product.name + '</div>';
      itemsHTML += '<div class="cart-item-variant">Variant: ' + product.variant + '</div>';
      if (product.plan) {
        itemsHTML += '<div class="cart-item-plan">' + product.plan + '</div>';
      }
      if (product.savings) {
        itemsHTML += '<div class="cart-item-savings">' + product.savings + '</div>';
      }
      itemsHTML += '<div class="cart-item-bottom">';
      itemsHTML += '<div style="display:flex;align-items:center;gap:8px;">';
      itemsHTML += '<div class="qty-control">';
      itemsHTML += '<button class="qty-btn" data-action="decrease" data-id="' + item.id + '">-</button>';
      itemsHTML += '<span class="qty-value">' + item.qty + '</span>';
      itemsHTML += '<button class="qty-btn" data-action="increase" data-id="' + item.id + '">+</button>';
      itemsHTML += '</div>';
      itemsHTML += '<button class="remove-btn" data-action="remove" data-id="' + item.id + '">Remove</button>';
      itemsHTML += '</div>';
      itemsHTML += '<div class="cart-item-price">';
      itemsHTML += '<div class="price-current">$' + (product.price * item.qty).toFixed(2) + '</div>';
      if (product.compare > product.price) {
        itemsHTML += '<div class="price-compare">$' + (product.compare * item.qty).toFixed(2) + '</div>';
      }
      itemsHTML += '</div>';
      itemsHTML += '</div>'; // cart-item-bottom
      itemsHTML += '</div>'; // cart-item-details
      itemsHTML += '</div>'; // cart-item
    });

    cartItemsEl.innerHTML = itemsHTML;

    // Cross-sell visibility
    const hasGummies = cart.some(i => i.id === 'gummies' || i.id === 'gummies3');
    const hasCapsules = cart.some(i => i.id === 'capsules');

    if (hasGummies && !hasCapsules) {
      crossSellEl.style.display = '';
      const headerEl = crossSellEl.querySelector('.cross-sell-header');
      const nameEl = crossSellEl.querySelector('.cross-sell-name');
      const priceEl = crossSellEl.querySelector('.cross-sell-price');
      const imgEl = crossSellEl.querySelector('.cross-sell-img');
      if (headerEl) headerEl.textContent = 'Women Who Added Capsules Saw Better Results';
      if (nameEl) nameEl.textContent = 'Gut Ritual Capsules';
      if (priceEl) priceEl.innerHTML = '$29.99 <span class="strike">$51.00</span>';
      if (imgEl) imgEl.textContent = '\uD83D\uDC8A';
    } else if (hasCapsules && !hasGummies) {
      crossSellEl.style.display = '';
      const headerEl = crossSellEl.querySelector('.cross-sell-header');
      const nameEl = crossSellEl.querySelector('.cross-sell-name');
      const priceEl = crossSellEl.querySelector('.cross-sell-price');
      const imgEl = crossSellEl.querySelector('.cross-sell-img');
      if (headerEl) headerEl.textContent = 'Women Who Added Gummies Saw Better Results';
      if (nameEl) nameEl.textContent = 'Feminine Balance Gummies';
      if (priceEl) priceEl.innerHTML = '$34.99 <span class="strike">$40.99</span>';
      if (imgEl) imgEl.textContent = '\uD83C\uDF4D';
    } else {
      crossSellEl.style.display = 'none';
    }

    // Bundle upsell visibility (show for ANY 1-unit variant - gummies OR capsules)
    const has1PackGummies = cart.some(i => i.id === 'gummies');
    const has1BottleCapsules = cart.some(i => i.id === 'capsules');
    const bundleInfoTitle = bundleUpsellEl.querySelector('.bundle-info-title');
    const bundleInfoSub = bundleUpsellEl.querySelector('.bundle-info-sub');

    if (has1PackGummies) {
      bundleUpsellEl.style.display = '';
      if (bundleInfoTitle) bundleInfoTitle.textContent = 'Switch to 3 Packs: Save 42%';
      if (bundleInfoSub) bundleInfoSub.textContent = '$58.99/quarter vs $122.97';
    } else if (has1BottleCapsules) {
      bundleUpsellEl.style.display = '';
      if (bundleInfoTitle) bundleInfoTitle.textContent = 'Switch to 3 Bottles: Save 65%';
      if (bundleInfoSub) bundleInfoSub.textContent = '$69.00 vs $195.00 + FREE shipping';
    } else {
      bundleUpsellEl.style.display = 'none';
    }

    // Empty cart state with product suggestions
    if (cart.length === 0) {
      let emptyHtml = '<div style="padding:24px 20px;text-align:center;">';
      emptyHtml += '<p style="font-family:var(--font-heading);font-size:18px;font-weight:700;color:var(--brown-950);margin-bottom:4px;">Your cart is empty</p>';
      emptyHtml += '<p style="font-size:13px;color:var(--brown-800);margin-bottom:20px;">Trusted by 50,000+ women. Start your routine.</p>';

      // Gummies suggestion
      emptyHtml += '<div style="display:flex;gap:12px;align-items:center;padding:14px;border:1px solid var(--border-solid);border-left:3px solid var(--yellow-400);border-radius:4px;margin-bottom:10px;text-align:left;">';
      emptyHtml += '<div style="width:52px;height:52px;flex-shrink:0;background:var(--yellow-100);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:22px;">\uD83C\uDF4D</div>';
      emptyHtml += '<div style="flex:1;min-width:0;">';
      emptyHtml += '<p style="font-size:13px;font-weight:600;color:var(--brown-950);margin:0 0 1px;">Vaginal Probiotic Gummies</p>';
      emptyHtml += '<p style="font-size:11px;color:var(--brown-800);margin:0 0 2px;">Our #1 bestseller</p>';
      emptyHtml += '<p style="font-size:11px;color:var(--yellow-500);margin:0 0 4px;">&#9733;&#9733;&#9733;&#9733;&#9733; 11,800+ reviews</p>';
      emptyHtml += '<p style="font-size:13px;margin:0;"><strong style="color:var(--brown-950);">$34.99</strong> <span style="text-decoration:line-through;font-size:12px;color:var(--brown-800);">$57.99</span></p>';
      emptyHtml += '</div>';
      emptyHtml += '<button class="cross-sell-add" data-suggest="gummies" style="background:var(--yellow-600);font-size:10px;padding:7px 10px;">+ Add</button>';
      emptyHtml += '</div>';

      // Capsules suggestion
      emptyHtml += '<div style="display:flex;gap:12px;align-items:center;padding:14px;border:1px solid var(--border-solid);border-left:3px solid var(--rose-primary);border-radius:4px;text-align:left;">';
      emptyHtml += '<div style="width:52px;height:52px;flex-shrink:0;background:var(--rose-light);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:22px;">\uD83D\uDC8A</div>';
      emptyHtml += '<div style="flex:1;min-width:0;">';
      emptyHtml += '<p style="font-size:13px;font-weight:600;color:var(--brown-950);margin:0 0 1px;">Gut Ritual Capsules</p>';
      emptyHtml += '<p style="font-size:11px;color:var(--brown-800);margin:0 0 2px;">For bloating & gut health</p>';
      emptyHtml += '<p style="font-size:11px;color:var(--yellow-500);margin:0 0 4px;">&#9733;&#9733;&#9733;&#9733;&#9733; 11,800+ reviews</p>';
      emptyHtml += '<p style="font-size:13px;margin:0;"><strong style="color:var(--brown-950);">$29.99</strong> <span style="text-decoration:line-through;font-size:12px;color:var(--brown-800);">$51.00</span></p>';
      emptyHtml += '</div>';
      emptyHtml += '<button class="cross-sell-add" data-suggest="capsules" style="font-size:10px;padding:7px 10px;">+ Add</button>';
      emptyHtml += '</div>';

      emptyHtml += '</div>';
      cartItemsEl.innerHTML = emptyHtml;
      crossSellEl.style.display = 'none';
      bundleUpsellEl.style.display = 'none';

      // Bind suggest buttons
      cartItemsEl.querySelectorAll('[data-suggest]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.suggest;
          cart.push({ id: id, qty: 1 });
          renderCart();
        });
      });
    }

    // Bind item action buttons
    cartItemsEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', handleCartAction);
    });
  }

  // ==================== CART ACTIONS ====================
  function handleCartAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    const itemIndex = cart.findIndex(i => i.id === id);
    if (itemIndex === -1) return;

    switch (action) {
      case 'increase':
        cart[itemIndex].qty += 1;
        break;
      case 'decrease':
        if (cart[itemIndex].qty > 1) {
          cart[itemIndex].qty -= 1;
        }
        break;
      case 'remove':
        cart.splice(itemIndex, 1);
        break;
    }

    renderCart();
  }

  // ==================== CROSS-SELL ADD ====================
  function initCrossSell() {
    const addBtn = document.getElementById('addCrossSell');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
      const hasGummies = cart.some(i => i.id === 'gummies' || i.id === 'gummies3');
      const hasCapsules = cart.some(i => i.id === 'capsules');

      if (hasGummies && !hasCapsules) {
        cart.push({ id: 'capsules', qty: 1 });
      } else if (hasCapsules && !hasGummies) {
        cart.push({ id: 'gummies', qty: 1 });
      }

      renderCart();
    });
  }

  // ==================== BUNDLE UPGRADE ====================
  function initBundleUpgrade() {
    const upgradeBtn = document.getElementById('upgradeBundle');
    if (!upgradeBtn) return;

    upgradeBtn.addEventListener('click', () => {
      const idx = cart.findIndex(i => i.id === 'gummies');
      if (idx !== -1) {
        cart[idx] = { id: 'gummies3', qty: 1 };
        renderCart();
      }
    });
  }

  // ==================== VIEWPORT TOGGLE ====================
  function initViewportToggle() {
    const toggles = document.querySelectorAll('.demo-toggle');
    const viewport = document.getElementById('demoViewport');
    if (!viewport || !toggles.length) return;

    toggles.forEach(btn => {
      btn.addEventListener('click', () => {
        toggles.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.dataset.viewport;
        viewport.classList.remove('mobile', 'desktop');
        viewport.classList.add(mode);
      });
    });
  }

  // ==================== CHECKLIST ====================
  function initChecklist() {
    const items = document.querySelectorAll('.checklist-item');
    const counter = document.getElementById('checklistCounter');
    if (!items.length) return;

    // Load state from localStorage
    const saved = JSON.parse(localStorage.getItem('nuora-cart-checklist') || '{}');

    items.forEach(item => {
      const key = item.dataset.check;
      if (saved[key]) {
        item.classList.add('checked');
      }

      item.addEventListener('click', () => {
        item.classList.toggle('checked');

        // Save state
        const state = {};
        items.forEach(i => {
          if (i.classList.contains('checked')) {
            state[i.dataset.check] = true;
          }
        });
        localStorage.setItem('nuora-cart-checklist', JSON.stringify(state));

        updateChecklistCounter();
      });
    });

    function updateChecklistCounter() {
      const checked = document.querySelectorAll('.checklist-item.checked').length;
      counter.textContent = checked + ' of ' + items.length + ' completed';
    }

    updateChecklistCounter();
  }

  // ==================== CODE COPY ====================
  function initCodeCopy() {
    document.querySelectorAll('.code-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.copy;
        const codeEl = document.getElementById(targetId);
        if (!codeEl) return;

        navigator.clipboard.writeText(codeEl.textContent).then(() => {
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = original;
          }, 1500);
        }).catch(() => {
          // Fallback for older browsers
          const range = document.createRange();
          range.selectNodeContents(codeEl);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          document.execCommand('copy');
          selection.removeAllRanges();

          const original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = original;
          }, 1500);
        });
      });
    });
  }

  // ==================== SECTION NAV HIGHLIGHT ====================
  function initNavHighlight() {
    const navLinks = document.querySelectorAll('.section-nav a');
    const sections = [];

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const section = document.getElementById(href.slice(1));
        if (section) {
          sections.push({ el: section, link: link });
        }
      }
    });

    if (!sections.length) return;

    function onScroll() {
      const scrollPos = window.scrollY + 160;

      let activeSection = sections[0];
      for (const s of sections) {
        if (s.el.offsetTop <= scrollPos) {
          activeSection = s;
        }
      }

      navLinks.forEach(l => l.classList.remove('active'));
      if (activeSection) {
        activeSection.link.classList.add('active');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ==================== MOBILE MENU ====================
  function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('headerNav');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
      nav.classList.toggle('open');
    });

    // Close on nav link click
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
      });
    });
  }

  // ==================== CHECKOUT BUTTON ====================
  function initCheckoutBtn() {
    const btn = document.getElementById('checkoutBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      btn.textContent = 'Redirecting to checkout...';
      btn.style.background = 'var(--positive)';
      setTimeout(() => {
        btn.innerHTML = 'Checkout - <span id="checkoutTotal">$' + cart.reduce((sum, i) => sum + PRODUCTS[i.id].price * i.qty, 0).toFixed(2) + '</span>';
        btn.style.background = '';
      }, 1500);
    });
  }

  // ==================== INIT ====================
  function init() {
    renderCart();
    initCrossSell();
    initBundleUpgrade();
    initViewportToggle();
    initChecklist();
    initCodeCopy();
    initNavHighlight();
    initMobileMenu();
    initCheckoutBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
