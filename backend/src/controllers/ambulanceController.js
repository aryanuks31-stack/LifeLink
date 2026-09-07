const db = require("../config/firebase");

const AVERAGE_CITY_SPEED_KMH = 30;

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function etaMinutes(distanceKm) {
  return Math.max(1, Math.round((distanceKm / AVERAGE_CITY_SPEED_KMH) * 60));
}

async function getDriver(driverId) {
  const doc = await db.collection("drivers").doc(driverId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

const getAmbulances = async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = db.collection("ambulances");

    if (status) {
      query = query.where("status", "==", status);
    }

    if (type) {
      query = query.where("type", "==", type);
    }

    const snapshot = await query.get();
    const ambulances = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(ambulances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch ambulances" });
  }
};

const getAmbulanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("ambulances").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Ambulance not found" });
    }

    const ambulance = { id: doc.id, ...doc.data() };
    const driver = await getDriver(ambulance.driverId);

    res.status(200).json({ ...ambulance, driver });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch ambulance" });
  }
};

const getNearestAmbulance = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: "lat and lng query params are required" });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const snapshot = await db.collection("ambulances").get();
    const ambulances = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const available = ambulances.filter((a) => a.status === "available");

    if (available.length === 0) {
      return res.status(404).json({ message: "No ambulances available right now" });
    }

    const ranked = available
      .map((ambulance) => ({
        ambulance,
        distanceKm: haversineKm(userLat, userLng, ambulance.currentLat, ambulance.currentLng),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const { ambulance, distanceKm } = ranked[0];
    const driver = await getDriver(ambulance.driverId);

    const hospitalsSnapshot = await db.collection("hospitals").get();
    const hospitals = hospitalsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const nearestHospital = hospitals
      .map((h) => ({ hospital: h, distanceKm: haversineKm(userLat, userLng, h.lat, h.lng) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0]?.hospital ?? null;

    res.status(200).json({
      ambulance: { ...ambulance, driver },
      distanceKm: Math.round(distanceKm * 10) / 10,
      etaMinutes: etaMinutes(distanceKm),
      nearestHospital,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to find nearest ambulance" });
  }
};

module.exports = {
  getAmbulances,
  getAmbulanceById,
  getNearestAmbulance,
};