// backend/src/routes/medicineRoutes.js
const express = require("express");
const router = express.Router();
const {
  getMedicines,
  getMedicineById,
  createOrder,
  getOrderStatus,
} = require("../controllers/medicineController");

// /orders/:id before /:id so Express matches order lookups first.
router.get("/", getMedicines);            // GET /api/medicines?category=&search=
router.get("/orders/:id", getOrderStatus); // GET /api/medicines/orders/:id
router.post("/orders", createOrder);       // POST /api/medicines/orders
router.get("/:id", getMedicineById);       // GET /api/medicines/:id

module.exports = router;