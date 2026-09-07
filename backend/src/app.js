const express = require("express");
const cors = require("cors");
const hospitalRoutes = require("./routes/hospitalRoutes");
const sosRoutes = require("./routes/sosRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const bloodDonationRoutes = require("./routes/bloodDonationRoutes");
const ambulanceRoutes = require("./routes/ambulanceRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "LifeLink Backend Running 🚑",
  });
});

app.use("/api/hospitals", hospitalRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/blood-donations", bloodDonationRoutes);
app.use("/api/ambulances", ambulanceRoutes);

module.exports = app;