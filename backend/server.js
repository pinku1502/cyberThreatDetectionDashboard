const express = require("express");
const cors = require("cors");
require("dotenv").config();

const predictRoutes = require("./routes/predict");
const websiteSecurityRoutes = require("./routes/websiteSecurity");

const app = express();

app.use(cors());
app.use(express.json());

// DEBUG - server request check
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Mount predict routes
app.use("/api/predict", predictRoutes);
app.use("/api/website-security", websiteSecurityRoutes);

// Home Route
app.get("/", (req, res) => {
  res.json({ message: "Backend Running" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});