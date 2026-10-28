'use strict';

const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const returnToCheckout = params.get('return') === 'checkout';
const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const apiBase = window.DEEPORA_API_ORIGIN || (isLocalHost ? `${location.protocol}//${location.hostname}:4175` : location.origin);

async function accountRequest(path, data) {
  let response;
  try {
    response = await fetch(`${apiBase}/api/auth/${path}`, {
      method: data ? 'POST' : 'GET',
      credentials: 'include',
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined
    });
  } catch {
    throw new Error('The account service is not reachable. Start it with npm start and try again.');
  }
  const payload = await response.json().catch(() => ({}));
  if (response.status === 404 && ['send-email-code', 'verify-email-code'].includes(path)) {
    throw new Error(`The account server at ${apiBase} does not have the email verification endpoint. Stop old Node servers, then run npm start from the project folder.`);
  }
  if (!response.ok) throw new Error(payload.error || 'That request could not be completed. Please try again.');
  return payload;
}

function feedback(message, type = '') {
  const output = $('#accountFeedback');
  output.textContent = message;
  output.dataset.state = type;
}

async function syncBagForUser() {
  const userId = window.deeporaUserId || '';
  const userKey = `deepora-cart:user:${userId}`;
  const legacy = localStorage.getItem('deepora-cart:guest') || localStorage.getItem('deepora-cart') || '[]';
  let guestItems = [];
  try { guestItems = JSON.parse(legacy); } catch {}
  if (!Array.isArray(guestItems)) guestItems = [];
  const cached = localStorage.getItem(userKey);
  let preferredItems = guestItems;
  if (cached) {
    try { const parsed = JSON.parse(cached); if (Array.isArray(parsed)) preferredItems = parsed; } catch {}
  }
  localStorage.setItem(userKey, JSON.stringify(preferredItems));
  if (guestItems.length) {
    localStorage.removeItem('deepora-cart:guest');
    localStorage.removeItem('deepora-cart');
  }
  fetch(`${apiBase}/api/cart`, { credentials: 'include' }).then(async response => {
    if (!response.ok) return;
    const saved = await response.json();
    if (Array.isArray(saved.items) && saved.items.length) {
      localStorage.setItem(userKey, JSON.stringify(saved.items));
    } else if (preferredItems.length) {
      await fetch(`${apiBase}/api/cart`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: preferredItems }) });
    }
  }).catch(() => { /* Local account bag remains available offline. */ });
}

function showMode(mode) {
  const signingUp = mode === 'signup';
  $('#signinForm').hidden = signingUp;
  $('#signupPanel').hidden = !signingUp;
  $('#showSignin').classList.toggle('active', !signingUp);
  $('#showSignup').classList.toggle('active', signingUp);
  $('#showSignin').setAttribute('aria-selected', String(!signingUp));
  $('#showSignup').setAttribute('aria-selected', String(signingUp));
  $('#accountTitle').textContent = signingUp ? 'Create your account' : 'Welcome back';
  feedback('');
}

let verifiedSignupEmail = '';
let signupEmailVerificationToken = '';
const signupEmailInput = $('#optionalSignupEmail');
const emailCodeInputs = [...document.querySelectorAll('.email-code-boxes input')];
const emailCodeStatus = $('#emailCodeStatus');
function resetEmailVerification() {
  verifiedSignupEmail = '';
  signupEmailVerificationToken = '';
  signupEmailInput.readOnly = false;
  $('#emailCodePanel').hidden = true;
  $('#signupDetailsSection').hidden = true;
  $('#emailVerifiedNote').hidden = true;
  emailCodeInputs.forEach(input => { input.value = ''; input.required = false; });
  emailCodeStatus.textContent = '';
}
$('#sendEmailCode').addEventListener('click', async () => {
  const email = signupEmailInput.value.trim().toLowerCase();
  if (!signupEmailInput.reportValidity()) return;
  const button = $('#sendEmailCode');
  button.disabled = true;
  emailCodeStatus.textContent = 'Sending your code…';
  try {
    await accountRequest('send-email-code', { email });
    emailCodeInputs.forEach(input => { input.required = true; });
    $('#emailCodePanel').hidden = false;
    emailCodeStatus.textContent = 'Code sent. It is valid for 10 minutes.';
    emailCodeInputs[0].focus();
  } catch (error) {
    emailCodeStatus.textContent = error.message;
    emailCodeStatus.dataset.state = 'error';
  } finally { button.disabled = false; }
});
signupEmailInput.addEventListener('input', () => {
  if (verifiedSignupEmail && signupEmailInput.value.trim().toLowerCase() !== verifiedSignupEmail) resetEmailVerification();
  emailCodeStatus.dataset.state = '';
});
emailCodeInputs.forEach((input, index) => {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(-1);
    if (input.value && index < emailCodeInputs.length - 1) emailCodeInputs[index + 1].focus();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Backspace' && !input.value && index > 0) emailCodeInputs[index - 1].focus();
    if (event.key === 'ArrowLeft' && index > 0) emailCodeInputs[index - 1].focus();
    if (event.key === 'ArrowRight' && index < emailCodeInputs.length - 1) emailCodeInputs[index + 1].focus();
  });
  input.addEventListener('paste', event => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    digits.split('').forEach((digit, digitIndex) => { if (emailCodeInputs[digitIndex]) emailCodeInputs[digitIndex].value = digit; });
    emailCodeInputs[Math.min(digits.length, 5)].focus();
  });
});
$('#verifyEmailCode').addEventListener('click', async () => {
  const code = emailCodeInputs.map(input => input.value).join('');
  if (code.length !== 6) { emailCodeStatus.textContent = 'Enter all 6 digits to continue.'; return; }
  const button = $('#verifyEmailCode');
  button.disabled = true;
  emailCodeStatus.textContent = 'Checking your code…';
  try {
    const result = await accountRequest('verify-email-code', { email: signupEmailInput.value.trim().toLowerCase(), code });
    verifiedSignupEmail = signupEmailInput.value.trim().toLowerCase();
    signupEmailVerificationToken = result.verificationToken;
    signupEmailInput.readOnly = true;
    $('#emailCodePanel').hidden = true;
    $('#emailVerifiedNote').hidden = false;
    $('#signupDetailsSection').hidden = false;
    emailCodeStatus.textContent = 'Email verified. Complete your delivery and account details.';
    $('#signupDetailsSection').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  } catch (error) {
    emailCodeStatus.textContent = error.message;
    emailCodeStatus.dataset.state = 'error';
  } finally { button.disabled = false; }
});

