const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const authApiBase = window.DEEPORA_API_ORIGIN || (isLocalHost ? `${location.protocol}//${location.hostname}:4175` : location.origin);
let catalog = [];
let catalogUnavailable = false;
let activeFilter = 'diya';
let cartOwnerId = null;
let cartSyncTimer = 0;
let cart = readCart();
let selectedStudioProductId = null;
let selectedDialogVariantId = null;
let lockedScrollY = 0;
const scrollLocks = new Set();
let lenis = null;

// Use one Lenis clock for native scroll, GSAP timelines, and scroll-scrubbed scenes.
if (window.Lenis && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  lenis = new Lenis({ autoRaf: false, lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
  lenis.on('scroll', () => ScrollTrigger.update());
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

function lockBackgroundScroll(reason) {
  if (scrollLocks.has(reason)) return;
  if (!scrollLocks.size) {
    lockedScrollY = Math.max(0, lenis?.scroll ?? window.scrollY);
    lenis?.stop();
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = '100%';
  }
  scrollLocks.add(reason);
}
function unlockBackgroundScroll(reason, restoreY = lockedScrollY) {
  scrollLocks.delete(reason);
  if (scrollLocks.size) return;
  const targetY = Math.max(0, Number.isFinite(restoreY) ? restoreY : lockedScrollY);
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, targetY);
  lenis?.start();
  if (lenis) lenis.scrollTo(targetY, { immediate: true, force: true });
}

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem('deepora-cart:guest') || localStorage.getItem('deepora-cart') || '[]');
    return Array.isArray(saved) ? saved.filter(line => line && typeof line.id === 'string' && Number.isInteger(line.quantity) && line.quantity > 0).map(line => ({ ...line, variant: line.variant || 'single' })) : [];
  } catch (error) {
    return [];
  }
}

