const express = require("express");
const cors = require("cors");

const app = express();

// -------------------------
// Middleware
// -------------------------

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------------
// Routes
// -------------------------

const sosRoutes = require("./routes/sosRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const medicineRoutes = require("./routes/medicineRoutes");

// SOS
app.use("/api/sos", sosRoutes);

// Hospitals
app.use("/api/hospitals", hospitalRoutes);

// Medicines
app.use("/api/medicines", medicineRoutes);

// -------------------------
// Health check
// -------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "LifeLink backend is running",
  });
});

// -------------------------
// 404 handler
// -------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// -------------------------
// Error handler
// -------------------------

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;