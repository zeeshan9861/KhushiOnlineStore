/**
 * Khushi Online Store - Refactored OOP Architecture
 * Using ES6+ Classes, Design Patterns (MVC, Observer, Singleton)
 * Improved encapsulation, inheritance, composition
 */

// ============================================
// CONFIGURATION & CONSTANTS (Singleton Pattern)
// ============================================

class Config {
  static #instance = null;

  constructor() {
    if (Config.#instance) return Config.#instance;
    
    this.BUSINESS_PHONE = '+918102424024';
    this.PRODUCTS_PER_PAGE = 12;
    this.CART_STORAGE_KEY = 'khushi_cart_v1';
    this.ZOOM_MIN = 50;
    this.ZOOM_MAX = 300;
    this.ZOOM_STEP = 10;
    this.SWIPE_THRESHOLD = 50;

    Config.#instance = this;
  }

  static getInstance() {
    return new Config();
  }
}

// ============================================
// IMAGE SERVICE CLASS (Handle localStorage images)
// ============================================

class ImageService {
  static getImageUrl(imageUrl) {
    // If image path is from admin upload (images/uploads/...), try to get from localStorage
    if (imageUrl && imageUrl.includes('images/uploads/')) {
      try {
        const base64Data = localStorage.getItem(imageUrl);
        if (base64Data) {
          return base64Data; // Return base64 data URL directly
        }
      } catch (e) {
        console.warn('Failed to load image from localStorage:', imageUrl);
      }
    }
    // Return original URL (for products.json or regular file paths)
    return imageUrl;
  }

  static isLocalStorageImage(imageUrl) {
    return imageUrl && imageUrl.includes('images/uploads/');
  }
}

// ============================================
// BASE MANAGER CLASS (Abstract Pattern)
// ============================================

class BaseManager {
  constructor(name = 'BaseManager') {
    this.name = name;
    this.observers = [];
  }

