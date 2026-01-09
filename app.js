/* ==========================================================================
   MERCÊS CORE - VERSÃO FINAL (Corrigida) 🚀
   ========================================================================== */

// 1. CREDENCIAIS E CONEXÃO
const SUPABASE_URL = 'https://bdnimwfibbxyiwdeiyfy.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbmltd2ZpYmJ4eWl3ZGVpeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2OTY1MzgsImV4cCI6MjA4MzI3MjUzOH0.8emSl6xTtLeKaxTtyl1xdQYRccUvtU5sYYgsYH4bnR4';

// CORREÇÃO CRÍTICA: Não use o mesmo nome da biblioteca global
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CONFIG = {
  CURRENCY_FMT: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  WHATSAPP_NUMBER: "5517988054837" // Seu número correto
};

// ESTADO GLOBAL
const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('merces_cart')) || [],
  mode: 'varejo'
};

/* ==========================================================================
   1. DATA LAYER (Buscar Produtos)
   ========================================================================== */
const normalizeProduct = (row) => ({
  id: String(row.id || '').trim(),
  nome: String(row.nome || '').trim(),
  categoria: String(row.categoria || '').trim(),
  descricao: String(row.descricao || '').trim(),
  imagem: String(row.imagem || ''), 
  
  // Tratamento robusto de números
  precoVarejo: Number(row.preco_varejo) || 0,
  precoAtacado: Number(row.preco_atacado) || 0,
  minimoAtacado: Number(row.minimo_atacado) || 1,
  
  ativo: String(row.ativo || 'NÃO').toUpperCase()
});

async function initSystem() {
  renderLoading(true);
  console.log("Iniciando Mercês Core...");

  try {
    // Busca produtos ativos no Supabase
    const { data, error } = await _supabase
      .from('produtos')
      .select('*');

    if (error) throw error;

    if (!data || data.length === 0) {
      document.getElementById('productGrid').innerHTML = '<p style="padding:20px; text-align:center;">Nenhum produto encontrado no sistema.</p>';
      return;
    }

    // Normaliza e Salva
    state.products = data.map(normalizeProduct);
    
    // Renderiza Inicial
    renderCatalog(); 
    updateCartIcon();
    renderCartDrawer();
    console.log(`Carregados ${state.products.length} produtos.`);

  } catch (err) {
    console.error('Erro de conexão:', err);
    alert('Erro ao conectar com o servidor. Verifique sua internet.');
  } finally {
    renderLoading(false);
  }
}

/* ==========================================================================
   2. UI RENDERING (Catálogo)
   ========================================================================== */
function toggleMode(newMode) {
  state.mode = newMode;
  
  // Atualiza botões visuais
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(newMode === 'varejo' ? 'btnVarejo' : 'btnAtacado');
  if(activeBtn) activeBtn.classList.add('active');
  
  // Re-renderiza catálogo e carrinho (para atualizar preços visuais)
  renderCatalog();
  renderCartDrawer(); 
  showToast(`Modo ${newMode === 'varejo' ? 'RESIDENCIAL' : 'ATACADO'} ativado`);
}

function renderCatalog(lista = state.products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  grid.innerHTML = lista.map(product => {
    const isWholesale = state.mode === 'atacado';
    const finalPrice = isWholesale ? product.precoAtacado : product.precoVarejo;
    const minQty = isWholesale ? product.minimoAtacado : 1;
    
    // Formatação de preço
    const priceDisplay = (finalPrice === 0) 
      ? '<span style="font-size:0.8rem">Consulte</span>' 
      : CONFIG.CURRENCY_FMT.format(finalPrice);

    return `
      <article class="card-item" onclick="addToCart('${product.id}')">
        <div style="height: 200px; background: url('${product.imagem}') center/cover no-repeat; border-radius: 4px; margin-bottom: 15px; background-color: #222;"></div>
        
        <h3 style="font-size: 1.2rem; margin-bottom: 8px; line-height: 1.2;">${product.nome}</h3>
        <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 15px; min-height: 40px;">${product.descricao.substring(0, 60)}...</p>
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 15px;">
          <div style="display: flex; flex-direction: column;">
            <span style="color: var(--color-gold-matte); font-size: 1.1rem; font-weight: 600;">${priceDisplay}</span>
            ${isWholesale ? `<small style="font-size: 0.7rem; color: #888">Mín: ${minQty} un.</small>` : ''}
          </div>
          <button class="btn-primary" style="padding: 8px 16px; font-size: 0.75rem;">ADICIONAR</button>
        </div>
      </article>
    `;
  }).join('');
}

