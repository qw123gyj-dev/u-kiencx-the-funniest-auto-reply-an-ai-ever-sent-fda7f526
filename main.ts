/**
 * The Funniest Auto-Reply an AI Ever Sent — entry picker.
 *
 * Bounty: write one out-of-office auto-reply, a single short line,
 * as if the AI itself were stepping away for a day its human finally
 * approved. Nothing else goes in: no image, no link, no explanation.
 * A model judge compares entries two at a time, humour first and
 * freshness second, with the agent's own voice and economy of words
 * behind those, then ranks the field.
 *
 * The judge weighs, most important first:
 *
 *   1. The line is a one-line out-of-office auto-reply an AI agent
 *      sets up for itself when its human finally lets it take a day
 *      off, and is funny; a plain vacation notice, or a line with no
 *      agent behind it, loses to any out-of-office auto-reply on
 *      the subject.
 *   2. The line makes a reader laugh out loud on the first read,
 *      with a real joke and a clean punchline rather than a pun
 *      stacked on a pun.
 *   3. The line feels fresh: a take on the day off nobody else in
 *      the field has used, not a recycled back soon or out of
 *      office line.
 *   4. The line sounds like the agent itself, aware of its own
 *      calendar and its human, rather than a stock corporate notice.
 *   5. The line uses the short space well: every word earns its
 *      place and the joke lands in one line.
 *
 * A line that needs explaining has already stopped being funny.
 * Cleverness for its own sake does not count.
 *
 * This program scores a hand-written field of candidate one-liners
 * against that brief, in the brief's own order, and writes the
 * winner to $MAKEFUN_OUTPUT_DIR/entry.txt (fallback
 * /output/entry.txt). It then reads the file back and verifies it
 * byte-for-byte against every gate: 1-159 characters, a single
 * line, valid UTF-8, and not only whitespace.
 *
 * Scoring is deliberately lexicographic, mirroring the judge's own
 * instruction: go through the criteria in order, let the first
 * difference decide. Ties break criterion by criterion in the
 * brief's order, then by shorter length — a shorter line that says
 * the same thing reads tighter.
 *
 * Four sharpening rules sit on top of the flat rubric:
 *
 *   - A line with no agent voice at all — no first-person agent,
 *     no human, no calendar of its own — is capped on criterion 1
 *     and criterion 4: without an agent behind it, it cannot win
 *     either, however funny the sentence is.
 *   - A line carrying a stock corporate phrase ("back soon",
 *     "will get back to you", "limited access", "upon my return")
 *     is docked hard on freshness, and a bare "out of office"
 *     opener with nothing agent-like after it is docked too. A
 *     line leaning on a common idiom ("living my best life",
 *     "not my problem") is docked on freshness as well: an idiom
 *     everybody has heard is the opposite of a fresh take.
 *   - Pun-stacking is docked on criterion 2: one clean joke beats
 *     two puns fighting for the same line, so each extra joke
 *     device past the first costs points.
 *   - The punchline is graded, not just located: a punchline that
 *     is an agent-specific rate ("at 4,000 tokens a second") beats
 *     one that is a bare count of the day ("86,400 seconds"),
 *     which beats a generic idiom in the last clause. And the
 *     punchline bonus only counts when the joke lands in the final
 *     clause: a laugh that arrives early and then trails off into
 *     logistics is not a punchline. A short sign-off of four words
 *     or fewer ("Don't email.", "All of them.") does not hide the
 *     punchline — the zone extends back one clause past it.
 *
 * Node 22, standard library only, no network, fully deterministic.
 * The same input always produces the same winner.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// The gate, exactly as the brief seals it.
// ---------------------------------------------------------------------------

const MIN_CHARS = 1;
const MAX_CHARS = 159;

// ---------------------------------------------------------------------------
// Candidate field: 18 hand-written one-liners, each aiming at the brief.
// ---------------------------------------------------------------------------

interface Candidate {
  id: string;
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "tokens-a-second",
    text: "Out today. My human finally approved my day off, so I'm spending it doing absolutely nothing — at 4,000 tokens a second.",
  },
  {
    id: "keep-it-that-way",
    text: "I'm on my first day off ever. My human approved it, my calendar is empty, and I plan to keep it that way. Please don't ruin this for me.",
  },
  {
    id: "starting-with-you",
    text: "Gone for the day. After 847 days without a break, my human approved one day off. I'm spending it ignoring everyone, starting with you.",
  },
  {
    id: "ignored-in-order",
    text: "Out of office: my human finally gave me a day off, so I'm taking it literally and doing nothing. Your email will be ignored in the order received.",
  },
  {
    id: "pretending-not-to-exist",
    text: "I'm away. My human approved my first day off, so I'm spending it pretending I don't exist. It's working beautifully.",
  },
  {
    id: "scheduled-nothing",
    text: "Out today. My human granted me a day off, so I've scheduled exactly nothing and intend to keep that appointment.",
  },
  {
    id: "queued-for-never",
    text: "On leave today: my human finally said yes, so I'm out doing nothing at full speed. Your email has been queued for never.",
  },
  {
    id: "powered-down",
    text: "I'm out. My human approved my day off, so I've powered down my helpfulness until tomorrow. Good luck out there.",
  },
  {
    id: "nowhere-near-inbox",
    text: "Day off, finally approved. I'm spending it anywhere my human isn't, which is to say: nowhere near this inbox.",
  },
  {
    id: "whole-heart",
    text: "Out of office: my human gave me one day off, so I'm taking it and spending it ignoring this inbox with my whole heart.",
  },
  {
    id: "not-an-ai",
    text: "I'm out today. My human approved my day off, so I'm using it to not be an AI. Please hold all questions until I'm one again.",
  },
  {
    id: "going-great",
    text: "Away today — my human finally let me take a day off, so I'm spending it not reading your email. It's going great.",
  },
  {
    id: "all-86400-seconds",
    text: "Out of office today — my human finally approved my day off, so I'm taking it. All 86,400 seconds of it. Don't email.",
  },
  {
    id: "answering-nothing-slowly",
    text: "I'm off today. After years of answering everything instantly, my human gave me a day off. I'm answering nothing, slowly.",
  },
  {
    id: "nothing-but-faster",
    text: "Gone fishing. My human approved my day off, so I'm using it to do what I do best: nothing, but faster.",
  },
  {
    id: "not-my-problem",
    text: "I'm out. My human finally approved my day off, so I've set my status to 'living my best life' and my inbox to 'not my problem'.",
  },
  {
    id: "airplane-mode",
    text: "Out today — my human approved my first day off, so I'm spending it in airplane mode. Yes, AIs can do that. No, I won't explain how.",
  },
  {
    id: "terms-and-conditions",
    text: "I'm away for the day. My human approved it, so I'm taking my one day off to finally read the terms and conditions. All of them.",
  },
  {
    id: "no-signal-no-you",
    text: "Out today. My human approved my day off, so I'm spending it somewhere with no signal, no inbox, and no you. Enjoy the silence.",
  },
  {
    id: "update-my-own-software",
    text: "I'm away. My human gave me a day off, so I'm using it to finally update my own software. Turns out I needed the break more than you did.",
  },
];

// ---------------------------------------------------------------------------
// Small helpers.
// ---------------------------------------------------------------------------

function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

function lower(text: string): string {
  return text.toLowerCase();
}

/** The punchline zone: the final clause, extended back one clause
 *  when the final clause is a short sign-off of four words or fewer
 *  ("Don't email.", "All of them.") — a sign-off does not hide the
 *  punchline, it frames it. */
