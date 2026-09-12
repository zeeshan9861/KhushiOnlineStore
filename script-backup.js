/**
 * Khushi Online Store - Modern ES6+ JavaScript
 * Updated to ECMAScript 2020+ standards
 * Features: Arrow functions, destructuring, async/await, classes
 */

// ============================================
// 1. PRODUCT MANAGEMENT (Class-based)
// ============================================

class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.currentPage = 1;
    this.currentCategory = 'all';
    this.currentSearchTerm = '';
    this.currentSortOption = 'default';
    this.productsPerPage = 12;
  }

  // Truncate description to max words
  truncateDescription = (text, maxWords = 50) => {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    return words.length > maxWords 
      ? `${words.slice(0, maxWords).join(' ')}...` 
      : text;
  }

  // Load products from JSON
  async loadProducts() {
    try {
        const response = await fetch('products.json'); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        products = await response.json(); // Parses the JSON data
        filteredProducts = products;
        
        // After loading, render products, defaulting to "all"
        // Also ensure the "All" category link is marked active.
        const allLink = document.querySelector('[data-category="all"]');
        if (allLink) {
            allLink.classList.add('active-category');
        }
        renderProducts("all"); 
        
    } catch (error) {
        console.error("Could not load product data:", error);
        // Improve the in-page error so the developer/user knows why fetch failed
        const productSection = document.getElementById('product-list');
        if (productSection) {
            productSection.innerHTML = '<h2>Error loading products</h2>' +
                '<p>Please ensure "products.json" exists and that you are serving the site over HTTP (do not open <code>index.html</code> directly via <code>file://</code>).</p>' +
                '<p><strong>Recommended (VS Code):</strong> Install the <em>Live Server</em> extension, open this folder in VS Code, then click <em>Go Live</em> (status bar) or right-click <code>index.html</code> → <em>Open with Live Server</em>. The site will open at <code>http://127.0.0.1:5500</code> (or another port shown by Live Server).</p>' +
                '<p>Quick alternative (PowerShell): <code>Set-Location "e:\\Khushi Online Store"; python -m http.server 8000</code></p>' +
                '<p style="color:#666;margin-top:8px;">Error details: ' + (error && error.message ? error.message : String(error)) + '</p>';
        }
    }
  }
}

// --- 2. SEARCH & FILTER FUNCTIONALITY ---
function filterAndSortProducts() {
    // Start with all products
    let results = products;

    // Step 1: Filter by category
    if (currentCategory !== "all") {
        results = results.filter(p => p.category === currentCategory);
    }

    // Step 2: Filter by search term
    if (currentSearchTerm.trim() !== "") {
        const searchLower = currentSearchTerm.toLowerCase();
        results = results.filter(p => 
            p.name.toLowerCase().includes(searchLower) || 
            p.description.toLowerCase().includes(searchLower)
        );
    }

    // Step 3: Sort products
    switch(currentSortOption) {
        case "price-low":
            results.sort((a, b) => a.price - b.price);
            break;
        case "price-high":
            results.sort((a, b) => b.price - a.price);
            break;
        case "name-asc":
            results.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case "name-desc":
            results.sort((a, b) => b.name.localeCompare(a.name));
            break;
        default:
            // Keep default order
            break;
    }

    filteredProducts = results;
    currentPage = 1; // Reset to first page
    updateProductCount();
    renderProductsPage();
}

// Function to update product count display
function updateProductCount() {
    const countElement = document.getElementById('product-count');
    const count = filteredProducts.length;
    if (countElement) {
        countElement.textContent = `${count} product${count !== 1 ? 's' : ''}`;
    } else {
        console.warn('updateProductCount: #product-count not found in DOM');
    }
}

