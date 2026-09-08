const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");

const {
  fakerEN_IN: faker,
} = require("@faker-js/faker");

const serviceAccount =
  require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();


// ============================================================
// CONFIG
// ============================================================

const CITY_CENTER = {
  lat: 26.9124,
  lng: 75.7873,
};

const HOSPITAL_COUNT = 10;
const AMBULANCE_COUNT = 30;
const DRIVER_COUNT = 30;
const MEDICINE_COUNT = 100;
const USER_COUNT = 5;
const BLOOD_DRIVE_COUNT = 12;

const DEMO_USER_ID =
  "cbab8131-96e5-4ea4-a580-c8db339ffc5f";


// ============================================================
// CONSTANTS
// ============================================================

const JAIPUR_AREAS = [
  "Malviya Nagar",
  "Vaishali Nagar",
  "C-Scheme",
  "Mansarovar",
  "Jagatpura",
  "Tonk Road",
  "Vidhyadhar Nagar",
  "Raja Park",
  "Bani Park",
  "Sanganer",
];

const BLOOD_TYPES = [
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
];

const BLOOD_DONATION_NGOS = [
  "Indian Red Cross Society, Jaipur",
  "Sankalp India Foundation",
  "Lions Blood Bank Jaipur",
  "Rotary Club of Jaipur",
  "Jeevan Dhara Blood Bank",
  "Thalassemia & Sickle Cell Society",
];

const MEDICINE_CATEGORIES = [
  "Pain Relief",
  "Antibiotics",
  "Cardiac",
  "Diabetes",
  "Respiratory",
  "Digestive",
  "Vitamins & Supplements",
  "Skin Care",
  "First Aid",
  "Allergy",
];

const AMBULANCE_TYPES = [
  "BLS",
  "ALS",
  "ICU",
];

const SOS_STATUSES = [
  "resolved",
  "resolved",
  "resolved",
  "cancelled",
  "active",
];

const REQUEST_STATUSES = [
  "completed",
  "completed",
  "completed",
  "cancelled",
  "pending",
];


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function randomNearbyCoords(
  center,
  radiusKm = 15
) {
  const radiusInDegrees =
    radiusKm / 111;

  const angle =
    Math.random() * 2 * Math.PI;

  const distance =
    Math.random() *
    radiusInDegrees;

  return {
    lat:
      center.lat +
      distance *
        Math.cos(angle),

    lng:
      center.lng +
      distance *
        Math.sin(angle),
  };
}


function randomPastDate(
  daysBack = 60
) {
  return Timestamp.fromDate(
    faker.date.recent({
      days: daysBack,
    })
  );
}


// ============================================================
// HOSPITALS
// ============================================================

function generateHospitals() {
  return Array.from(
    { length: HOSPITAL_COUNT },
    () => {
      const coords =
        randomNearbyCoords(
          CITY_CENTER
        );

      const totalBeds =
        faker.number.int({
          min: 40,
          max: 300,
        });

      const availableBeds =
        faker.number.int({
          min: 0,
          max: totalBeds,
        });

      const icuTotal =
        faker.number.int({
          min: 10,
          max: 40,
        });

      const icuAvailable =
        faker.number.int({
          min: 0,
          max: icuTotal,
        });

      const area =
        faker.helpers.arrayElement(
          JAIPUR_AREAS
        );

      return {
        id: faker.string.uuid(),

        name: `${area} ${faker.helpers.arrayElement([
          "General Hospital",
          "Medical Center",
          "Trauma Center",
          "Multispecialty Hospital",
        ])}`,

        address:
          `${faker.location.buildingNumber()}, ` +
          `${area}, Jaipur, Rajasthan ` +
          `${faker.location.zipCode(
            "3020##"
          )}`,

        lat: coords.lat,
        lng: coords.lng,

        phone:
          faker.phone.number(),

        totalBeds,

        availableBeds,

        icuTotal,

        icuAvailable,

        isTraumaCenter:
          faker.datatype.boolean(),

        rating:
          faker.number.float({
            min: 3.2,
            max: 5,
            fractionDigits: 1,
          }),

        lastUpdated:
          FieldValue.serverTimestamp(),
      };
    }
  );
}


