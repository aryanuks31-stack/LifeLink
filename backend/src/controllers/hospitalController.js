const db = require("../config/firebase");

/**
 * GET /api/hospitals
 *
 * Fetch all hospitals.
 */
const getHospitals = async (req, res) => {
  try {
    const snapshot = await db
      .collection("hospitals")
      .get();

    const hospitals = snapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    );

    return res.status(200).json(hospitals);
  } catch (error) {
    console.error(
      "Failed to fetch hospitals:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch hospitals",
    });
  }
};

/**
 * GET /api/hospitals/:id
 *
 * Fetch a single hospital by ID.
 */
const getHospitalById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !id ||
      typeof id !== "string" ||
      id.trim().length === 0
    ) {
      return res.status(400).json({
        message:
          "Hospital ID is required",
      });
    }

    const hospitalId = id.trim();

    const doc = await db
      .collection("hospitals")
      .doc(hospitalId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        message:
          "Hospital not found",
      });
    }

    return res.status(200).json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    console.error(
      "Failed to fetch hospital:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch hospital",
    });
  }
};

module.exports = {
  getHospitals,
  getHospitalById,
};

