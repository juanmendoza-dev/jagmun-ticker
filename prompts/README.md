# Prompts

Prompt files handed to external tools (Claude Design, Claude Code, Codex) for this project.
Each one is written to be **self-contained** — the receiving tool has never seen the specs in `docs/specs/`
and has no repo access, so everything it needs is in the file itself.

Naming: `NN-<tool>-<what-it-builds>.md`, numbered in the order they were written.

| # | File | Tool | Builds |
|---|---|---|---|
| 01 | [01-claude-design-composite-board.md](01-claude-design-composite-board.md) | Claude Design | Visual prototype of the board frame with the JAG Composite on stage |

`docs/specs/jag-composite-board-design-spec.md` (what the board shows) and
`docs/specs/jag-ingest-and-control-spec.md` (how things get onto it) remain the source of truth.
Prompts pull from them selectively —
never paste the whole spec into a prompt, because most of it describes work the receiving
tool is explicitly not supposed to do.