// ============================================================
// DRIVERS
// ============================================================

function generateDrivers() {
  return Array.from(
    { length: DRIVER_COUNT },
    (_, i) => ({
      id: faker.string.uuid(),

      name:
        faker.person.fullName(),

      phone:
        faker.phone.number(),

      licenseNumber:
        faker.string
          .alphanumeric(10)
          .toUpperCase(),

      yearsExperience:
        faker.number.int({
          min: 1,
          max: 20,
        }),

      // First 10 drivers are guaranteed
      // to be available for SOS dispatch.
      status:
        i < 10
          ? "on-duty"
          : "off-duty",

      rating:
        faker.number.float({
          min: 3.5,
          max: 5,
          fractionDigits: 1,
        }),
    })
  );
}


// ============================================================
// AMBULANCES
// ============================================================

function generateAmbulances(
  hospitals,
  drivers
) {
  return Array.from(
    { length: AMBULANCE_COUNT },
    (_, i) => {

      const hospital =
        faker.helpers.arrayElement(
          hospitals
        );

      let coords;

      // --------------------------------------------------------
      // GUARANTEED SOS DEMO AMBULANCE
      // --------------------------------------------------------
      //
      // The demo user location from the app is approximately:
      //
      // 26.8442342, 75.564581
      //
      // This ambulance starts very close to that location.
      //

      if (i === 0) {
        coords = {
          lat: 26.8500,
          lng: 75.5700,
        };
      } else {
        coords =
          randomNearbyCoords(
            {
              lat: hospital.lat,
              lng: hospital.lng,
            },
            5
          );
      }

      return {
        id:
          faker.string.uuid(),

        vehicleNumber:
          `RJ-${faker.number.int({
            min: 10,
            max: 99,
          })}-` +
          `${faker.string.alpha({
            length: 2,
            casing: "upper",
          })}-` +
          `${faker.number.int({
            min: 1000,
            max: 9999,
          })}`,

        type:
          faker.helpers.arrayElement(
            AMBULANCE_TYPES
          ),

        hospitalId:
          hospital.id,

        // Every ambulance gets a driver.
        // First 10 correspond to on-duty drivers.
        driverId:
          drivers[
            i % drivers.length
          ].id,

        // First 10 ambulances are guaranteed
        // to be available.
        status:
          i < 10
            ? "available"
            : faker.helpers.arrayElement([
                "enroute",
                "busy",
              ]),

        currentLat:
          coords.lat,

        currentLng:
          coords.lng,

        lastUpdated:
          FieldValue.serverTimestamp(),
      };
    }
  );
}


// ============================================================
// MEDICINES
// ============================================================

