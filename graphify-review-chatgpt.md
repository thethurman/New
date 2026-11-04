# ChatGPT review — Graphify adoption and GatherReel pilot

**Date:** 2026-11-04  
**Source:** Review of `graphify-evaluation.md` in `thethurman/New`, branch `docs/graphify-evaluation`  
**Status:** Decision and implementation instructions; pilot not yet executed.

## Decision

**Proceed with a limited thin-wrapper + GitHub Actions pilot. Do not fork Graphify and do not roll it out across every repository yet.**

Use **GatherReel** as the first real-world test. The initial evaluation's offline sample reported 4,057 nodes, 10,328 edges, ~12.5 seconds to build, and no model-token cost. Those results are encouraging but do **not** establish query accuracy, defect-detection quality, or usefulness in a live application.

A graph does not replace reading the underlying source code, running tests, or assessing runtime behavior. For Stripe and authorization flows, Graphify is a navigation aid, not a security verifier.

## Decisions on the original five questions

| Question | Decision |
| --- | --- |
| Skill, fork, or wrapper? | Wrapper using pinned Graphify CLI; optional MCP for compatible assistants. Fork only for a demonstrated upstream blocker. |
| Commit generated graphs? | No for the pilot. Keep short-lived CI artifacts; consider centrally versioned storage only after consumption is proven. |
| Does pinning a 0.9.x version suffice? | No. Pin dependency and workflow actions, test against representative repos, and explicitly approve upgrades. |
| Alternatives? | Compare against ordinary repository search/navigation; optionally against a dedicated code-graph tool. CodeQL is a separate security-oriented baseline, not a direct substitute. |
| Security/privacy? | Offline code-only default, explicit backend selection, logging disabled, minimum CI permissions, exclusion rules, access-controlled artifacts and retention limits. |

## Design and workflow requirements

1. **First prove consumption.** Verify how Claude Code and Codex/ChatGPT can actually retrieve/query the generated graph. Do not assume every assistant can run the MCP server. A graph nobody uses is operational overhead.
2. **Fix and validate the example workflow.** The evaluation sketch uploads `graphify-out/` without demonstrating that extraction emits files there. Inspect the installed CLI's actual output paths and use an explicit export/copy step; fail if expected artifacts are absent.
3. Begin with `workflow_dispatch` on a test branch. Only introduce selected push triggers after the pilot passes.
4. Use `permissions: contents: read`; pin Graphify (currently evaluated at `graphifyy==0.9.102`) and preferably GitHub Actions to immutable commit SHAs.
5. Set `GRAPHIFY_BACKEND=none` and `GRAPHIFY_QUERY_LOG_DISABLE=1` explicitly. Confirm no external LLM calls. Avoid automatic backend selection.
6. Run **code-only** extraction first. Exclude credentials, `.env` files, dependencies, generated/build assets, private media, and other sensitive or irrelevant files. Review `.graphifyignore` behavior before trusting it.
7. Store generated graph/report/HTML as CI artifacts with short retention (initially 7 days). Do not add `graph.json` to normal repository commits.
8. Prefer on-demand targeted/PR analysis plus a nightly or post-merge full graph, **only if** runtime/cost measurements justify it; do not blindly rebuild every push.
9. Record source commit SHA, Graphify version, extraction settings and graph schema/format in artifact metadata so results are not mistaken for current code.
10. Do not install global assistant hooks or repo-wide instruction changes until the tool has demonstrated value. Do not enable doc/PDF/image semantic processing or cross-repository merging in this pilot.

## GatherReel benchmark: five concrete questions

Run each with **(A) ordinary code search/navigation** and **(B) Graphify-assisted search**. Independently verify answers against source and tests.

1. Trace Stripe checkout → webhook handling → membership activation. Identify gates and potential pending-payment states.
2. Find all routes and operations that authorize an event host, including any legacy paths.
3. Map guest camera/upload path → R2 storage → metadata/persistence.
4. Identify all components/flows affected by navigation control changes.
5. Trace the activity-digest cron, its authentication, data selection, and outbound email dependencies.

For every question, capture: actual findings, correctness, material omissions, investigation time, model tokens, and graph freshness. Where applicable, note false positives and places a code graph cannot represent runtime behavior.

**Pass bar:** the graph must meaningfully improve completeness or investigation effort, with no critical omissions, and have a repeatable, usable retrieval path for the assistants. Do not treat a fast extraction benchmark as sufficient evidence.

## Requested Claude Code deliverable

Prepare a **small draft PR** containing the proposed implementation, permissions, security considerations, explicit output validation, and pilot instructions. Do not merge or deploy globally. Run only the isolated pilot validations authorized by the existing repo workflow, document what actually ran, and distinguish test evidence from proposals.

Keep the scope small: this is an engineering-efficiency experiment, not a new platform.

## Open questions to resolve during pilot

- Does Graphify accurately map dynamic TypeScript/Next.js calls, including indirect imports and Stripe event flows?
- How will ChatGPT/Codex retrieve artifact contents in the actual working environment?
- What repo-local exclusions and artifact access controls are needed for sensitive app code?
- Is incremental `update` reliable, and how does it compare in runtime to full extraction?
- Are Graphify's upstream test suite, MCP tools, and version compatibility adequate for production use?

**Repository policy:** Do not overwrite `graphify-evaluation.md` or change `master` as part of publishing this review.
