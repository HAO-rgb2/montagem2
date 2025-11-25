// public/script.js
const API_BASE = ''; // empty = same origin (server serves /api/*). If backend separate, set e.g. 'http://localhost:3000'

// ------------------- CART (persistente) -------------------
const CART_KEY = 'infpro_cart_v2';

function loadCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch(e){ return []; }
}
function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function addToCart(product){
  const cart = loadCart();
  const found = cart.find(i=>i.id===product.id);
  if(found) found.qty++;
  else cart.push({...product, qty:1});
  saveCart(cart);
  showToast('Adicionado ao carrinho');
}
function removeFromCart(id){
  let cart = loadCart();
  cart = cart.filter(i=>i.id!==id);
  saveCart(cart);
  renderCartItems();
}

function calculateTotals(cart){
  const subtotal = cart.reduce((s,i)=> s + i.price * (i.qty||1), 0);
  const shipping = subtotal > 7000 ? 0 : Math.max(29.9, subtotal * 0.05);
  return { subtotal, shipping, total: subtotal + shipping };
}

function renderCartItems(){
  const cart = loadCart();
  const container = document.getElementById('cartItems');
  if(!container) return;
  container.innerHTML = '';
  cart.forEach(item=>{
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center justify-content-between mb-2';
    div.innerHTML = `<div>${item.title} <small class="text-muted">x${item.qty}</small></div>
      <div><strong>R$ ${ (item.price * item.qty).toFixed(2) }</strong> <button class="btn btn-sm btn-link text-danger" onclick="removeFromCart('${item.id}')">Remover</button></div>`;
    container.appendChild(div);
  });
  const totals = calculateTotals(cart);
  const subtotalEl = document.getElementById('cartSubtotal');
  const shippingEl = document.getElementById('cartShipping');
  const totalEl = document.getElementById('cartTotal');
  if(subtotalEl) subtotalEl.textContent = totals.subtotal.toFixed(2);
  if(shippingEl) shippingEl.textContent = totals.shipping.toFixed(2);
  if(totalEl) totalEl.textContent = totals.total.toFixed(2);
}

// ------------------- PRODUCTS (fetch API) -------------------
async function fetchProducts(){
  try{
    const res = await fetch(API_BASE + '/api/products');
    if(!res.ok) throw new Error('Erro ao buscar produtos');
    const data = await res.json();
    return data;
  }catch(e){
    console.error(e);
    return [];
  }
}

async function renderProductsGrid(){
  const grid = document.getElementById('productsGrid');
  if(!grid) return;
  const products = await fetchProducts();
  grid.innerHTML = '';
  products.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.img}" class="w-full rounded mb-3" alt="${p.title}">
      <h3 class="text-lg font-semibold mb-1">${p.title}</h3>
      <div class="text-muted mb-2">${p.description || ''}</div>
      <div class="d-flex justify-content-between items-center">
         <div class="price">R$ ${p.price.toFixed(2)}</div>
         <div><button class="btn btn-sm btn-primary" onclick='addToCart(${JSON.stringify(p)})'>Adicionar</button></div>
      </div>`;
    grid.appendChild(card);
  });
}

// ------------------- REVIEWS -------------------
async function loadReviews(){
  try{
    const res = await fetch(API_BASE + '/api/reviews');
    if(!res.ok) return [];
    return await res.json();
  }catch(e){ return []; }
}
async function renderReviews(){
  const container = document.getElementById('reviewsGrid');
  if(!container) return;
  const reviews = await loadReviews();
  container.innerHTML = '';
  reviews.forEach(r=>{
    const el = document.createElement('div');
    el.className = 'product-card';
    el.innerHTML = `<strong>${r.name}</strong> <div class="text-yellow-500">★ ${r.rating}</div><p class="mt-2 text-muted">${r.text}</p>`;
    container.appendChild(el);
  });
}

// ------------------- AUTH (login/register) -------------------
async function registerUser(formData){
  try{
    const res = await fetch(API_BASE + '/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(formData) });
    return await res.json();
  }catch(e){ return { error: e.message };}
}
async function loginUser(formData){
  try{
    const res = await fetch(API_BASE + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(formData) });
    return await res.json();
  }catch(e){ return { error: e.message };}
}

// hooks for forms
document.addEventListener('submit', async (ev)=>{
  const form = ev.target;
  if(form.id === 'registerForm'){
    ev.preventDefault();
    const fd = Object.fromEntries(new FormData(form).entries());
    const res = await registerUser(fd);
    if(res.token){ localStorage.setItem('infpro_token', res.token); alert('Cadastro realizado!'); location.href = 'index.html'; }
    else alert(res.error || 'Erro no cadastro');
  }
  if(form.id === 'loginForm'){
    ev.preventDefault();
    const fd = Object.fromEntries(new FormData(form).entries());
    const res = await loginUser(fd);
    if(res.token){ localStorage.setItem('infpro_token', res.token); alert('Login efetuado!'); location.href = 'index.html'; }
    else alert(res.error || 'Erro no login');
  }
  if(form.id === 'contactForm'){
    ev.preventDefault();
    alert('Mensagem enviada! Obrigado por entrar em contato.');
    form.reset();
  }
  if(form.id === 'quoteForm'){
    ev.preventDefault();
    alert('Pedido de orçamento enviado! Verificaremos e retornaremos por e-mail.');
    form.reset();
  }
});

// ------------------- THEME (dark mode) -------------------
function setTheme(theme){
  if(theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  localStorage.setItem('infpro_theme', theme);
}
document.addEventListener('DOMContentLoaded', ()=>{
  const saved = localStorage.getItem('infpro_theme') || 'light';
  setTheme(saved);
  // render products if on loja
  renderProductsGrid();
  renderReviews();
  renderCartItems();

  // theme toggle buttons
  ['themeToggle','themeToggle2'].forEach(id => {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      const cur = localStorage.getItem('infpro_theme') || 'light';
      setTheme(cur === 'light' ? 'dark' : 'light');
    });
  });

  // cart floating button text update (count)
  setInterval(()=> {
    const cart = loadCart();
    const btns = document.querySelectorAll('.cart-floating');
    btns.forEach(b=> b.textContent = `🛒 (${cart.reduce((s,i)=>s+i.qty,0)||0})`);
  }, 500);
});
