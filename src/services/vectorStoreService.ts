import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { Document } from "langchain/document";
import { config } from "../config/env";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Annotation, StateGraph } from "@langchain/langgraph";

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

const vectorStore = new MemoryVectorStore(embeddings);

// Define state for application
const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

// Function to load and process all documents
export async function initializeVectorStore(): Promise<boolean> {
  try {
    console.log("Loading documents...");

    // Load philosophical books
    const loader = new DirectoryLoader(config.booksDir, {
      ".txt": (path) => new TextLoader(path),
    });

    const allDocs = await loader.load();
    console.log(`Loaded ${allDocs.length} philosophical books`);

    // Split the documents into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.vectorStoreConfig.chunkSize,
      chunkOverlap: config.vectorStoreConfig.chunkOverlap,
    });

    const allSplits = await textSplitter.splitDocuments(allDocs);
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
  const retrievedDocs = await vectorStore.similaritySearch(state.question);
  return { context: retrievedDocs };
};

const generate = async (state: typeof StateAnnotation.State) => {
  const template = `
    You are an AI philosopher assistant. Use the following pieces of retrieved context to answer the question.
    Use three sentences maximum and keep the answer concise."
    
    Context: {context}
    
    Question: {question}
    
    Answer:
  `;

  const promptTemplate = ChatPromptTemplate.fromMessages([["user", template]]);

  const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
  const messages = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  });
  const llm = new ChatOpenAI({
    model: config.modelConfig.modelName,
    temperature: config.modelConfig.temperature,
  });
  const response = await llm.invoke(messages);
  return { answer: response.content };
};

// Compile application and test
const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
  .compile();

// Function to query the vector store with optional filters
export async function queryVectorStore(question: string): Promise<any> {
  try {
    const result = await graph.invoke({ question });
    return result;
  } catch (error) {
    console.error("Error querying vector store:", error);
    throw error;
  }
}
