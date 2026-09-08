const express = require("express");

const router = express.Router();

const {
  triggerSOS,
  getSOSStatus,
} = require("../controllers/sosController");

router.post("/trigger", triggerSOS);

router.get("/:sosEventId/status", getSOSStatus);

module.exports = router;