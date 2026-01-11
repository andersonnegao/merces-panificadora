/* ==========================================================================
   MERCÊS CORE - VERSÃO FINAL (Supabase Puro) 🚀
   ========================================================================== */

// 1. CREDENCIAIS
const SUPABASE_URL = 'https://bdnimwfibbxyiwdeiyfy.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbmltd2ZpYmJ4eWl3ZGVpeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2OTY1MzgsImV4cCI6MjA4MzI3MjUzOH0.8emSl6xTtLeKaxTtyl1xdQYRccUvtU5sYYgsYH4bnR4';

// CLIENTE SUPABASE
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CONFIG = {
  CURRENCY_FMT: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  WHATSAPP_NUMBER: "5517988054837" 
};

// IMAGENS
const CATEGORY_IMAGES = {
  'Todos': 'https://cdn-icons-png.flaticon.com/512/706/706164.png',
  'Pães': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=150&h=150&fit=crop',
  'Doces': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=150&h=150&fit=crop',
  'Salgados': 'https://images.unsplash.com/photo-1626265774643-f1943311a86b?w=150&h=150&fit=crop',
  'salgado': 'https://images.unsplash.com/photo-1626265774643-f1943311a86b?w=150&h=150&fit=crop',
  'Tortas': 'https://images.unsplash.com/photo-1572383672419-ab47799b4d36?w=150&h=150&fit=crop',
  'Cookies': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=150&h=150&fit=crop',
  'Bolos': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop',
  'Bebidas': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=150&h=150&fit=crop',
  'DEFAULT': 'https://cdn-icons-png.flaticon.com/512/706/706164.png' 
};

// ESTADO GLOBAL
const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('merces_cart')) || [],
  mode: 'varejo',
  activeCategory: 'Todos'
};

// 🛡️ LIMPEZA DE CÓDIGO LEGADO - REMOVER QUALQUER REFERÊNCIA AO GOOGLE
(function cleanLegacyCode() {
  try {
    // Limpar localStorage de qualquer chave que contenha 'google' ou 'sheets'
    for (let key of Object.keys(localStorage)) {
      if (key.toLowerCase().includes('google') || key.toLowerCase().includes('sheets')) {
        localStorage.removeItem(key);
        console.log(`✅ Removido do localStorage: ${key}`);
      }
    }
    
    // Limpar qualquer variável global que contenha Google API
    if (window.gapi) delete window.gapi;
    if (window.GoogleSheets) delete window.GoogleSheets;
    
    // Bloquear qualquer requisição futura para Google
    if (window.fetch) {
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('script.google.com')) {
          console.error('❌ BLOQUEADO: Tentativa de acesso a script.google.com:', url);
          return Promise.reject(new Error('Acesso bloqueado: Google Sheets não é mais usado'));
        }
        return originalFetch.apply(this, args);
      };
    }
    
    console.log('✅ Limpeza de código legado concluída');
  } catch(e) {
    console.warn('Erro ao limpar código legado:', e);
  }
})();

/* ==========================================================================
   1. DATA LAYER
   ========================================================================== */
const normalizeProduct = (row) => ({
  id: String(row.id || '').trim(),
  nome: String(row.nome || '').trim(),
  categoria: String(row.categoria || 'Outros').trim(),
  descricao: String(row.descricao || '').trim(),
  imagem: String(row.imagem || ''), 
  precoVarejo: Number(row.preco_varejo) || 0,
  precoAtacado: Number(row.preco_atacado) || 0,
  minimoAtacado: Number(row.minimo_atacado) || 1,
  ativo: String(row.ativo || 'NÃO').toUpperCase()
});

async function initSystem() {
  renderLoading(true);
  try {
    const { data, error } = await _supabase.from('produtos').select('*');
    if (error) throw error;

    if (!data || data.length === 0) {
      document.getElementById('productGrid').innerHTML = '<p>Nenhum produto encontrado.</p>';
      return;
    }
    state.products = data.map(normalizeProduct);
    renderCategories(); renderCatalog(); updateCartIcon(); renderCartDrawer();
  } catch (err) {
    console.error(err);
    alert('Erro ao carregar cardápio.');
  } finally {
    renderLoading(false);
  }
}

