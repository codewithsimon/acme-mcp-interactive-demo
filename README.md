# Acme MCP interactive explainer

A stage-ready, deterministic React presentation that explains the Model Context Protocol through a fictional Acme workflow. This is an **educational simulation**, not an MCP server or client. It makes no runtime network calls and uses no model, API, backend, credentials, or live Acme systems.

## Run locally

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

Vite serves the local app at the URL printed in the terminal. The deployed demo route is:

**https://codewithsimon.github.io/acme-mcp-interactive-demo/**

## Stage operation

Start in **Guided** mode and advance each chapter manually. The story moves from a pre-MCP integration tangle through discovery, structured tools, host portability, an indirect prompt-injection attempt, server-side denial, and a valid prepare/approve deployment. Nothing auto-advances.

Switch to **Free explore** to inspect the capability catalog and schemas, edit simulated tool inputs, invoke the deterministic tools, and inspect the protocol event stream and append-only audit log. **Reset simulation** restores the fixture state.

For a projector, use a current Chromium, Firefox, or Safari browser at 100% zoom and enter browser full-screen. The layout adapts to laptop, 16:9 projector, tablet, and narrow screens. The app honors the operating system’s reduced-motion preference; **Skip motion** also disables transitions for the current session.

### Keyboard controls

| Key | Action |
| --- | --- |
| `→`, `Space`, `Page Down` | Next guided chapter |
| `←`, `Page Up` | Previous guided chapter |
| `E` | Toggle Guided / Free explore |
| `R` | Reset the deterministic simulation |
| `Shift+R` | Replay the path to the current chapter |
| `?`, `Escape` | Toggle presenter help |

Keyboard navigation is suspended while typing in form fields.

## Deterministic simulation

Typed fixtures, validators, policy decisions, and the state machine live in `src/domain.ts` and `src/simulator.ts`. The same reducer drives both guided and free-explore modes. Stable demo values include:

- Project Phoenix at 72% with two known blockers
- issue `ACME-1042`
- denied release `experimental-99`
- approved release `phoenix-2026.08`
- one-time prepare token `prep_phx_202608_7K2M`

Protocol messages, illustrative model reasoning, downstream operations, and server policy decisions are explicitly labeled in the event stream.

## GitHub Pages

`vite.config.ts` sets the production base to `/acme-mcp-interactive-demo/`. The workflow in `.github/workflows/deploy-pages.yml` validates pull requests and deploys `dist/` on pushes to `main`.

In repository **Settings → Pages**, set **Source** to **GitHub Actions**. The workflow uses only the standard `pages: write` and `id-token: write` permissions; no deployment secret is required.
