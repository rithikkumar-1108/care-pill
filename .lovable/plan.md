

## MediTrack - Medicine Tracker Application

A comprehensive medicine tracking app designed for elderly users and chronic patients, featuring a warm, friendly interface with large, accessible controls.

---

### 🔐 1. Authentication & User Profiles

**User Registration & Login**
- Email/phone + password authentication via Supabase Auth
- Simple, large-button login/signup forms
- Password reset via email

**User Profile Setup**
- Name, age, gender fields
- Optional health condition notes
- Caregiver contact (email + phone for dual notifications)
- Profile photo upload option

---

### 💊 2. Medicine Management

**Add/Edit Medicines**
- Medicine name with autocomplete suggestions
- Dosage input (tablet count, ml, etc.)
- Duration picker (start & end dates)
- Stock quantity tracker
- Instructions (before/after food, with water, etc.)
- Assign to sessions (Morning, Afternoon, Night)

**Medicine List View**
- Card-based display with medicine images
- Quick edit/delete actions
- Stock status indicator (good/low/critical)

---

### ⏰ 3. Daily Sessions & Scheduling

**Three Daily Sessions**
- Morning, Afternoon, Night with warm, friendly icons
- Default times (8 AM, 2 PM, 8 PM) with user override option
- Each session shows assigned medicines

**Session Dashboard**
- Today's overview with all three sessions
- Large "Take Medicine" buttons
- Clear status: Pending → Taken ✔️ or Missed ❌
- One-tap marking with confirmation

---

### 🔔 4. Smart Reminders & Notifications

**Browser Push Notifications**
- Permission request on first login
- Notification at scheduled session time
- Auto-repeat every 5 minutes until marked taken

**In-App Alerts**
- Sound alert when app is open
- Full-screen reminder modal
- Snooze option (5, 10, 15 minutes)

**Caregiver Alerts (Email + SMS via Twilio)**
- Immediate notification if dose missed after 30 minutes
- Daily summary email to caregiver
- Low stock alerts

---

### 📊 5. Dose Tracking & History

**Daily Logs**
- Timestamped record of each dose
- Status: Taken/Missed/Skipped
- Notes field for any observations

**History View**
- Filterable by date range
- Searchable by medicine name
- Export option (PDF/CSV)

---

### 📅 6. Calendar & Visualization

**Color-Coded Calendar**
- 🟢 Green = All doses taken
- 🔴 Red = Doses missed
- 🟡 Yellow = Partial completion
- ⚪ Grey = Future/Pending

**Daily Detail View**
- Tap any date to see session breakdown
- Quick stats: adherence percentage

---

### 📦 7. Refill & Stock Management

**Automatic Stock Tracking**
- Deduct from stock when dose marked taken
- Visual stock meter on each medicine

**Smart Alerts**
- Low stock warning (configurable threshold)
- "Order Refill" reminder
- Caregiver notification for critical stock

---

### 👨‍⚕️ 8. Caregiver Dashboard

**Separate Login Portal**
- View-only access to patient data
- Link via invitation from patient

**Caregiver Features**
- Real-time patient adherence view
- Medicine schedule overview
- Missed dose alerts history
- Stock status of all medicines

---

### 🎨 9. Design & Accessibility

**Warm & Friendly Theme**
- Soft orange and teal color palette
- Rounded corners, gentle shadows
- Welcoming, non-clinical feel

**Elderly-Friendly UI**
- Extra-large fonts (18px+ base)
- Big, tappable buttons (48px+ height)
- High contrast text
- Simple navigation (max 3 taps to any feature)
- Clear session icons (sun, cloud, moon)

---

### 🏗️ 10. Technical Architecture

**Frontend**
- React with TypeScript
- Tailwind CSS for styling
- Responsive design (mobile-first)

**Backend (Lovable Cloud + Supabase)**
- Supabase Auth for authentication
- PostgreSQL database for all data
- Edge Functions for:
  - Scheduled reminder checks (cron)
  - Email sending (Resend)
  - SMS sending (Twilio)
- Row-Level Security for data protection

**Database Tables**
- `profiles` - User information
- `user_roles` - Admin/user/caregiver roles
- `medicines` - Medicine catalog per user
- `session_schedules` - Custom session times
- `medicine_sessions` - Medicine-to-session assignments
- `dose_logs` - Daily tracking records
- `caregiver_links` - Patient-caregiver relationships
- `stock_alerts` - Low stock notifications

---

### 📱 Sample Screens

1. **Dashboard** - Today's sessions with take/skip buttons
2. **Medicine List** - All medicines with stock status
3. **Add Medicine** - Simple form with session assignment
4. **Calendar View** - Monthly adherence visualization
5. **History** - Searchable dose log
6. **Profile Settings** - User info & caregiver setup
7. **Caregiver Portal** - Read-only patient overview

