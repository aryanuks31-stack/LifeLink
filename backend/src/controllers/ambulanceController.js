const db = require("../config/firebase");

const AVERAGE_CITY_SPEED_KMH = 30;

function isValidCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return (
    2 *
    earthRadiusKm *
    Math.asin(Math.sqrt(a))
  );
}

function etaMinutes(distanceKm) {
  return Math.max(
    1,
    Math.round((distanceKm / AVERAGE_CITY_SPEED_KMH) * 60)
  );
}

function hasValidLocation(item, latField, lngField) {
  return (
    isValidCoordinate(item[latField], -90, 90) &&
    isValidCoordinate(item[lngField], -180, 180)
  );
}

async function getDriver(driverId) {
  if (!driverId) {
    return null;
  }

  const doc = await db.collection("drivers").doc(driverId).get();

  return doc.exists
    ? { id: doc.id, ...doc.data() }
    : null;
}

// --------------------------------------------------
// GET /api/ambulances
// --------------------------------------------------

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

    const ambulances = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(ambulances);
  } catch (error) {
    console.error("Failed to fetch ambulances:", error);

    return res.status(500).json({
      message: "Failed to fetch ambulances",
    });
  }
};

// --------------------------------------------------
// GET /api/ambulances/:id
// --------------------------------------------------

const getAmbulanceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Ambulance ID is required",
      });
    }

    const doc = await db.collection("ambulances").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        message: "Ambulance not found",
      });
    }

    const ambulance = {
      id: doc.id,
      ...doc.data(),
    };

    const driver = await getDriver(ambulance.driverId);

    return res.status(200).json({
      ...ambulance,
      driver,
    });
  } catch (error) {
    console.error("Failed to fetch ambulance:", error);

    return res.status(500).json({
      message: "Failed to fetch ambulance",
    });
  }
};

// --------------------------------------------------
// GET /api/ambulances/nearest?lat=...&lng=...
// --------------------------------------------------

const getNearestAmbulance = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!isValidCoordinate(lat, -90, 90)) {
      return res.status(400).json({
        message: "Invalid latitude",
      });
    }

    if (!isValidCoordinate(lng, -180, 180)) {
      return res.status(400).json({
        message: "Invalid longitude",
      });
    }

    const userLat = Number(lat);
    const userLng = Number(lng);

    // Fetch available ambulances.
    const snapshot = await db
      .collection("ambulances")
      .where("status", "==", "available")
      .get();

    const ambulances = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Ignore ambulances without usable GPS coordinates.
    const available = ambulances.filter((ambulance) =>
      hasValidLocation(
        ambulance,
        "currentLat",
        "currentLng"
      )
    );

    if (available.length === 0) {
      return res.status(404).json({
        message: "No ambulances available right now",
      });
    }

    // Rank by distance from the user.
    const ranked = available
      .map((ambulance) => ({
        ambulance,
        distanceKm: haversineKm(
          userLat,
          userLng,
          Number(ambulance.currentLat),
          Number(ambulance.currentLng)
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const { ambulance, distanceKm } = ranked[0];

    const driver = await getDriver(ambulance.driverId);

    // --------------------------------------------------
    // Find nearest hospital
    // --------------------------------------------------

    const hospitalsSnapshot = await db
      .collection("hospitals")
      .get();

    const hospitals = hospitalsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((hospital) =>
        hasValidLocation(hospital, "lat", "lng")
      );

    const nearestHospital =
      hospitals.length > 0
        ? hospitals
            .map((hospital) => ({
              hospital,
              distanceKm: haversineKm(
                userLat,
                userLng,
                Number(hospital.lat),
                Number(hospital.lng)
              ),
            }))
            .sort(
              (a, b) => a.distanceKm - b.distanceKm
            )[0].hospital
        : null;

    return res.status(200).json({
      ambulance: {
        ...ambulance,
        driver,
      },

      distanceKm:
        Math.round(distanceKm * 10) / 10,

      etaMinutes: etaMinutes(distanceKm),

      nearestHospital,
    });
  } catch (error) {
    console.error(
      "Failed to find nearest ambulance:",
      error
    );

    return res.status(500).json({
      message: "Failed to find nearest ambulance",
    });
  }
};

module.exports = {
  getAmbulances,
  getAmbulanceById,
  getNearestAmbulance,
};