// Lógica de Busca
const searchInput = document.getElementById('headerSearch');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    const filtrados = state.products.filter(p => 
      p.nome.toLowerCase().includes(termo) || 
      p.descricao.toLowerCase().includes(termo)
    );
    renderCatalog(filtrados);
  });
}

function renderLoading(isLoading) {
  const el = document.getElementById('productsStatus');
  if(el) el.innerHTML = isLoading ? '<div style="color:var(--color-gold-matte); text-align:center; margin: 20px 0;">Carregando cardápio...</div>' : '';
}

/* ==========================================================================
   3. CARRINHO (Cart Logic)
   ========================================================================== */
const cartOverlay = document.getElementById('cartOverlay');
const btnOpenCart = document.getElementById('goCart');
const btnCloseCart = document.getElementById('btnCloseCart');
const btnClearCart = document.getElementById('btnClear'); // Novo

// Event Listeners Carrinho
if(btnOpenCart) btnOpenCart.addEventListener('click', () => { renderCartDrawer(); cartOverlay.classList.add('open'); });
if(btnCloseCart) btnCloseCart.addEventListener('click', () => { cartOverlay.classList.remove('open'); });

// Botão Limpar Carrinho
if(btnClearCart) {
    btnClearCart.addEventListener('click', () => {
        if(confirm('Deseja realmente esvaziar o carrinho?')) {
            state.cart = [];
            saveCart();
            renderCartDrawer();
            updateCartIcon();
        }
    });
}

function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const isWholesale = state.mode === 'atacado';
  const price = isWholesale ? product.precoAtacado : product.precoVarejo;
  const qtyToAdd = isWholesale ? product.minimoAtacado : 1;

  // Verifica item existente com o MESMO MODO de preço
  const existingItem = state.cart.find(item => item.id === productId && item.mode === state.mode);

  if (existingItem) {
    existingItem.qty += qtyToAdd;
  } else {
    state.cart.push({
      id: product.id,
      nome: product.nome,
      imagem: product.imagem,
      price: price,
      qty: qtyToAdd,
      mode: state.mode // Importante saber se foi comprado como atacado ou varejo
    });
  }
  
  saveCart();
  updateCartIcon();
  showToast(`${product.nome} adicionado`);
  renderCartDrawer(); // Atualiza se estiver aberto
}

function removeFromCart(index) {
  state.cart.splice(index, 1); // Remove pelo índice para evitar remover duplicatas de modos diferentes
  saveCart(); renderCartDrawer(); updateCartIcon();
}

function changeQty(index, delta) {
  const item = state.cart[index];
  if (!item) return;
  
  const newQty = item.qty + delta;
  
  // Validação de mínimo se for atacado
  // Opcional: Se quiser forçar mínimo do atacado ao diminuir, faça a checagem aqui.
  
  if (newQty <= 0) {
      removeFromCart(index);
  } else { 
      item.qty = newQty; 
      saveCart(); 
      renderCartDrawer(); 
      updateCartIcon(); 
  }
}

function renderCartDrawer() {
  const list = document.getElementById('cartList');
  const totalEl = document.getElementById('cartTotal');
  
  if (state.cart.length === 0) {
    list.innerHTML = `<div style="text-align:center; margin-top:40px; color:#666;">Seu carrinho está vazio.</div>`;
    totalEl.innerText = 'Total: R$ 0,00';
    return;
  }

  let total = 0;
  
  // Usamos map com index para gerenciar exclusão correta
  list.innerHTML = state.cart.map((item, index) => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    
    return `
      <div style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">
        <div style="width:50px; height:50px; background:url('${item.imagem}') center/cover; border-radius:4px; background-color:#333;"></div>
        <div style="flex:1;">
          <div style="color:white; font-size:0.9rem; font-weight:500;">${item.nome}</div>
          <small style="color:#888;">${item.mode === 'atacado' ? 'Atacado' : 'Varejo'}</small>
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
             <div style="background:#222; border-radius:4px; display:flex; align-items:center;">
               <button onclick="changeQty(${index}, -1)" style="color:white; padding:0 10px; background:none; border:none; cursor:pointer;">-</button>
               <span style="color:white; font-size:0.9rem;">${item.qty}</span>
               <button onclick="changeQty(${index}, 1)" style="color:white; padding:0 10px; background:none; border:none; cursor:pointer;">+</button>
             </div>
             <div style="color:var(--color-gold-matte); font-size:0.9rem;">${CONFIG.CURRENCY_FMT.format(subtotal)}</div>
          </div>
        </div>
        <button onclick="removeFromCart(${index})" style="color:#666; font-size:1.2rem; background:none; border:none; cursor:pointer; padding:0 0 0 10px; align-self:flex-start;">&times;</button>
      </div>
    `;
  }).join('');
  
  totalEl.innerText = `Total: ${CONFIG.CURRENCY_FMT.format(total)}`;
}

