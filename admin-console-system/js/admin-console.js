/**
 * Admin Console for Khushi Electronics
 * Product Management System with Authentication
 */

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
    // Return original URL (for relative paths)
    return imageUrl;
  }

  static isLocalStorageImage(imageUrl) {
    return imageUrl && imageUrl.includes('images/uploads/');
  }
}

// ============================================
// Session & Authentication Check
// ============================================

class AdminSession {
  static getCurrentSession() {
    const session = localStorage.getItem('khushi_admin_session');
    return session ? JSON.parse(session) : null;
  }

  static isLoggedIn() {
    return this.getCurrentSession() !== null;
  }

  static logout() {
    localStorage.removeItem('khushi_admin_session');
    localStorage.removeItem('khushi_admin_remember');
    window.location.href = 'index.html';
  }

  static getRole() {
    const session = this.getCurrentSession();
    return session ? session.role : null;
  }

  static hasPermission(requiredRole) {
    const role = this.getRole();
    const roleHierarchy = {
      'super_admin': 3,
      'owner': 2,
      'admin': 1
    };
    return (roleHierarchy[role] || 0) >= (roleHierarchy[requiredRole] || 0);
  }

  static canDeleteProduct() {
    return this.hasPermission('super_admin');
  }

  static canAccessSettings() {
    return this.hasPermission('super_admin');
  }
}

// ============================================
// Admin Manager Class
// ============================================

class AdminManager {
  constructor() {
    // Check authentication first
    if (!AdminSession.isLoggedIn()) {
      window.location.href = 'index.html';
      return;
    }
    this.currentUser = AdminSession.getCurrentSession();
    this.products = [];
    this.categories = [];
    this.currentPage = 1;
    this.itemsPerPage = 20;
    this.filteredProducts = [];
    this.setupEventListeners();
    this.init();
  }

  async init() {
    this.displayUserInfo();
    await this.loadProducts();
    this.populateCategorySelect();
    this.renderCategories();
    this.updateStatistics();
    await this.setNewProductId();
    this.toast('✅ Admin Console Ready', 'success');
  }

  // API base (can be set by api-config.js as window.API_BASE_URL)
  getApiBase() {
    return (window && window.API_BASE_URL) ? window.API_BASE_URL.replace(/\/+$/,'') : '';
  }

  displayUserInfo() {
    const headerControls = document.querySelector('.admin-controls');
    if (headerControls) {
      const userInfo = document.createElement('span');
      userInfo.className = 'user-info';
      userInfo.innerHTML = `👤 ${this.currentUser.name} <small>(${this.currentUser.role})</small>`;
      headerControls.insertAdjacentElement('afterbegin', userInfo);
    }
  }

  async loadProducts() {
    try {
      // Check if there are synced products in localStorage (from admin edits)
      const syncedProducts = localStorage.getItem('khushi_products_admin');
      if (syncedProducts) {
        this.products = JSON.parse(syncedProducts);
        console.log('✅ Loaded products from admin localStorage (synced data)');
      } else {
        // Fallback to products.json if no admin sync
        const response = await fetch('../products.json');
        if (!response.ok) throw new Error('Failed to load products');
        this.products = await response.json();
        console.log('✅ Loaded products from products.json');
      }
      
      this.loadCategories();
      this.addCategoriesFromProducts();
      this.renderProductsTable();
      this.toast('✅ Products loaded successfully', 'success');
    } catch (error) {
      this.toast(`❌ Error loading products: ${error.message}`, 'error');
      console.error(error);
    }
  }

  // Load categories from localStorage or initialize from products
  loadCategories() {
    const savedCategories = localStorage.getItem('khushi_admin_categories');
    if (savedCategories) {
      try {
        this.categories = JSON.parse(savedCategories);
      } catch (e) {
        this.categories = [];
      }
    } else {
      // First time: initialize from products
      this.categories = [...new Set(this.products.map(p => p.category))].sort();
    }
    this.populateCategorySelect();
  }

  // Add only NEW categories from products (don't remove existing ones)
  addCategoriesFromProducts() {
    const productCategories = [...new Set(this.products.map(p => p.category))];
    productCategories.forEach(cat => {
      if (!this.categories.includes(cat)) {
        this.categories.push(cat);
      }
    });
    this.categories.sort();
    this.saveCategoryChanges();
  }

