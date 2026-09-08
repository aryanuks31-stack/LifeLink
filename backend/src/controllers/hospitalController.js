const db = require("../config/firebase");

const getHospitals = async (req, res) => {
  try {
    const snapshot = await db.collection("hospitals").get();

    const hospitals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(hospitals);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch hospitals",
    });
  }
};

const getHospitalById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("hospitals").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch hospital" });
  }
};

module.exports = {
  getHospitals,
  getHospitalById,
};