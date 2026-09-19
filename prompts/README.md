# Prompts

Prompt files handed to external tools (Claude Design, Claude Code, Codex) for this project.
Each one is written to be **self-contained** — the receiving tool has never seen the spec in `docs/specs/`
and has no repo access, so everything it needs is in the file itself.

Naming: `NN-<tool>-<what-it-builds>.md`, numbered in the order they were written.

| # | File | Tool | Builds |
|---|---|---|---|
| 01 | [01-claude-design-composite-board.md](01-claude-design-composite-board.md) | Claude Design | Visual prototype of the projector board — tape, JAG Composite, crawl |

`docs/specs/jag-composite-board-design-spec.md` remains the source of truth. Prompts pull from it
selectively — never paste the whole spec into a prompt, because some of it describes work the
receiving tool is explicitly not supposed to do.
