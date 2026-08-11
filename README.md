# LifeLink
Medicines, ambulances, and SOS emergency response, all in one click.
LifeLink — Emergency Healthcare, One Tap Away

The Problem:

Emergency healthcare access in India is fragmented — booking an ambulance means calling around, there's no visibility into which hospitals have available beds or the right specialization, and there's no single trusted app for medicines, ambulances, and emergencies together.

1. around 24,000 people die every day in India due to delays in receiving timely medical assistance.
2. Only 10.8% reached an appropriate health facility within one hour.
3. Research in major Indian trauma centers found that patients often experienced delays because of:
     #Because of Low Vcancy of Bes
     #WorkFlow Issues

Our Solution

LifeLink brings together three things people need most in a health emergency:

💊 Medicines — order medicines with prescription upload
🚑 Ambulance booking — request the right ambulance type (basic, ICU, neonatal), matched by nearest availability
🆘 SOS Emergency (our core differentiator) — one-tap distress trigger that shows live driver status, nearby hospitals, real-time bed counts, and hospital specializations — instantly, without needing to search over all brings the most required workflow!
✨ SOS — The Core Feature

This is what sets us apart. In a real emergency, every second and every tap counts.

One tap on SOS instantly:

Captures your location and alerts emergency contacts
Shows the nearest hospitals with live bed availability
Matches hospitals by specialization (cardiac, trauma, pediatric, etc.)
Dispatches the nearest available ambulance and shows live driver status
Surfaces your digital medical ID (blood group, allergies, conditions) to responders

<img width="371" height="797" alt="WhatsApp Image 2026-08-11 at 7 53 48 PM" src="https://github.com/user-attachments/assets/9de07dc8-2af9-40fb-a69f-511f20bc5b42" />

This is the display of our current prototype.

Our Final App would include the Following:
Features
Category	What it does
Medicines	Browse, order, prescription upload
Ambulance Booking	Select type, live tracking, ETA
SOS Emergency	Instant alert, live hospital/bed data, nearest match
Digital Medical ID	Emergency profile visible to responders
Tech Stack
App: React Native (Expo)
Navigation: React Navigation
Backend: Firebase (Auth, Firestore, Cloud Functions)
Maps & Location: Google Maps Platform, react-native-maps, expo-location
SMS Alerts: FAST2SMS
Push Notifications: Expo Notifications (FCM)
Architecture
[React Native App]
        |
        v
[Firebase Auth] --- [Firestore DB] --- [Cloud Functions]
                                              |
                        ---------------------------------------
                        |                    |                 |
                  [Google Maps API]     [FAST2SMS]     [Expo Push (FCM)]


Data Schema (high level)
users — profile, medical ID, emergency contacts
ambulances — location, availability, type
bookings — status, type, pickup/drop, matched ambulance
hospitals — location, specializations, live bed counts
sos_events — trigger location, timestamp, resolved status


# Clone the repo
git clone https://github.com/aryanuks31-stack/LifeLink.git
cd [LifeLink]

# Install dependencies
npm install

# Start the Expo dev server
npx expo start. 


Team for Life Link
Name	Role	GitHub
[Aryan Singh]
[Ishan Mishra]
[Pahel Kapoor]	
[Pratham Kashyap]	

Roadmap
 Multi-language support (Hindi/English)
 Family/dependent mode
 Blood bank locator
 Insurance/ABHA integration
 Wearable/IoT fall-detection integration
By the end of the hackathon we promise to deliver a fully functioning app that helps hospitals make a strong network which benefits the hospitals and mainly patients under emergencies.
