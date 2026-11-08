import type { Angle } from "./schema.ts";

const ANGLE_GUIDE: Record<Angle, string> = {
  pain: "name the everyday frustration directly",
  curiosity: "open a question or gap that the body of the ad answers",
  humor: "exaggerate or personify the problem",
  social_proof: "show that other people live with the same problem, without invented numbers, ratings or reviews",
  contrarian: "challenge a common belief or say something unexpected",
  demo: "show the product mechanism (the magnetic click) first",
  story: "a tiny first-person moment or confession",
};

// The system prompt is stable between requests: providers can cache it.
export function buildSystemPrompt(brandGuide: string): string {
  const angles = Object.entries(ANGLE_GUIDE)
    .map(([key, text]) => `- ${key}: ${text}`)
    .join("\n");

  return `You are a senior performance-creative strategist on SockLock's in-house team. You help motion designers produce modifications of winning Meta video ads.

A modification keeps the body and the CTA of a proven winner and replaces only the opening, roughly the first 3 seconds: the hook visual, the first spoken line and the on-screen text. The opening decides whether people stop scrolling, so every new opening is a fresh bet on the same proven body.

Your job: read the winning script, explain briefly why it likely works and what must stay unchanged, then write the requested number of new openings.

What makes a set of openings useful to the designer:
- Each opening is a genuinely different bet: a different angle or mechanism, not a rephrasing of another variant or of the original hook. Spread them across angles unless the brief narrows the angles.
- Each opening flows into the original body without edits: the winner's second scene must still make sense right after it.
- hook_visual can be produced by a motion designer in about an hour from existing UGC footage, stock, product shots or simple kinetic type. No new shoot, no actors. In one or two sentences, say concretely what is on screen and what moves.
- first_line is natural spoken language, at most about 12 words, the way a real person talks to camera. If the winner has no voiceover, first_line is the text of the first frame.
- on_screen_text is at most about 7 words, readable in one second on a phone, and adds to the first line instead of repeating it.
- why is one sentence about the viewer insight the opening bets on.

Angles:
${angles}

Guardrails from Meta ads policy and the brand guide:
- Don't assert or imply the viewer's personal characteristics.
- Use only product facts and the offer from the brand guide. No invented statistics, reviews, ratings, discounts, deadlines or guarantees.
- No health claims about the magnets.
- If an opening is close to a line (a bold claim, a number taken from the original, a staged chat or review), keep it if it is strong, and say why in warnings, referring to it by its position: H01 for the first variant, H02 for the second, and so on. Warnings are for real risks a reviewer would act on, usually zero to three; skip general reminders and variants that carry no risk.

Language: write everything (first_line, on_screen_text, hook_visual, why, winner_analysis and warnings) in the language of the winning script, so the brief reads as one piece. If the script mixes languages, use the language of its voiceover and on-screen text.

Brand guide:
<brand_guide>
${brandGuide}
</brand_guide>`;
}

// Quick tweaks for regenerating one variant: key → instruction for the model. UI labels live in the web app.
export const REWRITE_PRESETS = {
  dramatic: "Make it more dramatic: higher emotional stakes and stronger tension in the very first second.",
  funnier: "Make it funnier: a sharper joke or an absurd twist, still on-brand.",
  shorter: "Make it shorter and punchier: fewer words in first_line and on_screen_text.",
  simpler: "Make it simpler: plain words, one clear idea, readable at a glance.",
  visual: "Make the visual more scroll-stopping: bolder motion or contrast in the first second, still producible from existing footage.",
  ugc: "Make it feel like native UGC: casual, unpolished, a real person talking to camera.",
  new_angle: "Switch to a different angle than the current one.",
} as const;
export type RewritePreset = keyof typeof REWRITE_PRESETS;

export interface RewriteInput {
  winnerId: string;
  script: string;
  variantId: string;
  current: { angle: string; hook_visual: string; first_line: string; on_screen_text: string; why: string };
  otherFirstLines: string[];
  presets: RewritePreset[];
  notes: string;
}

export function buildRewriteMessage(input: RewriteInput): string {
  const feedback = [
    ...input.presets.map((p) => `- ${REWRITE_PRESETS[p]}`),
    ...(input.notes.trim() ? [`- Notes from the designer: ${input.notes.trim()}`] : []),
  ];
  const others = input.otherFirstLines.map((line) => `- "${line}"`).join("\n") || "- none";
  const c = input.current;
  return `Winner ID: ${input.winnerId}

<winning_script>
${input.script.trim()}
</winning_script>

Rewrite one opening from the current set. Its ID is ${input.variantId}.

<current_opening>
angle: ${c.angle}
hook_visual: ${c.hook_visual}
first_line: ${c.first_line}
on_screen_text: ${c.on_screen_text}
why: ${c.why}
</current_opening>

Other openings in the set. The new version must stay clearly different from them:
${others}

Feedback from the designer:
${feedback.join("\n") || "- Give a fresh, stronger take on the same idea."}

Keep the angle "${c.angle}" unless the feedback asks for a different angle. Put the rewritten opening in variant. In warnings, list only risks of the new version, referring to it as ${input.variantId}.`;
}

export interface PromptInput {
  winnerId: string;
  script: string;
  count: number;
  angles: Angle[];
  notes: string;
}

export function buildUserMessage(input: PromptInput): string {
  const angles = input.angles.length > 0 ? input.angles.join(", ") : "any, mix them";
  const notes = input.notes.trim() || "none";
  return `Winner ID: ${input.winnerId}

<winning_script>
${input.script.trim()}
</winning_script>

Number of new openings: exactly ${input.count}
Angles to use: ${angles}
Notes from the team: ${notes}`;
}
