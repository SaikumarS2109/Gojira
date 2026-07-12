# Patient Healthcare Portal — Design Specification

**Date:** July 12, 2026  
**Timeline:** 16 hours  
**Deployment:** Vercel  
**Interview Portfolio:** Yes

---

## Overview

A role-based healthcare management portal built on Next.js with three user types (Patient, Doctor, Admin) accessing a single application with differentiated views and permissions. All data access is gated at the API layer using role-based checks.

---

## Architecture

**Frontend:** Next.js with React components, organized by role (patient/, doctor/, admin/)  
**Backend:** API routes with role-based middleware that checks `session.user.role` before returning data  
**Database:** PostgreSQL or MongoDB with five core collections  
**Auth:** NextAuth (extended from existing ticketing system), session includes role + specialty  
**Image Storage:** Vercel Blob for patient/doctor profile pictures  
**Deployment:** Vercel

---

## Database Schema

### User
```
- id (UUID)
- email (unique)
- password (hashed)
- name
- role: "patient" | "doctor" | "admin"
- phone
- specialty (string, doctors only)
- createdAt, updatedAt
```

### Patient
```
- id (UUID)
- userId (foreign key to User, role="patient")
- dateOfBirth
- gender
- bloodType
- allergies (text)
- medicalHistory (text notes)
- insurance (string)
- emergencyContact (name, phone)
- profilePictureUrl (Vercel Blob URL)
- createdAt, updatedAt
```

### Appointment
```
- id (UUID)
- patientId (foreign key)
- doctorId (foreign key to User, role="doctor")
- appointmentDate (datetime)
- duration (minutes)
- status: "scheduled" | "completed" | "cancelled"
- reason (string, why appointment)
- notes (doctor notes, filled after completion)
- createdBy (User id, who booked it)
- createdAt, updatedAt
```

### Prescription
```
- id (UUID)
- patientId (foreign key)
- doctorId (foreign key to User)
- medication (string)
- dosage (string)
- frequency (string, e.g., "twice daily")
- startDate
- endDate
- refillsRemaining (number)
- status: "active" | "refilled" | "expired"
- createdAt, updatedAt
```

### StaffShift
```
- id (UUID)
- doctorId (foreign key to User)
- date
- startTime (HH:MM)
- endTime (HH:MM)
- notes (optional)
- createdAt, updatedAt
```

---

## Role-Based Access Control

All API routes enforce role checks. Example middleware:

```typescript
// Every route checks: if (!session.user.role) return 403
// Then checks: can this role access this resource?

GET /api/patients/[id]
  ✓ Doctor can view any patient
  ✓ Admin can view any patient
  ✓ Patient can only view themselves
  ✗ Everyone else: 403

GET /api/appointments
  ✓ Patient sees only their appointments
  ✓ Doctor sees only their assigned appointments
  ✓ Admin sees all appointments
```

---

## Features by Role

### Patient
**Dashboard:**
- View upcoming appointments (with doctor name, time, notes)
- View own medical record (allergies, medical history, blood type, emergency contact)
- View active prescriptions + request refills
- View own profile picture + upload new one

**Appointments:**
- Browse available doctors and their schedules
- Book appointment (select doctor, preferred date/time, reason)
- Cancel appointment
- View appointment history

**Prescriptions:**
- List active prescriptions with dosage and frequency
- Request refill (changes `refillsRemaining`, updates `status`)

---

### Doctor
**Dashboard:**
- View list of assigned patients
- View today's appointments
- Quick access to manage prescriptions

**Patients:**
- Search/browse assigned patients
- View full patient record (medical history, allergies, past appointments)
- Edit patient medical record (add notes, update history)
- View prescription history for patient

**Prescriptions:**
- Create new prescription for assigned patient
- View/edit active prescriptions
- Mark prescription as refilled

**Schedule:**
- View own shifts (read-only on dashboard)
- View overall clinic staff schedule (read-only)

---

### Admin
**Dashboard:**
- Overview: total appointments today, pending refills, staff on duty
- Quick links to manage schedules, users, appointments

**Staff Scheduling:**
- View all shifts (calendar or list view)
- Create new shift (assign doctor to date/time)
- Edit/delete shifts
- View doctor availability

**User Management:**
- Create new doctor or patient account
- View all users filtered by role
- Edit user details (name, email, specialty for doctors)
- Deactivate users (soft delete)

**Appointments:**
- View all appointments (filter by date, doctor, patient)
- Create appointment on behalf of patient
- Cancel appointments
- View appointment notes/history

---

## Pages & Components

### Shared
- `components/LoginForm` — handles patient/doctor/admin login
- `components/SignupForm` — role selection + signup flow
- `components/ProfileCard` — displays user profile (name, picture, specialty if doctor)
- `components/AppointmentCard` — reusable appointment display
- `components/PrescriptionCard` — reusable prescription display
- `components/UploadProfilePicture` — Vercel Blob uploader
- `components/Navigation` — role-aware navbar

