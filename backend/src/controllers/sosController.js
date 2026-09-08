const db = require("../config/firebase");

const AMBULANCE_SEARCH_RADIUS_KM = 10;
const AMBULANCE_SPEED_KMH = 35;
const HOSPITAL_SPEED_KMH = 35;

const MIN_ETA_SECONDS = 120;
const MAX_ETA_SECONDS = 3600;

/**
 * Validate a coordinate.
 */
function isValidCoordinate(value, min, max) {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= min &&
    number <= max
  );
}

/**
 * Calculate Haversine distance between two coordinates.
 *
 * Returns distance in meters.
 */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (degrees) =>
    (degrees * Math.PI) / 180;

  const EARTH_RADIUS_METERS = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return (
    EARTH_RADIUS_METERS *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

/**
 * Convert ETA seconds into a human-readable string.
 */
function formatEta(seconds) {
  const safeSeconds = Math.max(
    0,
    Math.round(Number(seconds) || 0)
  );

  const minutes = Math.floor(
    safeSeconds / 60
  );

  const remainingSeconds =
    safeSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(
      minutes / 60
    );

    const remainingMinutes =
      minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
  }

  return `${minutes} min ${remainingSeconds}s`;
}

/**
 * Find the nearest hospital and nearest available
 * ambulance with an available on-duty driver.
 *
 * The ambulance reservation is performed inside a
 * Firestore transaction so two simultaneous SOS
 * requests cannot reserve the same ambulance.
 */
async function assignAmbulance(lat, lng) {
  const [
    hospitalsSnap,
    ambulancesSnap,
    driversSnap,
  ] = await Promise.all([
    db.collection("hospitals").get(),

    db
      .collection("ambulances")
      .where(
        "status",
        "==",
        "available"
      )
      .get(),

    db
      .collection("drivers")
      .where(
        "status",
        "==",
        "on-duty"
      )
      .get(),
  ]);

  const hospitals =
    hospitalsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  const ambulances =
    ambulancesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  const drivers =
    driversSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  if (hospitals.length === 0) {
    throw new Error(
      "No hospitals available"
    );
  }

  // ----------------------------------------
  // Find nearest hospital
  // ----------------------------------------

  let nearestHospital = null;
  let nearestHospitalDist = Infinity;

  for (const hospital of hospitals) {
    if (
      !isValidCoordinate(
        hospital.lat,
        -90,
        90
      ) ||
      !isValidCoordinate(
        hospital.lng,
        -180,
        180
      )
    ) {
      continue;
    }

    const distance = haversineMeters(
      lat,
      lng,
      Number(hospital.lat),
      Number(hospital.lng)
    );

    if (
      distance <
      nearestHospitalDist
    ) {
      nearestHospitalDist = distance;
      nearestHospital = hospital;
    }
  }

  if (!nearestHospital) {
    throw new Error(
      "No hospitals have valid coordinates"
    );
  }

  // ----------------------------------------
  // Find nearest available ambulance
  // ----------------------------------------

  let nearestAmbulance = null;
  let nearestAmbulanceDist = Infinity;

  for (const ambulance of ambulances) {
    if (
      !isValidCoordinate(
        ambulance.currentLat,
        -90,
        90
      ) ||
      !isValidCoordinate(
        ambulance.currentLng,
        -180,
        180
      )
    ) {
      continue;
    }

    const distance = haversineMeters(
      lat,
      lng,
      Number(ambulance.currentLat),
      Number(ambulance.currentLng)
    );

    const distanceKm =
      distance / 1000;

    if (
      distanceKm <=
        AMBULANCE_SEARCH_RADIUS_KM &&
      distance <
        nearestAmbulanceDist
    ) {
      nearestAmbulance = ambulance;
      nearestAmbulanceDist = distance;
    }
  }

  // ----------------------------------------
  // Find the ambulance's assigned driver
  // ----------------------------------------

  let chosenDriver = null;

  if (
    nearestAmbulance?.driverId
  ) {
    chosenDriver =
      drivers.find(
        (driver) =>
          driver.id ===
          nearestAmbulance.driverId
      ) || null;
  }

  /*
   * Do not dispatch an ambulance if its
   * assigned driver isn't currently on-duty.
   */
  if (
    !nearestAmbulance ||
    !chosenDriver
  ) {
    nearestAmbulance = null;
    nearestAmbulanceDist = Infinity;
    chosenDriver = null;
  }

  // ----------------------------------------
  // Atomically reserve ambulance
  // ----------------------------------------

  if (nearestAmbulance) {
    const ambulanceRef = db
      .collection("ambulances")
      .doc(nearestAmbulance.id);

    const reserved =
      await db.runTransaction(
        async (transaction) => {
          const ambulanceDoc =
            await transaction.get(
              ambulanceRef
            );

          if (!ambulanceDoc.exists) {
            return false;
          }

          const currentAmbulance =
            ambulanceDoc.data();

          /*
           * Critical concurrency check:
           * the ambulance must still be available.
           */
          if (
            currentAmbulance.status !==
            "available"
          ) {
            return false;
          }

          transaction.update(
            ambulanceRef,
            {
              status: "enroute",
              lastUpdated:
                new Date(),
            }
          );

          return true;
        }
      );

    if (!reserved) {
      throw new Error(
        "Ambulance was already assigned"
      );
    }

    /*
     * Update the local object so the SOS
     * response reflects the new state.
     */
    nearestAmbulance = {
      ...nearestAmbulance,
      status: "enroute",
    };
  }

  // ----------------------------------------
  // Calculate ETA
  // ----------------------------------------

  const ambulanceToUserKm =
    nearestAmbulance
      ? nearestAmbulanceDist / 1000
      : nearestHospitalDist / 1000;

  const hospitalDistanceKm =
    nearestHospitalDist / 1000;

  const ambulanceToUserHours =
    ambulanceToUserKm /
    AMBULANCE_SPEED_KMH;

  const pickupToHospitalHours =
    hospitalDistanceKm /
    HOSPITAL_SPEED_KMH;

  const totalEtaSeconds =
    Math.round(
      (
        ambulanceToUserHours +
        pickupToHospitalHours
      ) * 3600
    );

  const etaSeconds = Math.max(
    MIN_ETA_SECONDS,
    Math.min(
      totalEtaSeconds,
      MAX_ETA_SECONDS
    )
  );

  return {
    ambulance:
      nearestAmbulance,

    driver:
      chosenDriver,

    hospital:
      nearestHospital,

    etaSeconds,

    etaDisplay:
      formatEta(etaSeconds),

    distanceToHospitalMeters:
      Math.round(
        nearestHospitalDist
      ),
  };
}

