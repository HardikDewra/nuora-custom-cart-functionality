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
      upgradesTo: 'gummies3',
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
      upgradesTo: null,
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
      upgradesTo: 'capsules3',
    },
    capsules3: {
      name: 'Gut Ritual Capsules',
      variant: '3 Bottles',
      plan: 'Every 3 Months',
      savings: 'Saves 65% every order',
      price: 69.00,
      compare: 195.00,
      emoji: '\uD83D\uDC8A',
      type: 'rose',
      physicalUnits: 3,
      upgradesTo: null,
    },
  };

  // Which IDs count as "has gummies" and "has capsules"
  const GUMMY_IDS = ['gummies', 'gummies3'];
  const CAPSULE_IDS = ['capsules', 'capsules3'];

  let cart = [
    { id: 'gummies', qty: 1 },
  ];

  // ==================== HELPERS ====================
  function hasGummies() {
    return cart.some(i => GUMMY_IDS.includes(i.id));
  }

  function hasCapsules() {
    return cart.some(i => CAPSULE_IDS.includes(i.id));
  }

  function hasMultiPack() {
    return cart.some(i => PRODUCTS[i.id].physicalUnits >= 2);
  }

  // Find the first upgradeable item in cart (1-unit variant with an upgrade path)
  function getUpgradeableItem() {
    for (const item of cart) {
      const product = PRODUCTS[item.id];
      if (product.upgradesTo) {
        return { cartItem: item, product: product, upgradeProduct: PRODUCTS[product.upgradesTo] };
      }
    }
    return null;
  }

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

    // ---- Empty cart state ----
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
      emptyHtml += '<p style="font-size:11px;color:var(--yellow-500);margin:0 0 4px;">&#9733;&#9733;&#9733;&#9733;&#9733; 4,200+ reviews</p>';
      emptyHtml += '<p style="font-size:13px;margin:0;"><strong style="color:var(--brown-950);">$29.99</strong> <span style="text-decoration:line-through;font-size:12px;color:var(--brown-800);">$51.00</span></p>';
      emptyHtml += '</div>';
      emptyHtml += '<button class="cross-sell-add" data-suggest="capsules" style="font-size:10px;padding:7px 10px;">+ Add</button>';
      emptyHtml += '</div>';

      emptyHtml += '</div>';
      cartItemsEl.innerHTML = emptyHtml;
      crossSellEl.style.display = 'none';
      bundleUpsellEl.style.display = 'none';
      cartCountEl.textContent = '(0)';
      subtotalEl.textContent = '$0.00';
      totalPriceEl.textContent = '$0.00';
      checkoutTotalEl.textContent = '$0.00';
      savingsEl.style.display = 'none';
      shippingTextEl.textContent = 'Upgrade to 2+ packs for FREE shipping!';
      shippingTextEl.classList.remove('qualified');
      shippingFillEl.style.width = '0%';
      shippingFillEl.classList.remove('qualified');
      shippingCostEl.textContent = 'Calculated at checkout';

      // Bind suggest buttons
      cartItemsEl.querySelectorAll('[data-suggest]').forEach(btn => {
        btn.addEventListener('click', () => {
          cart.push({ id: btn.dataset.suggest, qty: 1 });
          renderCart();
        });
      });
      return;
    }

    // ---- Calculate totals ----
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

    cartCountEl.textContent = '(' + totalQty + ')';
    subtotalEl.textContent = '$' + subtotal.toFixed(2);
    totalPriceEl.textContent = '$' + subtotal.toFixed(2);
    checkoutTotalEl.textContent = '$' + subtotal.toFixed(2);

    if (savings > 0) {
      savingsEl.textContent = "You're saving $" + savings.toFixed(2) + ' on your wellness routine';
      savingsEl.style.display = '';
    } else {
      savingsEl.style.display = 'none';
    }

    // ---- Free shipping ----
    if (hasMultiPack()) {
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

    // ---- Render line items ----
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
      itemsHTML += '</div>';
      itemsHTML += '</div>';
      itemsHTML += '</div>';
    });
    cartItemsEl.innerHTML = itemsHTML;

    // Bind qty/remove buttons
    cartItemsEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const idx = cart.findIndex(i => i.id === id);
        if (idx === -1) return;

        if (action === 'remove') {
          cart.splice(idx, 1);
        } else if (action === 'increase') {
          cart[idx].qty += 1;
        } else if (action === 'decrease' && cart[idx].qty > 1) {
          cart[idx].qty -= 1;
        }
        renderCart();
      });
    });

    // ---- Cross-sell ----
    if (hasGummies() && !hasCapsules()) {
      crossSellEl.style.display = '';
      const headerEl = crossSellEl.querySelector('.cross-sell-header');
      const nameEl = crossSellEl.querySelector('.cross-sell-name');
      const priceEl = crossSellEl.querySelector('.cross-sell-price');
      const imgEl = crossSellEl.querySelector('.cross-sell-img');
      if (headerEl) headerEl.textContent = 'Women Who Added Capsules Saw Better Results';
      if (nameEl) nameEl.textContent = 'Gut Ritual Capsules';
      if (priceEl) priceEl.innerHTML = '$29.99 <span class="strike">$51.00</span>';
      if (imgEl) imgEl.textContent = '\uD83D\uDC8A';
    } else if (hasCapsules() && !hasGummies()) {
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

    // ---- Bundle upsell ----
    const upgradeable = getUpgradeableItem();
    const bundleInfoTitle = bundleUpsellEl.querySelector('.bundle-info-title');
    const bundleInfoSub = bundleUpsellEl.querySelector('.bundle-info-sub');
    const upgradeBtn = document.getElementById('upgradeBundle');

    if (upgradeable) {
      const up = upgradeable.upgradeProduct;
      const savingsPct = Math.round((1 - up.price / up.compare) * 100);
      const isBottle = up.variant.includes('Bottle');

      bundleUpsellEl.style.display = '';
      if (bundleInfoTitle) {
        bundleInfoTitle.textContent = 'Switch to ' + up.variant + ': Save ' + savingsPct + '%';
      }
      if (bundleInfoSub) {
        const freeShipNote = up.physicalUnits >= 2 ? ' + FREE shipping' : '';
        bundleInfoSub.textContent = '$' + up.price.toFixed(2) + ' vs $' + up.compare.toFixed(2) + freeShipNote;
      }
    } else {
      bundleUpsellEl.style.display = 'none';
    }
  }

  // ==================== CROSS-SELL ADD ====================
  function initCrossSell() {
    const addBtn = document.getElementById('addCrossSell');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
      if (hasGummies() && !hasCapsules()) {
        cart.push({ id: 'capsules', qty: 1 });
      } else if (hasCapsules() && !hasGummies()) {
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
      const upgradeable = getUpgradeableItem();
      if (!upgradeable) return;

      const idx = cart.findIndex(i => i.id === upgradeable.cartItem.id);
      if (idx === -1) return;

      // Swap to the upgraded variant
      cart[idx] = { id: upgradeable.product.upgradesTo, qty: 1 };
      renderCart();
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
        viewport.classList.remove('mobile', 'desktop');
        viewport.classList.add(btn.dataset.viewport);
      });
    });
  }

  // ==================== CHECKLIST ====================
  function initChecklist() {
    const items = document.querySelectorAll('.checklist-item');
    const counter = document.getElementById('checklistCounter');
    if (!items.length) return;

    const saved = JSON.parse(localStorage.getItem('nuora-cart-checklist') || '{}');

    items.forEach(item => {
      const key = item.dataset.check;
      if (saved[key]) item.classList.add('checked');

      item.addEventListener('click', () => {
        item.classList.toggle('checked');
        const state = {};
        items.forEach(i => {
          if (i.classList.contains('checked')) state[i.dataset.check] = true;
        });
        localStorage.setItem('nuora-cart-checklist', JSON.stringify(state));
        updateCounter();
      });
    });

    function updateCounter() {
      const checked = document.querySelectorAll('.checklist-item.checked').length;
      counter.textContent = checked + ' of ' + items.length + ' completed';
    }
    updateCounter();
  }

  // ==================== CODE COPY ====================
  function initCodeCopy() {
    document.querySelectorAll('.code-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const codeEl = document.getElementById(btn.dataset.copy);
        if (!codeEl) return;

        navigator.clipboard.writeText(codeEl.textContent).then(() => {
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = orig; }, 1500);
        }).catch(() => {
          const range = document.createRange();
          range.selectNodeContents(codeEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('copy');
          sel.removeAllRanges();
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = orig; }, 1500);
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
        if (section) sections.push({ el: section, link: link });
      }
    });

    if (!sections.length) return;

    function onScroll() {
      const scrollPos = window.scrollY + 160;
      let active = sections[0];
      for (const s of sections) {
        if (s.el.offsetTop <= scrollPos) active = s;
      }
      navLinks.forEach(l => l.classList.remove('active'));
      if (active) active.link.classList.add('active');
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ==================== MOBILE MENU ====================
  function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('headerNav');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => nav.classList.remove('open'));
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
        const total = cart.reduce((sum, i) => sum + PRODUCTS[i.id].price * i.qty, 0).toFixed(2);
        btn.innerHTML = 'Checkout - <span id="checkoutTotal">$' + total + '</span>';
        btn.style.background = '';
      }, 1500);
    });
  }

  // ==================== URGENCY TIMER ====================
  function initUrgencyTimer() {
    const timerEl = document.getElementById('urgencyTime');
    const timerContainer = document.getElementById('urgencyTimer');
    if (!timerEl || !timerContainer) return;

    let seconds = 7 * 60; // 7 minutes

    function tick() {
      if (seconds <= 0) {
        // Reset to 7 mins - visual only, never actually expires
        seconds = 7 * 60;
      }
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
      seconds--;
    }

    tick();
    setInterval(tick, 1000);
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
    initUrgencyTimer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