function fetchWithTimeout(url, options = {}, timeoutMs = 1600) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function loadCatalog() {
  const signedInCartPromise = syncSignedInCart();
  try {
    const response = await fetchWithTimeout(`${authApiBase}/api/products`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Catalog request failed with HTTP ${response.status}.`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('The product catalog response is invalid.');
    catalog = data.filter(validProduct).filter((product, index, items) => items.findIndex(item => item.id === product.id) === index)
      .map(product => product.id === 'mitti-glow-rangoli-bloom'
        ? { ...product, image: 'assets/Festive Four-Diya Flower Arrangement.png' }
        : product);
    catalogUnavailable = false;
  } catch (error) {
    console.error('Deepora catalog could not be loaded from MongoDB.', error);
    catalog = [];
    catalogUnavailable = true;
  }
  renderProducts();
  renderStudioPicker();
  renderCart();
  await signedInCartPromise;
  if (new URLSearchParams(location.search).get('checkout') === '1' && cart.length) {
    try {
      const response = await fetchWithTimeout(`${authApiBase}/api/auth/me`, { credentials: 'include' }, 1800);
      if (response.ok) location.replace('checkout.html');
      else if (response.status === 401) location.replace('account.html?return=checkout');
      else $('#cartNote').textContent = 'Your bag is saved. The account service is temporarily unavailable.';
    } catch { $('#cartNote').textContent = 'Your bag is saved. Start the account service to continue.'; }
  }
}
function validProduct(p) {
  return p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.category === 'string' &&
    typeof p.description === 'string' && typeof p.image === 'string' && Array.isArray(p.variants) && p.variants.length > 0 &&
    p.variants.every(variant => variant && typeof variant.id === 'string' && typeof variant.label === 'string' &&
      typeof variant.price === 'number' && variant.price >= 0 && Number.isFinite(variant.price) && Number.isInteger(variant.units) && variant.units > 0) &&
    typeof p.price === 'number' && p.price >= 0 && Number.isFinite(p.price) && Number.isInteger(p.stock) && p.stock >= 0;
}
function safeText(value) {
  const node = document.createElement('span'); node.textContent = value; return node.innerHTML;
}
function safeAttr(value) { return safeText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function getVariant(product, variantId) { return product?.variants?.find(variant => variant.id === variantId) || product?.variants?.[0]; }
function productStartingPrice(product) { return Math.min(...product.variants.map(variant => variant.price)); }
function cartLineKey(line) { return `${line.id}:${line.variant || 'single'}`; }
function artSvg(id = 'product') {
  const suffix = String(id).replace(/[^a-z0-9]/gi, '');
  return `<svg class="product-illustration" viewBox="0 0 360 270" role="img" aria-label="Ornamental diya illustration">
    <defs><linearGradient id="metal-${suffix}" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#71501f"/><stop offset=".24" stop-color="#f0d18a"/><stop offset=".43" stop-color="#795021"/><stop offset=".68" stop-color="#f2d98e"/><stop offset="1" stop-color="#694318"/></linearGradient><radialGradient id="fire-${suffix}"><stop stop-color="#fff4c5"/><stop offset=".3" stop-color="#ffb841" stop-opacity=".75"/><stop offset="1" stop-color="#c24f1c" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="180" cy="220" rx="90" ry="17" fill="#e38b32" opacity=".2"/><ellipse cx="180" cy="82" rx="38" ry="53" fill="url(#fire-${suffix})"/><path d="M180 119c-31-22-14-48 1-77 15 23 37 45-1 77Z" fill="#f4a839"/><path d="M180 117c-9-10-4-22 2-34 8 12 10 24-2 34Z" fill="#fff0bd"/><path d="M75 145q105-42 210 0-20 65-105 78-84-13-105-78Z" fill="url(#metal-${suffix})" stroke="#e9cd82" stroke-width="2"/><path d="M75 145q105-42 210 0-22 21-105 24-83-3-105-24Z" fill="#20160f" stroke="#e0bf70" stroke-width="3"/><path d="M85 158q95 25 190 0m-176 26q81 29 162 0m-139 30q70 22 116 0" fill="none" stroke="#f3d994" stroke-opacity=".7"/><path d="M140 217q40 15 80 0l-8 16q-32 12-64 0Z" fill="url(#metal-${suffix})" stroke="#e6ca7e"/><ellipse cx="180" cy="234" rx="42" ry="8" fill="url(#metal-${suffix})" stroke="#e6ca7e"/></svg>`;
}
function renderProducts() {
  const query = $('#catalogSearch').value.trim().toLocaleLowerCase();
  const shown = catalog.filter(p => (activeFilter === 'all' || p.category === activeFilter || (activeFilter === 'gift' && p.gift === true)) &&
    (!query || [p.name, p.subtitle, p.description, p.material, p.category].filter(Boolean).join(' ').toLocaleLowerCase().includes(query)));
  const grid = $('#products');
  if (!shown.length) {
    grid.innerHTML = catalog.length && query ? `<div class="catalog-empty"><span>⌕</span><div><p class="eyebrow">NO MATCHES</p><h3>Nothing found for <em>“${safeText(query)}”.</em></h3><p>Try another search, or clear the search field to see the full collection.</p></div></div>` : `<div class="catalog-empty"><span>✳</span><div><p class="eyebrow">${catalogUnavailable ? 'CATALOG UNAVAILABLE' : 'A COLLECTION IN THE MAKING'}</p><h3>${catalogUnavailable ? 'The collection is taking a moment.' : 'Good things take <em>light.</em>'}</h3><p>${catalogUnavailable ? 'The product catalog could not be loaded. Please try again later.' : 'The Deepora catalog is being prepared. Check back soon, or write to <a href="mailto:hello@deepora.example">hello@deepora.example</a>.'}</p></div></div>`;
    return;
  }
  grid.innerHTML = shown.map(p => `<article class="product-card" data-product="${safeAttr(p.id)}" tabindex="0" role="button" aria-label="View ${safeAttr(p.name)}">
    <div class="product-image"><img class="product-photo" src="${safeAttr(p.image)}" alt="${safeAttr(p.name)} diya" loading="lazy"><span class="product-tag">${safeText(p.label || 'THE DEEPORA COLLECTION')}</span></div>
    <div class="product-info"><div><h3>${safeText(p.name)}</h3><p>${safeText(p.subtitle || p.material)}</p></div><div class="product-price">From ${money.format(productStartingPrice(p))}${p.stock === 0 ? '<div class="product-unavailable">Unavailable</div>' : ''}</div></div></article>`).join('');
  $$('.product-card', grid).forEach(card => {
    const open = () => showProduct(card.dataset.product);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}
function showProduct(id) {
  const p = catalog.find(item => item.id === id); if (!p) return;
  selectedDialogVariantId = p.variants[0].id;
  $('#dialogArt').innerHTML = `<img class="dialog-photo" src="${safeAttr(p.image)}" alt="${safeAttr(p.name)} diya">`;
  $('#dialogCategory').textContent = p.label || 'THE DEEPORA COLLECTION';
  $('#dialogTitle').textContent = p.name;
  $('#dialogDescription').textContent = p.description;
  $('#dialogMaterial').textContent = p.material ? `Material · ${p.material}` : '';
  renderVariantPicker(p);
  lockBackgroundScroll('product');
  $('#productDialog').showModal();
}
function renderVariantPicker(product) {
  const picker = $('#variantPicker');
  picker.innerHTML = product.variants.map(variant => `<button type="button" class="variant-option${variant.id === selectedDialogVariantId ? ' active' : ''}" data-variant="${safeAttr(variant.id)}" aria-pressed="${variant.id === selectedDialogVariantId}"><span>${safeText(variant.label)}</span><b>${money.format(variant.price)}</b></button>`).join('');
  $$('[data-variant]', picker).forEach(button => button.addEventListener('click', () => {
    selectedDialogVariantId = button.dataset.variant;
    renderVariantPicker(product);
  }));
  const selected = getVariant(product, selectedDialogVariantId);
  $('#dialogPrice').textContent = selected ? money.format(selected.price) : '';
  const add = $('#dialogAdd');
  add.type = 'button';
  add.disabled = product.stock < 1;
  add.textContent = product.stock < 1 ? 'Currently unavailable' : `Add ${selected?.label || 'to bag'}`;
  add.onclick = event => { event.preventDefault(); addToCart(product.id, selected?.id); $('#productDialog').close(); openCart(); };
}
function saveCart() {
  const key = cartOwnerId ? `deepora-cart:user:${cartOwnerId}` : 'deepora-cart:guest';
  try {
    localStorage.setItem(key, JSON.stringify(cart));
    if (!cartOwnerId) localStorage.setItem('deepora-cart', JSON.stringify(cart));
  } catch (error) { console.warn('Deepora bag could not be saved.', error); }
  renderCart();
  if (cartOwnerId) {
    clearTimeout(cartSyncTimer);
    cartSyncTimer = setTimeout(() => {
      fetchWithTimeout(`${authApiBase}/api/cart`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart }) }, 2200).catch(() => {});
    }, 180);
  }
}
function addToCart(id, variantId = 'single') {
  const product = catalog.find(p => p.id === id); const variant = getVariant(product, variantId);
  if (!product || !variant || product.stock < 1) return;
  const line = cart.find(x => x.id === id && x.variant === variant.id);
  if (line) line.quantity = Math.min(line.quantity + 1, product.stock);
  else cart.push({ id, variant: variant.id, quantity: 1 });
  saveCart();
}
function renderCart() {
  cart = cart.map(line => {
    const product = catalog.find(p => p.id === line.id);
    const variant = getVariant(product, line.variant);
    return product && variant && product.stock > 0 ? { id: product.id, variant: variant.id, quantity: Math.min(line.quantity, product.stock) } : null;
  }).filter(Boolean);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  $('#cartCount').textContent = count; $('#drawerCount').textContent = `(${count})`;
  $('#cartEmpty').hidden = count > 0; $('#cartTotal').hidden = count === 0; $('#cartNote').hidden = count === 0;
  $('#rewardProgress').hidden = count === 0;
  $('#checkoutBtn').disabled = count === 0;
  const paidTotal = cart.reduce((sum, line) => {
    const product = catalog.find(p => p.id === line.id);
    return sum + getVariant(product, line.variant).price * line.quantity;
  }, 0);
  const ogGift = paidTotal >= 200 ? catalog.find(p => p.id === 'og-diya') : null;
  const dripGift = paidTotal >= 350 ? catalog.find(p => p.id === 'drip-diya') : null;
  const earned = [ogGift, dripGift].filter(Boolean);
  const nextReward = paidTotal < 200 ? 200 : paidTotal < 350 ? 350 : paidTotal < 500 ? 500 : 0;
  const rewardMessage = paidTotal >= 500 ? 'All rewards unlocked' : `Add ${money.format(nextReward - paidTotal)} for ${nextReward === 200 ? 'an OG Diya gift' : nextReward === 350 ? 'a DripDiya gift' : '₹50 off'}`;
  $('#rewardMessage').textContent = count ? rewardMessage : 'Add a diya to unlock a gift';
  $('#rewardFill').style.width = `${Math.min(paidTotal / 500, 1) * 100}%`;
  const rewardTrack = $('#rewardProgress [role="progressbar"]');
  rewardTrack.setAttribute('aria-valuenow', String(Math.min(paidTotal, 500)));
  rewardTrack.setAttribute('aria-valuetext', `${money.format(Math.min(paidTotal, 500))} of ₹500`);
  $('#rewardUnlocked').textContent = count ? [ogGift && 'OG Diya gift', dripGift && 'DripDiya gift', paidTotal >= 500 && '₹50 off'].filter(Boolean).join(' · ') || 'Rewards unlock as your bag grows' : '';
  $('#cartItems').innerHTML = cart.map(line => {
    const p = catalog.find(item => item.id === line.id);
    const variant = getVariant(p, line.variant);
    return `<div class="cart-line"><div class="cart-line-art"><img class="cart-photo" src="${safeAttr(p.image)}" alt="${safeAttr(p.name)}"></div><div class="cart-line-copy"><b>${safeText(p.name)}</b><small>${safeText(variant.label)} · ${money.format(variant.price)}</small><div class="quantity"><button data-change="-1" data-line="${safeAttr(cartLineKey(line))}" aria-label="Remove one">−</button><span>${line.quantity}</span><button data-change="1" data-line="${safeAttr(cartLineKey(line))}" aria-label="Add one">+</button><button class="remove-line" data-remove="${safeAttr(cartLineKey(line))}">Remove</button></div></div><b class="line-total">${money.format(variant.price * line.quantity)}</b></div>`;
  }).join('') + earned.map(p => `<div class="cart-line cart-gift"><div class="cart-line-art"><img class="cart-photo" src="${safeAttr(p.image)}" alt=""></div><div class="cart-line-copy"><b>${safeText(p.name)}</b><small>Gift from Deepora · 1 diya</small></div><b class="line-total">₹0</b></div>`).join('');
  const total = Math.max(0, paidTotal - (paidTotal >= 500 ? 50 : 0));
  $('#subtotalLabel').textContent = paidTotal >= 500 ? 'TOTAL · ₹50 SAVED' : 'SUBTOTAL';
  $('#subtotal').textContent = money.format(total);
  $$('[data-change]', $('#cartItems')).forEach(button => button.addEventListener('click', () => {
    const line = cart.find(x => cartLineKey(x) === button.dataset.line); const p = catalog.find(x => x.id === line.id);
    line.quantity = Math.max(0, Math.min(p.stock, line.quantity + Number(button.dataset.change)));
    if (!line.quantity) cart = cart.filter(x => x !== line); saveCart();
  }));
  $$('[data-remove]', $('#cartItems')).forEach(button => button.addEventListener('click', () => { cart = cart.filter(x => cartLineKey(x) !== button.dataset.remove); saveCart(); }));
  try {
    const key = cartOwnerId ? `deepora-cart:user:${cartOwnerId}` : 'deepora-cart:guest';
    localStorage.setItem(key, JSON.stringify(cart));
    if (!cartOwnerId) localStorage.setItem('deepora-cart', JSON.stringify(cart));
  } catch (error) { /* The bag still works for this session. */ }
}
async function syncSignedInCart() {
  try {
    const response = await fetchWithTimeout(`${authApiBase}/api/auth/me`, { credentials: 'include' }, 1800);
    if (!response.ok) return;
    const { user } = await response.json();
    if (!user?.id) return;
    const guestItems = cart;
    const cartResponse = await fetchWithTimeout(`${authApiBase}/api/cart`, { credentials: 'include' }, 1800);
    if (!cartResponse.ok) return;
    const saved = await cartResponse.json();
    cartOwnerId = user.id;
    const accountItems = Array.isArray(saved.items) ? saved.items : [];
    cart = accountItems.length ? accountItems : guestItems;
    try { localStorage.setItem(`deepora-cart:user:${cartOwnerId}`, JSON.stringify(cart)); } catch {}
    renderCart();
    if (!accountItems.length && guestItems.length) {
      fetchWithTimeout(`${authApiBase}/api/cart`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: guestItems }) }, 2200).catch(() => {});
    }
  } catch { /* A signed-out or offline visitor keeps using the local guest bag. */ }
}
let cartReturnScrollY = 0;
function currentPageScrollY() { return scrollLocks.size ? lockedScrollY : Math.max(0, lenis?.scroll ?? window.scrollY); }
function openCart() { dismissIntro(); cartReturnScrollY = currentPageScrollY(); lockBackgroundScroll('cart'); $('#overlay').classList.add('show'); $('#cartDrawer').classList.add('open'); $('#cartDrawer').setAttribute('aria-hidden', 'false'); }
function closeCart() { $('#overlay').classList.remove('show'); $('#cartDrawer').classList.remove('open'); $('#cartDrawer').setAttribute('aria-hidden', 'true'); unlockBackgroundScroll('cart', cartReturnScrollY); }

