const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { fakerEN_IN: faker } = require('@faker-js/faker');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// ---------- Config ----------
const CITY_CENTER = { lat: 26.9124, lng: 75.7873 }; // Jaipur
const HOSPITAL_COUNT = 10;
const AMBULANCE_COUNT = 30;
const DRIVER_COUNT = 30;
const MEDICINE_COUNT = 100;
const USER_COUNT = 5;
const BLOOD_DRIVE_COUNT = 12;

const JAIPUR_AREAS = [
  'Malviya Nagar', 'Vaishali Nagar', 'C-Scheme', 'Mansarovar', 'Jagatpura',
  'Tonk Road', 'Vidhyadhar Nagar', 'Raja Park', 'Bani Park', 'Sanganer',
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const BLOOD_DONATION_NGOS = [
  'Indian Red Cross Society, Jaipur',
  'Sankalp India Foundation',
  'Lions Blood Bank Jaipur',
  'Rotary Club of Jaipur',
  'Jeevan Dhara Blood Bank',
  'Thalassemia & Sickle Cell Society',
];
const MEDICINE_CATEGORIES = [
  'Pain Relief', 'Antibiotics', 'Cardiac', 'Diabetes', 'Respiratory',
  'Digestive', 'Vitamins & Supplements', 'Skin Care', 'First Aid', 'Allergy',
];
const AMBULANCE_TYPES = ['BLS', 'ALS', 'ICU'];
const SOS_STATUSES = ['resolved', 'resolved', 'resolved', 'cancelled', 'active'];
const REQUEST_STATUSES = ['completed', 'completed', 'completed', 'cancelled', 'pending'];

const MEDICINE_NAMES = [
  'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Azithromycin', 'Cetirizine',
  'Metformin', 'Atorvastatin', 'Amlodipine', 'Omeprazole', 'Pantoprazole',
  'Losartan', 'Telmisartan', 'Aspirin', 'Clopidogrel', 'Insulin Glargine',
  'Salbutamol', 'Montelukast', 'Levocetirizine', 'Diclofenac', 'Naproxen',
  'Ciprofloxacin', 'Doxycycline', 'Metronidazole', 'Ranitidine', 'Domperidone',
  'Ondansetron', 'Cefixime', 'Prednisolone', 'Dexamethasone', 'Hydrochlorothiazide',
  'Vitamin D3', 'Vitamin B12', 'Calcium Carbonate', 'Iron Folic Acid', 'Zinc Sulphate',
  'Multivitamin', 'ORS Sachets', 'Loperamide', 'Chlorpheniramine', 'Diphenhydramine',
];

function randomNearbyCoords(center, radiusKm = 15) {
  const radiusInDegrees = radiusKm / 111;
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusInDegrees;
  return {
    lat: center.lat + distance * Math.cos(angle),
    lng: center.lng + distance * Math.sin(angle),
  };
}

function randomPastDate(daysBack = 60) {
  return Timestamp.fromDate(faker.date.recent({ days: daysBack }));
}

// ---------- Generators ----------
function generateHospitals() {
  return Array.from({ length: HOSPITAL_COUNT }, () => {
    const coords = randomNearbyCoords(CITY_CENTER);
    const totalBeds = faker.number.int({ min: 40, max: 300 });
    const availableBeds = faker.number.int({ min: 0, max: totalBeds });
    const icuTotal = faker.number.int({ min: 10, max: 40 });
    const icuAvailable = faker.number.int({ min: 0, max: icuTotal });
    const area = faker.helpers.arrayElement(JAIPUR_AREAS);

    return {
      id: faker.string.uuid(),
      name: `${area} ${faker.helpers.arrayElement(['General Hospital', 'Medical Center', 'Trauma Center', 'Multispecialty Hospital'])}`,
      address: `${faker.location.buildingNumber()}, ${area}, Jaipur, Rajasthan ${faker.location.zipCode('3020##')}`,
      lat: coords.lat,
      lng: coords.lng,
      phone: faker.phone.number(),
      totalBeds,
      availableBeds,
      icuTotal,
      icuAvailable,
      isTraumaCenter: faker.datatype.boolean(),
      rating: faker.number.float({ min: 3.2, max: 5, fractionDigits: 1 }),
      lastUpdated: FieldValue.serverTimestamp(),
    };
  });
}

function generateDrivers() {
  return Array.from({ length: DRIVER_COUNT }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    phone: faker.phone.number(),
    licenseNumber: faker.string.alphanumeric(10).toUpperCase(),
    yearsExperience: faker.number.int({ min: 1, max: 20 }),
    status: faker.helpers.arrayElement(['available', 'on-duty', 'off-duty']),
    rating: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }),
  }));
}