  // Observer Pattern: notify listeners of state changes
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.observers.push(callback);
    }
  }

  unsubscribe(callback) {
    this.observers = this.observers.filter(obs => obs !== callback);
  }

  notify(data) {
    this.observers.forEach(callback => callback(data));
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${this.name}] ${timestamp} - ${message}`);
  }
}

// ============================================
// PRODUCT CLASS (Entity/Model)
// ============================================

class Product {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.category = data.category;
    this.imageUrl = data.imageUrl;
    this.imageUrls = data.imageUrls || [data.imageUrl];
  }

  getDisplayPrice() {
    return `₹${this.price.toLocaleString('en-IN')}`;
  }

  truncateDescription(maxWords = 50) {
    const words = this.description.split(/\s+/).filter(w => w.length > 0);
    return words.length > maxWords 
      ? `${words.slice(0, maxWords).join(' ')}...` 
      : this.description;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      category: this.category,
      imageUrl: this.imageUrl,
      imageUrls: this.imageUrls
    };
  }
}

// ============================================
// CART ITEM CLASS (Entity/Model)
// ============================================

class CartItem {
  constructor(product, quantity = 1) {
    this.id = String(product.id);
    this.name = product.name;
    this.price = product.price;
    this.imageUrl = product.imageUrl;
    this.quantity = Math.max(1, quantity);
  }

  getSubtotal() {
    return this.price * this.quantity;
  }

  incrementQuantity() {
    this.quantity++;
  }

  decrementQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
      return true;
    }
    return false;
  }

  setQuantity(qty) {
    const newQty = parseInt(qty, 10);
    if (newQty > 0) {
      this.quantity = newQty;
      return true;
    }
    return false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      imageUrl: this.imageUrl,
      quantity: this.quantity
    };
  }

  static fromJSON(data) {
    const item = new CartItem({ 
      id: data.id, 
      name: data.name, 
      price: data.price, 
      imageUrl: data.imageUrl 
    }, data.quantity);
    return item;
  }
}

// ============================================
// STORAGE SERVICE CLASS (Service Pattern)
// ============================================

class StorageService {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  save(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Storage save error:', err);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('Storage load error:', err);
      return null;
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (err) {
      console.error('Storage clear error:', err);
      return false;
    }
  }
}

// ============================================
// PRODUCT MANAGER CLASS (Manager Pattern + Observer)
// ============================================

class ProductManager extends BaseManager {
  constructor() {
    super('ProductManager');
    this.config = Config.getInstance();
    
    this.products = [];
    this.filteredProducts = [];
    this.currentPage = 1;
    this.currentCategory = 'all';
    this.currentSearchTerm = '';
    this.currentSortOption = 'default';
  }

  async loadProducts() {
    try {
      let data;
      const lastSync = localStorage.getItem('khushi_last_sync');
      
      // Check if admin has synced products to localStorage (priority)
      const syncedProducts = localStorage.getItem('khushi_products_sync');
      if (syncedProducts) {
        try {
          data = JSON.parse(syncedProducts);
          const syncTime = lastSync ? new Date(lastSync).toLocaleString() : 'Unknown';
          this.log(`✅ Loaded products from admin sync (Last sync: ${syncTime})`);
        } catch (e) {
          this.log('⚠️ Synced products corrupted, falling back to products.json');
          data = null;
        }
      }
      
      // Fall back to products.json if no valid synced products
      if (!data) {
        const response = await fetch('products.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        data = await response.json();
        this.log('✅ Loaded products from products.json');
      }
      
      this.products = data.map(item => new Product(item));
      this.filteredProducts = [...this.products];
      
      this.notify({ type: 'products-loaded', count: this.products.length });
      this.log(`✅ Loaded ${this.products.length} products total`);
      return true;
    } catch (error) {
      this.notify({ type: 'products-error', error });
      this.log(`❌ Product load error: ${error.message}`);
      return false;
    }
  }

  filterAndSort() {
    let results = [...this.products];

    // Filter by category
    if (this.currentCategory !== 'all') {
      results = results.filter(p => p.category === this.currentCategory);
    }

    // Filter by search term
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
    this.notify({ type: 'filter-changed', count: this.filteredProducts.length });
  }

  setCategory(category) {
    this.currentCategory = category || 'all';
    this.currentSearchTerm = '';
    this.currentSortOption = 'default';
    this.filterAndSort();
  }

  setSearchTerm(term) {
    this.currentSearchTerm = term;
    this.filterAndSort();
  }

  setSortOption(option) {
    this.currentSortOption = option;
    this.filterAndSort();
  }

  getPageData(pageNumber) {
    const totalPages = this.getTotalPages();
    if (pageNumber < 1 || pageNumber > totalPages) return null;

    const start = (pageNumber - 1) * this.config.PRODUCTS_PER_PAGE;
    const end = start + this.config.PRODUCTS_PER_PAGE;
    return {
      products: this.filteredProducts.slice(start, end),
      currentPage: pageNumber,
      totalPages
    };
  }

  getTotalPages() {
    return Math.ceil(this.filteredProducts.length / this.config.PRODUCTS_PER_PAGE);
  }

  nextPage() {
    const totalPages = this.getTotalPages();
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.notify({ type: 'page-changed', page: this.currentPage });
      return true;
    }
    return false;
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.notify({ type: 'page-changed', page: this.currentPage });
      return true;
    }
    return false;
  }

  findProductById(id) {
    return this.products.find(p => String(p.id) === String(id));
  }

  getStats() {
    if (this.products.length === 0) {
      return {
        totalProducts: 0,
        filteredCount: 0,
        categories: [],
        priceRange: { min: 0, max: 0 }
      };
    }

    return {
      totalProducts: this.products.length,
      filteredCount: this.filteredProducts.length,
      categories: [...new Set(this.products.map(p => p.category))],
      priceRange: {
        min: Math.min(...this.products.map(p => p.price)),
        max: Math.max(...this.products.map(p => p.price))
      }
    };
  }
}

// ============================================
// CART MANAGER CLASS (Manager Pattern + Observer)
// ============================================

class CartManager extends BaseManager {
  constructor() {
    super('CartManager');
    this.config = Config.getInstance();
    this.storage = new StorageService(this.config.CART_STORAGE_KEY);
    
    this.items = [];
    this.loadFromStorage();
  }

  loadFromStorage() {
    const data = this.storage.load();
    if (data && Array.isArray(data)) {
      this.items = data.map(item => CartItem.fromJSON(item));
      this.log(`✅ Loaded ${this.items.length} items from storage`);
    }
  }

  saveToStorage() {
    const success = this.storage.save(this.items.map(item => item.toJSON()));
    if (success) {
      this.log('✅ Cart saved to storage');
    }
    return success;
  }

  addProduct(product) {
    const existingItem = this.items.find(item => item.id === String(product.id));

    if (existingItem) {
      existingItem.incrementQuantity();
      this.log(`✅ Incremented ${product.name}`);
    } else {
      const newItem = new CartItem(product, 1);
      this.items.push(newItem);
      this.log(`✅ Added ${product.name} to cart`);
    }

    this.saveToStorage();
    this.notify({ type: 'item-added', product: product.name, items: this.items.length });
    return true;
  }

  removeItem(productId) {
    const index = this.items.findIndex(item => item.id === String(productId));
    if (index !== -1) {
      const itemName = this.items[index].name;
      this.items.splice(index, 1);
      this.saveToStorage();
      this.notify({ type: 'item-removed', id: productId, items: this.items.length });
      this.log(`✅ Removed ${itemName}`);
      return true;
    }
    return false;
  }

  updateQuantity(productId, quantity) {
    const item = this.items.find(i => i.id === String(productId));
    if (!item) return false;

    if (quantity <= 0) {
      return this.removeItem(productId);
    }

    if (item.setQuantity(quantity)) {
      this.saveToStorage();
      this.notify({ type: 'quantity-changed', id: productId, quantity });
      return true;
    }
    return false;
  }

  clear() {
    const count = this.items.length;
    this.items = [];
    this.saveToStorage();
    this.notify({ type: 'cart-cleared', itemsRemoved: count });
    this.log(`✅ Cart cleared (${count} items removed)`);
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + item.getSubtotal(), 0);
  }

  isEmpty() {
    return this.items.length === 0;
  }

  getItems() {
    return [...this.items];
  }

  generateOrderMessage(customerData) {
    const { name, whatsapp, address } = customerData;

    if (this.isEmpty()) {
      this.log('⚠️ Cannot generate message: cart is empty');
      return null;
    }

    if (!name || !whatsapp || !address) {
      this.log('⚠️ Missing customer data');
      return null;
    }

    // WhatsApp does not support true tables, so use padded columns with spaces
    function pad(str, len) {
      str = String(str);
      return str + ' '.repeat(Math.max(0, len - str.length));
    }
    const colWidths = { sr: 5, name: 20, qty: 8, price: 10 };
    let header = `${pad('SR No.', colWidths.sr)} ${pad('Product name', colWidths.name)}${pad('Qty', colWidths.qty)}${pad('Price', colWidths.price)}\n`;
    let rows = '';
    this.items.forEach((item, idx) => {
      rows += `${pad(idx + 1, colWidths.sr)} ${pad(item.name, colWidths.name)}${pad(item.quantity, colWidths.qty)}${pad('₹' + item.getSubtotal().toLocaleString('en-IN'), colWidths.price)}\n`;
    });
    const total = this.getSubtotal();

    let orderTable = '```\n' + header + rows + '```';

    return `Khushi Online Stores Order Request\n\nCUSTOMER DETAILS\nName: ${name}\nWhatsApp Number: ${whatsapp}\nAddress: ${address}\n \n Order details:\n${orderTable}\nGrand Total: ₹${total.toLocaleString('en-IN')}\n\nPlease confirm the availability and total cost including shipping if applicable. Thank you!`.trim();
  }

  redirectToWhatsApp(message) {
    if (!message) return false;

    try {
      const encoded = encodeURIComponent(message);
      const phone = this.config.BUSINESS_PHONE.replace('+', '');
      const url = `https://wa.me/${phone}?text=${encoded}`;
      window.open(url, '_blank');
      
      this.log('✅ Redirected to WhatsApp');
      return true;
    } catch (err) {
      this.log(`❌ WhatsApp redirect failed: ${err.message}`);
      return false;
    }
  }

  getStats() {
    return {
      itemCount: this.items.length,
      totalQuantity: this.getItemCount(),
      subtotal: this.getSubtotal(),
      isEmpty: this.isEmpty()
    };
  }
}