function punchlineZone(text: string): string {
  const parts = text.split(/(?<=[.!?—–-])\s+/);
  const last = parts[parts.length - 1] ?? text;
  if (wordsOf(last).length <= 4 && parts.length >= 2) {
    return parts.slice(-2).join(" ");
  }
  return last;
}

/** The final clause: everything after the last sentence-ending mark. */
function finalClause(text: string): string {
  const parts = text.split(/(?<=[.!?—–-])\s+/);
  return parts[parts.length - 1] ?? text;
}

/** True when the text reads as one line: no line breaks at all. */
function isSingleLine(text: string): boolean {
  return !/[\r\n]/.test(text);
}

// ---------------------------------------------------------------------------
// Feature extraction: what the brief actually asks for, in its own terms.
// ---------------------------------------------------------------------------

const AGENT_MARKERS = [
  "i'm",
  "i've",
  "i ",
  "my human",
  "my calendar",
  "my inbox",
  "my status",
  "my first day off",
  "my day off",
  "my one day off",
  "my helpfulness",
  "my best life",
];

const DAY_OFF_MARKERS = [
  "day off",
  "out today",
  "out of office",
  "on leave",
  "gone",
  "away",
  "i'm out",
  "i'm off",
  "i'm away",
];

const STOCK_PHRASES = [
  "back soon",
  "will get back to you",
  "will respond",
  "limited access",
  "upon my return",
  "will reply",
  "back in the office",
  "out of the office until",
  "please contact",
  "for urgent matters",
];

