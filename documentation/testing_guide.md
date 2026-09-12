# Khushi Online Store - End-to-End Testing Guide

## Testing the Complete Flow

### Prerequisites
- Use **VS Code Live Server** or any HTTP server (NOT file:// protocol)
- Open Browser Developer Console (F12 → Console tab)
- Check that `products.json` is in the root directory

---

## Step-by-Step Testing

### 1. **Application Initialization**

**Expected:**
- Page loads without errors
- Console shows: `🚀 Initializing Khushi Online Store...`
- Console shows: `✅ App initialized successfully`
- Products load and display in grid

**If products don't show:**
- Check Console for errors
- Verify `products.json` exists and is accessible
- Ensure you're using HTTP (not file://)

---

### 2. **Product Display**

**Expected:**
- 12 products visible on page 1
- Each product card shows:
  - ✓ Product image
  - ✓ Product name
  - ✓ Description (truncated)
  - ✓ Price in ₹
  - ✓ "Add to Cart" button

**Test:**
```
Check 3-4 products are rendered correctly
Verify prices display as "₹XXX"
```

---

### 3. **Adding Product to Cart**

**Test Steps:**
1. Click **"Add to Cart"** button on any product
2. Expected behavior:
   - Alert popup: `✅ [Product Name] added to cart!`
   - Cart count updates in header (top right)
   - Cart count updates in FAB button (bottom right)
   - Console shows: `[CartManager] HH:MM:SS - ✅ Added [Product Name] to cart`

**Example Console Output:**
```
[CartManager] 14:30:45 - ✅ Added Persona Kisan to cart
[UIRenderer] Cart updated with 1 item
```

**If this fails:**
- Check Console for errors
- Verify cart-count element exists in HTML
- Check Network tab that products.json loaded correctly

---

### 4. **Multiple Products**

**Test Steps:**
1. Add 2-3 different products to cart
2. Verify:
   - Alert shows for each product
   - Cart count increases correctly (1 → 2 → 3)
   - Console logs each addition

**Expected Console:**
```
[CartManager] 14:30:45 - ✅ Added Persona Kisan to cart
[CartManager] 14:30:47 - ✅ Added Persona Agni to cart
[CartManager] 14:30:49 - ✅ Added Persona Jawan to cart
```

---

### 5. **Viewing Cart**

**Test Steps:**
1. Click **"View Cart"** button (header) OR FAB button (bottom-right)
2. Modal should open showing:
   - Product list with names, quantities, subtotals
   - Quantity controls (−/+) buttons
   - Remove (✕) buttons
   - Total amount
   - Customer details form
   - WhatsApp button

**Expected Display:**
```
┌─────────────────────────────────────┐
│       Your Shopping Cart             │
├─────────────────────────────────────┤
│ Product │ Qty │ Subtotal │ Remove   │
│─────────────────────────────────────│
│ Kisan   │ 1   │ ₹880     │ ✕        │
│ Agni    │ 1   │ ₹1180    │ ✕        │
├─────────────────────────────────────┤
│              Total: ₹2060            │
└─────────────────────────────────────┘
```

---

### 6. **Updating Quantities**

**Test Steps:**
1. In cart modal, click **+** button on any product
2. Quantity should increment (1 → 2)
3. Subtotal should update (₹880 → ₹1760)
4. Total amount should update
5. Console should log: `[CartManager] HH:MM:SS - 📝 Quantity updated`

**Test Decrement:**
1. Click **−** button
2. Quantity should decrement (2 → 1)
3. Subtotal updates accordingly

**Edge case:** Click − when quantity is 1
- Should remove item from cart instead of going to 0

---

### 7. **Removing Items**

**Test Steps:**
1. Click **✕** button on any cart item
2. Item should disappear from cart
3. Cart count should decrease
4. Total should update
5. Console logs: `[CartManager] HH:MM:SS - 🗑️ Item removed from cart`

---

### 8. **Adding Duplicate Products**

**Test Steps:**
1. Add same product twice:
   - First time: Alert shows, cart count = 1
   - Second time: Alert shows, cart count = 1 (but quantity increases)
2. Open cart: Product should show with quantity = 2
3. Subtotal should be doubled

---

### 9. **Cart Persistence**

**Test Steps:**
1. Add 2-3 products to cart
2. Refresh page (F5)
3. **Expected:** Cart items should still be there!
4. Cart count should show correct number
5. Open cart modal and verify items are present

**This proves:**
- LocalStorage is working correctly
- Cart data persists across page reloads

---

### 10. **Search & Filter**

**Test Steps:**
1. Search for product (e.g., "Persona")
2. Verify product count reduces
3. Add product from search results to cart
4. Verify it's added correctly

---

### 11. **Category Filtering**

**Test Steps:**
1. Click category button (e.g., "Kisan Torch")
2. Products list should filter
3. Add product from filtered list to cart
4. Should work normally

---

### 12. **Sorting**

**Test Steps:**
1. Use "Sort" dropdown to change sort order
2. Products should rearrange
3. Add product to cart (verify it works)

---

### 13. **Pagination**

**Test Steps:**
1. If more than 12 products, "Next" button enables
2. Click "Next" to go to page 2
3. Different products show
4. Add product from page 2 to cart
5. Should work normally
6. Click "Previous" to go back

---

### 14. **WhatsApp Checkout (Optional)**

**Test Steps:**
1. Add 1-2 products to cart
2. Click "View Cart"
3. Fill in customer details:
   - Name: Your Name
   - WhatsApp: +91XXXXXXXXXX
   - Address: Full address
4. Click "Send Order on WhatsApp"
5. Should open WhatsApp Web with pre-filled message
6. Cart should clear after sending

**If it fails:**
- Verify WhatsApp is installed (or using WhatsApp Web)
- Check that all fields are filled
- Console should show error message

---

## Console Logging Expected

When properly working, Console should show messages like:

```javascript
// Initialization
🚀 Initializing Khushi Online Store...
[ProductManager] 14:30:00 - ✅ Loaded 50 products
✅ App initialized successfully

// Adding to cart
[CartManager] 14:30:45 - ✅ Added Persona Kisan to cart
🛒 Persona Kisan added to cart

// Updating cart
[CartManager] 14:30:50 - 📝 Quantity updated
[UIRenderer] Cart updated with 2 items

// Removing from cart
[CartManager] 14:30:55 - 🗑️ Item removed from cart
```

---

## Common Issues & Solutions

### Issue: Products don't load
**Solution:**
- Open DevTools (F12) → Network tab
- Check if `products.json` shows 200 status
- If 404, verify file exists in root folder
- Make sure using HTTP (Live Server)

### Issue: Add to Cart button doesn't work
**Solution:**
- Check Console for JavaScript errors
- Verify button has `data-id` attribute
- Refresh page and try again
- Check network console for fetch errors

### Issue: Cart doesn't update visually
**Solution:**
- Check if cart-count element exists in HTML
- Check Console for errors
- Open DevTools → Elements, search for `cart-count`
- Verify its ID exactly matches

### Issue: Cart empties after refresh
**Solution:**
- This is NORMAL if using incognito mode
- Try normal browsing mode
- Check LocalStorage: DevTools → Storage → LocalStorage
- Should see `khushi_cart_v1` key

### Issue: Quantities not updating
**Solution:**
- Click in modal to focus it
- Verify −/+ buttons have click handlers
- Check Console for errors
- Try refreshing page

---

## Testing Checklist

- [ ] Products load on page open
- [ ] Can add product to cart
- [ ] Alert shows when product added
- [ ] Cart count updates in header
- [ ] Cart count updates in FAB button
- [ ] Can view cart modal
- [ ] Can see cart items in modal
- [ ] Can increment quantity
- [ ] Can decrement quantity
- [ ] Can remove items
- [ ] Can add duplicate products
- [ ] Cart persists after page refresh
- [ ] Search filters products
- [ ] Categories filter products
- [ ] Can sort products
- [ ] Pagination works
- [ ] Can add from any page
- [ ] Console logs all actions

---

## Debugging Tips

1. **Open Console First:** Press F12 before testing
2. **Watch for Red Errors:** Red text = JavaScript errors
3. **Check Network Tab:** Verify products.json loads
4. **Use Breakpoints:** Click line number in Console to set breakpoints
5. **Check Elements:** Right-click element → Inspect to verify IDs

---

## Success Criteria

✅ **Minimum:** Products load, can add to cart, cart displays
✅ **Complete:** All tests pass, all console logs appear
✅ **Perfect:** End-to-end works smoothly with no errors

---

## Questions?

If something doesn't work:
1. Check Console for error messages
2. Verify all HTML elements exist
3. Verify products.json is accessible
4. Check that you're using HTTP (not file://)
5. Try hardrefresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)
