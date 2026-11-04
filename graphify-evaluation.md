# Graphify evaluation: should we use it as a skill, fork it, or wrap it?

**Prepared by:** Claude Code (cloud session), 2026-11-04
**For:** Corey Thurman. Written to be reviewed by a second AI assistant (ChatGPT).
**Status:** Recommendation, not yet acted on. Nothing has been changed in any repository.

---

## 1. The question

Corey found the open-source project **Graphify** and wants to use it across his GitHub repositories. Graphify is mainly sold as a "skill" for AI coding assistants. Corey's question: is a skill the most efficient way to use it, or should we fork the project and run it a different way?

## 2. What Graphify is

- **Repo:** https://github.com/Graphify-Labs/graphify (about 142k stars; the most popular of 988 repos named "graphify")
- **Package:** `graphifyy` on PyPI, version 0.9.102 at the time of review. Python 3.10+.
- **License:** Apache-2.0, plus an MIT license file. Forking is allowed.
- **Purpose:** turns a folder of code (plus optional docs, PDFs, images, audio and video) into a knowledge graph. AI assistants can then ask scoped questions of the graph instead of grepping and reading whole files.
- **Activity:** the latest commit at review time was 2026-11-03. The version number (0.9.102) suggests frequent releases. I only cloned the latest commit, so I did not measure the release history directly.

## 3. What I did

1. Cloned the repo (latest commit `59b5ab1`) and read `ARCHITECTURE.md`, `README.md`, `pyproject.toml`, the skill file (`graphify/skill.md`), the MCP server (`graphify/serve.py`) and the installer (`graphify/install.py`).
2. Checked Corey's repo `thethurman/new`. **It is empty.** Its only commits are "Initial commit" and "Delete README.md", so there was nothing to graph.
3. Installed Graphify into an isolated Python virtual environment instead. I then ran it **fully offline** (`GRAPHIFY_BACKEND=none`, no API keys) on Graphify's own source code as a test case.

Commands used:

```bash
pip install graphifyy                         # installed from the local clone
export GRAPHIFY_BACKEND=none GRAPHIFY_QUERY_LOG_DISABLE=1
graphify extract . --code-only                # build the graph from code only
graphify cluster-only . --no-label            # write GRAPH_REPORT.md and graph.html
graphify query "how does the MCP server load the graph"
graphify path "extract" "build_from_json"
```

## 4. Test results (Graphify run on its own `graphify/` package)

| Measure | Result |
|---|---|
| Input | 99 code files (136 doc files skipped by `--code-only`) |
| Time | About 12.5 seconds, first run, no cache |
| Graph size | 4,057 nodes, 10,328 edges |
| Groups found | 177 "communities" of related code (19 too small to show) |
| Edge evidence | 98% EXTRACTED (an explicit import or call), 2% INFERRED, 0% AMBIGUOUS |
| AI token cost | 0 |
| Outputs | `graph.json`, `GRAPH_REPORT.md`, `graph.html` (interactive), `manifest.json`, cache |

Quality checks:

- **`query` worked.** "How does the MCP server load the graph" started at the correct functions in `serve.py` (`_read_graph`, `_load_graph`, `_build_server`, `_GraphContextCache`). It returned 367 related nodes but showed only 66, to stay inside its default budget of about 2,000 tokens. It said so clearly and suggested how to widen or narrow the query.
- **`path` worked.** It traced `extract()` to `build_from_json()` in 4 steps and labelled every link EXTRACTED.
- **Weak spot:** without an AI model, groups are named "Community 0, 1, 2…", so the report is hard to read. Naming them needs an LLM backend: an API key, a local Ollama model, or the `claude` command-line tool.
- 2 files produced no symbols (an empty `__init__.py` and a data-only module). That is expected.

**Not tested:** the MCP server, the commit/watch hooks, the doc/PDF/image (semantic) pass, the `merge-graphs` cross-repo feature, and the project's own test suite. I also did not independently check the README's benchmark claim (0.497 recall@10).

## 5. How it is built

Graphify has four layers. Only the top one is "the skill."

| Layer | What it is | Needs an AI model? |
|---|---|---|
| **Python library** | Steps in order: `detect → extract → build → cluster → analyze → report → export`. Code is parsed with tree-sitter (about 40 languages); graphs are NetworkX; grouping uses Leiden/Louvain. | No |
| **Command-line tool** (`graphify`) | `extract`, `update`, `query`, `path`, `explain`, `watch`, `merge-graphs`, `cluster-only`, `label`, `hook install`, `prs`, and more. | Only for naming groups and for docs/PDFs/images |
| **MCP server** (`graphify serve`, optional `[mcp]` extra) | About 10 tools for assistants: `query_graph`, `get_node`, `get_neighbors`, `get_community`, `god_nodes`, `graph_stats`, `shortest_path`, `list_prs`, `get_pr_impact`, `triage_prs`. Runs over stdio or HTTP. | No |
| **Skill + installers** | `skill.md` (about 800 lines) is a step-by-step script telling the assistant which commands to run. `graphify <platform> install` also writes rules into `CLAUDE.md` / `AGENTS.md` / Cursor rules, and on Claude Code adds a `PreToolUse` hook that nudges the assistant to query the graph before searching files. There are copies for about 20 assistants. | Uses the assistant's own model for docs/PDFs/images |