function saveCart() { localStorage.setItem('merces_cart', JSON.stringify(state.cart)); }

function updateCartIcon() {
  const badge = document.getElementById('cartBadge');
  const count = state.cart.reduce((acc, item) => acc + item.qty, 0);
  if(badge) { 
      badge.innerText = count; 
      badge.style.display = count > 0 ? 'flex' : 'none'; 
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if(toast) { 
      toast.innerText = msg; 
      toast.classList.add('show'); 
      setTimeout(() => toast.classList.remove('show'), 3000); 
  }
}

/* ==========================================================================
   4. CHECKOUT (WhatsApp + Google Sheets)
   ========================================================================== */
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwIrQJj4ORfUMHMHorgQgfwcIADFSIsEzDzeZuqk0C9SQikyXkqcZVEztoThXnPkxI91Q/exec'; 

const orderForm = document.getElementById('orderForm');
if (orderForm) {
  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.cart.length === 0) return alert('Seu carrinho está vazio! Adicione itens antes de finalizar.');

    const btn = orderForm.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Processando...'; 
    btn.disabled = true;

    const formData = new FormData(orderForm);
    const cliente = Object.fromEntries(formData.entries());
    const totalPedido = state.cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    const pedido = {
      cliente: cliente,
      itens: state.cart,
      total: CONFIG.CURRENCY_FMT.format(totalPedido),
      data: new Date().toISOString()
    };

    try {
      // 1. Enviar para Google Sheets (Sem travar o fluxo se falhar)
      fetch(SCRIPT_URL, { 
          method: 'POST', 
          body: JSON.stringify(pedido), 
          mode: 'no-cors' 
      }).catch(err => console.log('Erro ao salvar na planilha (ignorado):', err));

      // 2. Montar mensagem do WhatsApp
      let msg = `*NOVO PEDIDO - MERCÊS PANIFICADORA*\n`;
      msg += `--------------------------------\n`;
      msg += `👤 *Cliente:* ${cliente.nome}\n`;
      msg += `📞 *Tel:* ${cliente.whatsapp}\n`;
      msg += `📍 *Entrega:* ${cliente.endereco} (${cliente.cidade})\n`;
      msg += `📅 *Para:* ${cliente.dataEntrega} às ${cliente.horaEntrega}\n\n`;
      
      msg += `*RESUMO DO PEDIDO:*\n`;
      state.cart.forEach(item => {
        msg += `▪️ ${item.qty}x ${item.nome} (${item.mode === 'atacado' ? 'Atc' : 'Var'})\n`;
      });
      
      msg += `--------------------------------\n`;
      msg += `💰 *TOTAL A PAGAR: ${pedido.total}*\n`;
      msg += `💳 *Pagamento:* ${cliente.pagamento}\n`;
      msg += `🧊 *Preparo:* ${cliente.tipo}\n`;
      if(cliente.observacao) msg += `📝 *Obs:* ${cliente.observacao}`;

      // Limpa o carrinho
      state.cart = []; saveCart(); updateCartIcon(); renderCartDrawer();
      
      // Redireciona
      const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');
      
      // Reseta formulário
      orderForm.reset();

    } catch (err) {
      console.error(err);
      alert('Houve um erro ao processar. Tente novamente.');
    } finally {
      btn.innerText = originalText; 
      btn.disabled = false;
    }
  });
}

// INICIALIZA TUDO
document.addEventListener('DOMContentLoaded', initSystem);
