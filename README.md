# DEEPORA - Luxury Storefront (Frontend)

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-ISC-brightgreen.svg)](package.json)
[![Author](https://img.shields.io/badge/Author-Mayank%20Rana-blue)](https://github.com/MayankR-Codes)

A modern, responsive e-commerce storefront for handcrafted festive diyas featuring an interactive 3D visualizer, dynamic cart and checkout workflow, customer account management, and smooth scroll animations.

---

## 🌟 Key Features

- **Luxury Visual Design**: High-fidelity festive visuals, responsive styling (`styles.css`), and cinematic animations powered by **GSAP**, **ScrollTrigger**, and **Lenis**.
- **Interactive 3D Diya Studio**: Real-time 3D rendered diya preview using **Three.js** (`assets/three.min.js`), allowing custom rotation, flame glow effects, and material inspection.
- **Dynamic Catalog Integration**: Fetches real-time products, pricing tiers, and stock availability from the backend REST API (`/api/products`).
- **Persistent Cart & Checkout**: Real-time subtotal calculation, coupon discounts, delivery address capture, and seamless order submission (`checkout.html`, `checkout.js`).
- **Customer Account Portal**: Sign up, login, profile management, and saved delivery address snapshot (`account.html`, `account.js`).
- **Live Order Tracking**: Instant order status display and invoice confirmation (`order-confirmation.html`, `order-confirmation.js`).
- **Video Maker Tool**: Built-in promotional video and poster rendering utility (`video-maker.html`).

---

## 🏗️ Directory Structure

```
Deepora-FrontEnd/
├── assets/                    # High-res images, 3D libraries, videos, audio
│   ├── deepora-hero-smooth.mp4
│   ├── gsap.min.js            # GSAP animation engine
│   ├── ScrollTrigger.min.js   # ScrollTrigger plugin
│   ├── lenis.min.js           # Smooth scroll controller
│   ├── three.min.js           # Three.js 3D engine
│   └── ...                    # Product photography and diya textures
├── tools/
│   └── video-server.js        # Media renderer server for video-maker tool
├── account.html               # Customer profile & authentication UI
├── account.js                 # Account management client controller
├── checkout.html              # Checkout view & address verification
├── checkout.js                # Order placement & validation logic
├── index.html                 # Main storefront & 3D visualizer
├── app.js                     # Core frontend interactions & Three.js 3D studio
├── order-confirmation.html    # Order tracking & invoice confirmation UI
├── order-confirmation.js      # Order confirmation controller
├── video-maker.html           # Promotional video & poster creator
├── styles.css                 # Luxury dark/gold theme styling
├── server.js                  # Zero-dependency local dev static server
├── robots.txt                 # Search engine crawler configuration
├── sitemap.xml                # SEO sitemap
├── .env.example               # Example frontend environment configuration
├── .gitignore                 # Git ignore rules for node_modules, temp files
├── package.json               # Frontend npm package configuration
└── README.md                  # Frontend documentation
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher.
- Zero external npm packages required to run the local server!

### 2. Start the Frontend Server
```bash
npm start
```
The storefront will be live at:
👉 **[http://localhost:4173](http://localhost:4173)**

### 3. Connect to Backend API
By default, the frontend automatically looks for the DEEPORA Backend API running at `http://127.0.0.1:4175`.

To point the frontend to a custom or production backend API, define `window.DEEPORA_API_ORIGIN` or set `DEEPORA_API_ORIGIN` in your environment.

---

## 🛠️ Additional Tools

### Video Maker Server
To run the local promotional video & poster generation tool:
```bash
npm run video-tool
```
Then visit `http://127.0.0.1:4174` in your browser.

---

## 📦 Setting Up as a Separate Git Repository

To initialize this folder as its own independent git repository:

```bash
cd C:\Users\KIIT\Documents\Deepora-FrontEnd
git init
git add .
git commit -m "feat: initial commit of Deepora Frontend luxury storefront"
git branch -M main
# Add your GitHub remote:
# git remote add origin https://github.com/<your-username>/deepora-frontend.git
# git push -u origin main
```

---

## 👤 Author
- **Developer**: [Mayank Rana](https://github.com/MayankR-Codes)
- **Email**: [mayank.rana.mr12@gmail.com](mailto:mayank.rana.mr12@gmail.com)
- **License**: ISC
