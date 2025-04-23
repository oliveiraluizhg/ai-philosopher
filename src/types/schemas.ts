import { z } from "zod";

export const ContentSchema = z.object({
  title: z.string().describe("The title of the philosophical content"),
  text: z
    .string()
    .describe(
      "The philosophical content generated based on the theme and context"
    ),
});

export const VisualPromptsSchema = z.object({
  imagePrompt: z.string().describe("Prompt for generating a static image"),
  // videoPrompt: z
  //   .string()
  //   .describe("Prompt for animating the image into a video clip"),
});

export const MusicPromptSchema = z.object({
  musicPrompt: z.string().describe("Prompt for generating background music"),
});

export type Content = z.infer<typeof ContentSchema>;
export type MusicPrompt = z.infer<typeof MusicPromptSchema>;
