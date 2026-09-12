# Quick Start Guide - Running the App

## How to Run the Application

### Option 1: VS Code Live Server (RECOMMENDED)

1. **Install Live Server Extension** (if not already installed)
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)
   - Search for "Live Server"
   - Click "Install" on the one by Ritwick Dey

2. **Run the Server**
   - Right-click on `index.html`
   - Select "Open with Live Server"
   - Browser opens automatically at `http://localhost:5500`

3. **Done!** App is running

---

### Option 2: Python Simple Server

If you have Python 3 installed:

```bash
# Navigate to the Khushi Online Store folder
cd "e:\Khushi Online Store"

# Start server
python -m http.server 8000
```

Then open: `http://localhost:8000`

---

### Option 3: Node.js HTTP Server

If you have Node.js:

```bash
# Install http-server globally (one-time)
npm install -g http-server

# Navigate to folder
cd "e:\Khushi Online Store"

# Start server
http-server
```

Then open the URL shown in console

---

## Quick Verification Checklist

After opening the app:

- [ ] Page loads without errors
- [ ] Products display in grid
- [ ] Can see product images
- [ ] Can see prices
- [ ] Can see "Add to Cart" buttons
- [ ] Can scroll to see multiple products
- [ ] Console shows: "✅ App initialized successfully"

---

## First Test: Add Product to Cart

1. **Click** "Add to Cart" button on any product
2. **Expect:**
   - Alert popup confirming
   - Cart count updates (top-right)
   - Console shows log message

3. **If it works:** ✅ App is functioning correctly!

---

## Troubleshooting

### Products Don't Load
**Cause:** Using file:// protocol instead of HTTP
**Solution:** Use Live Server or HTTP server (options above)

### Can't Click Add to Cart
**Cause:** JavaScript errors
**Solution:** Open DevTools (F12), check Console tab for red errors

### Cart Count Doesn't Update
**Cause:** Page elements not found
**Solution:** 
- Press F12 → Elements tab
- Search for "cart-count"
- Verify it exists in HTML

### Products Load But No Images
**Cause:** Image paths incorrect
**Solution:** 
- Verify `images/` folder exists
- Check image files exist in folder
- Check browser console for 404 errors

---

## Working Features Checklist

- ✅ Product loading from JSON
- ✅ Product display in grid
- ✅ Add to cart functionality
- ✅ Cart item counter
- ✅ View cart modal
- ✅ Update quantities
- ✅ Remove items
- ✅ Cart persistence (survives refresh)
- ✅ Category filtering
- ✅ Search functionality
- ✅ Sorting options
- ✅ Pagination
- ✅ Image zoom
- ✅ WhatsApp integration
- ✅ OOP architecture

---

## Next Steps

1. **Test Thoroughly** - Follow `TESTING_GUIDE.md`
2. **Review Code** - Check `OOP_REFACTORING_GUIDE.md`
3. **Check Fixes** - See `FIXES_APPLIED.md`
4. **Customize** - Modify products.json, style.css as needed

---

## File Structure

```
Khushi Online Store/
├── index.html           ← Main file to open
├── script-oop.js        ← OOP version (ACTIVE)
├── script.js            ← Original version (backup)
├── style.css            ← All styling
├── products.json        ← Product data
├── images/              ← Product images folder
└── *.md                 ← Documentation files
```

---

## Command Line Quick Start

### Windows PowerShell
```powershell
cd "e:\Khushi Online Store"
python -m http.server 8000
# Then open http://localhost:8000
```

### Mac Terminal
```bash
cd ~/path/to/Khushi\ Online\ Store
python3 -m http.server 8000
# Then open http://localhost:8000
```

### Linux Terminal
```bash
cd ~/Khushi\ Online\ Store
python3 -m http.server 8000
# Then open http://localhost:8000
```

---

## Important Notes

⚠️ **Must use HTTP protocol** (not file://)
⚠️ **Images folder must be in root** with images/
⚠️ **products.json must be in root** directory
⚠️ **All .md files are for reference** only

---

## Browser Console is Your Friend

Press **F12** to open Developer Tools:

- **Console Tab:** See logs and errors
- **Network Tab:** See if products.json loaded
- **Elements Tab:** Inspect HTML structure
- **Storage Tab:** Check localStorage (cart data)

---

## Success Indicators

✅ Products load on page load
✅ Alert shows when adding to cart
✅ Cart count updates
✅ Can view cart modal
✅ Can update quantities
✅ Cart persists after refresh

If all these work → **App is working correctly!**

---

## Support

If something doesn't work:

1. Check Console (F12) for error messages
2. Verify using HTTP (not file://)
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try hard refresh (Ctrl+Shift+R)
5. Check products.json exists
6. Check images/ folder exists

---

## You're Ready!

🚀 **The application is ready to use!**

Open `index.html` with Live Server and start testing!
