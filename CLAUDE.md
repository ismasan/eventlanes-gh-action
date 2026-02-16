# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitHub Action that generates diagram images from EventLanes DSL specs embedded in markdown. It parses `eventlanes` fenced code blocks, calls the EventLanes API to render diagrams, and inserts/updates image references wrapped in HTML comment markers.

Two execution modes:
- **Files mode** (push events): reads markdown files from disk, updates them, commits and pushes via git
- **PR mode** (pull_request, issues, issue_comment events): reads/updates PR bodies, issue bodies, or comments via GitHub API

Mode is auto-detected from the GitHub event name or can be set explicitly via the `mode` input.

## Commands

```bash
npm run build          # Bundle src/main.ts → dist/index.js via @vercel/ncc
npm run test           # Run tests once (vitest)
npm run test:watch     # Run tests in watch mode
```

The `dist/` directory is checked in and must be rebuilt before committing changes to source files.

## Architecture

```
src/main.ts            # Entry point: reads inputs, detects mode, routes to handler
src/api.ts             # EventLanes API client (POST /api/spec-image → screenshot_url)
src/markdown.ts        # Parse eventlanes blocks, apply diagram updates (idempotent)
src/modes/files.ts     # Files mode: glob files, update, git commit+push
src/modes/pr.ts        # PR mode: update PR/issue/comment bodies via Octokit
```

Key design: `markdown.ts` handles all parsing and update logic. It finds fenced `` ```eventlanes `` blocks, detects existing `<!-- eventlanes-diagram -->` markers, and applies updates in reverse line order to preserve offsets. Updates are skipped when the image URL hasn't changed (idempotent).

## Testing

Tests are in `__tests__/` using vitest with `vi.mock()` for module-level mocking. The API, markdown parser, and PR mode each have dedicated test files. Fixtures live in `__tests__/fixtures/`.

## Action Inputs

Defined in `action.yml`: `api-url` (default: `https://eventlanes.app`), `api-token` (required), `mode` (`auto`/`files`/`pr`), `file-patterns` (glob, default `**/*.md`), `commit-message`.