// ============================================
// IMAGE VIEWER CLASS (Observer Pattern)
// ============================================

class ImageViewer extends BaseManager {
  constructor() {
    super('ImageViewer');
    this.config = Config.getInstance();
    
    this.modal = null;
    this.helpModal = null;
    this.image = null;
    this.container = null;
    
    this.zoomLevel = 100;
    this.gallery = [];
    this.currentIndex = 0;
    this.touchStartX = 0;
  }

  init() {
    this.modal = document.getElementById('image-zoom-modal');
    this.helpModal = document.getElementById('image-help-modal');
    this.image = document.getElementById('zoomed-image');
    this.container = document.querySelector('.image-zoom-container');

    if (!this.modal || !this.image) {
      this.log('⚠️ Image viewer elements not found');
      return false;
    }

    this.attachEventListeners();
    this.log('✅ ImageViewer initialized');
    return true;
  }

  attachEventListeners() {
    // Zoom controls
    document.querySelector('.zoom-in')?.addEventListener('click', () => this.zoomIn());
    document.querySelector('.zoom-out')?.addEventListener('click', () => this.zoomOut());

    // Navigation
    document.querySelector('.prev-image')?.addEventListener('click', () => this.prevImage());
    document.querySelector('.next-image')?.addEventListener('click', () => this.nextImage());

    // Close
    document.querySelector('.image-zoom-close')?.addEventListener('click', () => this.close());
    this.modal?.addEventListener('click', (e) => e.target === this.modal && this.close());

    // Help modal
    document.querySelector('.image-help-btn')?.addEventListener('click', () => this.toggleHelp());
    document.querySelector('.image-help-close')?.addEventListener('click', () => this.closeHelp());
    this.helpModal?.addEventListener('click', (e) => e.target === this.helpModal && this.closeHelp());

    // Keyboard
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Product image clicks
    document.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG' && e.target.closest('.product-card')) {
        this.openFromProductCard(e.target);
      }
    });

    // Touch
    this.setupTouchGestures();
  }

  zoomIn() {
    if (this.zoomLevel < this.config.ZOOM_MAX) {
      this.zoomLevel += this.config.ZOOM_STEP;
      this.updateZoomDisplay();
      this.notify({ type: 'zoom-changed', level: this.zoomLevel });
    }
  }

  zoomOut() {
    if (this.zoomLevel > this.config.ZOOM_MIN) {
      this.zoomLevel -= this.config.ZOOM_STEP;
      this.updateZoomDisplay();
      this.notify({ type: 'zoom-changed', level: this.zoomLevel });
    }
  }

  updateZoomDisplay() {
    const levelEl = document.querySelector('.zoom-level');
    if (levelEl) levelEl.textContent = `${this.zoomLevel}%`;

    if (this.image) {
      this.image.style.transform = `scale(${this.zoomLevel / 100})`;
    }

    const zInBtn = document.querySelector('.zoom-in');
    const zOutBtn = document.querySelector('.zoom-out');
    if (zInBtn) zInBtn.disabled = this.zoomLevel >= this.config.ZOOM_MAX;
    if (zOutBtn) zOutBtn.disabled = this.zoomLevel <= this.config.ZOOM_MIN;
  }

  prevImage() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.displayImage();
      this.notify({ type: 'image-changed', index: this.currentIndex });
    }
  }

  nextImage() {
    if (this.currentIndex < this.gallery.length - 1) {
      this.currentIndex++;
      this.displayImage();
      this.notify({ type: 'image-changed', index: this.currentIndex });
    }
  }

  displayImage() {
    if (this.gallery[this.currentIndex]) {
      this.image.src = this.gallery[this.currentIndex];
      this.updateCounter();
      this.zoomLevel = 100;
      this.updateZoomDisplay();
    }
  }

  updateCounter() {
    const curEl = document.getElementById('image-current');
    const totEl = document.getElementById('image-total');
    const prevBtn = document.querySelector('.prev-image');
    const nextBtn = document.querySelector('.next-image');

    if (curEl) curEl.textContent = this.currentIndex + 1;
    if (totEl) totEl.textContent = this.gallery.length;
    if (prevBtn) prevBtn.disabled = this.currentIndex === 0;
    if (nextBtn) nextBtn.disabled = this.currentIndex >= this.gallery.length - 1;
  }

  openFromProductCard(imgElement) {
    const card = imgElement.closest('.product-card');
    const productId = card?.dataset.productId;
    
    // In a full implementation, we'd fetch product data from ProductManager
    this.gallery = [imgElement.src];
    this.currentIndex = 0;
    this.zoomLevel = 100;

    if (this.image) {
      this.image.src = this.gallery[0];
    }
    
    this.modal?.classList.add('show');
    this.updateZoomDisplay();
    this.updateCounter();
    this.log('✅ Image viewer opened');
  }

  close() {
    this.modal?.classList.remove('show');
    this.log('✅ Image viewer closed');
  }

  toggleHelp() {
    this.helpModal?.classList.toggle('show');
  }

  closeHelp() {
    this.helpModal?.classList.remove('show');
  }

  handleKeyboard(e) {
    if (!this.modal?.classList.contains('show')) return;

    const handlers = {
      'Escape': () => this.close(),
      '+': () => this.zoomIn(),
      '=': () => this.zoomIn(),
      '-': () => this.zoomOut(),
      '_': () => this.zoomOut(),
      'ArrowLeft': () => this.prevImage(),
      'ArrowRight': () => this.nextImage(),
    };

    if (handlers[e.key]) {
      e.preventDefault();
      handlers[e.key]();
    }
  }

  setupTouchGestures() {
    if (!this.container) return;

    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
      }
    });

    this.container.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const diff = this.touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > this.config.SWIPE_THRESHOLD) {
          if (diff > 0) this.nextImage();
          else this.prevImage();
        }
      }
    });
  }
}