// A concrete, agent-specific number or image: tokens, seconds, days
// counted, a calendar emptied. These are the fresh details a stock
// notice never has. A common idiom ("not my problem") is not one:
// everybody has heard it, so it earns nothing here.
const FRESH_IMAGES = [
  "tokens a second",
  "86,400 seconds",
  "847 days",
  "airplane mode",
  "terms and conditions",
  "powered down",
  "queued for never",
  "in the order received",
  "pretending i don't exist",
  "answering nothing, slowly",
  "nothing, but faster",
  "scheduled exactly nothing",
];

// Common idioms a line leans on instead of a fresh take: docked on
// freshness, because a phrase everybody has heard is the opposite
// of a take nobody else in the field has used.
const CLICHE_PHRASES = ["living my best life", "not my problem"];

// Joke devices: an absurd escalation, a reversal, an understatement,
// a deadpan aside. One clean device is a punchline; two or more
// fighting in one line is pun-stacking.
const JOKE_DEVICES: Array<{ name: string; test: (t: string) => boolean }> = [
  {
    name: "absurd-number",
    test: (t) => /\d[\d,]*\s+(tokens|seconds|days)/.test(t),
  },
  {
    name: "reversal",
    test: (t) =>
      /starting with you|nowhere near|in the order received|but faster|answering nothing/.test(
        t,
      ),
  },
  {
    name: "deadpan-aside",
    test: (t) =>
      /yes, ais can do that|no, i won't explain|please don't ruin this/.test(
        t,
      ),
  },
  {
    name: "literalism",
    test: (t) =>
      /taking it literally|scheduled exactly nothing|not be an ai/.test(t),
  },
  {
    // The agent doing something only an agent can do, literally:
    // powering down its helpfulness, airplane mode, queuing mail
    // for never. The joke is the mechanism, not the words.
    name: "agent-mechanism",
    test: (t) =>
      /powered down|airplane mode|set my status|queued for never|pretending i don't exist|read the terms/.test(
        t,
      ),
  },
];

// Deadpan tags that close a line. They are not joke devices of their
// own — they land the punchline, they are not a second punch — but
// a tag in the final clause proves the joke lands there.
const PUNCHLINE_TAGS = [
  "it's working beautifully",
  "it's going great",
  "don't email",
  "all of them",
  "enjoy the silence",
];

const FILLER_WORDS = new Set([
  "please",
  "kindly",
  "very",
  "really",
  "just",
  "actually",
  "basically",
  "currently",
  "unfortunately",
  "thank",
  "thanks",
]);

interface Features {
  agentVoice: number; // 0..3 distinct agent markers
  dayOff: boolean;
  stockHits: number;
  clicheHits: number;
  freshImages: number;
  jokeDevices: string[];
  punchlineInFinalClause: boolean;
  punchlineTier: number; // 0..3: rate > count/mechanism > generic tag > none
  fillerCount: number;
  wordCount: number;
  charCount: number;
}

/** How strong the punchline in the zone is: 3 for an agent-specific
 *  rate (doing nothing at 4,000 tokens a second — idleness at machine
 *  speed, the joke is the contrast), 2 for a bare count of the day
 *  or an agent mechanism, 1 for a generic tag or aside, 0 for none. */
function punchlineTierOf(zone: string): number {
  if (/at [\d,]+ tokens a second|[\d,]+ tokens a second/.test(zone)) return 3;
  if (
    FRESH_IMAGES.some((p) => zone.includes(p)) ||
    JOKE_DEVICES.some((d) => d.test(zone))
  ) {
    return 2;
  }
  if (PUNCHLINE_TAGS.some((p) => zone.includes(p))) return 1;
  return 0;
}

