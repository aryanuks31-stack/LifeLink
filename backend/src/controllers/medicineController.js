const db = require("../config/firebase");

const getMedicines = async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = db.collection("medicines");

    if (category) {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.get();

    let medicines = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (search) {
      const term = String(search).trim().toLowerCase();

      medicines = medicines.filter((medicine) =>
        String(medicine.name || "").toLowerCase().includes(term)
      );
    }

    return res.status(200).json(medicines);
  } catch (error) {
    console.error("Failed to fetch medicines:", error);

    return res.status(500).json({
      message: "Failed to fetch medicines",
    });
  }
};

// --------------------------------------------------
// GET /api/medicines/:id
// --------------------------------------------------

const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Medicine ID is required",
      });
    }

    const doc = await db.collection("medicines").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        message: "Medicine not found",
      });
    }

    return res.status(200).json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    console.error("Failed to fetch medicine:", error);

    return res.status(500).json({
      message: "Failed to fetch medicine",
    });
  }
};

// --------------------------------------------------
// POST /api/medicines/orders
// --------------------------------------------------

const createOrder = async (req, res) => {
  try {
    const { userId, items } = req.body;

    // -----------------------------
    // Validate request
    // -----------------------------

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "items must be a non-empty array",
      });
    }

    // Prevent unnecessarily large orders.
    if (items.length > 50) {
      return res.status(400).json({
        message: "Too many items in one order",
      });
    }

    // Validate every item before starting the transaction.
    for (const item of items) {
      if (
        !item ||
        typeof item.medicineId !== "string" ||
        !item.medicineId.trim()
      ) {
        return res.status(400).json({
          message: "Each item must contain a valid medicineId",
        });
      }

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return res.status(400).json({
          message: "Each item quantity must be a positive integer",
        });
      }

      if (item.quantity > 1000) {
        return res.status(400).json({
          message: "Item quantity is too large",
        });
      }
    }

    // -----------------------------
    // Combine duplicate medicine IDs
    // -----------------------------

    const quantities = new Map();

    for (const item of items) {
      const medicineId = item.medicineId.trim();

      quantities.set(
        medicineId,
        (quantities.get(medicineId) || 0) + item.quantity
      );
    }

    const normalizedItems = Array.from(
      quantities.entries()
    ).map(([medicineId, quantity]) => ({
      medicineId,
      quantity,
    }));

    // -----------------------------
    // Firestore transaction
    // -----------------------------

    const result = await db.runTransaction(async (transaction) => {
      let total = 0;
      const orderItems = [];
      const medicineRefs = [];

      // Read all medicines first.
      for (const item of normalizedItems) {
        const medicineRef = db
          .collection("medicines")
          .doc(item.medicineId);

        const medicineDoc =
          await transaction.get(medicineRef);

        if (!medicineDoc.exists) {
          const error = new Error(
            `Medicine ${item.medicineId} not found`
          );

          error.status = 404;
          throw error;
        }

        const medicine = medicineDoc.data();

        const stock = Number(medicine.stock);
        const price = Number(medicine.price);

        if (!Number.isFinite(stock) || stock < 0) {
          const error = new Error(
            `Invalid stock for ${medicine.name || item.medicineId}`
          );

          error.status = 500;
          throw error;
        }

        if (!Number.isFinite(price) || price < 0) {
          const error = new Error(
            `Invalid price for ${medicine.name || item.medicineId}`
          );

          error.status = 500;
          throw error;
        }

        if (stock < item.quantity) {
          const error = new Error(
            `Not enough stock for ${
              medicine.name || item.medicineId
            }`
          );

          error.status = 400;
          throw error;
        }

        const lineTotal =
          price * item.quantity;

        total += lineTotal;

        orderItems.push({
          medicineId: item.medicineId,
          name: medicine.name || "",
          quantity: item.quantity,
          price,
          lineTotal,
        });

        medicineRefs.push({
          ref: medicineRef,
          newStock: stock - item.quantity,
        });
      }

      // Update stock inside the same transaction.
      for (const medicine of medicineRefs) {
        transaction.update(medicine.ref, {
          stock: medicine.newStock,
        });
      }

      // Create the order inside the same transaction.
      const orderRef = db
        .collection("medicineOrders")
        .doc();

      transaction.set(orderRef, {
        userId,
        items: orderItems,
        total,
        status: "placed",
        createdAt: new Date(),
      });

      return {
        orderId: orderRef.id,
        total,
        status: "placed",
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Failed to create order:", error);

    // Expected validation/business errors.
    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create order",
    });
  }
};

// --------------------------------------------------
// GET /api/medicines/orders/:id
// --------------------------------------------------

const getOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Order ID is required",
      });
    }

    const doc = await db
      .collection("medicineOrders")
      .doc(id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.status(200).json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    console.error("Failed to fetch order:", error);

    return res.status(500).json({
      message: "Failed to fetch order",
    });
  }
};

module.exports = {
  getMedicines,
  getMedicineById,
  createOrder,
  getOrderStatus,
};