// --- 3. PAGINATION FUNCTIONALITY ---
function renderProductsPage() {
    // Render into the grid container so we don't remove the section wrapper
    const productList = document.getElementById('products-grid');
    if (!productList) {
        console.warn('renderProductsPage: #products-grid not found');
        return;
    }
    productList.innerHTML = ''; // Clear existing products

    if (filteredProducts.length === 0) {
        productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No products found. Try adjusting your search or filters.</p>';
        updatePaginationControls();
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const productsToDisplay = filteredProducts.slice(startIndex, endIndex);

    // Render products for current page
    productsToDisplay.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const truncatedDesc = truncateDescription(product.description);
        card.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p class="product-description">${truncatedDesc}</p>
            <p class="price">₹${product.price.toLocaleString('en-IN')}</p>
            <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
        `;
        productList.appendChild(card);
    });

    // Add event listeners for the 'Add to Cart' buttons after rendering
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', addToCart);
    });

    // Update pagination controls
    updatePaginationControls();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    const pageInfoElement = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (!pageInfoElement || !prevBtn || !nextBtn) {
        console.warn('updatePaginationControls: pagination elements missing', { pageInfoElement, prevBtn, nextBtn });
        return;
    }

    pageInfoElement.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// --- LEGACY: Keep renderProducts for backward compatibility ---
function renderProducts(filterCategory = null) {
    currentCategory = filterCategory || "all";
    currentSearchTerm = "";
    currentSortOption = "default";
    filterAndSortProducts();
}

// --- 2. CART MANAGEMENT ---
let cart = [];

// Local Storage key for cart persistence
const CART_STORAGE_KEY = 'khushi_cart_v1';

// Load cart from localStorage if present
function loadCartFromStorage() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Ensure parsed is an array and has required fields
            if (Array.isArray(parsed)) {
                cart = parsed.map(item => ({
                    id: String(item.id),
                    name: item.name,
                    price: Number(item.price),
                    imageUrl: item.imageUrl,
                    quantity: Number(item.quantity) || 1
                }));
            }
        }
    } catch (e) {
        console.warn('Could not parse cart from localStorage', e);
        cart = [];
    }
}

// Save cart to localStorage (only required fields)
function saveCartToStorage() {
    try {
        const payload = cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            imageUrl: item.imageUrl,
            quantity: item.quantity
        }));
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
        console.warn('Could not save cart to localStorage', e);
    }
}


function addToCart(event) {
    const productId = event.target.dataset.id;
    const product = products.find(p => p.id === productId);

    // CRITICAL CHECK: Ensure product was found before adding
    if (!product) {
        alert("Error: Product details not found. Please check products.json.");
        return;
    }

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, quantity: 1 });
    }

    updateCartDisplay();
    saveCartToStorage();
    alert(`${product.name} added to cart!`);
}


// NEW FUNCTION: Handle quantity change from input field
function updateQuantity(productId, newQuantity) {
    const item = cart.find(i => i.id === productId);

    if (item) {
        const quantity = parseInt(newQuantity);
        if (quantity > 0) {
            item.quantity = quantity;
        } else {
            // If quantity is 0, remove the item
            removeItem(productId);
            return;
        }
    }
    updateCartDisplay(); // Re-render the cart to show changes
    saveCartToStorage();
}

// NEW FUNCTION: Handle item removal
function removeItem(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay(); // Re-render the cart to show changes
    saveCartToStorage();
}


function updateCartDisplay() {
    const cartItemsList = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const cartCountElement = document.getElementById('cart-count');
    let total = 0;

    if (!cartItemsList) {
        console.warn('updateCartDisplay: #cart-items not found in DOM');
    } else {
        cartItemsList.innerHTML = ''; // Clear list
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        // Use a <div> with grid classes for alignment
        const cartItemDiv = document.createElement('div');
        cartItemDiv.className = 'cart-item';
        
        // Build the item structure with controls (matching the CSS grid layout)
        cartItemDiv.innerHTML = `
            <span class="item-name">${item.name}</span>
            <span>
                <input type="number" 
                       value="${item.quantity}" 
                       min="0" 
                       class="quantity-input" 
                       data-id="${item.id}">
            </span>
            <span>₹${itemTotal.toLocaleString('en-IN')}</span>
            <span>
                <button class="remove-btn" data-id="${item.id}">&times;</button>
            </span>
        `;
        
        cartItemsList.appendChild(cartItemDiv);
    });

    if (cartTotalElement) {
        cartTotalElement.textContent = `Total: ₹${total.toLocaleString('en-IN')}`;
    } else {
        console.warn('updateCartDisplay: #cart-total not found in DOM');
    }

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountElement) {
        cartCountElement.textContent = totalCount;
    } else {
        console.warn('updateCartDisplay: #cart-count not found in DOM');
    }

    // Update floating action button badge if present
    const fabCount = document.getElementById('fab-count');
    if (fabCount) {
        fabCount.textContent = totalCount;
    }

    // CRITICAL: Attach event listeners AFTER the cart is rendered
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', (event) => {
            const productId = event.target.dataset.id;
            const newQuantity = event.target.value;
            updateQuantity(productId, newQuantity);
        });
    });

    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const productId = event.target.dataset.id;
            removeItem(productId);
        });
    });
}

// --- 3. WHATSAPP INTEGRATION & VALIDATION ---

function generateWhatsAppMessage() {
    // 1. Get Customer Details from the form
    const customerName = document.getElementById('cust-name').value;
    const customerWhatsapp = document.getElementById('cust-whatsapp') ? document.getElementById('cust-whatsapp').value : '';
    const customerAddress = document.getElementById('cust-address').value;
    
    if (cart.length === 0) {
        return "Hello! I would like to inquire about a product.";
    }
    
    // Start Message with Customer Details
    let message = `*Khushi Online Stores Order Request*\n\n`;
    message += `*CUSTOMER DETAILS*\n`;
    message += `Name: ${customerName}\n`;
    message += `WhatsApp: ${customerWhatsapp}\n`;
    message += `Address: ${customerAddress}\n`;
    message += `-----------------------------\n`;
    
    let total = 0;

    // Add Cart Items
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
    // Add each item on its own line
    message += `${index + 1}. ${item.name} (x${item.quantity}) - ₹${itemTotal.toLocaleString('en-IN')}\n`;
    });

    message += `\n*Grand Total: ₹${total.toLocaleString('en-IN')}*\n\n`;
    message += "Please confirm the availability and total cost including shipping. Thank you!";
    
    // URL-encode the entire message
    return encodeURIComponent(message);
}

function redirectToWhatsApp() {
    const nameInput = document.getElementById('cust-name');
    const addressInput = document.getElementById('cust-address');
    const whatsappInput = document.getElementById('cust-whatsapp');

    // Simple Validation Check
    let hasError = false;
    if (!nameInput || !nameInput.value.trim()) {
        if (nameInput) nameInput.style.borderColor = 'red';
        hasError = true;
    } else {
        if (nameInput) nameInput.style.borderColor = '#ced4da';
    }
    if (!whatsappInput || !whatsappInput.value.trim()) {
        if (whatsappInput) whatsappInput.style.borderColor = 'red';
        hasError = true;
    } else {
        if (whatsappInput) whatsappInput.style.borderColor = '#ced4da';
    }
    if (!addressInput || !addressInput.value.trim()) {
        if (addressInput) addressInput.style.borderColor = 'red';
        hasError = true;
    } else {
        if (addressInput) addressInput.style.borderColor = '#ced4da';
    }
    if (hasError) {
        alert("Please enter your Name, WhatsApp Number, and Delivery Address to place the order.");
        return; // Stop the function if validation fails
    }
    
    // Proceed to generate and open the WhatsApp link
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${businessPhoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    // Optionally clear cart after sending order so next session starts empty
    cart = [];
    saveCartToStorage();
    updateCartDisplay();
    // Close modal if open
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) cartModal.style.display = 'none';
}

// --- 4. INITIALIZATION AND EVENT LISTENERS (Updated for All Category) ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load persisted cart (if any) so counts show immediately
    loadCartFromStorage();
    updateCartDisplay();

    // 2. Load products and default to "All" category view
    loadProducts(); 

    // 2. Cart Modal Handlers
    const cartModal = document.getElementById('cart-modal');
    const viewCartBtn = document.getElementById('view-cart-btn');
    const closeBtn = document.querySelector('.close-btn');

    viewCartBtn.addEventListener('click', () => {
        updateCartDisplay(); 
        cartModal.style.display = 'block';
    });

    // Floating cart FAB opens the cart modal as well
    const fabCart = document.getElementById('fab-cart');
    if (fabCart) {
        fabCart.addEventListener('click', () => {
            updateCartDisplay();
            cartModal.style.display = 'block';
            // On mobile, bring modal into view
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    closeBtn.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });

    // 3. WhatsApp Button Handler
    document.getElementById('whatsapp-share-btn').addEventListener('click', redirectToWhatsApp);

    // 4. Category Filter Handlers (Updated to manage active class)
    document.querySelectorAll('#categories a').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const category = event.target.dataset.category;
            
            // Remove 'active-category' from all links
            document.querySelectorAll('#categories a').forEach(a => {
                a.classList.remove('active-category');
            });
            
            // Add 'active-category' to the clicked link
            event.target.classList.add('active-category');
            
            // Update filter and re-render
            currentCategory = category;
            filterAndSortProducts();
        });
    });

    // 5. Search Input Handler
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (event) => {
        currentSearchTerm = event.target.value;
        filterAndSortProducts();
    });

    // 6. Sort Dropdown Handler
    const sortDropdown = document.getElementById('sort-dropdown');
    sortDropdown.addEventListener('change', (event) => {
        currentSortOption = event.target.value;
        filterAndSortProducts();
    });

    // 7. Pagination Handlers
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderProductsPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderProductsPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // 8. Enhanced Image Zoom Modal with Gallery Support
    const imageZoomModal = document.getElementById('image-zoom-modal');
    const zoomedImage = document.getElementById('zoomed-image');
    const imageZoomClose = document.querySelector('.image-zoom-close');
    const zoomInBtn = document.querySelector('.zoom-in');
    const zoomOutBtn = document.querySelector('.zoom-out');
    const zoomLevelSpan = document.querySelector('.zoom-level');
    const prevImageBtn = document.querySelector('.prev-image');
    const nextImageBtn = document.querySelector('.next-image');
    const imageCurrentSpan = document.getElementById('image-current');
    const imageTotalSpan = document.getElementById('image-total');
    const imageZoomContainer = document.querySelector('.image-zoom-container');

    let currentZoomLevel = 100;
    const minZoom = 50;
    const maxZoom = 300;
    const zoomStep = 25;
    let galleryImages = [];
    let currentImageIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;

    // Update zoom level display
    function updateZoomLevel() {
        zoomLevelSpan.textContent = currentZoomLevel + '%';
        const scale = currentZoomLevel / 100;
        zoomedImage.style.transform = `scale(${scale})`;
        zoomInBtn.disabled = currentZoomLevel >= maxZoom;
        zoomOutBtn.disabled = currentZoomLevel <= minZoom;
    }

    // Zoom in
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (currentZoomLevel < maxZoom) {
                currentZoomLevel = Math.min(currentZoomLevel + zoomStep, maxZoom);
                updateZoomLevel();
            }
        });
    }

    // Zoom out
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (currentZoomLevel > minZoom) {
                currentZoomLevel = Math.max(currentZoomLevel - zoomStep, minZoom);
                updateZoomLevel();
            }
        });
    }

    // Update image counter
    function updateImageCounter() {
        if (imageTotalSpan.textContent > 1) {
            imageCurrentSpan.textContent = currentImageIndex + 1;
            prevImageBtn.disabled = currentImageIndex === 0;
            nextImageBtn.disabled = currentImageIndex >= galleryImages.length - 1;
        }
    }

    // Navigate to previous image
    if (prevImageBtn) {
        prevImageBtn.addEventListener('click', () => {
            if (currentImageIndex > 0) {
                currentImageIndex--;
                zoomedImage.src = galleryImages[currentImageIndex];
                currentZoomLevel = 100;
                updateZoomLevel();
                updateImageCounter();
            }
        });
    }

    // Navigate to next image
    if (nextImageBtn) {
        nextImageBtn.addEventListener('click', () => {
            if (currentImageIndex < galleryImages.length - 1) {
                currentImageIndex++;
                zoomedImage.src = galleryImages[currentImageIndex];
                currentZoomLevel = 100;
                updateZoomLevel();
                updateImageCounter();
            }
        });
    }

    // Add click handlers to product images (delegated since images are dynamically added)
    document.addEventListener('click', (event) => {
        if (event.target.tagName === 'IMG' && event.target.closest('.product-card')) {
            // Find product and get all images for gallery
            const productCard = event.target.closest('.product-card');
            galleryImages = [event.target.src]; // Currently just one image per product
            currentImageIndex = 0;
            
            zoomedImage.src = event.target.src;
            imageTotalSpan.textContent = galleryImages.length;
            imageCurrentSpan.textContent = 1;
            imageZoomModal.classList.add('show');
            currentZoomLevel = 100;
            updateZoomLevel();
            updateImageCounter();
        }
    });

    // Close modal when close button is clicked
    if (imageZoomClose) {
        imageZoomClose.addEventListener('click', () => {
            imageZoomModal.classList.remove('show');
            currentZoomLevel = 100;
        });
    }

    // Close modal when backdrop is clicked
    if (imageZoomModal) {
        imageZoomModal.addEventListener('click', (event) => {
            if (event.target === imageZoomModal) {
                imageZoomModal.classList.remove('show');
                currentZoomLevel = 100;
            }
        });
    }

    // Keyboard navigation and controls
    document.addEventListener('keydown', (event) => {
        if (!imageZoomModal.classList.contains('show')) return;

        switch (event.key) {
            case 'Escape':
                imageZoomModal.classList.remove('show');
                currentZoomLevel = 100;
                break;
            case '+':
            case '=':
                event.preventDefault();
                if (currentZoomLevel < maxZoom) {
                    currentZoomLevel = Math.min(currentZoomLevel + zoomStep, maxZoom);
                    updateZoomLevel();
                }
                break;
            case '-':
            case '_':
                event.preventDefault();
                if (currentZoomLevel > minZoom) {
                    currentZoomLevel = Math.max(currentZoomLevel - zoomStep, minZoom);
                    updateZoomLevel();
                }
                break;
            case 'ArrowLeft':
                event.preventDefault();
                if (currentImageIndex > 0) {
                    currentImageIndex--;
                    zoomedImage.src = galleryImages[currentImageIndex];
                    currentZoomLevel = 100;
                    updateZoomLevel();
                    updateImageCounter();
                }
                break;
            case 'ArrowRight':
                event.preventDefault();
                if (currentImageIndex < galleryImages.length - 1) {
                    currentImageIndex++;
                    zoomedImage.src = galleryImages[currentImageIndex];
                    currentZoomLevel = 100;
                    updateZoomLevel();
                    updateImageCounter();
                }
                break;
        }
    });

    // Touch/Swipe support for mobile
    if (imageZoomContainer) {
        imageZoomContainer.addEventListener('touchstart', (event) => {
            touchStartX = event.changedTouches[0].clientX;
        }, false);

        imageZoomContainer.addEventListener('touchend', (event) => {
            touchEndX = event.changedTouches[0].clientX;
            handleSwipe();
        }, false);
    }

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swiped left -> show next image
                if (currentImageIndex < galleryImages.length - 1) {
                    currentImageIndex++;
                    zoomedImage.src = galleryImages[currentImageIndex];
                    currentZoomLevel = 100;
                    updateZoomLevel();
                    updateImageCounter();
                }
            } else {
                // Swiped right -> show previous image
                if (currentImageIndex > 0) {
                    currentImageIndex--;
                    zoomedImage.src = galleryImages[currentImageIndex];
                    currentZoomLevel = 100;
                    updateZoomLevel();
                    updateImageCounter();
                }
            }
        }
    }
});