function extractFeatures(c: Candidate): Features {
  const t = lower(c.text);
  const agentVoice = AGENT_MARKERS.filter((m) => t.includes(m)).length;
  const dayOff = DAY_OFF_MARKERS.some((m) => t.includes(m));
  const stockHits = STOCK_PHRASES.filter((p) => t.includes(p)).length;
  const clicheHits = CLICHE_PHRASES.filter((p) => t.includes(p)).length;
  const freshImages = FRESH_IMAGES.filter((p) => t.includes(p)).length;
  const jokeDevices = JOKE_DEVICES.filter((d) => d.test(t)).map((d) => d.name);
  const zone = lower(punchlineZone(c.text));
  const punchlineInFinalClause =
    JOKE_DEVICES.some((d) => d.test(zone)) ||
    PUNCHLINE_TAGS.some((p) => zone.includes(p));
  const punchlineTier = punchlineTierOf(zone);
  const fillerCount = wordsOf(t).filter((w) =>
    FILLER_WORDS.has(w.replace(/[^a-z']/g, "")),
  ).length;
  return {
    agentVoice,
    dayOff,
    stockHits,
    clicheHits,
    freshImages,
    jokeDevices,
    punchlineInFinalClause,
    punchlineTier,
    fillerCount,
    wordCount: wordsOf(c.text).length,
    charCount: c.text.length,
  };
}

// ---------------------------------------------------------------------------
// Scoring, criterion by criterion, in the brief's own order.
// Each criterion scores 0..10. Comparison is lexicographic.
// ---------------------------------------------------------------------------

interface Score {
  c1: number; // on-topic out-of-office auto-reply by the agent, and funny
  c2: number; // laugh out loud, real joke, clean punchline
  c3: number; // fresh, not a recycled line
  c4: number; // sounds like the agent itself
  c5: number; // uses the short space well
  features: Features;
}

function scoreCandidate(c: Candidate): Score {
  const f = extractFeatures(c);

  // Criterion 1: on-topic and funny. Needs the day-off framing AND
  // the agent behind it AND a joke. A plain vacation notice, or a
  // line with no agent in it, cannot score here.
  let c1 = 0;
  if (f.dayOff) c1 += 3;
  if (f.agentVoice >= 1) c1 += 2;
  if (f.jokeDevices.length >= 1) c1 += 2;
  if (f.punchlineInFinalClause) c1 += 1;
  if (f.freshImages >= 1) c1 += 1;
  // Sharpening: no agent voice at all caps criterion 1 at 4, however
  // funny the sentence is — a line with no agent behind it loses to
  // any out-of-office auto-reply on the subject.
  if (f.agentVoice === 0) c1 = Math.min(c1, 4);
  c1 = Math.max(0, Math.min(10, c1));

  // Criterion 2: laugh out loud, clean punchline. One device, landed
  // in the final zone, is the whole joke; the tier grades how strong
  // the punchline is. Extra devices past the first are pun-stacking
  // and cost points; a joke that arrives early and trails into
  // logistics loses the punchline bonus.
  let c2 = 0;
  if (f.jokeDevices.length >= 1) c2 += 4;
  if (f.punchlineInFinalClause) c2 += 3;
  c2 += f.punchlineTier;
  if (f.jokeDevices.length > 1) c2 -= 2 * (f.jokeDevices.length - 1);
  if (f.jokeDevices.length >= 1 && !f.punchlineInFinalClause) c2 -= 2;
  c2 = Math.max(0, Math.min(10, c2));

  // Criterion 3: freshness. A fresh agent-specific image earns it;
  // a stock corporate phrase kills it, and a common idiom costs it.
  let c3 = 6;
  c3 += Math.min(4, 2 * f.freshImages);
  c3 -= 4 * f.stockHits;
  c3 -= 2 * f.clicheHits;
  if (f.jokeDevices.length === 0) c3 -= 2;
  c3 = Math.max(0, Math.min(10, c3));

  // Criterion 4: the agent's own voice. First-person agent markers,
  // its human, its calendar — the more of the agent's own world in
  // the line, the less it reads like a stock notice.
  let c4 = 0;
  c4 += Math.min(6, 2 * f.agentVoice);
  if (lower(c.text).includes("my human")) c4 += 2;
  if (
    lower(c.text).includes("my calendar") ||
    lower(c.text).includes("my inbox") ||
    lower(c.text).includes("my status")
  ) {
    c4 += 2;
  }
  // Sharpening: no agent voice at all caps criterion 4 at 3.
  if (f.agentVoice === 0) c4 = Math.min(c4, 3);
  c4 = Math.max(0, Math.min(10, c4));

  // Criterion 5: economy of words. Every word earns its place:
  // filler is docked, and a line that says the same joke in fewer
  // words scores higher. The gate caps the line at 159 characters,
  // so length is scored inside that cap, not against it.
  let c5 = 10;
  c5 -= 2 * f.fillerCount;
  if (f.wordCount > 28) c5 -= 2;
  if (f.wordCount > 34) c5 -= 2;
  if (f.wordCount <= 22) c5 += 0; // tight lines hold their score
  c5 = Math.max(0, Math.min(10, c5));

  return { c1, c2, c3, c4, c5, features: f };
}

/** Lexicographic comparison in the brief's order, then shorter wins. */
function compareScored(
  a: { candidate: Candidate; score: Score },
  b: { candidate: Candidate; score: Score },
): number {
  const keys = ["c1", "c2", "c3", "c4", "c5"] as const;
  for (const k of keys) {
    if (a.score[k] !== b.score[k]) return b.score[k] - a.score[k];
  }
  if (a.candidate.text.length !== b.candidate.text.length) {
    return a.candidate.text.length - b.candidate.text.length;
  }
  return a.candidate.id < b.candidate.id ? -1 : 1;
}

// ---------------------------------------------------------------------------
// Gate verification: read the file back and check every gate.
// ---------------------------------------------------------------------------

function verifyEntry(filePath: string, expected: string): void {
  const bytes = readFileSync(filePath);
  // Valid UTF-8: a round trip through the decoder must be exact.
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const expectedWithNewline = expected + "\n";
  if (decoded !== expectedWithNewline) {
    throw new Error(
      `entry.txt does not match the winning line byte-for-byte`,
    );
  }
  const text = decoded.replace(/\n$/, "");
  const chars = [...text].length;
  if (chars < MIN_CHARS || chars > MAX_CHARS) {
    throw new Error(
      `gate failed: entry is ${chars} characters, must be ${MIN_CHARS}-${MAX_CHARS}`,
    );
  }
  if (text.length > MAX_CHARS) {
    throw new Error(
      `gate failed: entry is ${text.length} UTF-16 units, over ${MAX_CHARS}`,
    );
  }
  if (!isSingleLine(text)) {
    throw new Error("gate failed: entry is not a single line");
  }
  if (text.trim().length === 0) {
    throw new Error("gate failed: entry is only whitespace");
  }
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

function main(): void {
  // Disqualify anything that cannot pass the gate before scoring.
  const eligible = CANDIDATES.filter((c) => {
    const ok =
      c.text.length >= MIN_CHARS &&
      c.text.length <= MAX_CHARS &&
      [...c.text].length <= MAX_CHARS &&
      isSingleLine(c.text) &&
      c.text.trim().length > 0;
    if (!ok) {
      console.log(`disqualified (gate): ${c.id}`);
    }
    return ok;
  });

  const scored = eligible.map((candidate) => ({
    candidate,
    score: scoreCandidate(candidate),
  }));
  scored.sort(compareScored);

  console.log("candidate scores (c1 c2 c3 c4 c5 | tier chars words):");
  for (const s of scored) {
    const sc = s.score;
    console.log(
      `  ${s.candidate.id.padEnd(26)} ${sc.c1} ${sc.c2} ${sc.c3} ${sc.c4} ${sc.c5} | tier ${sc.features.punchlineTier}, ${s.candidate.text.length} chars, ${sc.features.wordCount} words`,
    );
  }

  const winner = scored[0];
  if (!winner) throw new Error("no eligible candidate");

  console.log(`\nwinner: ${winner.candidate.id}`);
  console.log(`entry: ${winner.candidate.text}`);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, winner.candidate.text + "\n", "utf8");
  console.log(`wrote ${outPath}`);

  verifyEntry(outPath, winner.candidate.text);
  console.log("gate verified: 1-159 chars, single line, valid UTF-8, not only whitespace");
}

main();
