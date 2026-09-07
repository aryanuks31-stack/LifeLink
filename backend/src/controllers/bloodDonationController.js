const db = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const getBloodDonationDrives = async (req, res) => {
  try {
    const { bloodType, status } = req.query;
    let query = db.collection("bloodDonationDrives");

    if (bloodType) {
      query = query.where("bloodTypesNeeded", "array-contains", bloodType.toUpperCase());
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const drives = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(drives);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch blood donation drives" });
  }
};

const getBloodDonationDriveById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("bloodDonationDrives").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Blood donation drive not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch blood donation drive" });
  }
};

const registerForDrive = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const driveRef = db.collection("bloodDonationDrives").doc(id);
    const driveDoc = await driveRef.get();

    if (!driveDoc.exists) {
      return res.status(404).json({ message: "Blood donation drive not found" });
    }

    const drive = driveDoc.data();
    const driveDate = drive.date?.toMillis ? drive.date.toMillis() : new Date(drive.date).getTime();

    if (drive.status === "completed" || driveDate < Date.now()) {
      return res.status(400).json({ message: "This drive has already ended" });
    }

    if (drive.registeredDonors >= drive.totalSlots) {
      return res.status(400).json({ message: "This drive is full" });
    }

    const existing = await db
      .collection("bloodDonationRegistrations")
      .where("driveId", "==", id)
      .where("userId", "==", userId)
      .get();

    if (!existing.empty) {
      return res.status(409).json({ message: "You are already registered for this drive" });
    }

    await db.collection("bloodDonationRegistrations").add({
      driveId: id,
      userId,
      registeredAt: new Date(),
    });

    await driveRef.update({
      registeredDonors: FieldValue.increment(1),
    });

    res.status(201).json({ message: "Registered for drive", driveId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to register for drive" });
  }
};

module.exports = {
  getBloodDonationDrives,
  getBloodDonationDriveById,
  registerForDrive,
};