function generateAmbulances(hospitals, drivers) {
  return Array.from({ length: AMBULANCE_COUNT }, (_, i) => {
    const hospital = faker.helpers.arrayElement(hospitals);
    const coords = randomNearbyCoords({ lat: hospital.lat, lng: hospital.lng }, 5);
    return {
      id: faker.string.uuid(),
      vehicleNumber: `RJ-${faker.number.int({ min: 10, max: 99 })}-${faker.string.alpha({ length: 2, casing: 'upper' })}-${faker.number.int({ min: 1000, max: 9999 })}`,
      type: faker.helpers.arrayElement(AMBULANCE_TYPES),
      hospitalId: hospital.id,
      driverId: drivers[i % drivers.length].id,
      status: faker.helpers.arrayElement(['available', 'available', 'enroute', 'busy']),
      currentLat: coords.lat,
      currentLng: coords.lng,
      lastUpdated: FieldValue.serverTimestamp(),
    };
  });
}

function generateMedicines() {
  return Array.from({ length: MEDICINE_COUNT }, () => {
    const prescriptionRequired = faker.datatype.boolean({ probability: 0.35 });
    return {
      id: faker.string.uuid(),
      name: faker.helpers.arrayElement(MEDICINE_NAMES),
      genericName: faker.science.chemicalElement().name,
      category: faker.helpers.arrayElement(MEDICINE_CATEGORIES),
      manufacturer: faker.company.name(),
      price: faker.number.float({ min: 15, max: 1200, fractionDigits: 2 }),
      stock: faker.number.int({ min: 0, max: 500 }),
      prescriptionRequired,
      description: faker.commerce.productDescription(),
      imageUrl: faker.image.urlPicsumPhotos({ width: 300, height: 300 }),
    };
  });
}

function generateUsers() {
  return Array.from({ length: USER_COUNT }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    bloodType: faker.helpers.arrayElement(BLOOD_TYPES),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }).toISOString().split('T')[0],
    allergies: faker.helpers.arrayElements(
      ['Penicillin', 'Peanuts', 'Latex', 'Pollen', 'Dust', 'None'],
      { min: 0, max: 2 }
    ),
    createdAt: FieldValue.serverTimestamp(),
  }));
}

function generateEmergencyContacts(users) {
  const contacts = [];
  users.forEach((user) => {
    const contactCount = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < contactCount; i++) {
      contacts.push({
        id: faker.string.uuid(),
        userId: user.id,
        name: faker.person.fullName(),
        phone: faker.phone.number(),
        relation: faker.helpers.arrayElement(['Parent', 'Sibling', 'Spouse', 'Friend', 'Child']),
      });
    }
  });
  return contacts;
}

function generateSOSEvents(users, hospitals, ambulances) {
  const events = [];
  users.forEach((user) => {
    const eventCount = faker.number.int({ min: 0, max: 3 });
    for (let i = 0; i < eventCount; i++) {
      const hospital = faker.helpers.arrayElement(hospitals);
      const ambulance = faker.helpers.arrayElement(ambulances);
      const coords = randomNearbyCoords(CITY_CENTER);
      events.push({
        id: faker.string.uuid(),
        userId: user.id,
        status: faker.helpers.arrayElement(SOS_STATUSES),
        lat: coords.lat,
        lng: coords.lng,
        hospitalId: hospital.id,
        ambulanceId: ambulance.id,
        triggeredAt: randomPastDate(30),
        resolvedAt: randomPastDate(29),
      });
    }
  });
  return events;
}

function generateAmbulanceRequests(users, ambulances, hospitals) {
  const requests = [];
  users.forEach((user) => {
    const requestCount = faker.number.int({ min: 0, max: 2 });
    for (let i = 0; i < requestCount; i++) {
      const ambulance = faker.helpers.arrayElement(ambulances);
      const hospital = faker.helpers.arrayElement(hospitals);
      const coords = randomNearbyCoords(CITY_CENTER);
      requests.push({
        id: faker.string.uuid(),
        userId: user.id,
        ambulanceId: ambulance.id,
        hospitalId: hospital.id,
        status: faker.helpers.arrayElement(REQUEST_STATUSES),
        pickupLat: coords.lat,
        pickupLng: coords.lng,
        requestedAt: randomPastDate(30),
        completedAt: randomPastDate(29),
      });
    }
  });
  return requests;
}

