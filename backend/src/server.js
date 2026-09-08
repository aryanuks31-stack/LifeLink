require("dotenv").config();

const app = require("./app");

// Use PORT from env only if it is a sane positive number; otherwise fall back to 5000.
// (Some deployment shims inject PORT=0, which would make listen() bind to a random port.)
const RAW_PORT = parseInt(process.env.PORT, 10);
const PORT = Number.isFinite(RAW_PORT) && RAW_PORT > 0 ? RAW_PORT : 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LifeLink Backend running on port ${PORT}`);
});