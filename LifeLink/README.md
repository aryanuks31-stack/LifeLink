# LifeLink-AmbuGO
Medicines, ambulances, and SOS emergency response — all in one click LifeLink — Emergency Healthcare, One Tap Away

The Problem:

Emergency healthcare access in India is fragmented — booking an ambulance means calling around, there's no visibility into which hospitals have available beds or the right specialization, and there's no single trusted app for medicines, ambulances, and emergencies together.

around 24,000 people die every day in India due to delays in receiving timely medical assistance.
Only 10.8% reached an appropriate health facility within one hour.
Research in major Indian trauma centers found that patients often experienced delays because of: #Because of Low Vcancy of Bes #WorkFlow Issues
Our Solution

LifeLink brings together three things people need most in a health emergency:

💊 Medicines — order medicines with prescription upload 🚑 Ambulance booking — request the right ambulance type (basic, ICU, neonatal), matched by nearest availability 🆘 SOS Emergency (our core differentiator) — one-tap distress trigger that shows live driver status, nearby hospitals, real-time bed counts, and hospital specializations — instantly, without needing to search over all brings the most required workflow! ✨ SOS — The Core Feature

This is what sets us apart. In a real emergency, every second and every tap counts.

One tap on SOS instantly:

Captures your location and alerts emergency contacts Shows the nearest hospitals with live bed availability Matches hospitals by specialization (cardiac, trauma, pediatric, etc.) Dispatches the nearest available ambulance and shows live driver status Surfaces your digital medical ID (blood group, allergies, conditions) to responders

<img width="417" height="612" alt="Screenshot from 2026-07-25 19-52-56" src="https://github.com/user-attachments/assets/b4c99bee-e680-4b2b-877b-f19dd17f2cd7" />

Features Category What it does Medicines Browse, order, prescription upload Ambulance Booking Select type, live tracking, ETA SOS Emergency Instant alert, live hospital/bed data, nearest match Digital Medical ID Emergency profile visible to responders Tech Stack App: React Native (Expo) Navigation: React Navigation Backend: Firebase (Auth, Firestore, Cloud Functions) Maps & Location: Google Maps Platform, react-native-maps, expo-location SMS Alerts: Twilio Push Notifications: Expo Notifications (FCM) Architecture [React Native App] | v [Firebase Auth] --- [Firestore DB] --- [Cloud Functions] | --------------------------------------- | | | [Google Maps API] [Twilio SMS] [Expo Push (FCM)]

(Replace with an actual diagram image once you have one — /docs/architecture.png)

Data Schema (high level) users — profile, medical ID, emergency contacts ambulances — location, availability, type bookings — status, type, pickup/drop, matched ambulance hospitals — location, specializations, live bed counts sos_events — trigger location, timestamp, resolved status

Full schema in /docs/schema.md

Project Status Feature Status Auth (email/password) 🟢 Done Booking flow 🟡 In progress SOS trigger + alerts 🟡 In progress Live tracking ⚪ Planned Hospital bed counts ⚪ Planned Medical ID ⚪ Planned Getting Started bash

Clone the repo
git clone https://github.com/[your-org]/[repo-name].git cd [repo-name]

Install dependencies
npm install

Start the Expo dev server
npx expo start

Scan the QR code with the Expo Go app on your phone to run it live.

Environment setup

Create a .env file (see .env.example) with your Firebase and Google Maps API keys.

Team for Life Link Name Role GitHub [Ishan Mishra] Backend — Core API & Data. [Aryan Singh] Backend — Real-time & Integration. [Pahel Kapoor] Frontend — User App. [Pratham Kashyap] Frontend — SOS UI & Driver Dashboard.

Roadmap Multi-language support (Hindi/English) Family/dependent mode Blood bank locator Insurance/ABHA integration Wearable/IoT fall-detection integration License

This project is licensed under the MIT License — see LICENSE for details.

Demo

📱 Expo Go link / QR code: (add before submission) 🎥 Demo video: (add before submission)
