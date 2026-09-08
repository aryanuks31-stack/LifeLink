const express = require("express");

const router = express.Router();

const {
  triggerSOS,
  getSOSStatus,
} = require("../controllers/sosController");

// Trigger a new SOS
router.post("/trigger", triggerSOS);

// Get live ambulance tracking status
router.get("/:sosEventId/status", getSOSStatus);

module.exports = router;