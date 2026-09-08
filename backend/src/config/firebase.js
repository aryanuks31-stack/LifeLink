require("dotenv").config();

const {
  initializeApp,
  cert,
  getApps,
} = require("firebase-admin/app");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (
  !FIREBASE_PROJECT_ID ||
  !FIREBASE_CLIENT_EMAIL ||
  !FIREBASE_PRIVATE_KEY
) {
  throw new Error(
    "Missing Firebase environment variables"
  );
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey:
        FIREBASE_PRIVATE_KEY.replace(
          /\\n/g,
          "\n"
        ),
    }),
  });
}

const db = getFirestore();

module.exports = db;