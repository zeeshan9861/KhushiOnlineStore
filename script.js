/**
 * Khushi Online Store - Modern ES6+ / ECMAScript 2020+
 * Fully refactored with classes, arrow functions, destructuring, async/await
 */

// ============================================
// CONFIG & CONSTANTS
// ============================================

const CONFIG = {
  BUSINESS_PHONE: '+918102424024',
  PRODUCTS_PER_PAGE: 12,
  CART_STORAGE_KEY: 'khushi_cart_v1',
  ZOOM_MIN: 50,
  ZOOM_MAX: 300,
  ZOOM_STEP: 10,
  SWIPE_THRESHOLD: 50,
};

// ============================================
// PRODUCT MANAGER CLASS
// ============================================

class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.currentPage = 1;
    this.currentCategory = 'all';
    this.currentSearchTerm = '';
    this.currentSortOption = 'default';
  }

  truncateDescription(text, maxWords = 50) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return words.length > maxWords 
      ? `${words.slice(0, maxWords).join(' ')}...` 
      : text;
  }

  async loadProducts() {
    try {
      const response = await fetch('products.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      this.products = await response.json();
      this.filteredProducts = [...this.products];
      
      document.querySelector('[data-category="all"]')?.classList.add('active-category');
      this.renderProducts('all');
      console.log(`✅ Loaded ${this.products.length} products`);
    } catch (error) {
      console.error('❌ Product load error:', error);
      this.showError(error);
    }
  }

  showError(error) {
    const section = document.getElementById('product-list');
    if (!section) return;
    
    section.innerHTML = `
      <h2>❌ Error Loading Products</h2>
      <p>Ensure "products.json" exists and the site is served over HTTP.</p>
      <p><strong>VS Code:</strong> Install Live Server, right-click index.html → "Open with Live Server"</p>
      <p style="color:#666;font-size:0.9em;">Error: ${error?.message || String(error)}</p>
    `;
  }

  filterAndSortProducts() {
    let results = [...this.products];

    // Filter by category
    if (this.currentCategory !== 'all') {
      results = results.filter(p => p.category === this.currentCategory);
    }

    // Filter by search
    if (this.currentSearchTerm.trim()) {
      const search = this.currentSearchTerm.toLowerCase();
      results = results.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.description.toLowerCase().includes(search)
      );
    }

    // Sort
    const sorters = {
      'price-low': (a, b) => a.price - b.price,
      'price-high': (a, b) => b.price - a.price,
      'name-asc': (a, b) => a.name.localeCompare(b.name),
      'name-desc': (a, b) => b.name.localeCompare(a.name),
    };

    if (sorters[this.currentSortOption]) {
      results.sort(sorters[this.currentSortOption]);
    }

    this.filteredProducts = results;
    this.currentPage = 1;
    this.updateProductCount();
    this.renderProductsPage();
  }

  updateProductCount() {
    const el = document.getElementById('product-count');
    if (el) {
      const n = this.filteredProducts.length;
      el.textContent = `${n} product${n !== 1 ? 's' : ''}`;
    }
  }

  renderProductsPage() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (this.filteredProducts.length === 0) {
      grid.innerHTML = `
        <p style="grid-column: 1/-1; text-align: center; padding: 40px;">
          No products found. Try adjusting filters.
        </p>
      `;
      this.updatePaginationControls();
      return;
    }

    const totalPages = Math.ceil(this.filteredProducts.length / CONFIG.PRODUCTS_PER_PAGE);
    const start = (this.currentPage - 1) * CONFIG.PRODUCTS_PER_PAGE;
    const end = start + CONFIG.PRODUCTS_PER_PAGE;
    const toDisplay = this.filteredProducts.slice(start, end);

    toDisplay.forEach(product => {
      const { id, name, description, price, imageUrl } = product;
      const desc = this.truncateDescription(description);
      
      const card = document.createElement('div');
      card.className = 'product-card';
      card.dataset.productId = id;
      card.innerHTML = `
        <img src="${imageUrl}" alt="${name}" loading="lazy">
        <h3>${name}</h3>
        <p class="product-description">${desc}</p>
        <p class="price">₹${price.toLocaleString('en-IN')}</p>
        <button class="add-to-cart" data-id="${id}">Add to Cart</button>
      `;
      grid.appendChild(card);
    });

    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', (e) => cartManager.addToCart(e));
    });

    this.updatePaginationControls();
  }

  updatePaginationControls() {
    const total = Math.ceil(this.filteredProducts.length / CONFIG.PRODUCTS_PER_PAGE);
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (!pageInfo || !prevBtn || !nextBtn) return;

    pageInfo.textContent = `Page ${this.currentPage} of ${total}`;
    prevBtn.disabled = this.currentPage === 1;
    nextBtn.disabled = this.currentPage === total || total === 0;
  }

  renderProducts(category = null) {
    this.currentCategory = category || 'all';
    this.currentSearchTerm = '';
    this.currentSortOption = 'default';
    this.filterAndSortProducts();
  }

  nextPage() {
    const total = Math.ceil(this.filteredProducts.length / CONFIG.PRODUCTS_PER_PAGE);
    if (this.currentPage < total) {
      this.currentPage++;
      this.renderProductsPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderProductsPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

// ============================================
// CART MANAGER CLASS
// ============================================

class CartManager {
  constructor() {
    this.cart = [];
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(CONFIG.CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.cart = parsed.map(item => ({
            id: String(item.id),
            name: item.name,
            price: Number(item.price),
            imageUrl: item.imageUrl,
            quantity: Number(item.quantity) || 1
          }));
        }
      }
      this.updateDisplay();
    } catch (err) {
      console.warn('Cart load error:', err);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(this.cart));
    } catch (err) {
      console.warn('Cart save error:', err);
    }
  }

  addToCart(event) {
    const productId = event.target.dataset.id;
    const product = productManager.products.find(p => String(p.id) === String(productId));

    if (!product) {
      console.error('Product not found:', productId);
      return;
    }

    const existing = this.cart.find(item => item.id === String(productId));

    if (existing) {
      this.updateQuantity(String(productId), existing.quantity + 1);
    } else {
      this.cart.push({
        id: String(productId),
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: 1
      });
    }

    this.saveToStorage();
    this.updateDisplay();
    alert(`✅ ${product.name} added to cart!`);
  }

  updateQuantity(productId, qty) {
    if (qty <= 0) {
      this.removeItem(productId);
      return;
    }

    const item = this.cart.find(i => i.id === String(productId));
    if (item) {
      item.quantity = qty;
      this.saveToStorage();
      this.updateDisplay();
    }
  }

  removeItem(productId) {
    this.cart = this.cart.filter(i => i.id !== String(productId));
    this.saveToStorage();
    this.updateDisplay();
  }

  updateDisplay() {
    const total = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count')&&(document.getElementById('cart-count').textContent = total);
    document.getElementById('fab-count')&&(document.getElementById('fab-count').textContent = total);

    const container = document.getElementById('cart-items');
    if (!container) return;

    container.innerHTML = '';

    if (this.cart.length === 0) {
      container.innerHTML = '<li style="text-align: center; padding: 20px;">Your cart is empty</li>';
    } else {
      this.cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `
          <span>${item.name}</span>
          <div class="cart-item-quantity">
            <button class="qty-btn minus" data-id="${item.id}">−</button>
            <span>${item.quantity}</span>
            <button class="qty-btn plus" data-id="${item.id}">+</button>
          </div>
          <span>₹${subtotal.toLocaleString('en-IN')}</span>
          <button class="remove-btn" data-id="${item.id}">✕</button>
        `;
        container.appendChild(li);
      });

      document.querySelectorAll('.qty-btn.minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const item = this.cart.find(i => i.id === id);
          this.updateQuantity(id, item.quantity - 1);
        });
      });

      document.querySelectorAll('.qty-btn.plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const item = this.cart.find(i => i.id === id);
          this.updateQuantity(id, item.quantity + 1);
        });
      });

      document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.removeItem(e.target.dataset.id);
        });
      });
    }

    const cartTotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = `Total: ₹${cartTotal.toLocaleString('en-IN')}`;
  }

  generateMessage() {
    const name = document.getElementById('cust-name')?.value.trim();
    const whatsapp = document.getElementById('cust-whatsapp')?.value.trim();
    const address = document.getElementById('cust-address')?.value.trim();

    // If cart is empty, show friendly inline message and don't proceed
    if (!this.cart || this.cart.length === 0) {
      const errorEl = document.getElementById('cart-error-message');
      if (errorEl) {
        errorEl.textContent = '🛒 Your cart is empty. Please add products to your cart before sending an order.';
        errorEl.style.display = 'block';
      }
      return null;
    }

    if (!name || !whatsapp || !address) {
        const errorEl = document.getElementById('cart-error-message');
        if (errorEl) {
          errorEl.textContent = '❌ Please fill all fields: Name, WhatsApp Number, and Delivery Address';
          errorEl.style.display = 'block';
        }
      return null;
    }

      // Clear error message when validation passes
      const errorEl = document.getElementById('cart-error-message');
      if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
      }
    const items = this.cart
      .map(item => `• ${item.name} (Qty: ${item.quantity}) - ₹${(item.price * item.quantity).toLocaleString('en-IN')}`)
      .join('\n');

    const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return `
*🛍️ ORDER FROM KHUSHI ONLINE STORE*

*Customer:*
Name: ${name}
WhatsApp: ${whatsapp}
Address: ${address}

*Items:*
${items}

*Total: ₹${total.toLocaleString('en-IN')}*

💳 Payment: Cash on Delivery
    `.trim();
  }

  redirectToWhatsApp() {
    const msg = this.generateMessage();
    if (!msg) return false; // validation failed; do not proceed

    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/${CONFIG.BUSINESS_PHONE.replace('+', '')}?text=${encoded}`;
    window.open(url, '_blank');

    // Clear cart only after opening WhatsApp
    this.cart = [];
    this.saveToStorage();
    this.updateDisplay();
    return true;
  }

  clear() {
    this.cart = [];
    this.saveToStorage();
    this.updateDisplay();
  }
}

// ============================================
// IMAGE VIEWER CLASS
// ============================================

class ImageViewer {
  constructor() {
    this.modal = document.getElementById('image-zoom-modal');
    this.helpModal = document.getElementById('image-help-modal');
    this.image = document.getElementById('zoomed-image');
    this.container = document.querySelector('.image-zoom-container');
    
    this.zoomLevel = 100;
    this.gallery = [];
    this.index = 0;
    this.touchStartX = 0;

    this.init();
  }

  init() {
    if (!this.modal || !this.image) return;

    // Zoom controls
    document.querySelector('.zoom-in')?.addEventListener('click', () => this.zoomIn());
    document.querySelector('.zoom-out')?.addEventListener('click', () => this.zoomOut());

    // Navigation
    document.querySelector('.prev-image')?.addEventListener('click', () => this.prevImage());
    document.querySelector('.next-image')?.addEventListener('click', () => this.nextImage());

    // Close
    document.querySelector('.image-zoom-close')?.addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => e.target === this.modal && this.close());

    // Help modal
    document.querySelector('.image-help-btn')?.addEventListener('click', () => this.toggleHelp());
    document.querySelector('.image-help-close')?.addEventListener('click', () => this.closeHelp());
    this.helpModal?.addEventListener('click', (e) => e.target === this.helpModal && this.closeHelp());

    // Keyboard
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Image click
    document.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG' && e.target.closest('.product-card')) {
        this.open(e);
      }
    });

    // Touch
    this.setupTouch();
  }

  zoomIn() {
    if (this.zoomLevel < CONFIG.ZOOM_MAX) {
      this.zoomLevel += CONFIG.ZOOM_STEP;
      this.updateZoom();
    }
  }

  zoomOut() {
    if (this.zoomLevel > CONFIG.ZOOM_MIN) {
      this.zoomLevel -= CONFIG.ZOOM_STEP;
      this.updateZoom();
    }
  }

  updateZoom() {
    document.querySelector('.zoom-level').textContent = `${this.zoomLevel}%`;
    this.image.style.transform = `scale(${this.zoomLevel / 100})`;

    const zIn = document.querySelector('.zoom-in');
    const zOut = document.querySelector('.zoom-out');
    if (zIn) zIn.disabled = this.zoomLevel >= CONFIG.ZOOM_MAX;
    if (zOut) zOut.disabled = this.zoomLevel <= CONFIG.ZOOM_MIN;
  }

  prevImage() {
    if (this.index > 0) {
      this.index--;
      this.showImage();
    }
  }

  nextImage() {
    if (this.index < this.gallery.length - 1) {
      this.index++;
      this.showImage();
    }
  }

  showImage() {
    this.image.src = this.gallery[this.index];
    this.updateCounter();
    this.zoomLevel = 100;
    this.updateZoom();
  }

  updateCounter() {
    const cur = document.getElementById('image-current');
    const tot = document.getElementById('image-total');
    const prev = document.querySelector('.prev-image');
    const next = document.querySelector('.next-image');

    if (cur) cur.textContent = this.index + 1;
    if (tot) tot.textContent = this.gallery.length;
    if (prev) prev.disabled = this.index === 0;
    if (next) next.disabled = this.index >= this.gallery.length - 1;
  }

  open(event) {
    const card = event.target.closest('.product-card');
    const prodId = card?.dataset.productId;
    const product = productManager.products.find(p => p.id === prodId);

    this.gallery = product?.imageUrls || [product?.imageUrl || event.target.src];
    this.index = 0;

    this.image.src = this.gallery[0];
    this.modal.classList.add('show');
    this.zoomLevel = 100;
    this.updateZoom();
    this.updateCounter();
  }

  close() {
    this.modal?.classList.remove('show');
  }

  toggleHelp() {
    this.helpModal?.classList.toggle('show');
  }

  closeHelp() {
    this.helpModal?.classList.remove('show');
  }

  handleKeyboard(e) {
    if (!this.modal?.classList.contains('show')) return;

    const keys = {
      'Escape': () => this.close(),
      '+': () => this.zoomIn(),
      '=': () => this.zoomIn(),
      '-': () => this.zoomOut(),
      '_': () => this.zoomOut(),
      'ArrowLeft': () => this.prevImage(),
      'ArrowRight': () => this.nextImage(),
    };

    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  }

  setupTouch() {
    if (!this.container) return;

    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
      }
    });

    this.container.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const diff = this.touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > CONFIG.SWIPE_THRESHOLD) {
          if (diff > 0) this.nextImage();
          else this.prevImage();
        }
      }
    });
  }
}

// ============================================
// INITIALIZATION
// ============================================

const productManager = new ProductManager();
const cartManager = new CartManager();
const imageViewer = new ImageViewer();

document.addEventListener('DOMContentLoaded', () => {
  // Load products
  productManager.loadProducts();

  // Search
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    productManager.currentSearchTerm = e.target.value;
    productManager.filterAndSortProducts();
  });

  // Sort
  document.getElementById('sort-dropdown')?.addEventListener('change', (e) => {
    productManager.currentSortOption = e.target.value;
    productManager.filterAndSortProducts();
  });

  // Pagination
  document.getElementById('prev-page-btn')?.addEventListener('click', () => productManager.prevPage());
  document.getElementById('next-page-btn')?.addEventListener('click', () => productManager.nextPage());

  // Categories
  document.querySelectorAll('[data-category]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('[data-category]').forEach(l => l.classList.remove('active-category'));
      link.classList.add('active-category');
      productManager.renderProducts(link.dataset.category);
    });
  });

  // Cart modal
  const modal = document.getElementById('cart-modal');
  const openModal = () => {
    cartManager.updateDisplay();
    modal?.classList.add('show');
  };
  const closeModal = () => modal?.classList.remove('show');

  document.getElementById('view-cart-btn')?.addEventListener('click', openModal);
  document.getElementById('fab-cart')?.addEventListener('click', openModal);
  document.querySelector('.close-btn')?.addEventListener('click', closeModal);

  // WhatsApp
  document.getElementById('whatsapp-share-btn')?.addEventListener('click', () => {
    // Attempt to send; redirectToWhatsApp returns true on success, false on validation failure
    const success = cartManager.redirectToWhatsApp();
    if (success) {
      closeModal();
    } else {
      // keep modal open and ensure error message is visible (generateMessage already sets it)
      const errorEl = document.getElementById('cart-error-message');
      if (errorEl) errorEl.style.display = 'block';
    }
  });

  console.log('✅ App initialized (ES6+)');
});
