  const express = require("express");
const cors = require("cors");
const hospitalRoutes = require("./routes/hospitalRoutes");
const sosRoutes = require("./routes/sosRoutes");

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

module.exports = app;