// ============================================
// UI RENDERER CLASS (View Pattern)
// ============================================

class UIRenderer {
  constructor(productManager, cartManager) {
    this.productManager = productManager;
    this.cartManager = cartManager;
  }

  renderProductsPage(pageData) {
    const grid = document.getElementById('products-grid');
    if (!grid) {
      console.error('products-grid element not found');
      return;
    }

    if (!pageData) {
      console.error('pageData is null or undefined');
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No products found.</p>';
      return;
    }

    grid.innerHTML = '';

    if (!pageData.products || pageData.products.length === 0) {
      grid.innerHTML = `
        <p style="grid-column: 1/-1; text-align: center; padding: 40px;">
          No products found. Try adjusting filters.
        </p>
      `;
      return;
    }

    pageData.products.forEach(product => {
      const card = this.createProductCard(product);
      grid.appendChild(card);
    });

    this.attachCardEventListeners();
  }

  createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    
    // Use ImageService to get correct image URL (handles localStorage base64 images)
    const imageUrl = ImageService.getImageUrl(product.imageUrl);
    
    card.innerHTML = `
      <img src="${imageUrl}" alt="${product.name}" loading="lazy">
      <h3>${product.name}</h3>
      <p class="product-description">${product.truncateDescription()}</p>
      <p class="price">${product.getDisplayPrice()}</p>
      <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
    `;
    return card;
  }

  attachCardEventListeners() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const productId = e.target.dataset.id;
        const product = this.productManager.findProductById(productId);
        if (product) {
          const added = this.cartManager.addProduct(product);
          this.updateCartDisplay();
          if (added) {
            this.showToast('✅ Your product added successfully');
          }
        } else {
          console.error('Product not found:', productId);
        }
      });
    });
  }

  showToast(message) {
    let toast = document.getElementById('toast-message');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-message';
      toast.style.position = 'fixed';
      toast.style.top = '32px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.background = '#28a745';
      toast.style.color = 'white';
      toast.style.padding = '16px 32px';
      toast.style.borderRadius = '8px';
      toast.style.fontSize = '1.1em';
      toast.style.fontWeight = '600';
      toast.style.boxShadow = '0 4px 16px rgba(40,167,69,0.18)';
      toast.style.zIndex = '9999';
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 2000);
  }

  updatePaginationControls(pageData) {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (pageInfo) {
      pageInfo.textContent = `Page ${pageData.currentPage} of ${pageData.totalPages}`;
    }
    if (prevBtn) {
      prevBtn.disabled = pageData.currentPage === 1;
    }
    if (nextBtn) {
      nextBtn.disabled = pageData.currentPage === pageData.totalPages;
    }
  }

  updateCartDisplay() {
    const stats = this.cartManager.getStats();
    const cartCount = document.getElementById('cart-count');
    const fabCount = document.getElementById('fab-count');
    const count = stats.itemCount;
    if (cartCount) cartCount.textContent = count;
    if (fabCount) fabCount.textContent = count;
    this.renderCartItems();
    this.renderCartTotal();
  }

  renderCartItems() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    const items = this.cartManager.getItems();
    container.innerHTML = '';

    if (items.length === 0) {
      container.innerHTML = '<li style="text-align: center; padding: 20px;">Your cart is empty</li>';
      return;
    }

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <span>${item.name}</span>
        <div class="cart-item-quantity">
          <button class="qty-btn minus" data-id="${item.id}">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn plus" data-id="${item.id}">+</button>
        </div>
        <span>₹${item.getSubtotal().toLocaleString('en-IN')}</span>
        <button class="remove-btn" data-id="${item.id}">✕</button>
      `;
      container.appendChild(li);
    });

    this.attachCartEventListeners();
  }

  renderCartTotal() {
    const totalEl = document.getElementById('cart-total');
    if (totalEl) {
      const total = this.cartManager.getSubtotal();
      totalEl.textContent = `Total: ₹${total.toLocaleString('en-IN')}`;
    }
  }

  attachCartEventListeners() {
    document.querySelectorAll('.qty-btn.minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const items = this.cartManager.getItems();
        const item = items.find(i => i.id === id);
        if (item) {
          this.cartManager.updateQuantity(id, item.quantity - 1);
        }
      });
    });

    document.querySelectorAll('.qty-btn.plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const items = this.cartManager.getItems();
        const item = items.find(i => i.id === id);
        if (item) {
          this.cartManager.updateQuantity(id, item.quantity + 1);
        }
      });
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.cartManager.removeItem(e.target.dataset.id);
      });
    });
  }

  showError(message) {
    const errorEl = document.getElementById('cart-error-message');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  clearError() {
    const errorEl = document.getElementById('cart-error-message');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  renderCategoryButtons() {
    const categoriesContainer = document.getElementById('categories');
    if (!categoriesContainer) return;

    // Get all unique categories from products
    const allCategories = [...new Set(this.productManager.products.map(p => p.category))].sort();
    
    // Create category buttons HTML
    let html = '<li><a href="#" data-category="all" class="active-category">All</a></li>';
    
    allCategories.forEach(category => {
      html += `<li><a href="#" data-category="${category}">${category}</a></li>`;
    });

    // Replace content
    categoriesContainer.innerHTML = html;

    // Attach event listeners to category links
    document.querySelectorAll('[data-category]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCategoryClick(link);
      });
    });
  }

  handleCategoryClick(link) {
    document.querySelectorAll('[data-category]').forEach(l => l.classList.remove('active-category'));
    link.classList.add('active-category');
    
    const category = link.dataset.category;
    this.productManager.setCategory(category);
    
    const pageData = this.productManager.getPageData(1);
    if (pageData) {
      this.renderProductsPage(pageData);
      this.updatePaginationControls(pageData);
    }
  }
}

// ============================================
// APPLICATION CONTROLLER (Orchestrator Pattern)
// ============================================

class AppController {
  constructor() {
    this.config = Config.getInstance();
    this.productManager = new ProductManager();
    this.cartManager = new CartManager();
    this.imageViewer = new ImageViewer();
    this.renderer = new UIRenderer(this.productManager, this.cartManager);
  }

  async init() {
    console.log('🚀 Initializing Khushi Online Store...');

    // Subscribe to manager updates
    this.productManager.subscribe(this.onProductManagerUpdate.bind(this));
    this.cartManager.subscribe(this.onCartManagerUpdate.bind(this));
    this.imageViewer.subscribe(this.onImageViewerUpdate.bind(this));

    // Initialize image viewer
    this.imageViewer.init();

    // Load products
    const success = await this.productManager.loadProducts();
    if (!success) {
      this.handleProductLoadError();
      return;
    }

    // Render category buttons dynamically based on products
    this.renderer.renderCategoryButtons();

    // Initial render
    const pageData = this.productManager.getPageData(1);
    if (pageData) {
      this.renderer.renderProductsPage(pageData);
      this.renderer.updatePaginationControls(pageData);
    }

    this.attachEventListeners();
    this.renderer.updateCartDisplay();

    console.log('✅ App initialized successfully');
  }

  attachEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        this.productManager.setSearchTerm(term);
        this.handleFilterChange();
      });
    }
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        const term = searchInput.value.trim();
        this.productManager.setSearchTerm(term);
        this.handleFilterChange();
      });
    }

    // Sort
    const sortDropdown = document.getElementById('sort-dropdown');
    if (sortDropdown) {
      sortDropdown.addEventListener('change', (e) => {
        this.productManager.setSortOption(e.target.value);
        this.handleFilterChange();
      });
    }

    // Pagination
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => this.handlePrevPage());
    }
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => this.handleNextPage());
    }

    // Listen for product updates from admin console
    window.addEventListener('storage', (e) => {
      if (e.key === 'khushi_products_sync' || e.key === 'khushi_last_sync') {
        console.log('📢 Detected product sync from admin console, refreshing...');
        this.handleProductSync();
      }
    });

    // Cart modal
    this.setupCartModalListeners();
  }

  setupCartModalListeners() {
    const modal = document.getElementById('cart-modal');
    const openBtns = [document.getElementById('view-cart-btn'), document.getElementById('fab-cart')];
    const closeBtn = document.querySelector('.close-btn');
    const whatsappBtn = document.getElementById('whatsapp-share-btn');

    const openModal = () => {
      this.renderer.updateCartDisplay();
      modal?.classList.add('show');
    };

    const closeModal = () => {
      modal?.classList.remove('show');
    };

    openBtns.forEach(btn => btn?.addEventListener('click', openModal));
    closeBtn?.addEventListener('click', closeModal);

    whatsappBtn?.addEventListener('click', () => {
      this.handleWhatsAppOrder();
    });
  }

  handleFilterChange() {
    const pageData = this.productManager.getPageData(this.productManager.currentPage);
    if (pageData) {
      this.renderer.renderProductsPage(pageData);
      this.renderer.updatePaginationControls(pageData);
    }
  }

  handlePrevPage() {
    if (this.productManager.prevPage()) {
      const pageData = this.productManager.getPageData(this.productManager.currentPage);
      if (pageData) {
        this.renderer.renderProductsPage(pageData);
        this.renderer.updatePaginationControls(pageData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  handleNextPage() {
    if (this.productManager.nextPage()) {
      const pageData = this.productManager.getPageData(this.productManager.currentPage);
      if (pageData) {
        this.renderer.renderProductsPage(pageData);
        this.renderer.updatePaginationControls(pageData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  handleWhatsAppOrder() {
    const name = document.getElementById('cust-name')?.value.trim();
    const whatsapp = document.getElementById('cust-whatsapp')?.value.trim();
    const address = document.getElementById('cust-address')?.value.trim();

    const customerData = { name, whatsapp, address };
    const message = this.cartManager.generateOrderMessage(customerData);

    if (!message) {
      this.renderer.showError('❌ Please fill all fields: Name, WhatsApp Number, and Delivery Address');
      return;
    }

    this.renderer.clearError();

    if (this.cartManager.redirectToWhatsApp(message)) {
      this.cartManager.clear();
      this.renderer.updateCartDisplay();
      document.getElementById('cart-modal')?.classList.remove('show');
      alert('✅ Order sent! Cart has been cleared.');
    }
  }

  handleProductLoadError() {
    const section = document.getElementById('product-list');
    if (section) {
      section.innerHTML = `
        <h2>❌ Error Loading Products</h2>
        <p>Ensure "products.json" exists and the site is served over HTTP.</p>
        <p><strong>VS Code:</strong> Install Live Server, right-click index.html → "Open with Live Server"</p>
      `;
    }
  }

  async handleProductSync() {
    // Reload products from localStorage sync
    const success = await this.productManager.loadProducts();
    if (success) {
      // Refresh category buttons with new products
      this.renderer.renderCategoryButtons();
      
      // Re-render products on current page
      this.productManager.setCategory(this.productManager.currentCategory);
      const pageData = this.productManager.getPageData(1);
      if (pageData) {
        this.renderer.renderProductsPage(pageData);
        this.renderer.updatePaginationControls(pageData);
      }
      
      this.renderer.showToast('🔄 Products updated from admin console');
    }
  }

  // Observer callbacks
  onProductManagerUpdate(data) {
    if (data.type === 'products-loaded') {
      console.log(`📦 ${data.count} products loaded`);
    }
  }

  onCartManagerUpdate(data) {
    if (data.type === 'item-added') {
      console.log(`🛒 ${data.product} added to cart`);
      // Update cart display immediately after item is added
      this.renderer.updateCartDisplay();
    } else if (data.type === 'item-removed') {
      console.log(`🗑️ Item removed from cart`);
      this.renderer.updateCartDisplay();
    } else if (data.type === 'quantity-changed') {
      console.log(`📝 Quantity updated`);
      this.renderer.updateCartDisplay();
    } else if (data.type === 'cart-cleared') {
      console.log(`🧹 Cart cleared`);
      this.renderer.updateCartDisplay();
    }
  }

  onImageViewerUpdate(data) {
    if (data.type === 'zoom-changed') {
      console.log(`🔍 Zoom: ${data.level}%`);
    }
  }
}

// ============================================
// APPLICATION BOOTSTRAP
// ============================================

let appController;

document.addEventListener('DOMContentLoaded', () => {
  appController = new AppController();
  appController.init().catch(err => {
    console.error('❌ Application initialization failed:', err);
  });
});
