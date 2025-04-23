import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  MusicPrompt,
  MusicPromptSchema,
  VisualPromptsSchema,
} from "../types/schemas";

export async function generateMusicPrompt(
  llm: ChatOpenAI,
  content: string
): Promise<MusicPrompt> {
  // Generate a single optimized music prompt for the entire content
  const promptTemplate = new PromptTemplate({
    inputVariables: ["content"],
    template: `
  You are a creative AI assistant specialized in transforming philosophical content into concise music generation prompts.
  Given the philosophical text, extract the core emotional tone, theme, and atmosphere.
  Then construct a music prompt specifying:
  1. Genre and mood
  2. Key instrumentation and arrangement
  3. Structural elements
  4. Style or influence reference
  5. Tempo indication

  Output only the final music prompt as plain text without subheadings or special characters.
  Keep music prompts under 500 characters.
  
  Philosophical Content:
  \"\"\"
  {content}
  \"\"\"`,
  });

  const structuredLLM = llm.withStructuredOutput(MusicPromptSchema);
  const promptInput = await promptTemplate.invoke({ content });
  return structuredLLM.invoke(promptInput);
}

export async function generateVisualPrompts(
  llm: ChatOpenAI,
  content: string
): Promise<
  {
    text: string;
    imagePrompt: string;
    // videoPrompt: string;
  }[]
> {
  // Split content into segments
  const segments = content
    .split(/\n\n+/) // Split on two or more newlines
    .map((segment) => segment.trim()) // Clean up whitespace
    .filter((segment) => segment.length > 0); // Remove empty entries

  // Generate visual media prompts for each segment
  const promptTemplate = new PromptTemplate({
    inputVariables: ["content", "segment"],
    template: `
You are an AI assistant that transforms philosophical text into concise, visually striking image generation prompts that blend cinematic technique with surrealist elements, set within the world of ancient Rome and Greece.
Analyze the content to extract key visual metaphors, settings, and emotional tones, focusing on Stoic philosophy. When specific philosophers are mentioned, feature them as figures in the scene, dressed in authentic period attire.
Then build an image prompt for the segment by listing, in order and separated by commas:
1. Style keyword (always start with "Cinematic surrealism")
2. Composition, lighting and framing
3. Scene and background details
4. Main focus, it’s appearance and action
5. Technical and cinematic modifiers

Output only the final image prompt as plan text without subheadings or special characters,
Keep image prompts under 1500 characters.

Content:
\"\"\"
{content}
\"\"\"
Segment:
\"\"\"
{segment}
\"\"\"`,
  });

  const structuredLLM = llm.withStructuredOutput(VisualPromptsSchema);

  const segmentPrompts = await Promise.all(
    segments.map(async (segment: string) => {
      const promptInput = await promptTemplate.invoke({ content, segment });
      const result = await structuredLLM.invoke(promptInput);

      return { text: segment, ...result };
    })
  );

  return segmentPrompts;
}
