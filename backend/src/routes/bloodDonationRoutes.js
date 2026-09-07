const express = require("express");
const router = express.Router();
const {
  getBloodDonationDrives,
  getBloodDonationDriveById,
  registerForDrive,
} = require("../controllers/bloodDonationController");

router.get("/", getBloodDonationDrives);
router.get("/:id", getBloodDonationDriveById);
router.post("/:id/register", registerForDrive);

module.exports = router;