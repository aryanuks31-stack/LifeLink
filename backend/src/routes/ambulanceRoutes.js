const express = require("express");
const router = express.Router();
const {
  getAmbulances,
  getAmbulanceById,
  getNearestAmbulance,
} = require("../controllers/ambulanceController");

router.get("/", getAmbulances);
router.get("/nearest", getNearestAmbulance);
router.get("/:id", getAmbulanceById);

module.exports = router;