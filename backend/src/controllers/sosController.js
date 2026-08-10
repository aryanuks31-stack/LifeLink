const db = require("../config/firebase");

const triggerSOS = async (req, res) => {
  try {
    const { userId, lat, lng } = req.body;

    if (!userId || lat === undefined || lng === undefined) {
      return res.status(400).json({ message: "userId, lat, and lng are required" });
    }

    // 1. Find the user's emergency contacts
    const contactsSnapshot = await db
      .collection("emergencyContacts")
      .where("userId", "==", userId)
      .get();

    if (contactsSnapshot.empty) {
      return res.status(404).json({ message: "No emergency contacts found for this user" });
    }

    const contacts = contactsSnapshot.docs.map((doc) => doc.data());

    // 2. Build the location link and message
    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
    const messageBody = `EMERGENCY ALERT: This person needs help. Live location: ${mapsLink}`;

    // 3. SIMULATE sending SMS (real provider integration pending — Twilio trial + Fast2SMS both require payment verification not available right now)
    const notifications = contacts.map((contact) => ({
      phone: contact.phone,
      name: contact.name,
      message: messageBody,
      status: "simulated_sent",
      sentAt: new Date(),
    }));

    console.log("📱 [SIMULATED SMS] Would send to:");
    notifications.forEach((n) => console.log(`   → ${n.name} (${n.phone}): "${n.message}"`));

    // 4. Save the SOS event to Firestore, including the simulated notification log
    const sosEventRef = await db.collection("sosEvents").add({
      userId,
      lat,
      lng,
      status: "active",
      contactsNotified: notifications.length,
      contactsFailed: 0,
      notificationLog: notifications,
      triggeredAt: new Date(),
    });

    res.status(200).json({
      message: "SOS triggered",
      sosEventId: sosEventRef.id,
      contactsNotified: notifications.length,
      contactsFailed: 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to trigger SOS" });
  }
};

module.exports = { triggerSOS };