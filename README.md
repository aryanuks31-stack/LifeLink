# 🚑 LifeLink

**One tap. Real help. No wasted minutes.**

LifeLink is a unified emergency-healthcare platform that combines SOS ambulance dispatch, live hospital bed availability, medicine ordering, and blood donation coordination — into a single mobile app.


---

## 🩺 The Problem

In a medical emergency, families lose critical minutes juggling separate actions — calling an ambulance, calling relatives, guessing which hospital has space, and sourcing medicines or blood — all through disconnected channels, with no visibility into what's actually available nearby.

## 💡 Our Solution

LifeLink unifies four time-critical needs into one app:

| Feature | What it does |
|---|---|
| 🆘 **SOS Emergency** | One tap captures live GPS location and instantly alerts emergency contacts |
| 🏥 **Live Bed Availability** | Real-time hospital bed and ICU capacity, so you never travel to a full hospital |
| 💊 **Medicines** | Browse and order medicines for delivery |
| 🩸 **Blood Donation** | Connect with NGO-partnered blood donation drives |

---

## 📱 Screenshots

| Dashboard | SOS | 
|---|---|---|
| ![Dashboard](c:\Users\aryan\OneDrive\Pictures\Screenshots\Screenshot 2026-08-11 194800.png) | ![SOS](c:\Users\aryan\OneDrive\Pictures\Screenshots\Screenshot 2026-08-11 195326.png) | 

---

## 🏗️ Tech Stack

**Frontend**
- React Native (Expo) + Expo Router
- TypeScript

**Backend**
- Node.js + Express.js
- Firebase Firestore (database)
- Firebase Admin SDK

**Integrations**
- Expo Location (GPS capture)
- SMS alerting for emergency contacts

---

## ⚙️ How It Works

```
User triggers SOS
      ↓
App captures live GPS location (Expo Location)
      ↓
Backend queries Firestore for emergency contacts
      ↓
Alert sent to contacts with live location
      ↓
SOS event logged in Firestore (status, timestamp, contacts notified)
      ↓
Nearest hospital + live bed data fetched via REST API
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo Go app (for testing on a physical device)
- Firebase project with Firestore enabled

### Backend Setup

```bash
cd backend
npm install
# Add your Firebase serviceAccountKey.json to src/config/
npm run dev
```

### Frontend Setup

```bash
cd app
npm install
npx expo start
```

Scan the QR code with Expo Go to run on your device.

---

## 👥 Team — LifeLink

| Name | Role |
|---|---|
| Aryan | Team Lead, Backend |
| Ishan | Backend |
| Pratham | Frontend |
| Pahel | Frontend |

---

## 🗺️ Roadmap

- [x] SOS trigger with live location capture
- [x] Live hospital bed availability
- [ ] Medicines ordering — full backend integration
- [ ] Blood donation drive registration
- [ ] Push notifications
- [ ] Hospital admin dashboard for self-updating bed counts

---