// The wordmark stays visible until the first cinematic frame and collection art are warm.
const intro = $('#intro');
const introMark = $('.intro-mark');
const resumeCheckout = new URLSearchParams(location.search).get('checkout') === '1';
const navigationEntry = performance.getEntriesByType('navigation')[0];
const introSeenKey = 'deepora-intro-seen';
let introAssetsReady = false;
let introTimer = 0;
async function preloadOpeningAssets(catalogPromise) {
  const openingVideo = $('#heroVideo');
  const videoReady = openingVideo ? new Promise(resolve => {
    const finish = () => resolve();
    openingVideo.addEventListener('loadeddata', finish, { once: true });
    openingVideo.addEventListener('error', finish, { once: true });
    openingVideo.preload = 'auto';
    openingVideo.load();
    setTimeout(finish, 2600);
  }) : Promise.resolve();
  const imagesReady = catalogPromise.then(() => Promise.all(catalog.slice(0, 4).map(product => new Promise(resolve => {
    const image = new Image();
    const timeout = setTimeout(resolve, 1800);
    image.onload = image.onerror = () => { clearTimeout(timeout); resolve(); };
    image.src = product.image;
  }))));
  await Promise.race([
    Promise.all([videoReady, imagesReady]),
    new Promise(resolve => setTimeout(resolve, 3000))
  ]);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  introAssetsReady = true;
  intro?.classList.add('intro-ready');
  if (shouldPlayIntro()) playIntro();
  else dismissIntro();
  if (window.ScrollTrigger) ScrollTrigger.refresh();
}
function shouldPlayIntro() {
  if (resumeCheckout || prefersReducedMotion || navigationEntry?.type === 'back_forward') return false;
  try { return sessionStorage.getItem(introSeenKey) !== '1'; } catch { return true; }
}
if (shouldPlayIntro()) {
  history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    scrollTo(0, 0);
    intro?.classList.remove('out');
    intro?.style.setProperty('--intro-brand-x', '0px');
    intro?.style.setProperty('--intro-brand-y', '0px');
    intro?.style.setProperty('--intro-brand-scale', '1');
    intro?.style.setProperty('--intro-stars-rise', '0px');
    intro?.style.setProperty('--intro-stars-alpha', '1');
    scheduleHeroSequence();
  }));
}
function dismissIntro() {
  if (!intro) return;
  clearTimeout(introTimer);
  intro.classList.add('out');
  try { sessionStorage.setItem(introSeenKey, '1'); } catch { /* Keep the intro session-only when storage is unavailable. */ }
}
function playIntro() {
  if (!intro || !introAssetsReady) return;
  clearTimeout(introTimer);
  intro.classList.remove('out');
  intro.style.opacity = '';
  intro.style.setProperty('--intro-brand-x', '0px');
  intro.style.setProperty('--intro-brand-y', '0px');
  intro.style.setProperty('--intro-brand-scale', '1');
  intro.style.setProperty('--intro-stars-rise', '0px');
  intro.style.setProperty('--intro-stars-alpha', '1');
  const logo = $('.nav .wordmark')?.getBoundingClientRect();
  const targetX = logo ? logo.left + logo.width / 2 - innerWidth / 2 : -innerWidth * .3;
  const targetY = logo ? logo.top + logo.height / 2 - innerHeight / 2 : -innerHeight * .38;
  const finish = () => { dismissIntro(); scheduleHeroSequence(); };
  if (prefersReducedMotion) { finish(); return; }
  if (window.gsap) {
    gsap.timeline({ delay: .9, onComplete: finish })
      .to(introMark, { x: targetX, y: targetY, scale: .34, duration: .95, ease: 'power2.inOut' }, 0)
      .to(intro, { '--intro-stars-rise': '-110px', '--intro-stars-alpha': 0, duration: .95, ease: 'power1.in' }, 0)
      .to(intro, { opacity: 0, duration: .55, ease: 'power1.out' }, .72);
  } else {
    introTimer = setTimeout(finish, 2300);
  }
}
$('#replayIntro').addEventListener('click', () => {
  scrollTo({ top: 0, behavior: 'instant' });
  try { sessionStorage.removeItem(introSeenKey); } catch { /* Replay remains available without storage. */ }
  playIntro();
});
if (!shouldPlayIntro()) dismissIntro();

