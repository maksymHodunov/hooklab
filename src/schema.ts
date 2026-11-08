import { z } from "zod";

// Angles a new hook can take.
export const ANGLES = [
  "pain",
  "curiosity",
  "humor",
  "social_proof",
  "contrarian",
  "demo",
  "story",
] as const;
export type Angle = (typeof ANGLES)[number];

// One new opening of the ad (the first ~3 seconds).
// Field descriptions go into the JSON Schema the model sees. All text is in the language of the winning script.
export const VariantSchema = z.object({
  angle: z.enum(ANGLES),
  hook_visual: z
    .string()
    .describe("What is on screen in the first 1–3 seconds and what moves. For the motion designer."),
  first_line: z
    .string()
    .describe("First voiceover line (or the first-frame text if the ad has no voiceover)."),
  on_screen_text: z.string().describe("On-screen text, up to ~7 words."),
  why: z.string().describe("One sentence: the viewer insight this hook bets on."),
});
export type VariantDraft = z.infer<typeof VariantSchema>;

// Full model response. The same schema validates the demo examples in data/demo.
export const GenerationSchema = z.object({
  winner_analysis: z.object({
    why_it_won: z.string().describe("1–2 sentences: why the winner likely works."),
    keep_unchanged: z.string().describe("What stays unchanged from the winner (body, CTA)."),
  }),
  variants: z.array(VariantSchema),
  warnings: z
    .array(z.string())
    .describe("Meta policy or brand risks, referring to variant IDs (H01…)."),
});
export type Generation = z.infer<typeof GenerationSchema>;

// Model response when regenerating a single variant.
export const RewriteSchema = z.object({
  variant: VariantSchema,
  warnings: z.array(z.string()).describe("Risks of the new version, if any."),
});
export type Rewrite = z.infer<typeof RewriteSchema>;
