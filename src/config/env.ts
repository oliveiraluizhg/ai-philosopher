import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Check for required API keys
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable not set");
}

// Export configuration
export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  port: process.env.PORT || 3000,
  dataDir: "./src/data",
  modelConfig: {
    temperature: 0,
    modelName: "gpt-4o",
  },
  vectorStoreConfig: {
    chunkSize: 1000,
    chunkOverlap: 200,
  },
};
