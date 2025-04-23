import express from "express";
import { generateWisdom } from "../services/philosophyOrchestrator";

const router = express.Router();

// Route for getting stoic wisdom
router.post("/wisdom", async (req, res) => {
  try {
    const { theme } = req.body;
    if (!theme) {
      return res.status(400).json({ error: "Theme is required" });
    }

    const response = await generateWisdom(theme);

    res.json(response);
  } catch (error) {
    console.error("Error in /wisdom route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
