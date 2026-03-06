const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const requestsFile = path.join(__dirname, "../data/requests.json");
const prescriptionsFile = path.join(__dirname, "../data/prescription.json");

// helper function to read json file
function readJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  const data = fs.readFileSync(filePath);
  return JSON.parse(data);
}

// helper function to write json file
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Doctor will see all patient requests
router.get("/requests", (req, res) => {
  const requests = readJSON(requestsFile);
  res.json(requests);
});

// Doctor prescribes medicine for a patient request
router.post("/prescribe", (req, res) => {
  const { patientName, symptoms, medicine, dosage, note } = req.body;

  if (!patientName || !symptoms || !medicine) {
    return res.status(400).json({ message: "patientName, symptoms, medicine required" });
  }

  const prescriptions = readJSON(prescriptionsFile);

  const newPrescription = {
    id: generateId(),
    patientName,
    symptoms,
    medicine,
    dosage: dosage || "Not Provided",
    note: note || "Take rest and drink water",
    date: new Date().toLocaleString()
  };

  prescriptions.push(newPrescription);
  writeJSON(prescriptionsFile, prescriptions);

  res.status(201).json({
    message: "Prescription saved successfully",
    data: newPrescription
  });
});

module.exports = router;