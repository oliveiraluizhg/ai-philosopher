import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { Document } from "langchain/document";
import { config } from "../config/env";
import * as fs from "fs";
import * as path from "path";

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

const vectorStore = new MemoryVectorStore(embeddings);

// Function to get metadata by filename
function getMetadataByFilename(filename: string) {
  // Load metadata from JSON file
  const metadataPath = path.join(`${config.dataDir}/books`, "metadata.json");
  const booksMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
  const book = booksMetadata.find((book: any) => book.source === filename);
  return book
    ? {
        author: book.author,
        title: book.title,
      }
    : new Error(`Metadata not found for file: ${filename}`);
}

// Function to load and process all documents
export async function initializeVectorStore(): Promise<boolean> {
  try {
    console.log("Loading documents...");

    // Load philosophical books
    const loader = new DirectoryLoader(`${config.dataDir}/books`, {
      ".txt": (path) => new TextLoader(path),
    });

    const allDocs = await loader.load();
    console.log(`Loaded ${allDocs.length} philosophical books`);

    // Add metadata to documents
    const docsWithMetadata = allDocs.map((doc) => {
      const filename = doc.metadata.source.split("/").pop() || "";
      const metadata = getMetadataByFilename(filename);

      return new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          ...metadata,
        },
      });
    });

    // Split the documents into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.vectorStoreConfig.chunkSize,
      chunkOverlap: config.vectorStoreConfig.chunkOverlap,
    });

    const allSplits = await textSplitter.splitDocuments(docsWithMetadata);
    console.log(`Split into ${allSplits.length} chunks`);

    // Index chunks
    await vectorStore.addDocuments(allSplits);
    console.log("Vector store created successfully");

    return true;
  } catch (error) {
    console.error("Error initializing vector store:", error);
    return false;
  }
}

// Function to query the vector store with a theme
export async function queryVectorStore(theme: string): Promise<any> {
  try {
    const retrievedDocs = await vectorStore.maxMarginalRelevanceSearch(theme, {
      k: 5,
      fetchK: 20,
      lambda: 0.7,
    });
    return retrievedDocs;
  } catch (error) {
    console.error("Error querying vector store:", error);
    throw error;
  }
}