function generateMedicines() {
  const medicines = [
    {
      name: "Paracetamol",
      genericName: "Paracetamol",
      category: "Pain Relief",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 25,
      prescriptionRequired: false,
      description:
        "Analgesic and antipyretic medicine.",
    },

    {
      name: "Ibuprofen",
      genericName: "Ibuprofen",
      category: "Pain Relief",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 35,
      prescriptionRequired: false,
      description:
        "Non-steroidal anti-inflammatory medicine.",
    },

    {
      name: "Amoxicillin",
      genericName: "Amoxicillin",
      category: "Antibiotics",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 80,
      prescriptionRequired: true,
      description:
        "Penicillin-class antibiotic.",
    },

    {
      name: "Azithromycin",
      genericName: "Azithromycin",
      category: "Antibiotics",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 65,
      prescriptionRequired: true,
      description:
        "Macrolide antibiotic.",
    },

    {
      name: "Cetirizine",
      genericName: "Cetirizine",
      category: "Allergy",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 20,
      prescriptionRequired: false,
      description:
        "Antihistamine medicine.",
    },

    {
      name: "Levocetirizine",
      genericName: "Levocetirizine",
      category: "Allergy",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 30,
      prescriptionRequired: false,
      description:
        "Antihistamine medicine.",
    },

    {
      name: "Metformin",
      genericName: "Metformin",
      category: "Diabetes",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 30,
      prescriptionRequired: true,
      description:
        "Medicine used in the management of type 2 diabetes.",
    },

    {
      name: "Atorvastatin",
      genericName: "Atorvastatin",
      category: "Cardiac",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 45,
      prescriptionRequired: true,
      description:
        "Statin medicine used to manage cholesterol.",
    },

    {
      name: "Amlodipine",
      genericName: "Amlodipine",
      category: "Cardiac",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 25,
      prescriptionRequired: true,
      description:
        "Calcium channel blocker.",
    },

    {
      name: "Losartan",
      genericName: "Losartan",
      category: "Cardiac",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 35,
      prescriptionRequired: true,
      description:
        "Angiotensin receptor blocker.",
    },

    {
      name: "Telmisartan",
      genericName: "Telmisartan",
      category: "Cardiac",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 40,
      prescriptionRequired: true,
      description:
        "Angiotensin receptor blocker.",
    },

    {
      name: "Aspirin",
      genericName: "Aspirin",
      category: "Cardiac",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 20,
      prescriptionRequired: false,
      description:
        "Antiplatelet medicine.",
    },

    {
      name: "Clopidogrel",
      genericName: "Clopidogrel",
      category: "Cardiac",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 55,
      prescriptionRequired: true,
      description:
        "Antiplatelet medicine.",
    },

    {
      name: "Omeprazole",
      genericName: "Omeprazole",
      category: "Digestive",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 30,
      prescriptionRequired: false,
      description:
        "Proton pump inhibitor medicine.",
    },

    {
      name: "Pantoprazole",
      genericName: "Pantoprazole",
      category: "Digestive",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 40,
      prescriptionRequired: false,
      description:
        "Proton pump inhibitor medicine.",
    },

    {
      name: "Ondansetron",
      genericName: "Ondansetron",
      category: "Digestive",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 30,
      prescriptionRequired: true,
      description:
        "Medicine used to prevent nausea and vomiting.",
    },

    {
      name: "Salbutamol",
      genericName: "Salbutamol",
      category: "Respiratory",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 25,
      prescriptionRequired: true,
      description:
        "Bronchodilator medicine.",
    },

    {
      name: "Montelukast",
      genericName: "Montelukast",
      category: "Respiratory",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 50,
      prescriptionRequired: true,
      description:
        "Leukotriene receptor antagonist.",
    },

    {
      name: "Clotrimazole",
      genericName: "Clotrimazole",
      category: "Skin Care",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 40,
      prescriptionRequired: false,
      description:
        "Topical antifungal medicine.",
    },

    {
      name: "Vitamin D3",
      genericName: "Cholecalciferol",
      category:
        "Vitamins & Supplements",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 60,
      prescriptionRequired: false,
      description:
        "Vitamin D supplement.",
    },

    {
      name: "Vitamin B12",
      genericName: "Cyanocobalamin",
      category:
        "Vitamins & Supplements",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 50,
      prescriptionRequired: false,
      description:
        "Vitamin B12 supplement.",
    },

    {
      name: "Calcium Carbonate",
      genericName: "Calcium Carbonate",
      category:
        "Vitamins & Supplements",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 45,
      prescriptionRequired: false,
      description:
        "Calcium supplement.",
    },

    {
      name: "Iron Folic Acid",
      genericName:
        "Ferrous Fumarate + Folic Acid",
      category:
        "Vitamins & Supplements",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 35,
      prescriptionRequired: false,
      description:
        "Iron and folic acid supplement.",
    },

    {
      name: "Zinc Sulphate",
      genericName: "Zinc Sulphate",
      category:
        "Vitamins & Supplements",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 30,
      prescriptionRequired: false,
      description:
        "Zinc supplement.",
    },

    {
      name: "Multivitamin",
      genericName: "Multivitamin",
      category:
        "Vitamins & Supplements",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 80,
      prescriptionRequired: false,
      description:
        "Combination vitamin and mineral supplement.",
    },

    {
      name: "ORS Sachets",
      genericName:
        "Oral Rehydration Salts",
      category: "First Aid",
      manufacturer:
        "Generic Pharmaceuticals",
      price: 10,
      prescriptionRequired: false,
      description:
        "Oral rehydration solution preparation.",
    },
  ];

  return Array.from(
    { length: MEDICINE_COUNT },
    (_, index) => {
      const medicine =
        medicines[
          index % medicines.length
        ];

      return {
        id: faker.string.uuid(),

        ...medicine,

        stock:
          faker.number.int({
            min: 20,
            max: 500,
          }),
      };
    }
  );
}


