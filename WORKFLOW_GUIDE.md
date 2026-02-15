# Mechanic App - Complete Workflow Setup Guide

## Overview
This app connects customers needing roadside assistance with nearby mechanics. The system handles authentication, location tracking, payment processing, and ratings.

---

## Complete Workflow

### PHASE 1: Authentication & Profile Setup

#### Customer Flow:
1. **Sign Up/Login** (`/register` or `/login`)
   - Uses Clerk authentication
   - Redirects to profile setup

2. **Select Role** (`/profile-setup`)
   - Choose "Customer" role
   - User data saved to `profiles` table with role='customer'

3. **Add Vehicle** (`/vehicle-onboarding`)
   - Add car details (make, model, year, license plate)
   - Saved to `customer_vehicles` table
   - Can add multiple vehicles

#### Mechanic Flow:
1. **Sign Up/Login** (`/register` or `/login`)
   - Uses Clerk authentication
   - Redirects to profile setup

2. **Select Role & Business Details** (`/profile-setup`)
   - Choose "Mechanic" role
   - Fill in:
     - Business name
     - License number
     - Years of experience
     - Service radius (default: 25km)
     - Specializations (Battery, Tire, Fuel Delivery, etc.)
   - Data saved to `mechanic_details` table

---

### PHASE 2: Customer Requests Service

#### Customer:
1. **Dashboard** (`/customer-dashboard`)
   - Shows active request status (if any)
   - Shows vehicle info
   - Quick service buttons for: Battery, Tire, Fuel, Other

2. **Request Service** (`/service-request`)
   - Select service type
   - Add description and photos (optional)
   - Location automatically captured from GPS
   - Estimated cost shown
   - Creates record in `service_requests` table with status='pending'

---

### PHASE 3: Mechanic Finds & Accepts Request

#### Mechanic:
1. **Dashboard** (`/mechanic-dashboard`)
   - **Must** toggle "Online" status to receive requests
   - Toggles availability in `mechanic_details`.`is_available`
   - Shows earnings for today
   - **NEW FEATURE**: Shows nearby pending requests
     - Filtered by distance (within service_radius_km)
     - Sorted by distance (closest first)
     - Shows actual km distance

2. **View Request Details** (`/job-management`)
   - Click on pending request
   - Shows:
     - Customer location on map
     - Service type with estimated cost
     - Problem description
     - Distance from mechanic
   - **Accept Job** button → calls RPC `assign_mechanic_to_request`
   - Request status changes from 'pending' → 'accepted'
   - Mechanic location updates every 30 seconds

---

### PHASE 4: Real-time Location Tracking

#### Both Customer & Mechanic:
1. **Live Tracking** (`/request-tracking` for customer, visible in job update)
   - Mechanic location updates in real-time
   - Map shows both locations
   - Distance and ETA calculated

#### Mechanic Status Flow (in `/job-management`):
1. **Accept** (pending → accepted)
2. **Start Driving** (accepted → en_route)
   - Location tracking becomes active
3. **Mark Arrived** (en_route → arrived)
4. **Start Working** (arrived → in_progress)
5. **Complete Job** (in_progress → completed)
   - **NEW FEATURE**: Shows dialog to enter final cost
   - If different from estimated, mechanic enters actual amount
   - Status updates to 'completed'

---

### PHASE 5: Payment Processing

#### Customer Side:
1. **Request Status = Completed**
   - In RequestTracking, button changes to "Proceed to Payment"
   - Click button → navigates to `/payment`

2. **Payment Page** (`/payment`)
   - **NEW FEATURE**: Multiple payment methods:
     - Credit/Debit Card
     - UPI (Google Pay, Paytm, PhonePe)
     - Cash Payment
   - Shows final cost (mechanic-provided or estimated)
   - Can add tip
   - Submit payment
   - Records payment in `payments` table

#### After Successful Payment:
- Updates request status to payment_status='paid'
- Redirect to `/rating-review`
- Mechanic gets notification of payment

---

### PHASE 6: Rating & Review

#### Customer:
1. **Rate Mechanic** (`/rating-review`)
   - Star rating (1-5)
   - Written review (optional)
   - Quick tags: Professional, Quick, Friendly, Fair Price, etc.
   - Recorded in `service_ratings` table

#### Mechanic Benefits:
- Rating affects profile (visible to future customers)
- Ratings count included on dashboard
- Highest-rated mechanics appear higher in search