function showProfile(user) {
  $('#accountForms').hidden = true;
  $('#profilePanel').hidden = false;
  $('#profileName').textContent = `${user.firstName} ${user.lastName}`;
  const rows = [
    ['Phone', user.phone || 'Not added'],
    ['Email', user.email || 'Not added'],
    ['Location', `${user.city}, ${user.state}`],
    ['Address', [user.addressFlat, user.addressBuilding, user.addressStreet, user.city, user.state, user.pincode, user.addressLandmark].filter(Boolean).join(', ') || 'Not added'],
    ['Google Maps', user.googleMapsUrl || 'Not added']
  ];
  $('#profileDetails').innerHTML = rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])}</dd></div>`).join('');
  $('#returnToBag').hidden = !returnToCheckout;
  if (returnToCheckout) {
    window.location.replace('checkout.html');
  }

  loadUserOrders();
}

async function loadUserOrders() {
  const container = $('#profileOrdersList');
  if (!container) return;
  container.innerHTML = '<p style="font-size:12px; color:#95866e;">Loading orders…</p>';
  try {
    const res = await fetch(`${apiBase}/api/orders`, { credentials: 'include' });
    if (!res.ok) throw new Error('Could not fetch orders');
    const data = await res.json();
    const orders = Array.isArray(data.orders) ? data.orders : [];
    if (orders.length === 0) {
      container.innerHTML = '<p style="font-size:12px; color:#95866e; font-style:italic;">No orders placed yet.</p>';
      return;
    }
    const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
    container.innerHTML = orders.map(ord => {
      const date = ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const itemsList = (ord.items || []).map(item => `${item.quantity}× ${item.name} (${item.variant})`).join(', ');
      const invoiceItems = (ord.items || []).map(item => `<div class="profile-invoice-item"><span>${safe(item.quantity)} × ${safe(item.name)}${item.variant ? ` <small>${safe(item.variant)}</small>` : ''}${item.gift ? ' <small>Gift from Deepora</small>' : ''}</span><b>${money.format(Number(item.lineTotal) || 0)}</b></div>`).join('');
      return `
        <details class="profile-order">
          <summary><span><strong>${safe(ord.reference)}</strong><small>${safe(date)}</small><span class="profile-order-items">${safe(itemsList || 'Items')}</span><em>${safe(ord.status || 'placed')}</em></span><b>${money.format(Number(ord.grandTotal) || 0)}</b></summary>
          <div class="profile-invoice"><h4>Order invoice</h4>${invoiceItems}<div class="profile-invoice-totals"><div><span>Items subtotal</span><b>${money.format(Number(ord.subtotal) || 0)}</b></div><div><span>Reward discount</span><b>−${money.format(Number(ord.discount) || 0)}</b></div><div><span>Delivery fee</span><b>${Number(ord.deliveryFee) ? money.format(Number(ord.deliveryFee)) : 'Free'}</b></div><div><span>Convenience fee</span><b>${money.format(Number(ord.convenienceFee) || 0)}</b></div><div class="profile-invoice-grand"><span>Grand total</span><b>${money.format(Number(ord.grandTotal) || 0)}</b></div></div></div>
        </details>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = '<p style="font-size:12px; color:#95866e;">Unable to load order history.</p>';
  }
}

