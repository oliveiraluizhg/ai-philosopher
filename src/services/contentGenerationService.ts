import { Content, ContentSchema } from "../types/schemas";
import { PromptTemplate, FewShotPromptTemplate } from "@langchain/core/prompts";
import path from "path";
import * as fs from "fs";
import { config } from "../config/env";
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "langchain/document";

export async function generateContent(
  llm: ChatOpenAI,
  theme: string,
  context: Document[]
): Promise<Content> {
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

  const docsContent = context
    .map((doc) => {
      const metadata = doc.metadata;
      return `[From ${metadata.author}'s "${metadata.title}"]\n${doc.pageContent}`;
    })
    .join("\n\n");

  const messages = await fewShotPrompt.invoke({
    theme: theme,
    context: docsContent,
  });

  const structuredLLM = llm.withStructuredOutput(ContentSchema);
  return structuredLLM.invoke(messages);
}
