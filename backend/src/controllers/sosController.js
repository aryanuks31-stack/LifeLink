const db = require("../config/firebase");

// ========================================
// CONFIGURATION
// ========================================

const AMBULANCE_SEARCH_RADIUS_KM = 10;
const AMBULANCE_SPEED_KMH = 35;
const HOSPITAL_SPEED_KMH = 35;

const MIN_ETA_SECONDS = 120;
const MAX_ETA_SECONDS = 3600;


// ========================================
// VALIDATE COORDINATE
// ========================================

function isValidCoordinate(value, min, max) {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= min &&
    number <= max
  );
}


// ========================================
// HAVERSINE DISTANCE
// ========================================

function haversineMeters(
  lat1,
  lng1,
  lat2,
  lng2
) {
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


// ========================================
// FORMAT ETA
// ========================================

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


// ========================================
// ASSIGN AMBULANCE
// ========================================

async function assignAmbulance(lat, lng) {
  const [
    hospitalsSnap,
    ambulancesSnap,
    driversSnap,
  ] = await Promise.all([
    db
      .collection("hospitals")
      .get(),

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


  // ========================================
  // CHECK HOSPITALS
  // ========================================

  if (hospitals.length === 0) {
    throw new Error(
      "No hospitals available"
    );
  }


  // ========================================
  // FIND NEAREST HOSPITAL
  // ========================================

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

    const distance =
      haversineMeters(
        lat,
        lng,
        Number(hospital.lat),
        Number(hospital.lng)
      );

    if (
      distance <
      nearestHospitalDist
    ) {
      nearestHospitalDist =
        distance;

      nearestHospital =
        hospital;
    }
  }

  if (!nearestHospital) {
    throw new Error(
      "No hospitals have valid coordinates"
    );
  }


  // ========================================
  // FIND NEAREST AVAILABLE AMBULANCE
  // ========================================

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

    const distance =
      haversineMeters(
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
      nearestAmbulance =
        ambulance;

      nearestAmbulanceDist =
        distance;
    }
  }


  // ========================================
  // FIND ASSIGNED DRIVER
  // ========================================

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


  // ========================================
  // REQUIRE DRIVER
  // ========================================

  if (
    !nearestAmbulance ||
    !chosenDriver
  ) {
    nearestAmbulance = null;
    nearestAmbulanceDist =
      Infinity;

    chosenDriver = null;
  }


  // ========================================
  // RESERVE AMBULANCE
  // ========================================

  if (nearestAmbulance) {
    const ambulanceRef =
      db
        .collection("ambulances")
        .doc(
          nearestAmbulance.id
        );

    const reserved =
      await db.runTransaction(
        async (transaction) => {
          const ambulanceDoc =
            await transaction.get(
              ambulanceRef
            );

          if (
            !ambulanceDoc.exists
          ) {
            return false;
          }

          const currentAmbulance =
            ambulanceDoc.data();

          // Make sure it is still available
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

    // Update local object
    nearestAmbulance = {
      ...nearestAmbulance,
      status: "enroute",
    };
  }


  // ========================================
  // CALCULATE ETA
  // ========================================

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

  const etaSeconds =
    Math.max(
      MIN_ETA_SECONDS,
      Math.min(
        totalEtaSeconds,
        MAX_ETA_SECONDS
      )
    );


  // ========================================
  // RETURN DISPATCH
  // ========================================

  return {
    ambulance:
      nearestAmbulance,

    driver:
      chosenDriver,

    hospital:
      nearestHospital,

    etaSeconds,

    etaDisplay:
      formatEta(
        etaSeconds
      ),

    distanceToHospitalMeters:
      Math.round(
        nearestHospitalDist
      ),
  };
}


// ========================================
// TRIGGER SOS
// POST /api/sos/trigger
// ========================================

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


    // ========================================
    // VALIDATE USER ID
    // ========================================

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


    // ========================================
    // VALIDATE LATITUDE
    // ========================================

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


    // ========================================
    // VALIDATE LONGITUDE
    // ========================================

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

    const userLat =
      Number(lat);

    const userLng =
      Number(lng);


    // ========================================
    // FIND EMERGENCY CONTACTS
    // ========================================

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


    // ========================================
    // FIND AMBULANCE + HOSPITAL
    // ========================================

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


    // ========================================
    // GOOGLE MAPS LOCATION
    // ========================================

    const mapsLink =
      `https://www.google.com/maps?q=${userLat},${userLng}`;


    // ========================================
    // NOTIFICATION MESSAGE
    // ========================================

    const messageBody =
      `EMERGENCY ALERT: ${
        contacts[0]?.name ||
        "Someone"
      } needs help. ` +
      `Ambulance enroute. ` +
      `ETA: ${dispatch.etaDisplay}. ` +
      `Live location: ${mapsLink}`;


    // ========================================
    // SIMULATED SMS
    // ========================================

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


    // ========================================
    // SAVE SOS EVENT
    // ========================================

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
            dispatch.ambulance?.id ||
            null,

          // IMPORTANT:
          // Save the ambulance's starting
          // position for live simulation.
          ambulanceStartLat:
            dispatch.ambulance
              ? Number(
                  dispatch.ambulance
                    .currentLat
                )
              : null,

          ambulanceStartLng:
            dispatch.ambulance
              ? Number(
                  dispatch.ambulance
                    .currentLng
                )
              : null,

          driverId:
            dispatch.driver?.id ||
            null,

          hospitalId:
            dispatch.hospital?.id ||
            null,

          etaSeconds:
            dispatch.etaSeconds,

          triggeredAt:
            new Date(),

          resolvedAt:
            null,
        });


    // ========================================
    // RESPONSE
    // ========================================

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
                dispatch.ambulance
                  .id,

              vehicleNumber:
                dispatch.ambulance
                  .vehicleNumber,

              type:
                dispatch.ambulance
                  .type,

              currentLat:
                dispatch.ambulance
                  .currentLat,

              currentLng:
                dispatch.ambulance
                  .currentLng,

              status:
                dispatch.ambulance
                  .status,
            }
          : null,

      driver:
        dispatch.driver
          ? {
              id:
                dispatch.driver.id,

              name:
                dispatch.driver.name,

              phone:
                dispatch.driver.phone,

              licenseNumber:
                dispatch.driver
                  .licenseNumber,

              rating:
                dispatch.driver.rating,
            }
          : null,

      hospital:
        dispatch.hospital
          ? {
              id:
                dispatch.hospital.id,

              name:
                dispatch.hospital.name,

              address:
                dispatch.hospital.address,

              lat:
                dispatch.hospital.lat,

              lng:
                dispatch.hospital.lng,

              phone:
                dispatch.hospital.phone,
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


// ========================================
// GET SOS STATUS
// GET /api/sos/:sosEventId/status
// ========================================
//
// This endpoint provides the current
// ambulance position to the mobile app.
//
// For the current demo, the ambulance
// automatically moves from its starting
// coordinates toward the user's location.
//
// Later, this can be replaced with real
// driver's GPS coordinates.
//

const getSOSStatus = async (
  req,
  res
) => {
  try {
    const {
      sosEventId,
    } = req.params;


    // ========================================
    // VALIDATE SOS ID
    // ========================================

    if (!sosEventId) {
      return res.status(400).json({
        message:
          "sosEventId is required",
      });
    }


    // ========================================
    // GET SOS EVENT
    // ========================================

    const sosDoc =
      await db
        .collection("sosEvents")
        .doc(sosEventId)
        .get();

    if (!sosDoc.exists) {
      return res.status(404).json({
        message:
          "SOS event not found",
      });
    }

    const sos =
      sosDoc.data();


    // ========================================
    // CHECK AMBULANCE
    // ========================================

    if (!sos.ambulanceId) {
      return res.status(404).json({
        message:
          "No ambulance assigned to this SOS",
      });
    }


    // ========================================
    // GET AMBULANCE
    // ========================================

    const ambulanceDoc =
      await db
        .collection("ambulances")
        .doc(
          sos.ambulanceId
        )
        .get();

    if (
      !ambulanceDoc.exists
    ) {
      return res.status(404).json({
        message:
          "Assigned ambulance not found",
      });
    }

    const ambulance =
      ambulanceDoc.data();


    // ========================================
    // USER LOCATION
    // ========================================

    if (
      !isValidCoordinate(
        sos.lat,
        -90,
        90
      ) ||
      !isValidCoordinate(
        sos.lng,
        -180,
        180
      )
    ) {
      return res.status(500).json({
        message:
          "SOS has invalid coordinates",
      });
    }

    const userLat =
      Number(sos.lat);

    const userLng =
      Number(sos.lng);


    // ========================================
    // AMBULANCE START POSITION
    // ========================================

    const startLat =
      Number(
        sos.ambulanceStartLat
      );

    const startLng =
      Number(
        sos.ambulanceStartLng
      );

    if (
      !isValidCoordinate(
        startLat,
        -90,
        90
      ) ||
      !isValidCoordinate(
        startLng,
        -180,
        180
      )
    ) {
      return res.status(500).json({
        message:
          "Ambulance starting coordinates are invalid",
      });
    }


    // ========================================
    // TOTAL DISTANCE
    // ========================================

    const totalDistanceMeters =
      haversineMeters(
        startLat,
        startLng,
        userLat,
        userLng
      );


    // ========================================
    // TRIGGER TIME
    // ========================================

    let triggeredAt;

    if (
      sos.triggeredAt?.toDate
    ) {
      triggeredAt =
        sos.triggeredAt.toDate();
    } else {
      triggeredAt =
        new Date(
          sos.triggeredAt
        );
    }

    if (
      Number.isNaN(
        triggeredAt.getTime()
      )
    ) {
      return res.status(500).json({
        message:
          "SOS trigger time is invalid",
      });
    }


    // ========================================
    // ELAPSED TIME
    // ========================================

    const elapsedSeconds =
      Math.max(
        0,
        (
          Date.now() -
          triggeredAt.getTime()
        ) / 1000
      );


    // ========================================
    // TRAVEL TIME
    // ========================================

    const travelTimeSeconds =
      Math.max(
        60,
        (
          totalDistanceMeters /
          1000
        ) /
          AMBULANCE_SPEED_KMH *
          3600
      );


    // ========================================
    // PROGRESS
    // ========================================

    const progress =
      Math.min(
        elapsedSeconds /
          travelTimeSeconds,
        1
      );


    // ========================================
    // CURRENT AMBULANCE POSITION
    // ========================================

    const currentLat =
      startLat +
      (
        userLat -
        startLat
      ) *
        progress;

    const currentLng =
      startLng +
      (
        userLng -
        startLng
      ) *
        progress;


    // ========================================
    // REMAINING DISTANCE
    // ========================================

    const remainingDistanceMeters =
      totalDistanceMeters *
      (1 - progress);


    // ========================================
    // REMAINING ETA
    // ========================================

    const remainingSeconds =
      Math.max(
        0,
        Math.round(
          travelTimeSeconds *
            (1 - progress)
        )
      );


    // ========================================
    // STATUS
    // ========================================

    const status =
      progress >= 1
        ? "arrived"
        : "enroute";


    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      sosEventId,

      status,

      ambulance: {
        id:
          ambulanceDoc.id,

        vehicleNumber:
          ambulance.vehicleNumber,

        type:
          ambulance.type,

        currentLat,

        currentLng,

        status,
      },

      user: {
        lat:
          userLat,

        lng:
          userLng,
      },

      distanceRemainingMeters:
        Math.round(
          remainingDistanceMeters
        ),

      etaSeconds:
        remainingSeconds,

      etaDisplay:
        formatEta(
          remainingSeconds
        ),
    });
  } catch (error) {
    console.error(
      "Failed to get SOS status:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to get SOS status",
    });
  }
};


// ========================================
// EXPORTS
// ========================================

module.exports = {
  triggerSOS,
  assignAmbulance,
  getSOSStatus,
};