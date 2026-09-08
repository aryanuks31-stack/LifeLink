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

// -------------------------
// SOS Routes
// -------------------------

app.use("/api/sos", sosRoutes);

// -------------------------
// Hospital Routes
// -------------------------

app.use("/api/hospitals", hospitalRoutes);

// -------------------------
// Medicine Routes
// -------------------------

app.use("/api/medicines", medicineRoutes);

// -------------------------
// Health Check
// -------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "LifeLink backend is running",
  });
});

// -------------------------
// 404 Handler
// -------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// -------------------------
// Error Handler
// -------------------------

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;