**Key finding:** for code, the skill adds almost nothing over the command-line tool. Its real job is the "semantic" pass over docs, PDFs and images: when run as a skill, it uses the assistant's own model and so needs no separate API key.

Other notes:

- Code parsing is local. With no backend set, nothing leaves the machine.
- **Query logging is on by default.** Every query is written to `~/.cache/graphify-queries.log`. Turn it off with `GRAPHIFY_QUERY_LOG_DISABLE=1`.
- With API keys present, the backend is chosen automatically, in this order: Gemini → Kimi → Claude → OpenAI → DeepSeek → Azure → Bedrock → Ollama. Kimi sends data to servers in China. Set `GRAPHIFY_BACKEND` explicitly to avoid surprises.
- The README promotes a paid "Graphify Cloud" for multi-repo and continuous use. The open-source tool still has `merge-graphs` for combining repos.
- A committed `graph.json` is rewritten in full on every build, so it makes large diffs in pull requests.

## 6. Options

| Option | Pros | Cons |
|---|---|---|
| **A. Use as a skill only** (`/graphify` in chat) | Easiest start; reads docs with no API key | Slow and uses tokens; the assistant follows an 800-line script each time; the graph goes stale between runs; it's set up separately per assistant |
| **B. Fork the project** | Full control over how it reads code | The project changes very often, so a fork falls behind fast; you take on maintenance for about 40 language parsers |
| **C. Thin wrapper repo + CI** (recommended) | Free and fast for code; graphs stay current automatically; works with any assistant via the command-line tool or MCP; easy to upgrade by changing one pinned version | Needs a small amount of CI setup; docs/PDFs need an API key in CI, or the skill kept for that part |

## 7. Recommendation

**Option C: don't fork. Install Graphify as a pinned dependency and run it in CI.**

1. Create a small template repo (for example, `thethurman/new`) that holds:
   - a GitHub Action that runs `graphify update .` (or `extract . --code-only`) on each push, with `GRAPHIFY_BACKEND=none`
   - a pinned version (`graphifyy==0.9.102`) and a `.graphifyignore`
   - shared assistant settings: either the `CLAUDE.md` / `AGENTS.md` rules or an MCP config that points at `graphify serve`
   - a script that uses `graphify merge-graphs` to build one cross-repo graph
2. Have assistants query the graph through MCP or `graphify query/path/explain`, not by running the full skill.
3. Keep the skill (or add an API key in CI) only if docs, PDFs or images need to be in the graph.
4. Fork only if a real need comes up, such as a missing language or a bug the project won't fix. Even then, try to contribute the fix back first.

Untested sketch of the CI step:

```yaml
# .github/workflows/graphify.yml (sketch, not yet run)
on: { push: { branches: [main] } }
jobs:
  graph:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install "graphifyy==0.9.102"
      - run: graphify extract . --code-only && graphify cluster-only . --no-label
        env: { GRAPHIFY_BACKEND: "none", GRAPHIFY_QUERY_LOG_DISABLE: "1" }
      - uses: actions/upload-artifact@v4
        with: { name: graphify-out, path: graphify-out/ }
```

Open decision: should the graph be **committed** to each repo, where assistants see it locally but it makes large diffs, or **published as a CI artifact or to a central repo**, which keeps repos clean but means assistants must fetch it?

## 8. Open questions for Corey

1. Which repos and languages should this cover? `thethurman/new` is empty.
2. Which AI assistants are in use: Claude Code only, or also ChatGPT/Codex, Cursor and others? That decides MCP versus instruction files.
3. Code only, or docs/PDFs/images too? Including those means an API key in CI, or keeping the skill.

## 9. Questions for the reviewer (ChatGPT)

Please challenge the following:

1. Is "wrapper + CI, don't fork" the right call for someone with several personal repos, or is a fork justified somewhere I haven't considered?
2. Commit `graphify-out/` to each repo, or publish it elsewhere? Which works better for Codex/ChatGPT, which may not run an MCP server?
3. Is relying on a fast-moving 0.9.x tool a real risk, and is pinning the version enough protection?
4. Are there better-established alternatives worth comparing (for example, other code-graph or code-indexing tools) before committing?
5. Any security or privacy concerns beyond those listed in section 5 (query log on by default, automatic backend choice, Kimi routing)?
