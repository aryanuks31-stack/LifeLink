const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const serviceAccount =
  require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function main() {

  console.log("\n==============================");
  console.log("CHECKING SOS DATA");
  console.log("==============================\n");

  const ambulancesSnapshot =
    await db
      .collection("ambulances")
      .get();

  const driversSnapshot =
    await db
      .collection("drivers")
      .get();

  console.log(
    "Ambulances:",
    ambulancesSnapshot.size
  );

  console.log(
    "Drivers:",
    driversSnapshot.size
  );

  const drivers =
    driversSnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    );

  const ambulances =
    ambulancesSnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    );

  const onDutyDrivers =
    drivers.filter(
      (driver) =>
        driver.status === "on-duty"
    );

  const availableAmbulances =
    ambulances.filter(
      (ambulance) =>
        ambulance.status === "available"
    );

  console.log(
    "\nOn-duty drivers:",
    onDutyDrivers.length
  );

  console.log(
    "Available ambulances:",
    availableAmbulances.length
  );

  console.log(
    "\n---------- FIRST AMBULANCE ----------"
  );

  console.log(
    JSON.stringify(
      availableAmbulances[0],
      null,
      2
    )
  );

  if (availableAmbulances[0]) {

    const ambulance =
      availableAmbulances[0];

    const driver =
      drivers.find(
        (d) =>
          d.id ===
          ambulance.driverId
      );

    console.log(
      "\n---------- MATCHED DRIVER ----------"
    );

    console.log(
      JSON.stringify(
        driver,
        null,
        2
      )
    );

    console.log(
      "\nDriver ID stored on ambulance:",
      ambulance.driverId
    );

    console.log(
      "Driver found:",
      !!driver
    );

    console.log(
      "Driver status:",
      driver?.status
    );
  }

  console.log(
    "\n=============================="
  );

  process.exit(0);
}

main().catch((error) => {

  console.error(
    "\n❌ CHECK FAILED:"
  );

  console.error(error);

  process.exit(1);
});