// ============================================================
// USERS
// ============================================================

function generateUsers() {
  return Array.from(
    { length: USER_COUNT },
    () => ({
      id: faker.string.uuid(),

      name:
        faker.person.fullName(),

      phone:
        faker.phone.number(),

      email:
        faker.internet.email(),

      bloodType:
        faker.helpers.arrayElement(
          BLOOD_TYPES
        ),

      dateOfBirth:
        faker.date
          .birthdate({
            min: 18,
            max: 75,
            mode: "age",
          })
          .toISOString()
          .split("T")[0],

      allergies:
        faker.helpers.arrayElements(
          [
            "Penicillin",
            "Peanuts",
            "Latex",
            "Pollen",
            "Dust",
            "None",
          ],
          {
            min: 0,
            max: 2,
          }
        ),

      createdAt:
        FieldValue.serverTimestamp(),
    })
  );
}


// ============================================================
// EMERGENCY CONTACTS
// ============================================================

function generateEmergencyContacts(
  users
) {
  const contacts = [];

  users.forEach((user) => {
    const contactCount =
      faker.number.int({
        min: 1,
        max: 3,
      });

    for (
      let i = 0;
      i < contactCount;
      i++
    ) {
      contacts.push({
        id: faker.string.uuid(),

        userId:
          user.id,

        name:
          faker.person.fullName(),

        phone:
          faker.phone.number(),

        relation:
          faker.helpers.arrayElement([
            "Parent",
            "Sibling",
            "Spouse",
            "Friend",
            "Child",
          ]),
      });
    }
  });

  return contacts;
}


// ============================================================
// SOS EVENTS
// ============================================================

function generateSOSEvents(
  users,
  hospitals,
  ambulances
) {
  const events = [];

  users.forEach((user) => {
    const eventCount =
      faker.number.int({
        min: 0,
        max: 3,
      });

    for (
      let i = 0;
      i < eventCount;
      i++
    ) {
      const hospital =
        faker.helpers.arrayElement(
          hospitals
        );

      const ambulance =
        faker.helpers.arrayElement(
          ambulances
        );

      const coords =
        randomNearbyCoords(
          CITY_CENTER
        );

      events.push({
        id: faker.string.uuid(),

        userId:
          user.id,

        status:
          faker.helpers.arrayElement(
            SOS_STATUSES
          ),

        lat:
          coords.lat,

        lng:
          coords.lng,

        hospitalId:
          hospital.id,

        ambulanceId:
          ambulance.id,

        triggeredAt:
          randomPastDate(30),

        resolvedAt:
          randomPastDate(29),
      });
    }
  });

  return events;
}


// ============================================================
// AMBULANCE REQUESTS
// ============================================================