---

## Database Schema Key Tables

### profiles
- `user_id` (Clerk ID)
- `role` (customer/mechanic)
- `full_name`
- `phone`
- `avatar_url`

### customer_details
- `user_id`
- Vehicle reference
- Preferred payment method

### customer_vehicles
- `user_id`
- `vehicle_make`, `vehicle_model`, `vehicle_year`
- `license_plate`
- `is_primary`

### mechanic_details
- `user_id`
- `business_name`
- `license_number`
- `years_experience`
- `service_radius_km`
- `specializations` (array)
- `is_available` (boolean)
- `is_verified` (boolean)
- `current_lat`, `current_lng` (location)
- `rating`, `total_reviews`

### service_requests
- `customer_id`
- `mechanic_id` (null until accepted)
- `service_type` (battery, tire, fuel, etc.)
- `status` (pending → accepted → en_route → arrived → in_progress → completed)
- `customer_lat`, `customer_lng`
- `mechanic_lat`, `mechanic_lng` (updated in real-time)
- `estimated_cost`
- `final_cost` (set by mechanic)
- `payment_status` (pending/paid)
- `description`

### payments
- `request_id`
- `customer_id`
- `mechanic_id`
- `amount`
- `platform_fee` (10%)
- `mechanic_payout` (90%)
- `payment_method` (card/upi/cash)
- `payment_status`

### service_ratings
- `request_id`
- `customer_id`
- `mechanic_id`
- `rating` (1-5)
- `review_text`
- `tags` (array)

---

## Key Features Implemented

✅ **Distance-Based Mechanic Discovery**
- Haversine formula calculates real distances
- Filters only mechanics within service radius
- Sorted by nearest first

✅ **Real-time Location Tracking**
- Mechanic location updates every 30 seconds
- Customer sees mechanic approaching on map
- Live ETA calculation

✅ **Multiple Payment Methods**
- Card
- UPI
- Cash (with mechanic verification)

✅ **Final Cost Adjustment**
- Mechanic sets final cost before job completion
- If different from estimate, customer pays correct amount

✅ **Automatic Order of Operations**
- Status flow enforced
- Payment required before review
- Review recorded in database

---

## Environment Setup

### Required:
- Supabase project
- Clerk authentication
- Google Maps API
- Node.js + npm/bun

### Environment Variables (.env.local):
```
VITE_CLERK_PUBLISHABLE_KEY=your_key
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### Database Setup:
```sql
-- Run all migrations in supabase/migrations/ folder
-- Latest: 20260204142724_d4e8963b-2245-4358-8e50-2a98bc3e97d5.sql
```

---

## Testing the Complete Workflow

### Test Scenario:

1. **Create Customer Account**
   - Sign up as customer
   - Add a vehicle
   - Get to dashboard

2. **Create Mechanic Account** (Different browser/incognito)
   - Sign up as mechanic
   - Fill business details
   - Toggle Online status
   
3. **Request Service**
   - Customer requests a service (e.g., "Battery")
   - Service appears on Mechanic Dashboard (if nearby)

4. **Accept & Complete**
   - Mechanic clicks request → Details view
   - Mechanic clicks "Accept Job"
   - Status: pending → accepted → en_route → arrived → in_progress → completed
   - Enter final cost when completing

5. **Payment & Review**
   - Customer clicks "Proceed to Payment"
   - Selects payment method and pays
   - Adds review/rating
   - Complete!

---

## Known Limitations / Todo

- [ ] Actual phone calling (currently shows toast)
- [ ] Photo uploads (currently UI only)
- [ ] Real Stripe integration (using mock payments)
- [ ] SMS notifications
- [ ] Mechanic license verification
- [ ] Insurance validation

---

## API Endpoints (Edge Functions)

- `POST /functions/v1/secure-profile` - Profile creation
- `GET/POST/PATCH /functions/v1/secure-service-request` - Request management
- `GET/PATCH /functions/v1/secure-mechanic-data` - Mechanic info & location
- `GET /functions/v1/secure-customer-data` - Customer info
- `POST /functions/v1/allocate-mechanic` - Auto-allocation (optional)

---

## Security Features

- Clerk authentication with JWT tokens
- Row-Level Security (RLS) on all tables
- Edge function authorization
- Customer data segregation
- Mechanic verification workflow

