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

## Setup

### 1. Run Camoufox as a Docker service

A Docker setup is included in the `camoufox/` directory of the n8n-plus project:

```yaml
# docker-compose.yaml
camoufox:
  build: ./camoufox
  container_name: camoufox
  restart: always
  ports:
    - "9222:9222"
  environment:
    CAMOUFOX_PORT: 9222
```

```bash
docker compose build camoufox
docker compose up -d camoufox
```

Check the logs for the WebSocket endpoint (includes a random token):

```bash
docker logs camoufox
# Websocket endpoint: ws://localhost:9222/abc123...
```

### 2. Configure n8n

Add `n8n-nodes-camoufox` to `N8N_CUSTOM_EXTENSIONS`:

```
N8N_CUSTOM_EXTENSIONS: /home/node/.n8n/custom-nodes/n8n-nodes-camoufox
```

Restart n8n, then create a **Camoufox Connection** credential:

- **WebSocket Endpoint**: `ws://camoufox:9222/<token>` (get the token from `docker logs camoufox`)
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