// A small canvas dust field gives depth without loading a video or 3D runtime.
const canvas = $('#dust'); const ctx = canvas.getContext('2d'); let particles = [];
function resizeDust() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5); canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  particles = Array.from({ length: innerWidth < 700 ? 70 : 145 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: .45 + Math.random() * 1.45, v: .08 + Math.random() * .26, a: .22 + Math.random() * .62, star: Math.random() < .28, phase: Math.random() * Math.PI * 2 }));
}
function dustFrame() {
  if (!ctx || intro.classList.contains('out') || prefersReducedMotion) return;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles.forEach(p => {
    p.y -= p.v; if (p.y < -2) { p.y = innerHeight + 2; p.x = Math.random() * innerWidth; }
    const twinkle = .5 + .5 * Math.sin(performance.now() * .0012 + p.phase);
    ctx.beginPath(); ctx.fillStyle = `rgba(244,211,144,${p.a * (.35 + twinkle * .65)})`; ctx.arc(p.x, p.y, p.r * (.72 + twinkle * .35), 0, Math.PI * 2); ctx.fill();
    if (p.star) { ctx.strokeStyle = `rgba(255,230,170,${p.a * twinkle * .72})`; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(p.x - p.r * 2.3, p.y); ctx.lineTo(p.x + p.r * 2.3, p.y); ctx.moveTo(p.x, p.y - p.r * 2.3); ctx.lineTo(p.x, p.y + p.r * 2.3); ctx.stroke(); }
  });
  requestAnimationFrame(dustFrame);
}
resizeDust(); dustFrame(); addEventListener('resize', resizeDust);

