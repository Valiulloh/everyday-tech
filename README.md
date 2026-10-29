# Everyday Tech

A responsive electronics storefront and admin dashboard built with semantic HTML, CSS, and vanilla JavaScript. A frontend portfolio project focused on product discovery, configurable devices, accessible interactions, and resilient browser storage.

**[View the live demo](https://everyday-tech-portfolio.witty-ocean-1794.chatgpt.site)** · [Browse products](https://everyday-tech-portfolio.witty-ocean-1794.chatgpt.site/products.html) · [Try the admin dashboard](https://everyday-tech-portfolio.witty-ocean-1794.chatgpt.site/admin.html)

## Features

- Catalog of 61 Apple device models with search, category and generation filters, sorting, and shareable filter URLs.
- Product pages with color photos, storage and supported memory options, specifications, and related devices.
- Persistent shopping bag with separate configurations, quantity validation, stock limits, and totals calculated in integer cents.
- Validated demo checkout, order confirmation, inventory reservations, and cancellation handling.
- Admin overview, product and category creation, product editing, image uploads, and order status management.
- Responsive layouts, keyboard focus styles, skip links, status announcements, and reduced-motion support.
- Storage validation, recovery from corrupt data, and updates across tabs.

## Run locally

Requires Node.js 20 or later and npm.

```sh
npm ci
npm start
```

Open [localhost:4173](http://127.0.0.1:4173). The development server binds to your own computer. Stop it with Ctrl+C.

```sh
npm test              # Run the Node test suite
npm run format       # Format source files
npm run format:check # Check formatting
npm run build        # Prepare the static site in dist/
npm run check        # Run formatting, tests, and build
```

The application has no runtime dependencies. Prettier is a development dependency, pinned through the lockfile. GitHub Actions runs the checks on pushes and pull requests.

## Code structure

| Path                                | Responsibility                                                 |
| ----------------------------------- | -------------------------------------------------------------- |
| `*.html`                            | Storefront and admin page shells                               |
| `css/styles.css`, `css/admin.css`   | Storefront and dashboard styling                               |
| `js/products.js`                    | Seed catalog, device configurations, and image references      |
| `js/store.js`                       | Validated catalog overrides, categories, orders, and inventory |
| `js/cart.js`                        | Bag persistence, configuration keys, quantities, and totals    |
| `js/catalog-utils.js`               | Filtering, sorting, and related products                       |
| `js/ui.js`                          | Shared storefront rendering helpers                            |
| `js/pages/`                         | Home, catalog, product, bag, and checkout behavior             |
| `js/app.js`                         | Storefront startup and cross-tab synchronization               |
| `js/admin.js`, `js/admin-create.js` | Dashboard interactions and creation forms                      |
| `tests/`                            | Cart, catalog, configuration, and admin regression tests       |
| `build.cjs`, `server.cjs`           | Static build and local development server                      |

Scripts use ordered `defer` loading so the site can run on a static host without a bundler. Business rules live in the store and cart files; page files render the interface and handle user interaction.

## Demo scope

This is a frontend demo with browser-local data. Admin changes, uploaded images, shopping bags, and demo orders are saved in the current browser only. They are not shared between devices or visitors. The admin dashboard has no authentication and is intended for demonstration.

Checkout does not take payments, send emails, or arrange shipping. Delivery form details are not persisted or transmitted. Use fictional delivery information. Prices and inventory are sample data; this is not an official Apple store. Clearing browser site data resets the demo.

Image uploads accept up to four JPEG, PNG, or WebP files, compress them in the browser, and store them locally. Browser storage quotas limit the amount of demo content that can be saved.

A production store would require a backend, authentication and authorization, a shared database, server-side price and inventory validation, hosted image storage, and a payment provider.

## Deploy

Run `npm run build` and publish the contents of `dist/` to a static host. The local development server is not a production server. No environment variables or API keys are required.

## Assets

Apple product imagery and trademarks belong to their respective owners. Official image source URLs are recorded in `images/apple/sources.json`; those assets are not licensed as original project code. This portfolio is an independent demo and is not affiliated with Apple.