/**
 * POST /api/sos/trigger
 *
 * Trigger an SOS emergency event.
 */
const triggerSOS = async (
  req,
  res
) => {
  try {
    const {
      userId,
      lat,
      lng,
    } = req.body;

    // ----------------------------------------
    // Validate user ID
    // ----------------------------------------

    if (
      !userId ||
      typeof userId !== "string" ||
      userId.trim().length === 0
    ) {
      return res.status(400).json({
        message:
          "userId is required",
      });
    }

    const cleanUserId =
      userId.trim();

    // ----------------------------------------
    // Validate latitude
    // ----------------------------------------

    if (
      !isValidCoordinate(
        lat,
        -90,
        90
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid latitude",
      });
    }

    // ----------------------------------------
    // Validate longitude
    // ----------------------------------------

    if (
      !isValidCoordinate(
        lng,
        -180,
        180
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid longitude",
      });
    }

    const userLat = Number(lat);
    const userLng = Number(lng);

    // ----------------------------------------
    // Find emergency contacts
    // ----------------------------------------

    const contactsSnapshot =
      await db
        .collection(
          "emergencyContacts"
        )
        .where(
          "userId",
          "==",
          cleanUserId
        )
        .get();

    if (
      contactsSnapshot.empty
    ) {
      return res.status(404).json({
        message:
          "No emergency contacts found for this user",
      });
    }

    const contacts =
      contactsSnapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      );

    // ----------------------------------------
    // Find ambulance + hospital
    // ----------------------------------------

    let dispatch;

    try {
      dispatch =
        await assignAmbulance(
          userLat,
          userLng
        );
    } catch (error) {
      console.error(
        "Ambulance assignment failed:",
        error
      );

      return res.status(503).json({
        message:
          "Could not find an available ambulance or hospital nearby",
      });
    }

    // ----------------------------------------
    // Create Google Maps location
    // ----------------------------------------

    const mapsLink =
      `https://www.google.com/maps?q=${userLat},${userLng}`;

    // ----------------------------------------
    // Build notification message
    // ----------------------------------------

    const messageBody =
      `EMERGENCY ALERT: ${
        contacts[0]?.name ||
        "Someone"
      } needs help. ` +
      `Ambulance enroute. ` +
      `ETA: ${dispatch.etaDisplay}. ` +
      `Live location: ${mapsLink}`;

    // ----------------------------------------
    // Simulated notifications
    // ----------------------------------------

    const notifications =
      contacts.map(
        (contact) => ({
          phone:
            contact.phone ||
            null,

          name:
            contact.name ||
            null,

          message:
            messageBody,

          status:
            "simulated_sent",

          sentAt:
            new Date(),
        })
      );

    console.log(
      "[SIMULATED SMS] Would send to:"
    );

    notifications.forEach(
      (notification) => {
        console.log(
          `   -> ${
            notification.name ||
            "Unknown"
          } (${
            notification.phone ||
            "No phone"
          })`
        );
      }
    );

    // ----------------------------------------
    // Save SOS event
    // ----------------------------------------

    const sosEventRef =
      await db
        .collection("sosEvents")
        .add({
          userId:
            cleanUserId,

          lat:
            userLat,

          lng:
            userLng,

          status:
            "active",

          contactsNotified:
            notifications.length,

          contactsFailed:
            0,

          notificationLog:
            notifications,

          ambulanceId:
            dispatch
              .ambulance?.id ||
            null,

          driverId:
            dispatch
              .driver?.id ||
            null,

          hospitalId:
            dispatch
              .hospital?.id ||
            null,

          etaSeconds:
            dispatch.etaSeconds,

          triggeredAt:
            new Date(),

          resolvedAt:
            null,
        });

    // ----------------------------------------
    // Response
    // ----------------------------------------

    return res.status(200).json({
      message:
        "SOS triggered - help is on the way",

      sosEventId:
        sosEventRef.id,

      contactsNotified:
        notifications.length,

      contactsFailed:
        0,

      ambulance:
        dispatch.ambulance
          ? {
              id:
                dispatch
                  .ambulance
                  .id,

              vehicleNumber:
                dispatch
                  .ambulance
                  .vehicleNumber,

              type:
                dispatch
                  .ambulance
                  .type,

              currentLat:
                dispatch
                  .ambulance
                  .currentLat,

              currentLng:
                dispatch
                  .ambulance
                  .currentLng,

              status:
                dispatch
                  .ambulance
                  .status,
            }
          : null,

      driver:
        dispatch.driver
          ? {
              id:
                dispatch
                  .driver.id,

              name:
                dispatch
                  .driver.name,

              phone:
                dispatch
                  .driver.phone,

              licenseNumber:
                dispatch
                  .driver
                  .licenseNumber,

              rating:
                dispatch
                  .driver.rating,
            }
          : null,

      hospital:
        dispatch.hospital
          ? {
              id:
                dispatch
                  .hospital.id,

              name:
                dispatch
                  .hospital.name,

              address:
                dispatch
                  .hospital.address,

              lat:
                dispatch
                  .hospital.lat,

              lng:
                dispatch
                  .hospital.lng,

              phone:
                dispatch
                  .hospital.phone,
            }
          : null,

      etaSeconds:
        dispatch.etaSeconds,

      etaDisplay:
        dispatch.etaDisplay,

      distanceToHospitalMeters:
        dispatch
          .distanceToHospitalMeters,
    });
  } catch (error) {
    console.error(
      "Failed to trigger SOS:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to trigger SOS",
    });
  }
};

module.exports = {
  triggerSOS,
  assignAmbulance,
};