$('#filters').addEventListener('click', e => { const btn = e.target.closest('[data-filter]'); if (!btn) return; activeFilter = btn.dataset.filter; $$('.filter').forEach(x => x.classList.toggle('active', x === btn)); renderProducts(); });
$('#cartTrigger').addEventListener('click', openCart); $('.close-drawer').addEventListener('click', closeCart); $('#overlay').addEventListener('click', closeCart);
$('#productDialog').addEventListener('close', () => unlockBackgroundScroll('product'));
$('.dialog-close').addEventListener('click', () => $('#productDialog').close());
$('#productDialog').addEventListener('click', e => { if (e.target === $('#productDialog')) $('#productDialog').close(); });
$('.search-open').addEventListener('click', () => { $('#catalogSearchWrap').classList.add('show'); $('#collection').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' }); setTimeout(() => $('#catalogSearch').focus(), 400); });
$('#catalogSearch').addEventListener('input', renderProducts);
$('#checkoutBtn').addEventListener('click', async () => {
  try {
    const response = await fetch(`${authApiBase}/api/auth/me`, { credentials: 'include' });
    if (!response.ok) { location.href = 'account.html?return=checkout'; return; }
    location.href = 'checkout.html';
  } catch { location.href = 'account.html?return=checkout'; }
});
function updateHeaderVisibility() {
  const header = $('.nav');
  const sequence = $('#heroSequence');
  const visible = !sequence || sequence.getBoundingClientRect().bottom <= 0;
  header.classList.toggle('nav-visible', visible);
  header.classList.toggle('stuck', visible);
}
addEventListener('scroll', updateHeaderVisibility, { passive: true });
addEventListener('resize', updateHeaderVisibility, { passive: true });
updateHeaderVisibility();
const heroArt = $('#heroArt');

const heroSequence = $('#heroSequence');
const heroVideo = $('#heroVideo');
const heroCopy = $('.hero-copy');
const heroBottom = $('.hero-bottom');
const glitterCanvas = $('#heroGlitter');
const glitterContext = glitterCanvas?.getContext('2d');
const glitterParticles = Array.from({ length: 132 }, (_, index) => ({
  angle: index * 2.399963,
  travel: .24 + (index % 17) / 17 * .9,
  size: .95 + (index % 5) * .44,
  alpha: .45 + (index % 7) * .08,
  streak: index % 4 === 0
}));
let glitterRatio = 1;
function resizeHeroGlitter() {
  if (!glitterCanvas || !glitterContext) return;
  glitterRatio = Math.min(devicePixelRatio || 1, 1.35);
  glitterCanvas.width = Math.round(innerWidth * glitterRatio);
  glitterCanvas.height = Math.round(innerHeight * glitterRatio);
  glitterContext.setTransform(glitterRatio, 0, 0, glitterRatio, 0, 0);
}
function drawHeroGlitter(progress, finale) {
  if (!glitterContext) return;
  glitterContext.clearRect(0, 0, innerWidth, innerHeight);
  const spread = smoothStep((progress - .82) / .18);
  const fade = 1 - smoothStep((progress - .97) / .03);
  if (spread <= 0 || fade <= .004) return;
  const originX = innerWidth * .52;
  const originY = innerHeight * (.57 + finale * .08);
  const reach = Math.hypot(innerWidth, innerHeight) * .72 * spread;
  for (const particle of glitterParticles) {
    const dx = Math.cos(particle.angle); const dy = Math.sin(particle.angle);
    const distance = reach * particle.travel;
    const x = originX + dx * distance; const y = originY + dy * distance;
    const alpha = particle.alpha * fade * Math.min(1, spread * 2.2);
    glitterContext.globalAlpha = alpha;
    glitterContext.fillStyle = '#f4d58f';
    glitterContext.beginPath(); glitterContext.arc(x, y, particle.size, 0, Math.PI * 2); glitterContext.fill();
    if (particle.streak) {
      glitterContext.strokeStyle = '#ffe8b4'; glitterContext.lineWidth = .65;
      glitterContext.beginPath(); glitterContext.moveTo(x - dx * 5, y - dy * 5); glitterContext.lineTo(x + dx * 5, y + dy * 5); glitterContext.stroke();
      glitterContext.beginPath(); glitterContext.moveTo(x - dy * 3, y + dx * 3); glitterContext.lineTo(x + dy * 3, y - dx * 3); glitterContext.stroke();
    }
  }
  glitterContext.globalAlpha = 1;
}
const smoothStep = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
let heroVideoTargetTime = .65;
let heroVideoSeekTimer = 0;
let heroVideoLastSeek = 0;
function queueHeroVideoSeek() {
  if (!heroVideo || heroVideoSeekTimer || !Number.isFinite(heroVideo.duration) || heroVideo.duration <= 0) return;
  const wait = Math.max(0, 55 - (performance.now() - heroVideoLastSeek));
  heroVideoSeekTimer = setTimeout(() => {
    heroVideoSeekTimer = 0;
    if (heroVideo.seeking || !Number.isFinite(heroVideo.duration) || heroVideo.duration <= .1) return;
    if (Math.abs(heroVideo.currentTime - heroVideoTargetTime) > .09) {
      heroVideoLastSeek = performance.now();
      const safeTime = Math.max(0, Math.min(heroVideo.duration - .04, heroVideoTargetTime));
      if (Number.isFinite(safeTime)) heroVideo.currentTime = safeTime;
    }
  }, wait);
}
function updateHeroSequence() {
  if (!heroSequence || !heroVideo || prefersReducedMotion) return;
  const bounds = heroSequence.getBoundingClientRect();
  const distance = Math.max(1, heroSequence.offsetHeight - innerHeight);
  const progress = Math.max(0, Math.min(1, -bounds.top / distance));
  heroSequence.style.setProperty('--hero-progress', progress.toFixed(4));
  const artBounds = heroArt.getBoundingClientRect();
  const centerShift = innerWidth / 2 - (artBounds.left + artBounds.width / 2);
  heroArt.style.setProperty('--hero-center-x', `${(centerShift * smoothStep(progress / .28)).toFixed(2)}px`);
  const finale = smoothStep((progress - .78) / .18);
  heroVideo.style.transform = `translateY(${(finale * 8).toFixed(2)}vh) scale(${(1.04 + smoothStep(progress) * .035).toFixed(3)})`;
  heroArt.style.setProperty('--hero-finale', finale.toFixed(3));
  heroArt.style.setProperty('--hero-finale-drop', `${(finale * 8).toFixed(2)}vh`);
  heroArt.style.setProperty('--hero-finale-scale', (.68 + finale * .48).toFixed(3));
  if (Number.isFinite(heroVideo.duration) && heroVideo.duration > .7) {
    heroVideoTargetTime = Math.min(heroVideo.duration - .04, .65 + progress * (heroVideo.duration - .69));
    queueHeroVideoSeek();
  }
  $('.hero-orb').style.opacity = String(1 - smoothStep((progress - .76) / .24));
  const copyAlpha = 1 - smoothStep((progress - .80) / .19);
  heroCopy.style.opacity = String(copyAlpha);
  heroCopy.style.transform = `translateY(${-smoothStep((progress - .70) / .30) * 48}px)`;
  heroBottom.style.opacity = String(1 - smoothStep((progress - .04) / .2));
  drawHeroGlitter(progress, finale);
}
let heroFrame = 0;
function scheduleHeroSequence() {
  if (heroFrame || prefersReducedMotion) return;
  heroFrame = requestAnimationFrame(() => { heroFrame = 0; updateHeroSequence(); });
}
if (heroSequence && heroVideo) {
  heroVideo.pause();
  resizeHeroGlitter();
  updateHeroSequence();
  heroVideo.addEventListener('loadedmetadata', () => {
    if (prefersReducedMotion) { heroVideo.currentTime = Math.min(heroVideo.duration - .04, .65); return; }
    scheduleHeroSequence();
  }, { once: true });
  heroVideo.addEventListener('seeked', queueHeroVideoSeek);
  addEventListener('scroll', scheduleHeroSequence, { passive: true });
  addEventListener('resize', () => { resizeHeroGlitter(); scheduleHeroSequence(); }, { passive: true });
}

const studio = $('.scroll-studio');
const studioVisual = $('#studioVisual');
const studioDiya = $('#studioDiya');
const studioAdd = $('#studioAdd');
let studioRenderer = null;
let diyaModel = null;
let diyaMaterial = null;
let studioRimMaterial = null;
let flameOuter = null;
let flameInner = null;
let flameLight = null;
let studioDragX = 0;
let studioDragY = 0;

function initStudio3D() {
  const canvas = $('#studioModelCanvas');
  if (!canvas || !window.THREE || !studioVisual) return false;
  try {
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    camera.position.set(0, 2.45, 8.2);
    camera.lookAt(0, 1.0, 0);
    studioRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    studioRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    studioRenderer.setClearColor(0x000000, 0);
    studioRenderer.outputEncoding = THREE.sRGBEncoding;
    studioRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    studioRenderer.toneMappingExposure = .96;

    scene.add(new THREE.HemisphereLight(0xffe8b1, 0x29170d, 1.05));
    const key = new THREE.DirectionalLight(0xfff0c4, 2.15); key.position.set(-3.8, 6, 4); scene.add(key);
    const rimLight = new THREE.DirectionalLight(0xffa948, 1.55); rimLight.position.set(4.5, 3.6, -4); scene.add(rimLight);
    const softbox = new THREE.PointLight(0xffd475, 1.35, 8); softbox.position.set(0, 3.7, 2.7); scene.add(softbox);

    const warmGold = new THREE.Color('#b67a24');
    diyaMaterial = new THREE.MeshPhysicalMaterial({ color: warmGold, metalness: .78, roughness: .24, clearcoat: 1, clearcoatRoughness: .18 });
    const darkMetal = new THREE.MeshPhysicalMaterial({ color: '#704016', metalness: .82, roughness: .3, clearcoat: .8 });
    const innerMetal = new THREE.MeshStandardMaterial({ color: '#17100a', metalness: .67, roughness: .35, side: THREE.DoubleSide });
    diyaModel = new THREE.Group(); scene.add(diyaModel);
    const profile = [
      [0,.03],[.24,.03],[.4,.07],[.48,.14],[.7,.2],[.91,.32],[1.12,.51],[1.29,.77],[1.37,1.03],[1.39,1.21],
      [1.39,1.25],[1.34,1.29],[1.29,1.25],[1.27,1.15],[1.2,.94],[1.05,.68],[.86,.49],[.62,.36],[.34,.31],[0,.3]
    ].map(([r,y]) => new THREE.Vector2(r,y));
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 112), diyaMaterial);
    bowl.material.side = THREE.DoubleSide; bowl.castShadow = true; bowl.receiveShadow = true; diyaModel.add(bowl);
    const foot = new THREE.Mesh(new THREE.LatheGeometry([[.28,.02],[.37,.035],[.39,.09],[.34,.15],[.23,.18],[.08,.18],[0,.17]].map(([r,y]) => new THREE.Vector2(r,y)), 96), darkMetal);
    foot.position.y = -.005; diyaModel.add(foot);
    studioRimMaterial = new THREE.MeshStandardMaterial({ color: '#ffe5a2', metalness: .88, roughness: .2, emissive: '#704b17', emissiveIntensity: .18 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35,.025,16,128), studioRimMaterial); rim.rotation.x = Math.PI / 2; rim.position.y = 1.25; diyaModel.add(rim);
    const spoutShape = new THREE.Shape();
    spoutShape.moveTo(-.28, 0); spoutShape.quadraticCurveTo(-.17, .07, -.11, .19); spoutShape.quadraticCurveTo(0, .43, 0, .48);
    spoutShape.quadraticCurveTo(0, .43, .11, .19); spoutShape.quadraticCurveTo(.17, .07, .28, 0); spoutShape.quadraticCurveTo(0, -.08, -.28, 0);
    const spoutGeometry = new THREE.ExtrudeGeometry(spoutShape, { depth: .19, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .025, bevelThickness: .025 });
    const spout = new THREE.Mesh(spoutGeometry, diyaMaterial); spout.position.set(0, .91, 1.17); diyaModel.add(spout);
    for (const [radius, y, tube] of [[1.28,.82,.012],[1.16,.58,.009],[.91,.39,.008]]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,112), studioRimMaterial); band.rotation.x = Math.PI / 2; band.position.y = y; diyaModel.add(band);
    }
    const beadMaterial = new THREE.MeshStandardMaterial({ color: '#d4aa58', metalness: .76, roughness: .26, emissive: '#6d4516', emissiveIntensity: .16 });
    const petalMaterial = new THREE.MeshStandardMaterial({ color: '#a94b36', metalness: .42, roughness: .3, emissive: '#49170f', emissiveIntensity: .14 });
    const beadGeometry = new THREE.SphereGeometry(.035, 12, 10);
    for (let i = 0; i < 32; i++) {
      const angle = i / 32 * Math.PI * 2;
      const bead = new THREE.Mesh(beadGeometry, beadMaterial);
      bead.position.set(Math.cos(angle) * 1.37, 1.285, Math.sin(angle) * 1.37);
      bead.scale.set(1, .8, 1);
      diyaModel.add(bead);
    }
    const flowerCenter = new THREE.Group();
    flowerCenter.position.set(0, .98, 1.4);
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), i % 2 ? beadMaterial : petalMaterial);
      petal.position.set(Math.cos(angle) * .11, Math.sin(angle) * .11, 0);
      petal.scale.set(.05, .078, .02);
      petal.rotation.z = angle - Math.PI / 2;
      flowerCenter.add(petal);
    }
    const flowerJewel = new THREE.Mesh(new THREE.SphereGeometry(.044, 20, 16), new THREE.MeshPhysicalMaterial({ color: '#f0cc72', metalness: .68, roughness: .2, clearcoat: 1 }));
    flowerCenter.add(flowerJewel);
    diyaModel.add(flowerCenter);
    const cavity = new THREE.Mesh(new THREE.CircleGeometry(1.29,112), innerMetal); cavity.rotation.x = -Math.PI / 2; cavity.position.y = 1.205; diyaModel.add(cavity);

    const wick = new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.22,20), new THREE.MeshStandardMaterial({ color:'#302015',roughness:.9 }));
    wick.position.set(0,1.31,0); diyaModel.add(wick);

    const makeFlame = (color, opacity = 1) => {
      const shape = [[0,0],[.08,.08],[.145,.22],[.19,.43],[.17,.62],[.125,.82],[.07,1.03],[0,1.26]].map(([r,y]) => new THREE.Vector2(r,y));
      const material = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(shape,48),material);
      return mesh;
    };
    const flameGroup = new THREE.Group(); scene.add(flameGroup);
    flameOuter = makeFlame('#ff9b32'); flameGroup.add(flameOuter);
    flameInner = makeFlame('#fff0a6',.96); flameInner.scale.set(.34,.66,.34); flameInner.position.y=.08; flameGroup.add(flameInner);
    flameLight = new THREE.PointLight(0xffad3e, 3.2, 6); flameLight.position.set(0,1.7,.08); scene.add(flameLight);
    flameGroup.position.set(0,1.39,0);

    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
    const shadowCtx = shadowCanvas.getContext('2d'); const shadowGradient = shadowCtx.createRadialGradient(64,64,4,64,64,63);
    shadowGradient.addColorStop(0,'rgba(238,158,59,.38)'); shadowGradient.addColorStop(.42,'rgba(178,98,27,.16)'); shadowGradient.addColorStop(1,'rgba(0,0,0,0)');
    shadowCtx.fillStyle=shadowGradient; shadowCtx.fillRect(0,0,128,128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.8,1.8),new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false }));
    shadow.rotation.x=-Math.PI/2; shadow.position.set(0,-.015,0); scene.add(shadow);

    const resize = () => { const rect = studioVisual.getBoundingClientRect(); if (!rect.width || !rect.height) return; studioRenderer.setSize(rect.width,rect.height,false); camera.aspect=rect.width/rect.height; camera.updateProjectionMatrix(); };
    new ResizeObserver(resize).observe(studioVisual); resize();
    studioVisual.classList.add('webgl-ready');
    const clock = new THREE.Clock();
    const render = () => {
      const time = clock.getElapsedTime();
      diyaModel.position.y = prefersReducedMotion ? 0 : Math.sin(time * .82) * .055;
      diyaModel.rotation.y = THREE.MathUtils.degToRad(-34 + Number(studio?.style.getPropertyValue('--studio-progress') || 0) * 96 + studioDragY);
      diyaModel.rotation.x = THREE.MathUtils.degToRad(10 + (prefersReducedMotion ? 0 : studioDragX));
      diyaModel.rotation.z = prefersReducedMotion ? 0 : Math.sin(time * .5) * .014;
      const sway = prefersReducedMotion ? 0 : Math.sin(time * 5.2) * .045;
      flameOuter.rotation.z = sway; flameOuter.scale.x = 1 + (prefersReducedMotion ? 0 : Math.sin(time * 7.1) * .035);
      flameInner.rotation.z = sway * .68; flameInner.scale.x = .47 + (prefersReducedMotion ? 0 : Math.sin(time * 7.1 + .6) * .018);
      flameLight.intensity = 2.8 + (prefersReducedMotion ? 0 : (Math.sin(time*8)+Math.sin(time*13.7))*.2);
      studioRenderer.render(scene,camera);
      if (!prefersReducedMotion) requestAnimationFrame(render);
    };
    render();
    return true;
  } catch (error) {
    console.warn('3D diya preview unavailable, using the illustrated fallback.', error);
    return false;
  }
}