$('#showSignin').addEventListener('click', () => showMode('signin'));
$('#showSignup').addEventListener('click', () => showMode('signup'));
document.querySelectorAll('.password-toggle').forEach(button => button.addEventListener('click', () => {
  const input = button.parentElement.querySelector('input');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(show));
  button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  button.innerHTML = show
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18"></path><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 8.3 4.5 9 7-.2 1-1 2.2-2.2 3.3"></path><path d="M6.2 6.2C4 7.6 2.5 9.8 2 12c.7 2.5 4 7 10 7 1.3 0 2.5-.3 3.6-.7"></path></svg>'
    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
}));
$('#signinForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const submit = event.currentTarget.querySelector('[type=submit]');
  submit.disabled = true;
  feedback('Signing you in…');
  try {
    const result = await accountRequest('signin', { identifier: form.get('identifier'), password: form.get('password') });
    window.deeporaUserId = result.user.id;
    if (returnToCheckout) syncBagForUser();
    showProfile(result.user);
    if (!returnToCheckout) syncBagForUser();
  } catch (error) { feedback(error.message, 'error'); }
  finally { submit.disabled = false; }
});

$('#signupForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!signupEmailVerificationToken || verifiedSignupEmail !== signupEmailInput.value.trim().toLowerCase()) {
    feedback('Verify your email before completing your account details.', 'error');
    return;
  }
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const form = new FormData(event.currentTarget);
  if (form.get('password') !== form.get('confirmPassword')) { feedback('Your passwords do not match.', 'error'); return; }
  if (!/^[^\s@]+@gmail\.com$/i.test(String(form.get('email') || '').trim())) { feedback('Enter a valid Gmail address.', 'error'); return; }
  const submit = event.currentTarget.querySelector('.account-submit');
  submit.disabled = true;
  feedback('Creating your account…');
  try {
    const result = await accountRequest('signup', {
      firstName: form.get('firstName'),
      lastName: form.get('lastName'),
      phone: form.get('phone'),
      email: form.get('email'),
      emailVerificationToken: signupEmailVerificationToken,
      password: form.get('password'),
      confirmPassword: form.get('confirmPassword'),
      state: form.get('state'),
      city: form.get('city'),
      addressFlat: form.get('addressFlat'),
      addressBuilding: form.get('addressBuilding'),
      addressStreet: form.get('addressStreet'),
      pincode: form.get('pincode'),
      addressLandmark: form.get('addressLandmark'),
      googleMapsUrl: form.get('googleMapsUrl')
    });
    window.deeporaUserId = result.user.id;
    if (returnToCheckout) syncBagForUser();
    showProfile(result.user);
    if (!returnToCheckout) syncBagForUser();
  } catch (error) { feedback(error.message, 'error'); }
  finally { submit.disabled = false; }
});

$('#signoutButton').addEventListener('click', async () => {
  try { await accountRequest('logout', {}); }
  catch (error) { feedback(error.message, 'error'); return; }
  window.location.reload();
});
$('#returnToBag').addEventListener('click', () => { window.location.href = 'checkout.html'; });
$('.account-back').addEventListener('click', event => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  event.preventDefault();
  const destination = event.currentTarget.href;
  document.body.classList.add('account-leaving');
  setTimeout(() => { window.location.href = destination; }, 520);
});

accountRequest('me').then(async ({ user }) => {
  window.deeporaUserId = user.id;
  if (returnToCheckout) syncBagForUser();
  showProfile(user);
  if (!returnToCheckout) syncBagForUser();
}).catch(() => {
  if (returnToCheckout) showMode('signup');
});

const canvas = $('#accountStars');
const context = canvas.getContext('2d');
let stars = [];
function resizeStars() {
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(innerWidth * scale);
  canvas.height = Math.round(innerHeight * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  stars = Array.from({ length: Math.min(88, Math.floor(innerWidth / 13)) }, (_, index) => ({
    x: (index * 7919 % 1000) / 1000 * innerWidth,
    y: (index * 3571 % 1000) / 1000 * innerHeight,
    r: .4 + (index % 5) * .16,
    phase: index * .41
  }));
}
function drawStars(time = 0) {
  context.clearRect(0, 0, innerWidth, innerHeight);
  for (const star of stars) {
    const alpha = .2 + (Math.sin(time / 1300 + star.phase) + 1) * .27;
    context.fillStyle = `rgba(228,190,112,${alpha})`;
    context.beginPath(); context.arc(star.x, star.y, star.r, 0, Math.PI * 2); context.fill();
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(drawStars);
}
resizeStars();
drawStars();
window.addEventListener('resize', resizeStars, { passive: true });
