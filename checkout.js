'use strict';

const $ = selector => document.querySelector(selector);
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const apiBase = window.DEEPORA_API_ORIGIN || (window.DEEPORA_USE_LOCAL ? `${location.protocol}//${location.hostname}:4175` : 'https://deepora-backend.vercel.app');
let orderItems = [];
let signedInUser = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

async function request(url, options, timeoutMs = 3500) {
  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { response = await fetch(url, { credentials: 'include', signal: controller.signal, ...options }); }
  catch { throw new Error('The order service is not reachable.'); }
  finally { clearTimeout(timeout); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

function showFeedback(message, error = false) {
  const feedback = $('#checkoutFeedback') || $('#checkoutServiceError');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.state = error ? 'error' : '';
  feedback.hidden = false;
}

async function initializeCheckout() {
  try {
    const { user } = await request(`${apiBase}/api/auth/me`);
    signedInUser = user;
  } catch {
    location.replace('account.html?return=checkout');
    return;
  }
  const user = signedInUser;
  let savedItems = [];
  const localBag = localStorage.getItem(`deepora-cart:user:${user.id}`) || localStorage.getItem('deepora-cart:guest') || localStorage.getItem('deepora-cart') || '[]';
  try { savedItems = JSON.parse(localBag); } catch { savedItems = []; }
  const [catalogResult, cartResult] = await Promise.allSettled([
    fetch(`${apiBase}/api/products`, { cache: 'no-cache', signal: AbortSignal.timeout(3000) }).then(async response => {
      if (!response.ok) throw new Error(`Catalog request failed with HTTP ${response.status}.`);
      return response.json();
    }),
    fetch(`${apiBase}/api/cart`, { credentials: 'include', signal: AbortSignal.timeout(3000) }).then(async response => response.ok ? response.json() : null)
  ]);
  if (catalogResult.status !== 'fulfilled' || !Array.isArray(catalogResult.value) || catalogResult.value.length === 0) {
    const serviceError = $('#checkoutServiceError');
    if (!serviceError) return;
    serviceError.textContent = 'The product catalog could not be loaded from the order service. Please try again later.';
    serviceError.hidden = false;
    return;
  }
  const catalog = catalogResult.value.map(product => product.id === 'mitti-glow-rangoli-bloom'
    ? { ...product, image: 'assets/Festive Four-Diya Flower Arrangement.png' }
    : product);
  const accountCart = cartResult.status === 'fulfilled' ? cartResult.value : null;
  if (Array.isArray(accountCart?.items) && accountCart.items.length) {
    savedItems = accountCart.items;
    localStorage.setItem(`deepora-cart:user:${user.id}`, JSON.stringify(savedItems));
  }
  orderItems = Array.isArray(savedItems) ? savedItems.filter(line => line && typeof line.id === 'string' && Number.isInteger(line.quantity) && line.quantity > 0 && catalog.some(product => product.id === line.id)) : [];
  if (!orderItems.length) { $('#checkoutEmpty').hidden = false; return; }

  const lines = orderItems.map(line => {
    const product = catalog.find(item => item.id === line.id);
    const variant = product.variants.find(item => item.id === (line.variant || 'single')) || product.variants[0];
    return { product, variant, quantity: line.quantity, price: variant.price * line.quantity, gift: false };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.price, 0);
  const gifts = [];
  if (subtotal >= 200) gifts.push(catalog.find(product => product.id === 'og-diya'));
  if (subtotal >= 350) gifts.push(catalog.find(product => product.id === 'drip-diya'));
  gifts.filter(Boolean).forEach(product => lines.push({ product, variant: product.variants[0], quantity: 1, price: 0, gift: true }));
  const discount = subtotal >= 500 ? 50 : 0;
  const deliveryFee = subtotal < 100 ? 89 : 0;
  const fee = 9;
  const grand = subtotal - discount + deliveryFee + fee;

  $('#checkoutItems').innerHTML = lines.map(line => `<article class="checkout-line"><img src="${escapeHtml(line.product.image)}" alt="${escapeHtml(line.product.name)}"><div><b>${escapeHtml(line.product.name)}</b><small>${line.gift ? 'Gift from Deepora · 1 diya' : `${escapeHtml(line.variant.label)} · Qty ${line.quantity}`}</small></div><strong class="checkout-line-price">${money.format(line.price)}</strong></article>`).join('');
  $('#billSubtotal').textContent = money.format(subtotal);
  $('#discountRow').hidden = discount === 0;
  $('#billDiscount').textContent = `−${money.format(discount)}`;
  $('#billDeliveryFee').textContent = deliveryFee ? money.format(deliveryFee) : 'Free';
  $('#billFee').textContent = money.format(fee);
  $('#billGrand').textContent = money.format(grand);
  $('#deliveryName').textContent = `${user.firstName} ${user.lastName} · ${user.phone}`;
  $('#deliveryAddress').textContent = [user.addressFlat, user.addressBuilding, user.addressStreet, user.addressLandmark, user.city, user.state, user.pincode].filter(Boolean).join(', ');
  if (user.googleMapsUrl) { $('#deliveryMap').href = user.googleMapsUrl; $('#deliveryMap').hidden = false; }
  $('#checkoutGrid').hidden = false;
  $('#placeOrder').addEventListener('click', async () => {
    const button = $('#placeOrder');
    button.disabled = true;
    showFeedback('Placing your order…');
    try {
      const response = await request(`${apiBase}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems, customerNote: $('#customerNote')?.value?.trim() || '' })
      }, 35000);
      const order = response.order;

      try {
        localStorage.removeItem('deepora-cart');
        localStorage.removeItem('deepora-cart:guest');
        localStorage.removeItem(`deepora-cart:user:${user.id}`);
      } catch {}
      fetch(`${apiBase}/api/cart`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [] }) }).catch(() => {});
      try { sessionStorage.setItem(`deepora-order-email:${order.reference}`, JSON.stringify(response.emailDelivery || {})); } catch {}
      location.replace(`order-confirmation.html?ref=${encodeURIComponent(order.reference)}`);
    } catch (error) {
      showFeedback(error.message, true);
      button.disabled = false;
    }
  });
}

const canvas = $('#checkoutStars');
const context = canvas.getContext('2d');
let stars = [];
function resizeStars() {
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(innerWidth * scale); canvas.height = Math.round(innerHeight * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  stars = Array.from({ length: Math.min(88, Math.floor(innerWidth / 13)) }, (_, index) => ({ x: (index * 7919 % 1000) / 1000 * innerWidth, y: (index * 3571 % 1000) / 1000 * innerHeight, r: .4 + (index % 5) * .16, phase: index * .41 }));
}
function drawStars(time = 0) {
  context.clearRect(0, 0, innerWidth, innerHeight);
  for (const star of stars) { context.fillStyle = `rgba(228,190,112,${.2 + (Math.sin(time / 1300 + star.phase) + 1) * .27})`; context.beginPath(); context.arc(star.x, star.y, star.r, 0, Math.PI * 2); context.fill(); }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(drawStars);
}
resizeStars(); drawStars(); window.addEventListener('resize', resizeStars, { passive: true });
initializeCheckout();
