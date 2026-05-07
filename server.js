const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 5000;

// ================= HTTP SERVER + SOCKET =================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);
});

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= FILE PATHS =================
const requestsFile = path.join(__dirname, "data", "requests.json");
const prescriptionsFile = path.join(__dirname, "data", "prescriptions.json");

// ================= UTIL FUNCTIONS =================
function generateId() {
  return Math.floor(1000 + Math.random() * 9000);
}

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  const data = fs.readFileSync(filePath, "utf-8");
  if (!data.trim()) return [];
  return JSON.parse(data);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ================= HOME ROUTE =================
app.get("/", (req, res) => {
  res.send("✅ MedBuddy Backend Running!");
});

// ================= PATIENT REQUEST =================
app.post("/api/patient/request", (req, res) => {

  const { patientName, mobile, age, gender, symptoms, assignedDoctor } = req.body;

  if (!patientName || !mobile || !age || !gender || !symptoms || !assignedDoctor) {
    return res.status(400).json({
      message: "❌ All fields required"
    });
  }

  const requests = readJSON(requestsFile);

  const newRequest = {
    id: generateId(),
    patientName,
    mobile,
    age,
    gender,
    symptoms,
    assignedDoctor,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  requests.push(newRequest);
  writeJSON(requestsFile, requests);

  res.status(201).json({
    message: "✅ Request submitted successfully",
    data: newRequest
  });

});

// ================= VIEW PRESCRIPTION =================
app.get("/api/patient/prescription/:requestId", (req, res) => {

  const requestId = req.params.requestId;
  const prescriptions = readJSON(prescriptionsFile);

  const prescription = prescriptions.find(p => p.requestId == requestId);

  if (!prescription) {
    return res.status(404).json({ message: "❌ Prescription not found" });
  }

  res.status(200).json(prescription);

});

// ================= DOCTOR VIEW REQUESTS =================
app.get("/api/doctor/requests", (req, res) => {

  const requests = readJSON(requestsFile);
  res.status(200).json(requests);

});

// ================= DOCTOR PRESCRIBE =================
app.post("/api/doctor/prescribe", (req, res) => {

  const { requestId, doctorName, medicine, dosage, days, advice } = req.body;

  if (!requestId || !doctorName || !medicine || !dosage || !days) {
    return res.status(400).json({
      message: "❌ All required fields missing"
    });
  }

  const requests = readJSON(requestsFile);
  const prescriptions = readJSON(prescriptionsFile);

  const requestData = requests.find(r => r.id == requestId);

  if (!requestData) {
    return res.status(404).json({ message: "❌ Request not found" });
  }

  // ================= UPDATE STATUS =================
  requestData.status = "Approved";

  const newPrescription = {
    id: generateId(),
    requestId: requestData.id,
    patientName: requestData.patientName,
    mobile: requestData.mobile,
    age: requestData.age,
    gender: requestData.gender,
    symptoms: requestData.symptoms,
    doctorName,
    medicine,
    dosage,
    days,
    advice: advice || "",
    status: "Approved",
    createdAt: new Date().toISOString()
  };

  prescriptions.push(newPrescription);

  writeJSON(requestsFile, requests);
  writeJSON(prescriptionsFile, prescriptions);

  // ================= REAL TIME NOTIFICATION =================
  io.emit("prescriptionApproved", {
    requestId: requestData.id,
    patientName: requestData.patientName
  });

  console.log("🔔 Notification sent for Request ID:", requestData.id);

  res.status(201).json({
    message: "✅ Prescription added successfully",
    data: newPrescription
  });

});

// ================= UPDATE PRESCRIPTION =================
app.put("/api/doctor/prescription/:id", (req, res) => {

  const prescriptionId = req.params.id;
  const { medicine, dosage, days, advice } = req.body;

  if (!medicine || !dosage || !days) {
    return res.status(400).json({
      message: "❌ Required fields missing"
    });
  }

  const prescriptions = readJSON(prescriptionsFile);

  const prescription = prescriptions.find(p => p.id == prescriptionId);

  if (!prescription) {
    return res.status(404).json({
      message: "❌ Prescription not found"
    });
  }

  prescription.medicine = medicine;
  prescription.dosage = dosage;
  prescription.days = days;
  prescription.advice = advice || "";

  writeJSON(prescriptionsFile, prescriptions);

  io.emit("prescriptionApproved", {
    requestId: prescription.requestId,
    patientName: prescription.patientName,
    type: "updated"
  });

  res.status(200).json({
    message: "✅ Prescription Updated Successfully",
    data: prescription
  });

});

// ================= DELETE PRESCRIPTION =================
app.delete("/api/doctor/prescription/:id", (req, res) => {

  const prescriptionId = req.params.id;

  let prescriptions = readJSON(prescriptionsFile);

  const prescriptionIndex = prescriptions.findIndex(p => p.id == prescriptionId);

  if (prescriptionIndex === -1) {
    return res.status(404).json({
      message: "❌ Prescription not found"
    });
  }

  prescriptions.splice(prescriptionIndex, 1);

  writeJSON(prescriptionsFile, prescriptions);

  res.status(200).json({
    message: "🗑 Prescription Deleted Successfully"
  });

});

// ================= START SERVER =================
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});