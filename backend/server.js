const express = require("express");
const cors = require("cors");
require("dotenv").config();

const predictRoutes = require("./routes/predict");
const websiteSecurityRoutes = require("./routes/websiteSecurity");
const authRoutes = require("./routes/auth");
const websiteRoutes = require("./routes/websites").router;

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  console.log(req.method + " " + req.originalUrl);
  next();
});
app.use("/api/predict", predictRoutes);
app.use("/api/website-security", websiteSecurityRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/websites", websiteRoutes);
app.get("/", (req, res) => res.json({ message: "Backend Running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
