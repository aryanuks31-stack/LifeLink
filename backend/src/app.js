const hospitalRoutes = require("./routes/hospitalRoutes");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "LifeLink Backend Running 🚑",
  });
});

module.exports = app;
app.use(express.json());
app.use("/api/hospitals", hospitalRoutes);