function renderStudioPicker() {
  const picker = $('#studioProductPicker');
  if (!catalog.length) {
    if (picker) picker.innerHTML = '';
    if (studioAdd) studioAdd.disabled = true;
    return;
  }
  if (!selectedStudioProductId || !catalog.some(product => product.id === selectedStudioProductId)) {
    selectedStudioProductId = catalog.find(product => product.id === 'mitti-glow-rangoli-bloom')?.id || catalog[0].id;
  }
  if (!picker) { updateStudioAddButton(); return; }
  picker.innerHTML = catalog.slice(0, 4).map(product => {
    const pack = product.variants.find(variant => variant.units === 2);
    const name = product.studioName || (product.id === 'mitti-glow-rangoli-bloom' ? 'Mitti Glow' : product.name);
    const price = pack ? `${money.format(product.price)} · 2 for ${money.format(pack.price)}` : money.format(product.price);
    return `<button class="studio-product-option${product.id === selectedStudioProductId ? ' active' : ''}" data-studio-product="${safeAttr(product.id)}" aria-pressed="${product.id === selectedStudioProductId}">${artSvg(product.id)}<span><strong>${safeText(name)}</strong><small>${price}</small></span></button>`;
  }).join('');
  $$('[data-studio-product]', picker).forEach(button => button.addEventListener('click', () => selectStudioProduct(button.dataset.studioProduct)));
  updateStudioAddButton();
}

