# Quick Start Guide - Mechanic App

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ or Bun
- Supabase account with project
- Clerk account configured
- Google Maps API key

### Installation

```bash
# Clone and install
git clone <repo>
cd your-app-companion-main
bun install  # or npm install

# Environment setup
cp .env.example .env.local
```

### .env.local Configuration
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Run Development Server
```bash
bun run dev
# or
npm run dev
```

Visit `http://localhost:5173`

---

## 🔑 Quick Test Login

### Create Test Accounts:
1. Go to `/register`
2. Create Customer account (choose "Customer" role)
3. In new browser: Create Mechanic account (choose "Mechanic" role, fill details)

### Test Data Location:
- Default: Hyderabad, India (17.42°N, 78.65°E)
- Adjust in useGeolocation hook for your area

---

## ✅ Complete Feature Checklist

| Feature | Location | Status |
|---------|----------|--------|
| Distance Filtering | MechanicDashboard | ✅ Working |
| Payment Methods | Payment page | ✅ Working |
| Final Cost Dialog | JobManagement | ✅ Working |
| Phone Calling | JobManagement, RequestTracking | ✅ Working |
| Live Tracking | RequestTracking | ✅ Working |
| Customer Reviews | RatingReview | ✅ Working |
| Real-time Updates | All pages | ✅ Working |

---

## 🧪 Test Workflow (5 min)

1. **Customer**: Request service (Battery)
2. **Mechanic**: Toggle Online
3. **Mechanic**: See request on dashboard, click it
4. **Mechanic**: Accept job
5. **Mechanic**: Update status: accepted → en route → arrived → in progress
6. **Mechanic**: Complete (enter final cost)
7. **Customer**: See "Proceed to Payment"
8. **Customer**: Pay and review
9. **Done!** ✅

---

## 🔍 Debugging

### Check Logs:
```bash
# Terminal: Check Supabase logs
supabase log tail

# Browser Console: Check JavaScript errors
F12 or Cmd+Option+I
```

### Common Issues:

**"Location services required"**
- Enable location in browser permissions
- Check browser geolocation is working

**"Payment failed"**
- Check Supabase connection
- Verify payment_status table column exists

**"Map not loading"**
- Verify Google Maps API key
- Check CORS settings

---

## 📱 Mobile Testing

### iOS Safari:
```
1. Enable location
2. Test phone calling (tel: links work)
3. Check responsiveness
```

### Android Chrome:
```
1. Enable location in app settings
2. Test phone calling
3. Test all page layouts
```

---

## 🎨 Customization

### Change Service Radius:
File: `ProfileSetup.tsx`
```tsx
const defaultServiceRadius = 25; // km
```

### Change Platform Fee:
File: `Payment.tsx`
```tsx
const platformFee = totalAmount * 0.1; // 10%
```

### Change Location Tracking Frequency:
File: `useMechanicLocation.ts`
```tsx
intervalRef.current = setInterval(() => {
  updateLocation(lat, lng);
}, 30000); // 30 seconds
```

---

## 📊 Database

### Current Tables:
- `profiles` - User accounts
- `customer_details` - Customer info
- `customer_vehicles` - User cars
- `mechanic_details` - Mechanic info
- `service_requests` - All requests
- `payments` - Payment records
- `service_ratings` - Reviews
- `messages` - Chat
- `notifications` - Alerts

### Migrations:
All in: `supabase/migrations/`
Latest: `20260204142724_*`

---

## 🚢 Deployment

### Build:
```bash
bun run build
# or
npm run build
```

### Deploy to Vercel:
```bash
vercel deploy
```

### Deploy to Netlify:
```bash
netlify deploy
```

---

## 📞 Support

Check docs in root:
- `IMPLEMENTATION_COMPLETE.md` - Full details
- `WORKFLOW_GUIDE.md` - Complete workflow
- `CHANGES_MADE.md` - What was changed

---

## ✨ What's New (This Version)

✅ Distance-based mechanic discovery
✅ Multiple payment methods (Card/UPI/Cash)
✅ Final cost customization by mechanic
✅ Proper workflow enforcement
✅ Phone calling integration
✅ Complete tipping system
✅ Payment tracking & records
✅ Better UI/UX throughout

---

## 🎯 Next Steps

1. Test the complete workflow
2. Integrate real payment processor (Stripe)
3. Set up SMS notifications
4. Add photo uploads to cloud storage
5. Implement mechanic verification
6. Enable production mode

---

## 💬 Need Help?

1. Check `WORKFLOW_GUIDE.md` for detailed flow
2. Review `CHANGES_MADE.md` for implementation details
3. Check browser console for errors
4. Use `supabase log tail` for database issues

---

**Happy Testing! 🚀**

