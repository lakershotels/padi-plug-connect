# 🚀 PadiPlug Local Development Setup

**Status:** npm install in progress (takes 10-15 minutes for first install)

---

## 📋 What's Happening

- ✅ Flutter dependencies installed
- ✅ Build assets prepared
- ⏳ npm dependencies installing... (terminal running in background)
- ⏳ Dev server will start automatically once complete

---

## 🎯 Once npm Install Completes

### Start Local Dev Server

```bash
cd c:\padi-plug-connect-main
npm run dev
```

**What this does:**
- Starts Vite dev server
- Compiles React + TypeScript
- Watches for file changes
- Hot-reload on save
- Opens browser automatically

**Access at:** `http://localhost:5173` (or port shown in terminal)

---

## 🧪 Local Testing Features

### Development Server Commands

```bash
# Start dev server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint

# Format code
npm run format
```

### Development Workflow

1. **Make changes** - Edit any `.tsx`, `.ts`, `.css` files
2. **Auto-reload** - Browser refreshes automatically
3. **See errors** - Both in terminal and in browser
4. **Test features** - All routes available at localhost

---

## 🌍 Available Routes for Testing

Once dev server is running, you can test these routes:

### Public Routes
- `http://localhost:5173/` - Home
- `http://localhost:5173/auth` - Authentication
- `http://localhost:5173/marketplace` - Product marketplace
- `http://localhost:5173/artisans` - Artisan directory
- `http://localhost:5173/vendors/:slug` - Vendor profile
- `http://localhost:5173/products/:id` - Product detail
- `http://localhost:5173/search` - Search
- `http://localhost:5173/deals` - Deals & Promotions
- `http://localhost:5173/privacy` - Privacy policy
- `http://localhost:5173/terms` - Terms of service

### Protected Routes (After Login)
- `http://localhost:5173/dashboard` - User dashboard
- `http://localhost:5173/orders` - Order history
- `http://localhost:5173/wallet` - Wallet & balance
- `http://localhost:5173/messages` - Chat messages
- `http://localhost:5173/notifications` - Notifications
- `http://localhost:5173/favorites` - Wishlist
- `http://localhost:5173/settings` - User settings
- `http://localhost:5173/admin` - Admin dashboard
- `http://localhost:5173/vendor` - Vendor dashboard
- `http://localhost:5173/artisan` - Artisan profile
- `http://localhost:5173/plans` - Subscription plans

---

## 🔍 Testing with Supabase

The app connects to Supabase for authentication and data:

### Test User Setup
1. Go to `http://localhost:5173/auth`
2. Sign up with test email (e.g., `test@padiplug.local`)
3. Confirm email (check Supabase dashboard)
4. Login and explore

### View Database
```bash
# Access Supabase Studio (if running locally)
supabase studio
```

---

## 🐛 Debugging

### Browser DevTools
- `F12` or `Ctrl+Shift+I` - Open DevTools
- **Console** - See console.logs and errors
- **Network** - Monitor API calls to Supabase
- **React DevTools** - Inspect component tree
- **Sources** - Debug TypeScript

### Terminal Logs
- Vite dev server shows compilation errors
- API calls logged to console
- Supabase client logs available

### Common Issues

**Issue:** "Page not loading"
- Restart dev server: `Ctrl+C` then `npm run dev`
- Check terminal for errors
- Verify port 5173 is not in use

**Issue:** "API calls failing"
- Check Supabase credentials in `.env`
- Verify Supabase project is running
- Check browser network tab

**Issue:** "Styling looks wrong"
- Restart dev server (CSS changes may cache)
- Clear browser cache: `Ctrl+Shift+Delete`

---

## 📱 Test Mobile Layout

### Browser Mobile Emulation
1. Open DevTools (`F12`)
2. Click device icon (toggle device toolbar)
3. Select mobile device
4. Test responsive design

### Test on Real Device
```bash
# Build and run on Android
flutter run -d <device-id>

# Or with Capacitor
npx cap run android
```

---

## 🔄 Hot Reload

### What Reloads Automatically
- ✅ React component changes
- ✅ TypeScript changes  
- ✅ CSS/Tailwind changes
- ✅ Route changes
- ✅ API integration changes

### What Requires Restart
- ❌ `.env` file changes
- ❌ vite.config.ts changes
- ❌ TypeScript config changes
- ❌ New dependencies (need `npm install`)

**Restart dev server:** `Ctrl+C` then `npm run dev`

---

## 📊 Performance Testing

### Check Bundle Size
```bash
npm run build
# Check dist/ folder size
```

### Lighthouse Audit
1. Build production: `npm run build`
2. Preview: `npm run preview`
3. Open DevTools → Lighthouse
4. Run audit

---

## 🔗 Useful URLs

**During Development:**
- Vite Dev: `http://localhost:5173`
- Supabase: `https://supabase.com/dashboard`
- Tailwind CSS: `https://tailwindcss.com/docs`

**Documentation:**
- React: `https://react.dev`
- TypeScript: `https://www.typescriptlang.org/docs`
- TanStack Router: `https://tanstack.com/router`
- Supabase: `https://supabase.com/docs`

---

## ✅ Quick Start Checklist

- [ ] Wait for npm install to complete (~10-15 minutes)
- [ ] Run `npm run dev`
- [ ] Open `http://localhost:5173` in browser
- [ ] Test home page loads
- [ ] Test auth flow
- [ ] Check browser console for errors
- [ ] Test a few routes
- [ ] Open DevTools and explore

---

## 📝 Tips for Local Testing

1. **Use incognito mode** - Avoid cached authentication issues
2. **Open DevTools** - Watch for errors as you test
3. **Test all routes** - Verify routes exist and load
4. **Check console** - Look for TypeScript or API errors
5. **Test forms** - Try validation and submissions
6. **Monitor network** - Verify Supabase API calls work
7. **Test responsive** - Mobile emulation with DevTools

---

## 🚀 Next Steps

1. **Wait** for npm install (indicator: terminal shows `added XXX packages`)
2. **Run** `npm run dev`
3. **Test** at `http://localhost:5173`
4. **Build APK** when ready: `build-android.bat`
5. **Deploy** to Play Store

---

**Status:** npm install running in terminal  
**Next:** Dev server will be ready when install completes  
**Time:** ~10-15 minutes
