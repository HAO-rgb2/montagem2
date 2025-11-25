// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_secret_in_prod';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// basic rate limiter
const limiter = rateLimit({ windowMs: 1000 * 60, max: 120 });
app.use(limiter);

// helper read/write
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- PRODUCTS API ---
app.get('/api/products', (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  const p = products.find(x => x.id === req.params.id);
  if(!p) return res.status(404).json({error:'Produto não encontrado'});
  res.json(p);
});

// create product (protected - in prod use auth + roles)
app.post('/api/products', (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  const { title, price, cat, img, description } = req.body;
  const newP = { id: uuidv4(), title, price, cat, img, description };
  products.push(newP);
  writeJSON(PRODUCTS_FILE, products);
  res.status(201).json(newP);
});

// --- AUTH: register / login ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if(!name || !email || !password) return res.status(400).json({error:'Dados incompletos'});
  const users = readJSON(USERS_FILE);
  if(users.find(u=>u.email === email)) return res.status(400).json({error:'E-mail já cadastrado'});
  const hash = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), name, email, passwordHash: hash, createdAt: new Date().toISOString() };
  users.push(user);
  writeJSON(USERS_FILE, users);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn:'7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u=>u.email===email);
  if(!user) return res.status(400).json({error:'Credenciais inválidas'});
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(400).json({error:'Credenciais inválidas'});
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn:'7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// --- ORDERS ---
app.post('/api/orders', (req, res) => {
  const { items, total, customer, address } = req.body;
  if(!items || !items.length) return res.status(400).json({error:'Carrinho vazio'});
  const orders = readJSON(ORDERS_FILE);
  const order = { id: 'ORD-' + Date.now(), items, total, customer, address, createdAt: new Date().toISOString(), status:'pending' };
  orders.push(order);
  writeJSON(ORDERS_FILE, orders);
  res.status(201).json(order);
});

// simple route to get reviews (static in products or separate)
app.get('/api/reviews', (req, res) => {
  // combine from products' reviews or static array
  const reviews = [
    { id: 'r1', name:'Mateus', rating:5, text:'Montagem profissional e muito rápida!' },
    { id: 'r2', name:'Larissa', rating:5, text:'Suporte excelente e ótimo preço.' }
  ];
  res.json(reviews);
});

// start server
const PORT = process.env.PORT || 3000;
if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive:true });
// ensure default files
if(!fs.existsSync(PRODUCTS_FILE)) writeJSON(PRODUCTS_FILE, [
  { id:'p1', title:'NVIDIA RTX 4070 Ti 12GB', price:4299.90, cat:'gpu', img:'https://images.unsplash.com/photo-1611078480916-2b1b5b0a9c5b?q=80&w=800&auto=format&fit=crop', description:'Placa de vídeo topo de linha.' },
  { id:'p2', title:'AMD Ryzen 9 7900X', price:2599.00, cat:'cpu', img:'https://images.unsplash.com/photo-1593642634367-d91a135587b5?q=80&w=800&auto=format&fit=crop', description:'Processador alto desempenho.' }
]);
if(!fs.existsSync(USERS_FILE)) writeJSON(USERS_FILE, []);
if(!fs.existsSync(ORDERS_FILE)) writeJSON(ORDERS_FILE, []);

app.listen(PORT, ()=> console.log(`API rodando em http://localhost:${PORT}`));