  // Extract categories (legacy method - now only adds new ones)
  extractCategories() {
    this.addCategoriesFromProducts();
  }

  // Save categories to localStorage
  saveCategoryChanges() {
    localStorage.setItem('khushi_admin_categories', JSON.stringify(this.categories));
    this.populateCategorySelect();
    this.renderCategories();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => this.switchTab(e));
    });
    // Product form
    const productForm = document.getElementById('product-form');
    if (productForm) productForm.addEventListener('submit', (e) => this.handleAddProduct(e));

    // Edit form
    const editForm = document.getElementById('edit-product-form');
    if (editForm) editForm.addEventListener('submit', (e) => this.handleEditProduct(e));

    // Filter and search
    const searchProducts = document.getElementById('search-products');
    if (searchProducts) searchProducts.addEventListener('input', () => this.renderProductsTable());
    const filterCategory = document.getElementById('filter-category');
    if (filterCategory) filterCategory.addEventListener('change', () => this.renderProductsTable());
    const filterSort = document.getElementById('filter-sort');
    if (filterSort) filterSort.addEventListener('change', () => this.renderProductsTable());

    // Actions
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) syncBtn.addEventListener('click', () => this.syncToFile());
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportJSON());
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

    // Categories
    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => this.addCategory());
    const newCategory = document.getElementById('new-category');
    if (newCategory) newCategory.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addCategory();
    });

    // Settings
    const exportJsonBtn = document.getElementById('export-json-btn');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => this.exportJSON());
    const importJsonBtn = document.getElementById('import-json-btn');
    if (importJsonBtn) importJsonBtn.addEventListener('click', () => {
      const importFile = document.getElementById('import-json-file');
      if (importFile) importFile.click();
    });
    const importJsonFile = document.getElementById('import-json-file');
    if (importJsonFile) importJsonFile.addEventListener('change', (e) => this.handleImportJSON(e));
    
    const exportExcelBtn = document.getElementById('export-excel-btn');
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.exportExcel());
    const importExcelBtn = document.getElementById('import-excel-btn');
    if (importExcelBtn) importExcelBtn.addEventListener('click', () => {
      const importFile = document.getElementById('import-excel-file');
      if (importFile) importFile.click();
    });
    const importExcelFile = document.getElementById('import-excel-file');
    if (importExcelFile) importExcelFile.addEventListener('change', (e) => this.handleImportExcel(e));
    
    const backupBtn = document.getElementById('backup-btn');
    if (backupBtn) backupBtn.addEventListener('click', () => this.backupProducts());
    const restoreBtn = document.getElementById('restore-btn');
    if (restoreBtn) restoreBtn.addEventListener('click', () => {
      const restoreFile = document.getElementById('restore-file');
      if (restoreFile) restoreFile.click();
    });
    const restoreFile = document.getElementById('restore-file');
    if (restoreFile) restoreFile.addEventListener('change', (e) => this.handleRestore(e));
    const deleteAllBtn = document.getElementById('delete-all-btn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', () => this.confirmDeleteAll());

    // Pagination
    const prevPageBtn = document.getElementById('prev-page-btn');
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => this.prevPage());
    const nextPageBtn = document.getElementById('next-page-btn');
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => this.nextPage());

    // Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.target.dataset.modal;
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
      });
    });
    const confirmYes = document.getElementById('confirm-yes');
    if (confirmYes) confirmYes.addEventListener('click', () => this.executeConfirmedAction());
    const confirmNo = document.getElementById('confirm-no');
    if (confirmNo) confirmNo.addEventListener('click', () => this.closeConfirmModal());
  }

  async setNewProductId() {
    // Get all product IDs from both admin and backend (products.json)
    let allIds = this.products.map(p => p.id);
    try {
      const response = await fetch('../products.json');
      if (response.ok) {
        const backendProducts = await response.json();
        allIds = allIds.concat(backendProducts.map(p => p.id));
      }
    } catch (e) { /* ignore fetch errors */ }
    // Find the highest number used
    let maxNum = 0;
    allIds.forEach(id => {
      const match = id.match(/^KE(\d{6})$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    const newId = 'KE' + nextNum.toString().padStart(6, '0');
    const idInput = document.getElementById('product-id');
    if (idInput) idInput.value = newId;
  }

  // Switch tabs
  switchTab(e) {
    e.preventDefault();
    const tabName = e.target.dataset.tab;

    // Deactivate all tabs and nav items
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    // Activate selected tab and nav item
    const tabElement = document.getElementById(tabName);
    if (tabElement) {
      tabElement.classList.add('active');
    }
    e.target.classList.add('active');
  }

  // Render products table with pagination
  renderProductsTable() {
    const searchTerm = document.getElementById('search-products').value.toLowerCase();
    const categoryFilter = document.getElementById('filter-category').value;
    const sortOption = document.getElementById('filter-sort').value;

    // Enhanced search: Check across multiple fields
    let filtered = this.products.filter(p => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(searchLower);
      const descMatch = p.description.toLowerCase().includes(searchLower);
      const idMatch = p.id.toLowerCase().includes(searchLower);
      const categoryMatch = p.category.toLowerCase().includes(searchLower);
      const priceMatch = searchLower && p.price.toString().includes(searchLower);
      
      const matchesSearch = !searchTerm || nameMatch || descMatch || idMatch || categoryMatch || priceMatch;
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });

    // Sort
    switch(sortOption) {
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      default:
        // Default sort: by product ID in ascending order
        filtered.sort((a, b) => a.id.localeCompare(b.id));
        break;
    }

    // Store filtered products for pagination
    this.filteredProducts = filtered;
    this.currentPage = 1; // Reset to first page when filters change
    
    // Render the current page
    this.renderCurrentPage();
  }

  // Render current page of products
  renderCurrentPage() {
    const table = document.getElementById('products-list');
    
    // Calculate pagination
    const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
    const startIdx = (this.currentPage - 1) * this.itemsPerPage;
    const endIdx = Math.min(startIdx + this.itemsPerPage, this.filteredProducts.length);
    const pageProducts = this.filteredProducts.slice(startIdx, endIdx);

    // Render table header
    table.innerHTML = `
      <div class="table-header">
        <div>ID</div>
        <div>Product Name</div>
        <div>Category</div>
        <div>Price</div>
        <div>Description</div>
        <div>Image</div>
        <div>Actions</div>
      </div>
    `;

    if (this.filteredProducts.length === 0) {
      table.innerHTML += '<div class="table-row empty">No products found</div>';
      this.updatePaginationControls(0, 0);
      return;
    }

    // Render products for current page
    pageProducts.forEach(product => {
      const desc = product.description.substring(0, 50) + '...';
      const imageUrl = ImageService.getImageUrl(product.imageUrl);
      const imgSrc = ImageService.isLocalStorageImage(product.imageUrl) ? imageUrl : '../' + product.imageUrl;
      
      table.innerHTML += `
        <div class="table-row">
          <div class="product-id">${product.id}</div>
          <div>${product.name}</div>
          <div>${product.category}</div>
          <div>₹${product.price.toLocaleString('en-IN')}</div>
          <div title="${product.description}">${desc}</div>
          <div><img src="${imgSrc}" alt="${product.name}" class="product-image-thumb"></div>
          <div class="product-actions">
            <button class="action-btn view" onclick="adminManager.openDetailsModal('${product.id}')">View</button>
            <button class="action-btn edit" onclick="adminManager.openEditModal('${product.id}')">Edit</button>
            <button class="action-btn delete" onclick="adminManager.deleteProduct('${product.id}')">Delete</button>
          </div>
        </div>
      `;
    });

    // Update pagination controls
    this.updatePaginationControls(this.currentPage, totalPages);
  }

  // Update pagination button states and page info
  updatePaginationControls(currentPage, totalPages) {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');

    if (pageInfo) {
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = currentPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = currentPage >= totalPages;
    }
  }

  // Navigate to previous page
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderCurrentPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Navigate to next page
  nextPage() {
    const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderCurrentPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Open details modal to view full product info
  openDetailsModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const imageUrl = ImageService.getImageUrl(product.imageUrl);
    const imgSrc = ImageService.isLocalStorageImage(product.imageUrl) ? imageUrl : '../' + product.imageUrl;

    const detailsContent = document.getElementById('product-details-content');
    detailsContent.innerHTML = `
      <div class="detail-row">
        <label>Product ID:</label>
        <p>${product.id}</p>
      </div>
      <div class="detail-row">
        <label>Product Name:</label>
        <p>${product.name}</p>
      </div>
      <div class="detail-row">
        <label>Category:</label>
        <p>${product.category}</p>
      </div>
      <div class="detail-row">
        <label>Price:</label>
        <p>₹${product.price.toLocaleString('en-IN')}</p>
      </div>
      <div class="detail-row">
        <label>Description:</label>
        <p>${product.description}</p>
      </div>
      <div class="detail-row">
        <label>Image:</label>
        <img src="${imgSrc}" alt="${product.name}" class="detail-image">
      </div>
    `;

    // Store the product ID for the edit button
    document.getElementById('details-edit-btn').onclick = () => {
      document.getElementById('details-modal').classList.remove('show');
      this.openEditModal(productId);
    };

    document.getElementById('details-modal').classList.add('show');
  }

  // Handle add product
  handleAddProduct(e) {
    e.preventDefault();

    const fileInput = document.getElementById('product-image');
    const file = fileInput.files[0];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!file || !allowedTypes.includes(file.type)) {
      this.toast('❌ Please upload a valid image (PNG, JPG, JPEG) or PDF.', 'error');
      return;
    }

    const product = {
      id: document.getElementById('product-id').value,
      name: document.getElementById('product-name').value,
      category: document.getElementById('product-category').value,
      price: parseFloat(document.getElementById('product-price').value),
      imageUrl: '', // will be set after upload
      description: document.getElementById('product-description').value
    };

    // Product ID is always unique and auto-generated, so no need to check for duplicates

    // Save file to images/uploads (client-side only: use base64 as fallback)
    const reader = new FileReader();
    reader.onload = (event) => {
      // Save as base64 string (simulate upload)
      const ext = file.name.split('.').pop().toLowerCase();
      const fileName = `${product.id}_${Date.now()}.${ext}`;
      const filePath = `images/uploads/${fileName}`;
      try {
        // Save base64 to localStorage (simulate file system)
        localStorage.setItem(filePath, event.target.result);
        product.imageUrl = filePath;
        // Add product to list
        this.products.push(product);
        this.extractCategories();
        this.renderProductsTable();
        this.updateStatistics();
        this.syncToFile(); // Auto-sync after adding
        e.target.reset();
        this.setNewProductId(); // Set next unique ID
        this.toast('✅ Product added successfully', 'success');
      } catch (err) {
        this.toast('❌ Failed to save image/pdf.', 'error');
      }
    };
    reader.readAsDataURL(file);
  }

  // Open edit modal
  openEditModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('edit-product-id-hidden').value = product.id;
    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-product-category').value = product.category;
    document.getElementById('edit-product-price').value = product.price;
    document.getElementById('edit-product-image').value = product.imageUrl;
    document.getElementById('edit-product-description').value = product.description;

    document.getElementById('edit-modal').classList.add('show');
  }

  // Handle edit product
  handleEditProduct(e) {
    e.preventDefault();

    const productId = document.getElementById('edit-product-id-hidden').value;
    const product = this.products.find(p => p.id === productId);

    if (product) {
      const oldImageUrl = product.imageUrl;
      const newImageUrl = document.getElementById('edit-product-image').value;
      
      // Update product properties
      product.name = document.getElementById('edit-product-name').value;
      product.category = document.getElementById('edit-product-category').value;
      product.price = parseFloat(document.getElementById('edit-product-price').value);
      product.imageUrl = newImageUrl;
      product.description = document.getElementById('edit-product-description').value;

      // Clean up old image from localStorage if it was replaced with a different image
      if (oldImageUrl && oldImageUrl.includes('images/uploads/') && oldImageUrl !== newImageUrl) {
        try {
          localStorage.removeItem(oldImageUrl);
          console.log(`🗑️ Removed old image from localStorage: ${oldImageUrl}`);
        } catch (e) {
          console.warn('Could not remove old image:', e);
        }
      }

      this.extractCategories();
      this.renderProductsTable();
      this.updateStatistics();
      document.getElementById('edit-modal').classList.remove('show');
      this.syncToFile(); // Auto-sync after editing
      this.toast('✅ Product updated successfully', 'success');
    }
  }

  // Delete product
  deleteProduct(productId) {
    if (!AdminSession.canDeleteProduct()) {
      this.toast('❌ You do not have permission to delete products', 'error');
      return;
    }

    if (confirm(`Are you sure you want to delete this product?`)) {
      // Find the product to get its image info
      const productToDelete = this.products.find(p => p.id === productId);
      
      // Remove the product from the array
      this.products = this.products.filter(p => p.id !== productId);
      
      // Remove associated image data from localStorage if it's an uploaded image
      if (productToDelete && productToDelete.imageUrl && productToDelete.imageUrl.includes('images/uploads/')) {
        try {
          localStorage.removeItem(productToDelete.imageUrl);
          console.log(`🗑️ Removed image data from localStorage: ${productToDelete.imageUrl}`);
        } catch (e) {
          console.warn('Could not remove image from localStorage:', e);
        }
      }
      
      this.extractCategories();
      this.renderProductsTable();
      this.updateStatistics();
      this.syncToFile(); // Auto-sync after deleting
      this.toast('✅ Product deleted successfully (image data removed)', 'success');
    }
  }

  // Confirm delete all products
  confirmDeleteAll() {
    if (!AdminSession.canDeleteProduct()) {
      this.toast('❌ You do not have permission to delete products', 'error');
      return;
    }

    if (confirm('⚠️ WARNING: This will delete ALL products and remove all associated image data. Are you absolutely sure?')) {
      this.deleteAllProducts();
    }
  }

  // Delete all products and clean up image data
  deleteAllProducts() {
    // Remove all uploaded images from localStorage
    let removedImageCount = 0;
    this.products.forEach(product => {
      if (product.imageUrl && product.imageUrl.includes('images/uploads/')) {
        try {
          localStorage.removeItem(product.imageUrl);
          removedImageCount++;
        } catch (e) {
          console.warn('Could not remove image:', product.imageUrl);
        }
      }
    });

    // Clear all products
    this.products = [];
    this.categories = [];
    
    this.extractCategories();
    this.renderProductsTable();
    this.updateStatistics();
    this.syncToFile();
    
    this.toast(`✅ All products deleted (${removedImageCount} images removed)`, 'success');
    console.log(`🗑️ Deleted all products and cleaned up ${removedImageCount} image files`);
  }

  // Populate category select
  populateCategorySelect() {
    const selects = [
      document.getElementById('product-category'),
      document.getElementById('filter-category'),
      document.getElementById('edit-product-category')
    ];

    selects.forEach(select => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">Select Category</option>';
      this.categories.forEach(cat => {
        select.innerHTML += `<option value="${cat}">${cat}</option>`;
      });
      select.value = currentValue;
    });
  }

  // Add category
  addCategory() {
    const input = document.getElementById('new-category');
    const newCategory = input.value.trim();

    if (!newCategory) {
      this.toast('⚠️ Please enter a category name', 'info');
      return;
    }

    if (this.categories.includes(newCategory)) {
      this.toast('⚠️ Category already exists', 'info');
      return;
    }

    this.categories.push(newCategory);
    this.categories.sort();
    input.value = '';
    this.saveCategoryChanges();
    this.toast('✅ Category added successfully', 'success');
  }

  // Render categories list
  renderCategories() {
    const container = document.getElementById('categories-list');
    container.innerHTML = '';

    this.categories.forEach(cat => {
      const count = this.products.filter(p => p.category === cat).length;
      container.innerHTML += `
        <div class="category-card">
          <div>
            <div class="category-card-name">${cat}</div>
            <small>${count} product${count !== 1 ? 's' : ''}</small>
          </div>
          <button class="category-delete-btn" onclick="adminManager.deleteCategory('${cat}')">Delete</button>
        </div>
      `;
    });
  }

  // Delete category
  deleteCategory(category) {
    const count = this.products.filter(p => p.category === category).length;
    if (count > 0) {
      this.toast(`⚠️ Cannot delete category with ${count} products`, 'info');
      return;
    }

    this.categories = this.categories.filter(c => c !== category);
    this.saveCategoryChanges();
    this.toast('✅ Category deleted successfully', 'success');
  }

  // Update statistics
  updateStatistics() {
    const totalProducts = this.products.length;
    const totalCategories = this.categories.length;
    const avgPrice = totalProducts > 0 
      ? this.products.reduce((sum, p) => sum + p.price, 0) / totalProducts
      : 0;
    const prices = this.products.map(p => p.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    document.getElementById('stat-total-products').textContent = totalProducts;
    document.getElementById('stat-total-categories').textContent = totalCategories;
    document.getElementById('stat-avg-price').textContent = `₹${avgPrice.toFixed(0).toLocaleString('en-IN')}`;
    document.getElementById('stat-price-range').textContent = `₹${minPrice.toLocaleString('en-IN')}-₹${maxPrice.toLocaleString('en-IN')}`;

    // Category breakdown
    const breakdown = document.getElementById('category-breakdown');
    breakdown.innerHTML = '';
    this.categories.forEach(cat => {
      const count = this.products.filter(p => p.category === cat).length;
      breakdown.innerHTML += `
        <div class="category-item">
          <span class="category-name">${cat}</span>
          <span class="category-count">${count}</span>
        </div>
      `;
    });
  }

  // Export JSON
  exportJSON() {
    const dataStr = JSON.stringify(this.products, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.toast('✅ Products exported successfully', 'success');
  }

  // Handle import JSON
  handleImportJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!Array.isArray(imported)) throw new Error('Invalid format');

        let updatedCount = 0;
        let addedCount = 0;

        // Process each imported product
        imported.forEach(importedProduct => {
          // Check if product with this ID already exists
          const existingIndex = this.products.findIndex(p => p.id === importedProduct.id);
          
          if (existingIndex !== -1) {
            // Product exists - update all fields
            this.products[existingIndex] = {
              id: importedProduct.id,
              name: importedProduct.name,
              category: importedProduct.category,
              price: importedProduct.price,
              description: importedProduct.description,
              imageUrl: importedProduct.imageUrl
            };
            updatedCount++;
          } else {
            // New product - add it
            this.products.push(importedProduct);
            addedCount++;
          }
        });

        this.extractCategories();
        this.renderProductsTable();
        this.updateStatistics();
        this.syncToFile();
        
        const message = updatedCount > 0 && addedCount > 0 
          ? `✅ Imported: ${addedCount} new, ${updatedCount} updated`
          : updatedCount > 0 
          ? `✅ Updated ${updatedCount} products`
          : `✅ Added ${addedCount} products`;
        
        this.toast(message, 'success');
      } catch (error) {
        this.toast(`❌ Import failed: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  // Export products as Excel (CSV format)
  exportExcel() {
    if (this.products.length === 0) {
      this.toast('⚠️ No products to export', 'info');
      return;
    }

    // Create CSV header
    const headers = ['ID', 'Name', 'Category', 'Price', 'Description', 'Image URL'];
    const csvContent = [
      headers.join(','),
      ...this.products.map(p => 
        [
          `"${p.id}"`,
          `"${p.name.replace(/"/g, '""')}"`,
          `"${p.category}"`,
          p.price,
          `"${p.description.replace(/"/g, '""')}"`,
          `"${p.imageUrl}"`
        ].join(',')
      )
    ].join('\n');

    // Download CSV as Excel-compatible file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    this.toast('✅ Products exported as Excel successfully', 'success');
  }

  // Handle import Excel (CSV format)
  handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n');
        
        if (lines.length < 2) throw new Error('Invalid Excel format');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const importedProducts = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Parse CSV line (handle quoted values)
          const values = [];
          let current = '';
          let inQuotes = false;
          for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') {
              inQuotes = !inQuotes;
            } else if (line[j] === ',' && !inQuotes) {
              values.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += line[j];
            }
          }
          values.push(current.trim().replace(/^"|"$/g, ''));

          // Map CSV columns to product object
          const product = {
            id: values[0] || '',
            name: values[1] || '',
            category: values[2] || '',
            price: parseFloat(values[3]) || 0,
            description: values[4] || '',
            imageUrl: values[5] || ''
          };

          // Validate required fields
          if (!product.id || !product.name || !product.category) {
            throw new Error(`Row ${i + 1}: Missing required fields (ID, Name, Category)`);
          }

          importedProducts.push(product);
        }

        if (importedProducts.length === 0) throw new Error('No valid products found');

        // Process each imported product with duplicate ID detection
        let updatedCount = 0;
        let addedCount = 0;

        importedProducts.forEach(importedProduct => {
          // Check if product with this ID already exists
          const existingIndex = this.products.findIndex(p => p.id === importedProduct.id);
          
          if (existingIndex !== -1) {
            // Product exists - update all fields
            this.products[existingIndex] = {
              id: importedProduct.id,
              name: importedProduct.name,
              category: importedProduct.category,
              price: importedProduct.price,
              description: importedProduct.description,
              imageUrl: importedProduct.imageUrl
            };
            updatedCount++;
          } else {
            // New product - add it
            this.products.push(importedProduct);
            addedCount++;
          }
        });

        this.extractCategories();
        this.renderProductsTable();
        this.updateStatistics();
        this.syncToFile();
        
        const message = updatedCount > 0 && addedCount > 0 
          ? `✅ Imported: ${addedCount} new, ${updatedCount} updated`
          : updatedCount > 0 
          ? `✅ Updated ${updatedCount} products`
          : `✅ Added ${addedCount} products`;
        
        this.toast(message, 'success');
      } catch (error) {
        this.toast(`❌ Import failed: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  // Backup products
  backupProducts() {
    localStorage.setItem('khushi_backup', JSON.stringify(this.products));
    this.toast('✅ Backup created successfully', 'success');
  }

  // Handle restore
  handleRestore(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const restored = JSON.parse(event.target.result);
        if (!Array.isArray(restored)) throw new Error('Invalid format');

        this.products = restored;
        this.extractCategories();
        this.renderProductsTable();
        this.updateStatistics();
        this.toast('✅ Products restored successfully', 'success');
      } catch (error) {
        this.toast(`❌ Restore failed: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  // Sync to file (localStorage and localStorage for main site)
  syncToFile() {
    // Save to admin localStorage (used when admin reloads)
    localStorage.setItem('khushi_products_admin', JSON.stringify(this.products));
    
    // Also save to the key that main website checks (for website auto-sync)
    localStorage.setItem('khushi_products_sync', JSON.stringify(this.products));
    localStorage.setItem('khushi_last_sync', new Date().toISOString());
    
    // Try to persist to server API if available (optional server persistence)
    (async () => {
      try {
        const apiUrl = this.getApiBase() + '/api/products';
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.products)
        });

        if (resp.ok) {
          this.toast('✅ Products synced to server and localStorage', 'success');
          console.log('✅ Products synced to server:', this.products.length, 'items');
          return;
        }
        // If server responds with error, fall back to localStorage-only behavior
        console.warn('Server sync failed:', resp.statusText || resp.status);
      } catch (err) {
        // Network error or no server running - ignore and fall back
        console.log('No server available for persistence, using localStorage fallback.');
      }

      // Notify user about local sync fallback
      this.toast('✅ Products synced to localStorage (server unavailable)', 'info');
      console.log('📍 Local sync timestamp:', new Date().toLocaleString());
    })();
  }

  // Toast notifications
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    // Check if a toast with the same message already exists
    const existingToasts = Array.from(container.querySelectorAll('.toast'));
    const isDuplicate = existingToasts.some(t => t.textContent === message && !t.classList.contains('removing'));
    
    if (isDuplicate) {
      return; // Don't show duplicate toasts
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Show confirm modal
  showConfirmModal(title, message, onConfirm) {
    this.pendingAction = onConfirm;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').classList.add('show');
  }

  // Execute confirmed action
  executeConfirmedAction() {
    if (this.pendingAction) {
      this.pendingAction();
      this.pendingAction = null;
    }
    this.closeConfirmModal();
  }

  // Close confirm modal
  closeConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('show');
  }

  // Logout
  logout() {
    if (confirm('Are you sure you want to logout?')) {
      AdminSession.logout();
    }
  }
}

// ============================================
// Initialize Admin Manager
// ============================================

let adminManager;
document.addEventListener('DOMContentLoaded', async () => {
  adminManager = new AdminManager();
  if (typeof adminManager.init === 'function') {
    await adminManager.init();
  }
  console.log('✅ Admin Console Loaded');
});