function generateBloodDonationDrives() {
  return Array.from({ length: BLOOD_DRIVE_COUNT }, () => {
    const coords = randomNearbyCoords(CITY_CENTER);
    const area = faker.helpers.arrayElement(JAIPUR_AREAS);
    const ngo = faker.helpers.arrayElement(BLOOD_DONATION_NGOS);
    const daysFromNow = faker.number.int({ min: 0, max: 30 });
    const driveDate = Timestamp.fromDate(
      new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
    );
    const totalSlots = faker.number.int({ min: 30, max: 150 });
    const status = daysFromNow === 0
      ? faker.helpers.arrayElement(['ongoing', 'upcoming'])
      : 'upcoming';

    return {
      id: faker.string.uuid(),
      name: `Blood Donation Camp — ${area}`,
      ngo,
      organizer: ngo,
      address: `${faker.location.buildingNumber()}, ${area}, Jaipur, Rajasthan`,
      area,
      lat: coords.lat,
      lng: coords.lng,
      phone: faker.phone.number(),
      date: driveDate,
      startTime: '9:00 AM',
      endTime: '5:00 PM',
      bloodTypesNeeded: faker.helpers.arrayElements(BLOOD_TYPES, { min: 2, max: 5 }),
      totalSlots,
      registeredDonors: faker.number.int({ min: 0, max: totalSlots }),
      status,
      description: 'Donate blood and save lives. Walk-ins welcome; bring a valid government ID.',
    };
  });
}

// ---------- Clear existing data ----------
async function clearCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) {
    console.log(`⚪ "${collectionName}" already empty`);
    return;
  }
  const batchSize = 400;
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  console.log(`🗑️  Cleared ${docs.length} docs from "${collectionName}"`);
}

async function clearAll() {
  const collections = [
    'hospitals', 'drivers', 'ambulances', 'medicines',
    'users', 'emergencyContacts', 'sosEvents', 'ambulanceRequests',
    'bloodDonationDrives', 'bloodDonationRegistrations',
  ];
  for (const name of collections) {
    await clearCollection(name);
  }
}

// ---------- Write to Firestore ----------
async function seedCollection(collectionName, docs) {
  const batchSize = 400;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);
    chunk.forEach((doc) => {
      const ref = db.collection(collectionName).doc(doc.id);
      batch.set(ref, doc);
    });
    await batch.commit();
  }
  console.log(`✅ Seeded ${docs.length} docs into "${collectionName}"`);
}

async function main() {
  console.log('🧹 Clearing old data...\n');
  await clearAll();

  console.log('\n🌱 Starting seed (Jaipur)...\n');

  const hospitals = generateHospitals();
  const drivers = generateDrivers();
  const ambulances = generateAmbulances(hospitals, drivers);
  const medicines = generateMedicines();
  const users = generateUsers();
  const emergencyContacts = generateEmergencyContacts(users);

  // Ensure the demo user used by the app screens exists with emergency contacts.
  // The app hardcodes DEMO_USER_ID = 'cbab8131-96e5-4ea4-a580-c8db339ffc5f'.
  const DEMO_USER_ID = 'cbab8131-96e5-4ea4-a580-c8db339ffc5f';
  const demoUserExists = users.some((u) => u.id === DEMO_USER_ID);
  if (!demoUserExists) {
    users.push({
      id: DEMO_USER_ID,
      name: 'Demo User',
      phone: '9999999999',
      email: 'demo@lifelink.local',
      bloodType: 'O+',
      dateOfBirth: '1995-01-01',
      allergies: [],
      createdAt: FieldValue.serverTimestamp(),
    });
    emergencyContacts.push(
      ...[
        {
          id: faker.string.uuid(),
          userId: DEMO_USER_ID,
          name: 'Emergency Contact 1',
          phone: '9876543210',
          relation: 'Parent',
        },
        {
          id: faker.string.uuid(),
          userId: DEMO_USER_ID,
          name: 'Emergency Contact 2',
          phone: '9876543211',
          relation: 'Sibling',
        },
      ]
    );
  } else {
    // Demo user exists but may have no contacts — always ensure at least one.
    const hasContacts = emergencyContacts.some((c) => c.userId === DEMO_USER_ID);
    if (!hasContacts) {
      emergencyContacts.push({
        id: faker.string.uuid(),
        userId: DEMO_USER_ID,
        name: 'Emergency Contact 1',
        phone: '9876543210',
        relation: 'Parent',
      });
    }
  }
  const sosEvents = generateSOSEvents(users, hospitals, ambulances);
  const ambulanceRequests = generateAmbulanceRequests(users, ambulances, hospitals);
  const bloodDonationDrives = generateBloodDonationDrives();

  await seedCollection('hospitals', hospitals);
  await seedCollection('drivers', drivers);
  await seedCollection('ambulances', ambulances);
  await seedCollection('medicines', medicines);
  await seedCollection('users', users);
  await seedCollection('emergencyContacts', emergencyContacts);
  await seedCollection('sosEvents', sosEvents);
  await seedCollection('ambulanceRequests', ambulanceRequests);
  await seedCollection('bloodDonationDrives', bloodDonationDrives);

  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});