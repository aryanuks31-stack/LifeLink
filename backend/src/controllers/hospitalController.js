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

module.exports = {
  getHospitals,
};