function generateAmbulanceRequests(
  users,
  ambulances,
  hospitals
) {
  const requests = [];

  users.forEach((user) => {
    const requestCount =
      faker.number.int({
        min: 0,
        max: 2,
      });

    for (
      let i = 0;
      i < requestCount;
      i++
    ) {
      const ambulance =
        faker.helpers.arrayElement(
          ambulances
        );

      const hospital =
        faker.helpers.arrayElement(
          hospitals
        );

      const coords =
        randomNearbyCoords(
          CITY_CENTER
        );

      requests.push({
        id: faker.string.uuid(),

        userId:
          user.id,

        ambulanceId:
          ambulance.id,

        hospitalId:
          hospital.id,

        status:
          faker.helpers.arrayElement(
            REQUEST_STATUSES
          ),

        pickupLat:
          coords.lat,

        pickupLng:
          coords.lng,

        requestedAt:
          randomPastDate(30),

        completedAt:
          randomPastDate(29),
      });
    }
  });

  return requests;
}


// ============================================================
// BLOOD DONATION DRIVES
// ============================================================

function generateBloodDonationDrives() {
  return Array.from(
    { length: BLOOD_DRIVE_COUNT },
    () => {

      const coords =
        randomNearbyCoords(
          CITY_CENTER
        );

      const area =
        faker.helpers.arrayElement(
          JAIPUR_AREAS
        );

      const ngo =
        faker.helpers.arrayElement(
          BLOOD_DONATION_NGOS
        );

      const daysFromNow =
        faker.number.int({
          min: 0,
          max: 30,
        });

      const driveDate =
        Timestamp.fromDate(
          new Date(
            Date.now() +
              daysFromNow *
                24 *
                60 *
                60 *
                1000
          )
        );

      const totalSlots =
        faker.number.int({
          min: 30,
          max: 150,
        });

      const status =
        daysFromNow === 0
          ? faker.helpers.arrayElement([
              "ongoing",
              "upcoming",
            ])
          : "upcoming";

      return {
        id: faker.string.uuid(),

        name:
          `Blood Donation Camp — ${area}`,

        ngo,

        organizer:
          ngo,

        address:
          `${faker.location.buildingNumber()}, ` +
          `${area}, Jaipur, Rajasthan`,

        area,

        lat:
          coords.lat,

        lng:
          coords.lng,

        phone:
          faker.phone.number(),

        date:
          driveDate,

        startTime:
          "9:00 AM",

        endTime:
          "5:00 PM",

        bloodTypesNeeded:
          faker.helpers.arrayElements(
            BLOOD_TYPES,
            {
              min: 2,
              max: 5,
            }
          ),

        totalSlots,

        registeredDonors:
          faker.number.int({
            min: 0,
            max: totalSlots,
          }),

        status,

        description:
          "Donate blood and save lives. Walk-ins welcome; bring a valid government ID.",
      };
    }
  );
}


// ============================================================
// CLEAR EXISTING DATA
// ============================================================

async function clearCollection(
  collectionName
) {
  const snapshot =
    await db
      .collection(collectionName)
      .get();

  if (snapshot.empty) {
    console.log(
      `⚪ "${collectionName}" already empty`
    );

    return;
  }

  const batchSize = 400;

  const docs =
    snapshot.docs;

  for (
    let i = 0;
    i < docs.length;
    i += batchSize
  ) {
    const batch =
      db.batch();

    docs
      .slice(
        i,
        i + batchSize
      )
      .forEach((doc) => {
        batch.delete(
          doc.ref
        );
      });

    await batch.commit();
  }

  console.log(
    `🗑️ Cleared ${docs.length} docs from "${collectionName}"`
  );
}


async function clearAll() {
  const collections = [
    "hospitals",
    "drivers",
    "ambulances",
    "medicines",
    "users",
    "emergencyContacts",
    "sosEvents",
    "ambulanceRequests",
    "bloodDonationDrives",
    "bloodDonationRegistrations",
  ];

  for (
    const name of collections
  ) {
    await clearCollection(
      name
    );
  }
}


// ============================================================
// WRITE TO FIRESTORE
// ============================================================

