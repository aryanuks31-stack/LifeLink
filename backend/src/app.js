const express = require("express");
const cors = require("cors");

const hospitalRoutes = require("./routes/hospitalRoutes");
const sosRoutes = require("./routes/sosRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const ambulanceRoutes = require("./routes/ambulanceRoutes");

const app = express();

// --------------------------------------------------
// CORS
// --------------------------------------------------

const corsOrigin = process.env.CORS_ORIGIN || "*";

app.use(
  cors({
    origin: corsOrigin,
  })
);

// --------------------------------------------------
// Request parsing
// --------------------------------------------------

app.use(
  express.json({
    limit: "1mb",
  })
);

// --------------------------------------------------
// Health / status
// --------------------------------------------------

app.get("/", (req, res) => {
  return res.status(200).json({
    status: "LifeLink Backend Running",
  });
});

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "lifelink-backend",
  });
});

// --------------------------------------------------
// API routes
// --------------------------------------------------

app.use(
  "/api/hospitals",
  hospitalRoutes
);

app.use(
  "/api/sos",
  sosRoutes
);

app.use(
  "/api/medicines",
  medicineRoutes
);

app.use(
  "/api/ambulances",
  ambulanceRoutes
);

// --------------------------------------------------
// 404 handler
// --------------------------------------------------

app.use((req, res) => {
  return res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

// --------------------------------------------------
// Global error handler
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error(
    "Unhandled server error:",
    err
  );

  const statusCode =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status < 600
      ? err.status
      : 500;

  return res.status(statusCode).json({
    message:
      statusCode !== 500 && err.message
        ? err.message
        : "Internal server error",
  });
});

module.exports = app;

