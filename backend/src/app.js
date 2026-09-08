const express = require("express");
const cors = require("cors");

const app = express();

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// ROUTES
// ========================================

const sosRoutes = require("./routes/sosRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const medicineRoutes = require("./routes/medicineRoutes");

// SOS
app.use("/api/sos", sosRoutes);

// Hospital
app.use("/api/hospitals", hospitalRoutes);

// Medicines
app.use("/api/medicines", medicineRoutes);

// ========================================
// TEST ROUTE
// ========================================

app.get("/api/sos-test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SOS routes are mounted",
  });
});

// ========================================
// ROOT
// ========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LifeLink backend is running",
  });
});

// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ========================================
// ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;