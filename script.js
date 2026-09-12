/**
 * Khushi Online Store - Modern ES6+ / ECMAScript 2020+
 * Fully refactored with classes, arrow functions, destructuring, async/await
 */

// ============================================
// CONFIG & CONSTANTS
// ============================================

const CONFIG = {
  BUSINESS_PHONE: '+917004692562',
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
      // Prefer server-stored products if an API is available (shared across browsers)
      let loaded = false;
      try {
        const apiBase = (window && window.API_BASE_URL) ? window.API_BASE_URL.replace(/\/+$/,'') : '';
        const apiUrl = apiBase + '/api/products';
        const apiResp = await fetch(apiUrl);
        if (apiResp.ok) {
          const apiProducts = await apiResp.json();
          if (Array.isArray(apiProducts)) {
            this.products = apiProducts;
            console.log(`✅ Loaded ${this.products.length} products from ${apiUrl}`);
            loaded = true;
          }
        }
      } catch (e) {
        // ignore network errors and fall back
      }

      if (!loaded) {
        // Check if admin has synced updated products to localStorage
        const syncedProducts = localStorage.getItem('khushi_products_sync');
        if (syncedProducts) {
          this.products = JSON.parse(syncedProducts);
          console.log(`✅ Loaded ${this.products.length} products from admin sync (localStorage)`);
        } else {
          // Fallback to products.json if no admin sync available
          const response = await fetch('products.json');
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          this.products = await response.json();
          console.log(`✅ Loaded ${this.products.length} products from products.json`);
        }
      }
      
      this.filteredProducts = [...this.products];
      
      document.querySelector('[data-category="all"]')?.classList.add('active-category');
      this.renderProducts('all');
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
    console.log('Adding product to cart. ID:', productId);
    
    const product = productManager.products.find(p => String(p.id) === String(productId));

    if (!product) {
      console.error('Product not found:', productId);
      alert('❌ Product not found!');
      return;
    }

    console.log('Product found:', product);

    const existing = this.cart.find(item => item.id === String(productId));

    if (existing) {
      console.log('Product already in cart, updating quantity');
      this.updateQuantity(String(productId), existing.quantity + 1);
    } else {
      const newItem = {
        id: String(productId),
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: 1
      };
      console.log('Adding new item:', newItem);
      this.cart.push(newItem);
    }

    this.saveToStorage();
    console.log('Cart after adding:', this.cart);
    console.log('Cart saved to localStorage');
    
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
    console.log('===== GENERATE MESSAGE START =====');
    console.log('Current cart array:', this.cart);
    console.log('Cart length:', this.cart ? this.cart.length : 'CART IS NULL');
    
    // Get form values
    const name = document.getElementById('cust-name')?.value?.trim() || '';
    const whatsapp = document.getElementById('cust-whatsapp')?.value?.trim() || '';
    const address = document.getElementById('cust-address')?.value?.trim() || '';

    console.log('Form - Name:', name);
    console.log('Form - WhatsApp:', whatsapp);
    console.log('Form - Address:', address);

    // Validate form
    if (!name || !whatsapp || !address) {
      console.error('FORM VALIDATION FAILED');
      const errorEl = document.getElementById('cart-error-message');
      if (errorEl) {
        errorEl.textContent = 'Fill all fields: Name, WhatsApp, Address';
        errorEl.style.display = 'block';
      }
      return null;
    }

    // Validate cart
    if (!this.cart || this.cart.length === 0) {
      console.error('CART IS EMPTY OR NULL');
      const errorEl = document.getElementById('cart-error-message');
      if (errorEl) {
        errorEl.textContent = 'Cart is empty. Add products first.';
        errorEl.style.display = 'block';
      }
      return null;
    }

    console.log('Validation PASSED');
    console.log('Building message with', this.cart.length, 'items');

    // Build message in requested WhatsApp format (columns aligned)
    const padRight = (s, len) => {
      s = String(s);
      return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
    };
    const padLeft = (s, len) => {
      s = String(s);
      return s.length >= len ? s.slice(-len) : ' '.repeat(len - s.length) + s;
    };

    let lines = [];
    lines.push('Khushi Online Stores Order Request');
    lines.push('');
    lines.push('CUSTOMER DETAILS');
    lines.push('Name: ' + name);
    lines.push('WhatsApp Number: ' + whatsapp);
    lines.push('Address: ' + address);
    lines.push('');
    lines.push('Order details:');
    lines.push('');
    // Header with approximate spacing to match example
    lines.push('SR No. Product name         Qty     Price       ');

    // Add items (aligned columns)
    let totalPrice = 0;
    this.cart.forEach((item, idx) => {
      const itemTotal = item.price * item.quantity;
      totalPrice += itemTotal;

      const sr = padRight(idx + 1, 5);
      const prod = padRight(item.name, 20);
      const qty = padRight(item.quantity, 7);
      const priceStr = '₹' + itemTotal.toLocaleString('en-IN');
      const price = padLeft(priceStr, 11);

      const line = sr + prod + qty + price;
      lines.push(line);
      console.log('Item line:', line);
    });

    lines.push('');
    lines.push('Grand Total: ₹' + totalPrice.toLocaleString('en-IN'));

    // Join all lines
    const message = lines.join('\n');

    console.log('===== FINAL MESSAGE =====');
    console.log(message);
    console.log('===== MESSAGE LENGTH:', message.length, '=====');
    console.log('===== GENERATE MESSAGE END =====');

    return message;
  }

  redirectToWhatsApp() {
    console.log('===== REDIRECT TO WHATSAPP START =====');
    
    try {
      // Get message
      const message = this.generateMessage();
      console.log('Message from generateMessage():', message);
      
      if (!message) {
        console.error('Message is null/empty. Cannot proceed.');
        return;
      }

      // Owner phone - NO PLUS SIGN for wa.me
      const ownerPhone = '917004692562'; // International format without +
      console.log('Owner phone:', ownerPhone);

      // CRITICAL: Use simple encodeURIComponent - this is the key!
      // The text parameter must be properly encoded
      const encodedMessage = encodeURIComponent(message);
      console.log('Encoded message length:', encodedMessage.length);
      console.log('First 200 chars of encoded:', encodedMessage.substring(0, 200));

      // Build WhatsApp URL - Format: https://wa.me/[phone]?text=[message]
      const waUrl = `https://wa.me/${ownerPhone}?text=${encodedMessage}`;
      console.log('Full WhatsApp URL length:', waUrl.length);

      // Show preview on page (make visible)
      const previewEl = document.getElementById('message-preview');
      if (previewEl) {
        previewEl.textContent = message;
        previewEl.style.display = 'block';
        console.log('Message preview updated on page');
      }

      console.log('Opening WhatsApp URL...');
      
      // Open in new window/tab
      const whatsappWindow = window.open(waUrl, '_blank', 'width=800,height=600');
      
      if (!whatsappWindow) {
        console.error('Popup was blocked! Check browser popup settings.');
        alert('Popup blocked. Please allow popups for this site.');
        return false;
      }

      console.log('WhatsApp window opened successfully');

      // Clear cart after successful send
      setTimeout(() => {
        this.clearCart();
        console.log('Cart cleared after send');
      }, 1000);

      console.log('===== REDIRECT TO WHATSAPP END - SUCCESS =====');
      return true;

    } catch (error) {
      console.error('ERROR in redirectToWhatsApp:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      alert('Error sending order. Check console for details.');
      return false;
    }
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

  // Note: test buttons removed per user request. Only the Send Order button remains.

  // WhatsApp
  document.getElementById('whatsapp-share-btn')?.addEventListener('click', () => {
    console.log('WhatsApp button clicked');
    console.log('Current cart:', cartManager.cart);
    console.log('Cart count:', cartManager.cart ? cartManager.cart.length : 0);
    
    // Validate form before sending
    const name = document.getElementById('cust-name')?.value.trim();
    const whatsapp = document.getElementById('cust-whatsapp')?.value.trim();
    const address = document.getElementById('cust-address')?.value.trim();
    
    console.log('Form data:', { name, whatsapp, address });
    
    // Show message preview
    const previewEl = document.getElementById('message-preview');
    if (previewEl && cartManager.cart && cartManager.cart.length > 0) {
      const msg = cartManager.generateMessage();
      if (msg) {
        previewEl.textContent = msg;
        previewEl.style.display = 'block';
        console.log('Message preview displayed');
      }
    }
    
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
