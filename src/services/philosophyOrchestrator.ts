import { Annotation, StateGraph } from "@langchain/langgraph";
import { queryVectorStore } from "./vectorStoreService";
import { generateContent } from "./contentGenerationService";
import {
  generateMusicPrompt,
  generateVisualPrompts,
} from "./promptGenerationService";
import { Content } from "../types/schemas";
import { config } from "../config/env";
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "langchain/document";

// Define state for application
const InputStateAnnotation = Annotation.Root({
  theme: Annotation<string>,
});

const StateAnnotation = Annotation.Root({
  theme: Annotation<string>,
  context: Annotation<Document[]>,
  content: Annotation<Content>,
  musicPrompt: Annotation<string>,
  segments: Annotation<
    {
      text: string;
      imagePrompt: string;
      videoPrompt: string;
    }[]
  >,
});

const llm = new ChatOpenAI({
  model: config.modelConfig.modelName,
  temperature: config.modelConfig.temperature,
});

const retrieve = async (state: typeof InputStateAnnotation.State) => {
  const context = await queryVectorStore(state.theme);
  return { context };
};

const generate = async (state: typeof StateAnnotation.State) => {
  const content = await generateContent(llm, state.theme, state.context);
  //TODO: Refine and condense the raw content
  //TODO: Split content by paragraph

  const musicPrompt = await generateMusicPrompt(llm, content.text);

  const segments = await generateVisualPrompts(llm, content.text);
  return { content, ...musicPrompt, segments };
};

// Compile application
const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
  .compile();

export async function generateWisdom(theme: string) {
  return graph.invoke({ theme });
}
