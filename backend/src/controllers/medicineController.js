const db = require("../config/firebase");

const getMedicines = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = db.collection("medicines");

    if (category) {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.get();
    let medicines = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const term = search.toLowerCase();
      medicines = medicines.filter((m) => m.name.toLowerCase().includes(term));
    }

    res.status(200).json(medicines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch medicines" });
  }
};

const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("medicines").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch medicine" });
  }
};

const createOrder = async (req, res) => {
  try {
    const { userId, items } = req.body;
    // items = [{ medicineId, quantity }]

    if (!userId || !items || !items.length) {
      return res.status(400).json({ message: "userId and items are required" });
    }

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const medDoc = await db.collection("medicines").doc(item.medicineId).get();
      if (!medDoc.exists) {
        return res.status(404).json({ message: `Medicine ${item.medicineId} not found` });
      }
      const med = medDoc.data();

      if (med.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${med.name}` });
      }

      const lineTotal = med.price * item.quantity;
      total += lineTotal;

      orderItems.push({
        medicineId: item.medicineId,
        name: med.name,
        quantity: item.quantity,
        price: med.price,
        lineTotal,
      });
    }

    const orderRef = await db.collection("medicineOrders").add({
      userId,
      items: orderItems,
      total,
      status: "placed",
      createdAt: new Date(),
    });

    res.status(201).json({ orderId: orderRef.id, total, status: "placed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create order" });
  }
};

const getOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("medicineOrders").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

module.exports = { getMedicines, getMedicineById, createOrder, getOrderStatus };