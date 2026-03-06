const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// file path
const filePath = path.join(__dirname, "../data/requests.json");

// Generate 4 digit ID
function generateId() {
  return Math.floor(1000 + Math.random() * 9000);
}

// POST request save
router.post("/request", (req, res) => {
  const { patientName, mobile, age, gender, symptoms } = req.body;

  if (!patientName || !mobile || !age || !gender || !symptoms) {
    return res.status(400).json({ message: "All fields required!" });
  }

  let requests = [];

  // file exists then read
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf-8");
    requests = data ? JSON.parse(data) : [];
  }

  const newRequest = {
    id: generateId(),
    patientName,
    mobile,
    age,
    gender,
    symptoms,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  requests.push(newRequest);

  fs.writeFileSync(filePath, JSON.stringify(requests, null, 2));

  res.status(201).json({
    message: "Patient request saved successfully",
    data: newRequest
  });
});

// GET all requests (doctor will use this)
router.get("/requests", (req, res) => {
  let requests = [];

  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf-8");
    requests = data ? JSON.parse(data) : [];
  }

  res.json(requests);
});

module.exports = router;