/* ==========================================================================
   2. UI RENDERING
   ========================================================================== */
function renderCategories() {
  const container = document.getElementById('categoryList');
  if (!container) return;
  const categories = ['Todos', ...new Set(state.products.map(p => p.categoria).filter(c => c))];
  container.innerHTML = categories.map(cat => {
    const isActive = state.activeCategory === cat ? 'active' : '';
    const imgUrl = CATEGORY_IMAGES[cat] || CATEGORY_IMAGES['DEFAULT'];
    return `<button class="cat-btn ${isActive}" onclick="filterCategory('${cat}')"><img src="${imgUrl}" class="cat-thumb"/><span class="cat-label">${cat}</span></button>`;
  }).join('');
}

function filterCategory(cat) { state.activeCategory = cat; renderCategories(); renderCatalog(); }

function toggleMode(newMode) {
  state.mode = newMode;
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(newMode === 'varejo' ? 'btnVarejo' : 'btnAtacado').classList.add('active');
  renderCatalog();
}

function renderCatalog(listaPersonalizada = null) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  let listaFinal = listaPersonalizada || state.products;
  if (!listaPersonalizada && state.activeCategory !== 'Todos') {
    listaFinal = listaFinal.filter(p => p.categoria === state.activeCategory);
  }
  if (listaFinal.length === 0) { grid.innerHTML = '<div>Vazio</div>'; return; }

  grid.innerHTML = listaFinal.map(product => {
    const isWholesale = state.mode === 'atacado';
    const finalPrice = isWholesale ? product.precoAtacado : product.precoVarejo;
    const minQty = isWholesale ? product.minimoAtacado : 1;
    const priceDisplay = (finalPrice === 0) ? 'Consulte' : CONFIG.CURRENCY_FMT.format(finalPrice);

    return `
      <article class="card-item" onclick="addToCart('${product.id}')">
        <div style="height:200px; background:url('${product.imagem}') center/cover no-repeat; border-radius:4px; margin-bottom:15px; background-color:#222;"></div>
        <h3>${product.nome}</h3>
        <p style="color:#888; font-size:0.9rem;">${product.descricao.substring(0, 60)}...</p>
        <div style="display:flex; justify-content:space-between; margin-top:10px;">
          <span style="color:#d4af37; font-weight:bold;">${priceDisplay}</span>
          ${isWholesale ? `<small>Mín: ${minQty}</small>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

function renderLoading(isLoading) {
  const el = document.getElementById('productsStatus');
  if(el) el.innerHTML = isLoading ? 'Carregando...' : '';
}

/* ==========================================================================
   3. CARRINHO
   ========================================================================== */
const cartOverlay = document.getElementById('cartOverlay');
if(document.getElementById('goCart')) document.getElementById('goCart').addEventListener('click', () => { renderCartDrawer(); cartOverlay.classList.add('open'); });
if(document.getElementById('btnCloseCart')) document.getElementById('btnCloseCart').addEventListener('click', () => { cartOverlay.classList.remove('open'); });
if(document.getElementById('btnClear')) {
    document.getElementById('btnClear').addEventListener('click', () => {
        if(confirm('Limpar carrinho?')) { state.cart = []; saveCart(); renderCartDrawer(); updateCartIcon(); }
    });
}

function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  const isWholesale = state.mode === 'atacado';
  const price = isWholesale ? product.precoAtacado : product.precoVarejo;
  const qtyToAdd = isWholesale ? product.minimoAtacado : 1;
  const existingItem = state.cart.find(item => item.id === productId && item.mode === state.mode);

  if (existingItem) existingItem.qty += qtyToAdd;
  else state.cart.push({ id: product.id, nome: product.nome, imagem: product.imagem, price, qty: qtyToAdd, mode: state.mode });
  
  saveCart(); updateCartIcon(); renderCartDrawer();
  const toast = document.getElementById('toast');
  if(toast) { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); }
}

