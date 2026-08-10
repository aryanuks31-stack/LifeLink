const express = require("express");
const router = express.Router();
const { triggerSOS } = require("../controllers/sosController");

router.post("/trigger", triggerSOS);

module.exports = router;