function selectStudioProduct(id) {
  const product = catalog.find(item => item.id === id);
  if (!product) return;
  selectedStudioProductId = id;
  $$('.studio-product-option').forEach(button => {
    const active = button.dataset.studioProduct === id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  updateStudioAddButton();
}

function updateStudioAddButton() {
  if (!studioAdd) return;
  const product = catalog.find(item => item.id === selectedStudioProductId);
  const name = product?.studioName || (product?.id === 'mitti-glow-rangoli-bloom' ? 'Mitti Glow' : product?.name);
  studioAdd.disabled = !product || product.stock < 1;
  studioAdd.textContent = product && product.stock > 0 ? `Add ${name} · ${money.format(product.price)}` : 'Currently unavailable';
}

function updateStudio() {
  if (!studio || !studioDiya) return;
  const bounds = studio.getBoundingClientRect();
  const travel = Math.max(1, bounds.height - innerHeight);
  const progress = Math.max(0, Math.min(1, -bounds.top / travel));
  studio.style.setProperty('--studio-progress', progress.toFixed(3));
    studioDiya.style.setProperty('--studio-rotate-y', `${-34 + progress * 96}deg`);
  studioDiya.style.setProperty('--studio-rotate-x', `${10 - progress * 8}deg`);
  studioDiya.style.setProperty('--studio-rotate-z', `${Math.sin(progress * Math.PI) * 1.5}deg`);
  studioDiya.style.setProperty('--studio-scale', `${.92 + Math.sin(progress * Math.PI) * .04}`);
}

let studioFrame = 0;
function scheduleStudioUpdate() {
  if (studioFrame) return;
  studioFrame = requestAnimationFrame(() => { studioFrame = 0; updateStudio(); });
}

if (studio) {
  addEventListener('scroll', scheduleStudioUpdate, { passive: true });
  addEventListener('resize', scheduleStudioUpdate, { passive: true });
  updateStudio();
}
const manifesto = $('#story');
const sealFlipper = $('#sealFlipper');
function updateSealFlip() {
  if (!manifesto || !sealFlipper || prefersReducedMotion) return;
  const top = manifesto.getBoundingClientRect().top;
  const progress = Math.max(0, Math.min(1, (innerHeight * .05 - top) / (innerHeight * .85)));
  sealFlipper.style.setProperty('--seal-turn', `${(progress * 180).toFixed(2)}deg`);
}
let sealFrame = 0;
function scheduleSealFlip() {
  if (sealFrame || prefersReducedMotion) return;
  sealFrame = requestAnimationFrame(() => { sealFrame = 0; updateSealFlip(); });
}
if (manifesto && sealFlipper) {
  updateSealFlip();
  addEventListener('scroll', scheduleSealFlip, { passive: true });
  addEventListener('resize', scheduleSealFlip, { passive: true });
}
$$('.finish-swatch').forEach(button => button.addEventListener('click', () => {
  const finish = button.dataset.finish;
  const colors = {
    brass: ['#5d3e17', '#b88031', '#f4d88c', '#ffc45d'],
    copper: ['#6f2d1d', '#b95e37', '#f3ae74', '#ff9254'],
    obsidian: ['#171618', '#62594b', '#c8b58e', '#c5a76b'],
    rose: ['#512c32', '#a85563', '#f5b4ad', '#ff8295'],
    jade: ['#173f32', '#398b66', '#a2e6ac', '#52d99c'],
    sapphire: ['#172d50', '#3f67ab', '#b6d5ff', '#77aaff']
  }[finish];
  if (!studioDiya || !colors) return;
  if (diyaMaterial && studioRimMaterial) {
    diyaMaterial.color.set(colors[1]);
    studioRimMaterial.color.set(colors[2]);
    studioRimMaterial.emissive.set(colors[0]);
  }
  studioDiya.style.setProperty('--finish-dark', colors[0]);
  studioDiya.style.setProperty('--finish-mid', colors[1]);
  studioDiya.style.setProperty('--finish-light', colors[2]);
  studioDiya.style.setProperty('--finish-glow', colors[3]);
  $$('.finish-swatch').forEach(item => item.classList.toggle('active', item === button));
}));
// Let visitors inspect the sculptural form with a gentle pointer drag.
if (studioVisual && studioDiya) {
  let dragStart = null;
  studioVisual.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    dragStart = { x: event.clientX, y: event.clientY, baseX: studioDragY, baseY: studioDragX };
    studioDiya.classList.add('is-dragging');
    studioVisual.setPointerCapture(event.pointerId);
  });
  studioVisual.addEventListener('pointermove', event => {
    if (!dragStart) return;
    studioDragY = Math.max(-42, Math.min(42, dragStart.baseX + (event.clientX - dragStart.x) * .32));
    studioDragX = Math.max(-16, Math.min(16, dragStart.baseY - (event.clientY - dragStart.y) * .22));
    studioDiya.style.setProperty('--studio-drag-y', `${studioDragY}deg`);
    studioDiya.style.setProperty('--studio-drag-x', `${studioDragX}deg`);
  });
  const endStudioDrag = () => { dragStart = null; studioDiya.classList.remove('is-dragging'); };
  studioVisual.addEventListener('pointerup', endStudioDrag);
  studioVisual.addEventListener('pointercancel', endStudioDrag);
  $('#studioModelCanvas')?.addEventListener('keydown', event => {
    const step = event.shiftKey ? 8 : 3;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') studioDragY = Math.max(-42, studioDragY - step);
    if (event.key === 'ArrowRight') studioDragY = Math.min(42, studioDragY + step);
    if (event.key === 'ArrowUp') studioDragX = Math.min(16, studioDragX + step);
    if (event.key === 'ArrowDown') studioDragX = Math.max(-16, studioDragX - step);
    studioDiya.style.setProperty('--studio-drag-y', `${studioDragY}deg`);
    studioDiya.style.setProperty('--studio-drag-x', `${studioDragX}deg`);
  });
}
studioAdd?.addEventListener('click', event => {
  event.preventDefault();
  if (!selectedStudioProductId) return;
  addToCart(selectedStudioProductId);
  openCart();
});
const catalogPromise = loadCatalog();

if (window.ScrollTrigger) {
  if (heroSequence) ScrollTrigger.create({ trigger: heroSequence, start: 'top top', end: 'bottom bottom', onUpdate: scheduleHeroSequence, invalidateOnRefresh: true });
  if (studio) ScrollTrigger.create({ trigger: studio, start: 'top top', end: 'bottom bottom', onUpdate: scheduleStudioUpdate, invalidateOnRefresh: true });
  if (manifesto && sealFlipper) ScrollTrigger.create({ trigger: manifesto, start: 'top 5%', end: 'bottom 90%', onUpdate: updateSealFlip, invalidateOnRefresh: true });
}
initStudio3D();
preloadOpeningAssets(catalogPromise);