function removeFromCart(index) { state.cart.splice(index, 1); saveCart(); renderCartDrawer(); updateCartIcon(); }
function changeQty(index, delta) {
  const item = state.cart[index];
  if (!item) return;
  const newQty = item.qty + delta;
  if (newQty <= 0) removeFromCart(index);
  else { item.qty = newQty; saveCart(); renderCartDrawer(); updateCartIcon(); }
}

function renderCartDrawer() {
  const list = document.getElementById('cartList');
  const totalEl = document.getElementById('cartTotal');
  if (state.cart.length === 0) { list.innerHTML = '<div>Carrinho vazio</div>'; totalEl.innerText = 'R$ 0,00'; return; }
  
  let total = 0;
  list.innerHTML = state.cart.map((item, index) => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    return `
      <div style="display:flex; gap:10px; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">
        <div style="width:40px; height:40px; background:url('${item.imagem}') center/cover;"></div>
        <div style="flex:1;">
          <div>${item.nome}</div>
          <small>${item.mode === 'atacado' ? 'Atacado' : 'Varejo'}</small>
          <div style="display:flex; justify-content:space-between;">
             <div>
               <button onclick="changeQty(${index}, -1)">-</button> ${item.qty} <button onclick="changeQty(${index}, 1)">+</button>
             </div>
             <div>${CONFIG.CURRENCY_FMT.format(subtotal)}</div>
          </div>
        </div>
        <button onclick="removeFromCart(${index})">x</button>
      </div>
    `;
  }).join('');
  totalEl.innerText = `Total: ${CONFIG.CURRENCY_FMT.format(total)}`;
}

function saveCart() { localStorage.setItem('merces_cart', JSON.stringify(state.cart)); }
function updateCartIcon() {
  const badge = document.getElementById('cartBadge');
  const count = state.cart.reduce((acc, item) => acc + item.qty, 0);
  if(badge) { badge.innerText = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
}

/* ==========================================================================
   4. CHECKOUT (SUPABASE CORRIGIDO) ✅
   ========================================================================== */
const orderForm = document.getElementById('orderForm');

if (orderForm) {
  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.cart.length === 0) return alert('Carrinho vazio!');

    const btn = orderForm.querySelector('button[type="submit"]');
    btn.innerText = 'Processando...'; 
    btn.disabled = true;

    const formData = new FormData(orderForm);
    const cliente = Object.fromEntries(formData.entries());
    const totalValor = state.cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const totalFormatado = CONFIG.CURRENCY_FMT.format(totalValor);

    // DADOS PARA O SUPABASE
    const dadosPedido = {
        cliente_nome: cliente.nome,
        cliente_whatsapp: cliente.whatsapp,
        cliente_endereco: `${cliente.endereco} - ${cliente.cidade}`,
        pagamento: cliente.pagamento,
        total: totalFormatado,
        itens: state.cart, 
        status: 'Novo'
    };

    try {
      console.log("Tentando salvar no Supabase...");

      // 1. INSERIR NO BANCO
      const { data, error } = await _supabase
          .from('pedidos')
          .insert(dadosPedido);

      if (error) {
          throw new Error("Erro no Supabase: " + error.message);
      }

      console.log("Salvo com sucesso!");

      // 2. WHATSAPP (Só abre se não der erro acima)
      let msg = `*NOVO PEDIDO (WEB)*\n----------------\n`;
      msg += `👤 ${cliente.nome}\n📍 ${cliente.endereco}\n💰 ${totalFormatado}\n\n`;
      msg += `*ITENS:*\n`;
      state.cart.forEach(item => {
        msg += `▪️ ${item.qty}x ${item.nome}\n`;
      });
      
      msg += `----------------\nPagamento: ${cliente.pagamento}`;
      if(cliente.observacao) msg += `\nObs: ${cliente.observacao}`;

      // Limpar tudo
      state.cart = []; saveCart(); updateCartIcon(); renderCartDrawer(); orderForm.reset();
      
      const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');

    } catch (err) {
      console.error(err);
      alert("Erro ao enviar pedido: " + err.message);
    } finally {
      btn.innerText = 'Enviar Pedido'; 
      btn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', initSystem);