### Patient Routes
- `app/(patient)/dashboard` — appointments, prescriptions, medical record
- `app/(patient)/appointments/book` — appointment booking form
- `app/(patient)/appointments` — list all appointments
- `app/(patient)/prescriptions` — list + refill management
- `app/(patient)/profile` — view/edit own record + picture upload

### Doctor Routes
- `app/(doctor)/dashboard` — patient list, today's schedule, quick actions
- `app/(doctor)/patients/[id]` — patient record detail + edit
- `app/(doctor)/prescriptions` — create/manage prescriptions
- `app/(doctor)/schedule` — view own shifts

### Admin Routes
- `app/(admin)/dashboard` — overview + quick stats
- `app/(admin)/schedule` — staff shift management (CRUD)
- `app/(admin)/users` — create/manage accounts
- `app/(admin)/appointments` — view all appointments

### API Routes
```
/api/auth/[...nextauth]         — NextAuth (reuse existing)
/api/patients/[id]              — GET/PATCH patient (role-gated)
/api/patients                   — GET patient list (admin/doctor only)
/api/appointments               — GET/POST/PATCH appointments (role-gated)
/api/appointments/[id]          — GET/PATCH/DELETE appointment
/api/prescriptions              — GET/POST prescriptions (role-gated)
/api/prescriptions/[id]         — PATCH prescription (refill, expire)
/api/shifts                     — GET/POST shifts (admin-only)
/api/shifts/[id]                — PATCH/DELETE shift (admin-only)
/api/upload                     — POST profile picture to Vercel Blob
/api/users                      — GET/POST users (admin-only)
/api/users/[id]                 — PATCH/DELETE user (admin-only)
```

---

## Data Flow Examples

### Patient Books Appointment
1. Patient clicks "Book Appointment" → `/appointments/book` page
2. Component fetches `/api/doctors` (list of available doctors)
3. Patient selects doctor + date → submits form to `/api/appointments` (POST)
4. API checks: `session.user.role === "patient"` ✓ → creates Appointment record
5. Response includes appointment ID → redirect to `/appointments`
6. Show confirmation + appointment details

### Doctor Creates Prescription
1. Doctor navigates to patient detail page: `/patients/[id]`
2. Click "Add Prescription" → form appears
3. Submit → POST `/api/prescriptions` with `patientId`, `doctorId`, medication details
4. API checks: `session.user.role === "doctor"` AND `session.user.id === doctorId` ✓
5. Create Prescription record → return success
6. Update UI, show "Prescription created"

### Admin Manages Shifts
1. Admin navigates to `/admin/schedule`
2. Click "New Shift" → form for (doctor, date, startTime, endTime)
3. Submit → POST `/api/shifts`
4. API checks: `session.user.role === "admin"` ✓
5. Create StaffShift record → return success
6. Refresh calendar view

---

## Implementation Phases

### Phase 1: Foundation (2-3 hours)
- Set up database schema (PostgreSQL or MongoDB)
- Extend NextAuth: add role + specialty to User, session, JWT
- Create API middleware for role checks
- Create signup flow that captures role + specialty (doctors)
- Create login page

**Deliverable:** Users can sign up as patient/doctor/admin and log in

### Phase 2: Core Features (8-10 hours)
- **Appointments CRUD:** POST /api/appointments (book), GET (list), PATCH (cancel), role gates
- **Patients CRUD:** GET /api/patients/[id] (view), PATCH (edit medical record)
- **Prescriptions CRUD:** POST (create), GET (list), PATCH (refill/expire)
- **Shifts CRUD:** POST/PATCH/DELETE (admin-only)
- **Patient dashboard:** show upcoming appointments, active prescriptions, medical record
- **Doctor dashboard:** show assigned patients, today's schedule, create prescription flow
- **Admin dashboard:** appointment overview, quick actions to manage shifts/users

**Deliverable:** All CRUD operations working with role-based access; role-specific dashboards functional

### Phase 3: Polish (2-3 hours)
- Profile picture upload (Vercel Blob integration)
- All roles can upload profile pictures
- Dashboard styling + layout
- Navigation bar (role-aware)
- Basic form validation + error messages
- Vercel deployment

**Deliverable:** Polished, deployed application ready for demo

---

## Out of Scope

- Email/SMS notifications
- Advanced search and filtering
- Prescription photo uploads
- Recurring/recurring appointments
- HIPAA compliance & encryption (production-grade)
- Insurance validation
- Payment/billing
- Analytics

---

## Tech Stack

- **Frontend:** Next.js 14+, React, TypeScript
- **Backend:** Next.js API routes
- **Database:** PostgreSQL or MongoDB
- **Auth:** NextAuth.js (existing setup)
- **Images:** Vercel Blob
- **Deployment:** Vercel
- **Styling:** Tailwind CSS (match existing ticketing system)

---

## Success Criteria

- ✓ Three user roles work independently with proper access control
- ✓ All CRUD operations functional for appointments, prescriptions, shifts
- ✓ Role-specific dashboards display correct data
- ✓ Profile pictures upload and display
- ✓ Deployed on Vercel without errors
- ✓ Interview demo: can demonstrate patient booking, doctor prescribing, admin managing shifts

