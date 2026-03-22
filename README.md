# n8n-nodes-camoufox

n8n community node for [Camoufox](https://camoufox.com) — a stealthy, anti-detect browser built on Firefox for web scraping that evades bot detection.

This node connects to a remote Camoufox instance via Playwright's WebSocket protocol and provides scraping-focused operations.

## Operations

| Operation | Description |
|-----------|-------------|
| **Get Page Content** | Navigate to a URL and return the full HTML, visible text, title, and status code |
| **Extract Elements** | Navigate to a URL and extract data from elements matching a CSS selector (text, HTML, attributes, links, or table data) |
| **Screenshot** | Navigate to a URL and capture a full page, viewport, or element screenshot |
| **Run Script** | Navigate to a URL and execute custom JavaScript in the page context |

Every operation is self-contained: provide a URL, optionally configure wait conditions and pre-actions, and get structured data back.

## Pre-Actions

Each operation supports optional **Actions Before Extract** — a sequence of steps that run after navigation but before data extraction:

- **Click** — dismiss cookie banners, click "load more" buttons
- **Fill** / **Type** — enter text into form fields
- **Wait for Selector** — wait for dynamic content to appear
- **Scroll to Bottom** — trigger infinite scroll / lazy loading
- **Wait (ms)** — pause for a fixed duration

## Installation

### Via n8n UI (recommended)

1. Go to **Settings → Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-camoufox` and click **Install**

### Via CLI

```bash
# npm
npm install n8n-nodes-camoufox

# pnpm (inside your n8n installation directory)
pnpm add n8n-nodes-camoufox
```

Then restart n8n.

## Setup

### 1. Run the Camoufox container

See [camoufox-docker](https://github.com/LPilic/camoufox-docker) for the Docker container setup (Dockerfile, start script, and docker-compose example).

Quick start:

```bash
git clone https://github.com/LPilic/camoufox-docker.git camoufox
docker compose build camoufox
docker compose up -d camoufox
```

### 2. Configure n8n

Add `n8n-nodes-camoufox` to `N8N_CUSTOM_EXTENSIONS`:

```
N8N_CUSTOM_EXTENSIONS: /home/node/.n8n/custom-nodes/n8n-nodes-camoufox
```

Restart n8n, then create a **Camoufox Connection** credential:

- **WebSocket Endpoint**: `ws://camoufox:9222` — the node will auto-discover the token via the `/json` API. You can also provide the full URL with token (e.g. `ws://camoufox:9222/<token>`).
- **Ignore HTTPS Errors**: enable if behind a corporate proxy or using self-signed certs

Optional proxy settings are also available in the credential.

## Development

```bash
pnpm install
pnpm run build    # compile TypeScript + copy icons
pnpm run dev      # watch mode
pnpm run test     # run tests
pnpm run lint     # lint
```

## License

MIT
