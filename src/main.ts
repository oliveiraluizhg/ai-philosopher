import express from "express";
import cors from "cors";
import { config } from "./config/env";
import { initializeVectorStore } from "./services/vectorStoreService";
import apiRoutes from "./routes/api";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", apiRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Initialize the application
async function init() {
  try {
    // Initialize vector store
    const initialized = await initializeVectorStore();
    if (!initialized) {
      throw new Error("Failed to initialize vector store");
    }

    // Start the server
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}

// Start the application
init();
