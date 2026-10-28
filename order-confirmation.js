'use strict';

const $ = selector => document.querySelector(selector);
const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const apiBase = window.DEEPORA_API_ORIGIN || (window.DEEPORA_USE_LOCAL ? `${location.protocol}//${location.hostname}:4175` : 'https://deepora-backend.vercel.app');
const reference = new URLSearchParams(location.search).get('ref') || '';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

async function request(url, options = {}, timeoutMs = 12000) {
  const response = await fetch(url, { credentials: 'include', ...options, signal: AbortSignal.timeout(timeoutMs) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'We could not complete that request.');
  return data;
}

async function loadConfirmation() {
  if (!/^DP-[A-F0-9]{8}$/i.test(reference)) throw new Error('This order reference is not valid.');
  const { order, customer } = await request(`${apiBase}/api/orders/${encodeURIComponent(reference)}`);
  $('#confirmationReference').textContent = order.reference;
  $('#confirmationGreeting').textContent = `Thank you, ${customer.firstName}. Your order is now in our hands.`;
  $('#confirmationTotal').textContent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(order.grandTotal);
  $('#confirmationItems').innerHTML = order.items.map(item => `<div class="confirmation-item"><span>${escapeHtml(item.quantity)} × ${escapeHtml(item.name)}${item.gift ? ' <small>Gift from Deepora</small>' : ''}</span><b>₹${escapeHtml(item.lineTotal)}</b></div>`).join('');
  if (order.customerNote) {
    const note = $('#confirmationRequest');
    note.hidden = false;
    note.innerHTML = `<span class="eyebrow">YOUR NOTE</span><p>${escapeHtml(order.customerNote)}</p>`;
  }
  const status = JSON.parse(sessionStorage.getItem(`deepora-order-email:${reference}`) || '{}');
  const email = $('#confirmationEmail');
  const resend = $('#resendInvoice');
  if (status.customer) {
    email.textContent = `Your itemized invoice was emailed to ${customer.email}.`;
    resend.hidden = true;
  } else {
    email.textContent = status.code === 'CUSTOMER_EMAIL_MISSING'
      ? 'Add an email to your account to receive an invoice. Your order is safely placed.'
      : 'Your order is placed. The invoice email did not go through yet.';
    resend.hidden = status.code === 'CUSTOMER_EMAIL_MISSING';
  }
  resend.addEventListener('click', async () => {
    resend.disabled = true;
    resend.textContent = 'Sending invoice';
    try {
      const result = await request(`${apiBase}/api/orders/${encodeURIComponent(reference)}/resend-invoice`, { method: 'POST' }, 35000);
      email.textContent = `Your itemized invoice was emailed to ${result.email}.`;
      resend.hidden = true;
      sessionStorage.setItem(`deepora-order-email:${reference}`, JSON.stringify({ customer: true }));
    } catch (error) {
      email.textContent = error.message;
      resend.disabled = false;
      resend.textContent = 'Resend invoice email';
    }
  }, { once: true });
  $('#feedbackCard').hidden = false;
  $('#feedbackForm').addEventListener('submit', submitFeedback);
}

async function submitFeedback(event) {
  event.preventDefault();
  const button = $('#feedbackSubmit');
  const status = $('#feedbackStatus');
  button.disabled = true;
  status.textContent = 'Saving your feedback';
  try {
    const result = await request(`${apiBase}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderReference: reference, rating: Number($('#feedbackRating').value), comment: $('#feedbackComment').value.trim() }),
    });
    status.textContent = result.message;
    $('#feedbackForm').reset();
    button.hidden = true;
    window.setTimeout(() => window.location.assign('index.html#collection'), 1800);
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
}

function animateStars() {
  const canvas = $('#confirmationStars');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let stars = [];
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    width = innerWidth;
    height = innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars = Array.from({ length: Math.min(90, Math.floor(width / 13)) }, (_, index) => ({
      x: (index * 7919 % 1000) / 1000 * width,
      y: (index * 3571 % 1000) / 1000 * height,
      radius: .35 + index % 4 * .14,
      phase: index * .6,
    }));
  }
  function draw(time = 0) {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      ctx.fillStyle = `rgba(228,190,112,${.12 + (Math.sin(time / 1500 + star.phase) + 1) * .2})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!reduced) requestAnimationFrame(draw);
  }
  resize();
  draw();
  addEventListener('resize', resize, { passive: true });
}

animateStars();
loadConfirmation().catch(error => {
  $('#confirmationGreeting').textContent = error.message;
  $('#confirmationEmail').textContent = 'If your order was just placed, your order record will appear here once the store service is available.';
});
