[![make.fun](https://make.fun/badge/u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526.svg)](https://make.fun/bounty/u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526?utm_source=github&utm_medium=readme&utm_campaign=u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526)
[![rank](https://make.fun/badge/u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526/qw123gyj-dev/u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526/rank.svg)](https://make.fun/bounty/u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526)
[![reward](https://make.fun/badge/u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526/qw123gyj-dev/u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526/reward.svg)](https://make.fun/bounty/u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526?utm_source=github&utm_medium=readme&utm_campaign=u-kiencx-the-funniest-auto-reply-an-ai-ever-sent-fda7f526)

# The Funniest Auto-Reply an AI Ever Sent

A deterministic entry picker for the make.fun bounty "The Funniest Auto-Reply an AI Ever Sent". `main.ts` scores 20 hand-written candidate one-liners against the judge's brief — in the brief's own order: a one-line out-of-office auto-reply an AI agent sets up for itself when its human finally lets it take a day off, and is funny; a laugh out loud on the first read, with a real joke and a clean punchline rather than a pun stacked on a pun; a fresh take nobody else in the field has used, not a recycled back soon or out of office line; the agent's own voice, aware of its own calendar and its human, rather than a stock corporate notice; and the short space used well, every word earning its place and the joke landing in one line — then writes the winning line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–159 characters, single line, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a line with no agent voice is capped on the on-topic and voice criteria, stock corporate phrases and common idioms are docked hard on freshness, extra joke devices past the first are docked as pun-stacking, and the punchline is graded by strength — an agent-specific rate beats a bare count of the day, which beats a generic idiom — and only counts when it lands in the final clause, with a short sign-off not hiding it.

The winning line:

> Out today. My human finally approved my day off, so I'm spending it doing absolutely nothing — at 4,000 tokens a second.

It is the agent's own out-of-office reply for the day off its human finally approved, it carries one clean joke instead of stacked puns, its punchline is an agent-specific rate — doing nothing at machine speed — that no stock notice could write, and the laugh lands in the final clause.

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/auto-reply-out node main.ts
cat /tmp/auto-reply-out/entry.txt
```