async function seedCollection(
  collectionName,
  docs
) {
  const batchSize = 400;

  for (
    let i = 0;
    i < docs.length;
    i += batchSize
  ) {
    const batch =
      db.batch();

    const chunk =
      docs.slice(
        i,
        i + batchSize
      );

    chunk.forEach((doc) => {
      const ref =
        db
          .collection(
            collectionName
          )
          .doc(doc.id);

      batch.set(
        ref,
        doc
      );
    });

    await batch.commit();
  }

  console.log(
    `✅ Seeded ${docs.length} docs into "${collectionName}"`
  );
}


// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log(
    "🧹 Clearing old data...\n"
  );

  await clearAll();

  console.log(
    "\n🌱 Starting seed (Jaipur)...\n"
  );


  // ==========================================================
  // GENERATE DATA
  // ==========================================================

  const hospitals =
    generateHospitals();

  const drivers =
    generateDrivers();

  const ambulances =
    generateAmbulances(
      hospitals,
      drivers
    );

  const medicines =
    generateMedicines();

  const users =
    generateUsers();

  const emergencyContacts =
    generateEmergencyContacts(
      users
    );


  // ==========================================================
  // ENSURE DEMO USER EXISTS
  // ==========================================================

  const demoUserExists =
    users.some(
      (u) =>
        u.id ===
        DEMO_USER_ID
    );

  if (!demoUserExists) {

    users.push({
      id:
        DEMO_USER_ID,

      name:
        "Demo User",

      phone:
        "9999999999",

      email:
        "demo@lifelink.local",

      bloodType:
        "O+",

      dateOfBirth:
        "1995-01-01",

      allergies:
        [],

      createdAt:
        FieldValue.serverTimestamp(),
    });


    emergencyContacts.push(
      {
        id:
          faker.string.uuid(),

        userId:
          DEMO_USER_ID,

        name:
          "Emergency Contact 1",

        phone:
          "9876543210",

        relation:
          "Parent",
      },

      {
        id:
          faker.string.uuid(),

        userId:
          DEMO_USER_ID,

        name:
          "Emergency Contact 2",

        phone:
          "9876543211",

        relation:
          "Sibling",
      }
    );

  } else {

    const hasContacts =
      emergencyContacts.some(
        (c) =>
          c.userId ===
          DEMO_USER_ID
      );

    if (!hasContacts) {

      emergencyContacts.push({
        id:
          faker.string.uuid(),

        userId:
          DEMO_USER_ID,

        name:
          "Emergency Contact 1",

        phone:
          "9876543210",

        relation:
          "Parent",
      });
    }
  }


  // ==========================================================
  // OTHER DATA
  // ==========================================================

  const sosEvents =
    generateSOSEvents(
      users,
      hospitals,
      ambulances
    );

  const ambulanceRequests =
    generateAmbulanceRequests(
      users,
      ambulances,
      hospitals
    );

  const bloodDonationDrives =
    generateBloodDonationDrives();


  // ==========================================================
  // SEED FIRESTORE
  // ==========================================================

  await seedCollection(
    "hospitals",
    hospitals
  );

  await seedCollection(
    "drivers",
    drivers
  );

  await seedCollection(
    "ambulances",
    ambulances
  );

  await seedCollection(
    "medicines",
    medicines
  );

  await seedCollection(
    "users",
    users
  );

  await seedCollection(
    "emergencyContacts",
    emergencyContacts
  );

  await seedCollection(
    "sosEvents",
    sosEvents
  );

  await seedCollection(
    "ambulanceRequests",
    ambulanceRequests
  );

  await seedCollection(
    "bloodDonationDrives",
    bloodDonationDrives
  );


  console.log(
    "\n🎉 Seed complete!"
  );

  console.log(
    "🚑 SOS demo ambulance is guaranteed to be available."
  );

  console.log(
    "👨‍✈️ SOS demo driver is guaranteed to be on-duty."
  );

  process.exit(0);
}


// ============================================================
// ERROR HANDLING
// ============================================================

main().catch((err) => {
  console.error(
    "❌ Seed failed:",
    err
  );

  process.exit(1);
});