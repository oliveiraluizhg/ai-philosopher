import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { Document } from "langchain/document";
import { config } from "../config/env";
import { FewShotPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// Define the structured output schema
const outputSchema = z.object({
  title: z.string().describe("The title of the philosophical insight"),
  content: z
    .string()
    .describe(
      "The philosophical content generated based on the theme and context"
    ),
});

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

const vectorStore = new MemoryVectorStore(embeddings);

// Define state for application
const InputStateAnnotation = Annotation.Root({
  theme: Annotation<string>,
});

const StateAnnotation = Annotation.Root({
  theme: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

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

const retrieve = async (state: typeof InputStateAnnotation.State) => {
  const retrievedDocs = await vectorStore.maxMarginalRelevanceSearch(
    state.theme,
    { k: 5, fetchK: 20, lambda: 0.7 }
  );
  return { context: retrievedDocs };
};

const generate = async (state: typeof StateAnnotation.State) => {
  // Load newsletters as examples
  const newslettersPath = path.join(config.dataDir, "newsletters.json");
  const newsletters = JSON.parse(fs.readFileSync(newslettersPath, "utf-8"));

  const examples = newsletters.map((newsletter: any) => ({
    input: newsletter.theme,
    output: newsletter.content,
  }));

  const examplePrompt = new PromptTemplate({
    template: "Theme: {input}\nContent: {output}",
    inputVariables: ["input", "output"],
  });

  const fewShotPrompt = new FewShotPromptTemplate({
    examples,
    examplePrompt,
    prefix: `You are an AI philosopher assistant. Create content based on the given theme, using the retrieved context as inspiration.
    Guidelines for your responses:
    - Be concise yet profound
    - Connect ancient wisdom to modern practical application
    - Use rhetorical questions and bold assertions
    - Maintain a direct, thoughtful, and challenging tone`,
    suffix: `
      Context: {context}
      Theme: {theme}`,
    inputVariables: ["context", "theme"],
  });

  const docsContent = state.context
    .map((doc) => {
      const metadata = doc.metadata;
      return `[From ${metadata.author}'s "${metadata.title}"]\n${doc.pageContent}`;
    })
    .join("\n\n");

  const messages = await fewShotPrompt.invoke({
    theme: state.theme,
    context: docsContent,
  });

  const llm = new ChatOpenAI({
    model: config.modelConfig.modelName,
    temperature: config.modelConfig.temperature,
  });

  const structuredLLM = llm.withStructuredOutput(outputSchema);
  const response = await structuredLLM.invoke(messages);
  return { answer: response };
};

// Compile application and test
const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
  .compile();

// Function to query the vector store with a theme
export async function queryVectorStore(theme: string): Promise<any> {
  try {
    const result = await graph.invoke({ theme });
    return result;
  } catch (error) {
    console.error("Error querying vector store:", error);
    throw error;
  }
}
