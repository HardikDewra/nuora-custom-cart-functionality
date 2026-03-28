/**
 * Nuora Cart A/B Test - Variant B (Full Custom Cart)
 * ====================================================
 * Paste this into Elevate's "Variant B" JavaScript field.
 *
 * Control (A): UpCart-like minimal design (default, no snippet needed)
 * Variant (B): Full custom cart with cross-sells, upsells, shipping bar
 *
 * This snippet switches the cart drawer from Design A to Design B.
 */
(function() {
  document.body.dataset.cartDesign = 'b';

  // If drawer already initialized, force re-render with Design B
  if (window.NuoraCartDrawer && window.NuoraCartDrawer.refresh) {
    window.NuoraCartDrawer.refresh();
  }
})();
