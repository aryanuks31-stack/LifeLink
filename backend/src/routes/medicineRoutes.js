const express = require("express");
const router = express.Router();
const {
  getMedicines,
  getMedicineById,
  createOrder,
  getOrderStatus,
} = require("../controllers/medicineController");

router.get("/", getMedicines);
router.get("/orders/:id", getOrderStatus);
router.get("/:id", getMedicineById);
router.post("/order", createOrder);

module.exports = router;