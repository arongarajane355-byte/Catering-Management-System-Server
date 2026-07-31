require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { testConnection } = require("./src/config/db");

const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const serviceRoutes = require("./src/routes/serviceRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Catering Management System API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`CMS backend running on http://localhost:${PORT}`);
  await testConnection();
});
