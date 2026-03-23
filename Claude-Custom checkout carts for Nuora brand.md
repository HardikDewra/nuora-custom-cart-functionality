# Custom checkout carts for Nuora brand

**Created:** 3/23/2026 23:14:56  
**Updated:** 3/23/2026 23:22:17  
**Exported:** 3/23/2026 23:24:44  
**Link:** [https://claude.ai/chat/d7f783cb-b0e4-45a1-8cc9-3b6c77d2a20d](https://claude.ai/chat/d7f783cb-b0e4-45a1-8cc9-3b6c77d2a20d)  

## Prompt:
3/23/2026, 11:14:58 PM

how can we create custom carts for our checkout pages for nuora brand, use previous chats as context



## Response:
3/23/2026, 11:15:43 PM

````plaintext
Thought process: Thinking about customizing Nuora brand checkout cart functionality and design.

Hardik is asking about creating custom carts for Nuora's checkout pages. Let me search past conversations for context about Nuora's checkout setup, cart customization, and any related discussions.
````

````plaintext
Tool: Looking for relevant chats...
````

````plaintext
Thought process

Let me search for more specific context about custom carts and checkout customization for Nuora.
````

````plaintext
Tool: Looking for relevant chats...
````

````plaintext
Thought process

Let me search for more context about checkout customization and custom cart pages.
````

````plaintext
Tool: Looking for relevant chats...
````

````plaintext
Thought process

Let me search for more specific context about custom checkout pages or cart pages for Nuora.
````

````plaintext
Tool: Looking for relevant chats...
````

````plaintext
Thought process

Let me search for more context about custom carts specifically.
````

````plaintext
Tool: Looking for relevant chats...
````

````plaintext
Thought process: Disambiguated multiple cart customization interpretations for clarification.

Now I have good context about Nuora's setup. Let me ask some clarifying questions because "custom carts for checkout pages" could mean several different things in the Shopify Plus context. Let me think about what Hardik might mean:

1. Custom cart drawer/slide cart on the site
2. Custom cart page (the /cart page)
3. Checkout page customization (Shopify Plus checkout extensibility)
4. Custom add-to-cart flows that bypass the cart entirely (like they're already doing with SKIO direct checkout URLs)

Given the context, they're already using direct-to-checkout URLs via SKIO for subscriptions, and Replo for custom pages. 

I need to clarify what exactly Hardik means by custom carts before I can give a useful recommendation.
````

Alright, so from your past chats I can see the current Nuora flow pretty well. You're using SKIO direct checkout URLs for subscriptions (cart/clear → cart/add with selling plan → /checkout), Replo for custom PDP pages, AfterSell for post-purchase cross-sells, and custom buy box components with variant-level pricing logic.

Before I go deep on this, I need to narrow down what you mean by "custom carts for checkout pages" because there are a few different things this could be:

1. **Custom cart drawer / slide-out cart** - a branded side panel that pops out when someone adds to cart, with upsells, quantity adjusters, subscription toggles, progress bars ("$X away from free shipping"), etc.

2. **Custom /cart page** - replacing Shopify's default cart page with a fully designed one (bundles, cross-sells, trust badges, etc.)

3. **Checkout page customization** - since you're on Shopify Plus, you have access to Checkout Extensibility to add custom blocks, upsells, branding, and trust elements directly in the checkout flow

4. **Skip-cart entirely** - you're already partially doing this with SKIO's direct checkout URLs. This would mean expanding that pattern so every add-to-cart action sends people straight to checkout with no cart page at all

Which of these are you thinking about? Or is it a combo? Also - is this something you want built custom (code), or are you looking at apps like Rebuy, Slide Cart, CartHook, etc.?

````plaintext
Tool: Generating ask_user_input_v0...
````

````plaintext
Thought process

Good, I've asked the clarifying questions. Waiting for Hardik's response.
````





## Prompt:
3/23/2026, 11:16:44 PM

Q: Which type of custom cart are you looking to build? (Select all that apply)
A: Cart drawer / slide-out cart, Custom /cart page

Q: Build approach?
A: Custom code (Replo/Liquid/JS)



## Response:
3/23/2026, 11:17:02 PM

````plaintext
Thought process: Evaluated custom cart implementation strategy across Shopify stack.

Hardik wants to build both a custom cart drawer (slide-out) and a custom /cart page for Nuora, using custom code (Replo/Liquid/JS). Let me think about the best approach given his stack - Shopify Plus, SKIO for subscriptions, Replo for landing pages, and the existing buy box components.

Let me search for more context and also think about what the best approach would be.
````

Got it - cart drawer + custom /cart page, all custom code. Let me lay this out properly.

A few questions before I map out the full architecture:

````plaintext
Tool: Generating ask_user_input_v0...
````

````plaintext
Thought process: Awaited user specifications to customize development strategy.

Waiting for Hardik's responses to tailor the approach.
````

Also thinking about a few technical things while you answer:

Since you're on Shopify Plus with SKIO, the cart needs to handle subscription line items properly - showing selling plan names, discount percentages, and billing cadence. Your current flow uses direct checkout URLs for subscriptions (cart/clear → cart/add with selling_plan → /checkout), so the cart drawer needs to either work alongside that pattern or replace it with a standard Shopify Cart API approach where selling plans get attached via the AJAX API.

The /cart page is more straightforward - it's basically a full-page version of the drawer with more room for cross-sells, trust elements, and order summary details. The question is whether you want both to exist simultaneously (drawer for quick adds, /cart page if they click through) or just one.



## Prompt:
3/23/2026, 11:17:21 PM

Q: What's the primary goal for the custom cart?
A: Increase AOV (upsells/cross-sells in cart)

Q: Should the cart drawer replace your current theme's cart, or live only on Replo pages?
A: Both - Replo pages + theme pages

Q: Who's implementing this - you or Tomide?
A: Tomide



## Response:
3/23/2026, 11:17:39 PM

````plaintext
Thought process: Architected sitewide cart solution integrating subscriptions and upsells.

Hardik wants to build a custom cart drawer + custom /cart page for Nuora, focused on increasing AOV through upsells/cross-sells. It needs to work sitewide (both Replo pages and theme pages), and Tomide will implement it.

Let me think about the architecture and give him a comprehensive breakdown he can hand off to Tomide.

Key considerations:
1. SKIO subscription handling - selling plans in cart
2. Shopify Cart API (AJAX) for cart management
3. Cross-sell/upsell logic in the cart


4. Ensuring it works across both Replo and Liquid theme pages, plus a dedicated /cart page

Now I'm looking into current best practices for Shopify custom cart implementations to make sure we're following the right approach.
````

Perfect. AOV-focused, sitewide, Tomide builds it. Let me put together a full technical brief you can hand off to him.

Last thing - what cross-sell / upsell logic do you want in the cart? This determines the whole product recommendation engine:

````plaintext
Tool: Generating ask_user_input_v0...
````

````plaintext
Thought process: Awaited stakeholder input to crystallize technical specifications.

Waiting for Hardik's answers to finalize the technical brief.
````

While you pick those, here's what I'm already mapping out for the brief:

The architecture will be a single vanilla JS module (no framework dependency) that injects itself sitewide via Shopify theme `theme.liquid` AND works inside Replo pages. It'll use Shopify's Cart AJAX API (`/cart.js`, `/cart/add.js`, `/cart/change.js`) so it stays in sync regardless of where the add-to-cart happens. The cart drawer component will be the same code on both Replo and theme pages - one source of truth.

For the custom /cart page, Tomide can either build it as a Replo page at `/pages/cart` and redirect the default `/cart` route to it, or override the theme's `cart.liquid` template directly. Replo route is cleaner since he's already comfortable building there.



## Prompt:
3/23/2026, 11:19:13 PM

Q: Which AOV tactics do you want in the cart? (Select all that apply)
A: Cross-sell complementary product (gummies buyer sees capsules), Free shipping threshold bar ($X away from free shipping), Quantity upsell (buy 2 more, save X%), Bundle upsell (upgrade to 3-pack)

Q: Should the cart drawer show subscription details for SKIO items?
A: Yes - show selling plan name, cadence, savings



## Response:
3/23/2026, 11:22:17 PM

````plaintext
Thought process: Thinking about AOV cart tactics and subscription display preferences for e-commerce implementation.

Hardik wants all four AOV tactics plus full SKIO subscription details in the cart. Let me build a comprehensive technical brief that Tomide can use to implement this. This should cover architecture, cart drawer specs, /cart page specs, cross-sell logic, SKIO integration, and the free shipping bar.

Let me create a thorough technical document.
````

All four AOV tactics plus full SKIO visibility. This is a meaty build. Let me put together the full technical brief for Tomide.

````plaintext
Web Search: Shopify Cart AJAX API selling plan 2025
````

> **Cart API reference** [shopify.dev](https://shopify.dev/docs/api/ajax/reference/cart)
>
> **Cart change REST API now supports changing selling plan - Shopify developer changelog** [shopify.dev](https://shopify.dev/changelog/cart-change-rest-api-now-supports-changing-selling-plan)
>
> **About the Shopify Ajax API** [shopify.dev](https://shopify.dev/docs/api/ajax)
>
> **Adding an item to the cart with Ajax** [getrecharge.com](https://docs.getrecharge.com/docs/add-an-item-to-the-cart-with-ajax-shop)
>
> **Shopify Cart API: Complete Guide with Examples in 2025 - KlinKode** [klinkode.com](https://klinkode.com/shopify-cart-api/)
>
> **Ajax Cart Pro ‑ Smart Purchase - Improves the user experience when purchasing a product | Shopify App Store** [shopify.com](https://apps.shopify.com/ajax-cart-pro)
>
> **Line item selling plan with Storefront API** [shopify.com](https://community.shopify.com/c/subscriptions/line-item-selling-plan-with-storefront-api/td-p/1322752)
>
> **Cart.js — A Javascript library to power your Shopify theme's cart.** [cartjs.org](https://cartjs.org/)
>
> **Issues in Assigning Selling Plan to Cart Line Item - Shopify Apps - Shopify Community** [shopify.com](https://community.shopify.com/t/issues-in-assigning-selling-plan-to-cart-line-item/139916)
>
> **Getting Selling Plan Information | skio** [skio.com](https://integrate.skio.com/skio/selling-plan/getting-selling-plan-information)
>
````plaintext
Thought process: Architecting comprehensive technical brief with integration specs.

Good, I have the technical details I need. Let me now build a comprehensive technical brief document for Tomide. This should cover:

1. Architecture overview
2. Cart drawer specs
3. Custom /cart page specs
4. SKIO integration details
5. Cross-sell logic
6. Free shipping bar
7. Bundle upsell
8. Quantity upsell
9. API endpoints to use
10. Data flow

Let me create this as a markdown document.
````

````plaintext
Web Search: SKIO storefront API selling plan data variant endpoint
````

> **Getting Selling Plan Information | skio** [skio.com](https://integrate.skio.com/skio/selling-plan/getting-selling-plan-information)
>
> **Skio API Reference** [skio.com](https://code.skio.com/)
>
> **Static Box API guide for developers** [skio.com](https://help.skio.com/docs/guide-for-3rd-party-for-static-box-api)
>
> **Storefront GraphQL API Docs | skio** [skio.com](https://integrate.skio.com/skio/shopify-api-references/storefront-graphql-api-docs)
>
> **Guide for 3rd party for Static Box API – Skio** [skio.com](https://help.skio.com/hc/en-us/articles/21177333688987-Guide-for-3rd-party-for-Static-Box-API)
>
> **Dynamic Box API guide for developers** [skio.com](https://help.skio.com/docs/guide-for-3rd-party-for-dynamic-box-api)
>
> **Using the Skio API** [skio.com](https://help.skio.com/docs/using-the-skio-api)
>
> **Rules API | skio** [skio.com](https://integrate.skio.com/skio/rules/rules-api)
>
> **Dynamic | skio** [skio.com](https://integrate.skio.com/skio/build-a-box/dynamic)
>
> **Liquid Docs | skio** [skio.com](https://integrate.skio.com/skio/shopify-api-references/liquid-docs)
>
````plaintext
Thought process

Now I have all the technical details. Let me build the comprehensive brief.
````

````plaintext
View: Read the docx skill for creating the technical brief
````

````plaintext
Thought process: Architected comprehensive markdown document for cart optimization strategy.

This is going to be a markdown document, not a docx. Let me create it as a comprehensive markdown file that Hardik can share with Tomide. I'll make it detailed and actionable.
````

Now let me build the full technical brief as a markdown doc you can hand directly to Tomide.

````plaintext
Create File: Creating comprehensive technical brief for Nuora custom cart implementation - cart drawer + custom /cart page with SKIO integration, cross-sells, free shipping bar, and AOV tactics
````

````plaintext
Thought process

Let me copy this to outputs so Hardik can download it.
````

````plaintext
Bash Tool: Copy the brief to outputs for download
````

````plaintext
Thought process

Let me present the file.
````

````plaintext
Present File: /mnt/user-data/outputs/nuora-custom-cart-brief.md
````

````plaintext
Thought process: Synthesized ecommerce optimization strategies and cart features.

Done. Let me give a concise summary.
````

Here's the full technical brief. Few things I want you to decide before handing this off to Tomide:

**The 6 open questions at the bottom are important** - especially #3 (quantity adjuster behavior). Given your history with Ka-ching/SKIO SKU mapping conflicts where qty 3 of a 1-bottle variant caused over-shipping, I'd strongly recommend **hiding the qty adjuster and only showing bundle upgrade prompts** (Option B). This way someone buying 1-bottle gets prompted to upgrade to the 3-bottle variant rather than accidentally ordering qty 3 of the single bottle.

The other big call is the **cross-sell pricing for capsules**. Your AfterSell post-purchase funnel already offers capsules at $29.99 (downsell at $24.99). If the cart drawer also shows $29.99, the post-purchase upsell loses its novelty. You might want to show a higher price in-cart (like $34.99) so the post-purchase offer still feels like a deal - or skip the in-cart cross-sell for capsules entirely and let AfterSell handle it. What's your take?

> File: /mnt/user-data/outputs/nuora-custom-cart-brief.md





---
Powered by [Claude Exporter](https://www.ai-chat-exporter.net)