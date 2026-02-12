# EventLanes Diagrams GitHub Action

Automatically generate diagram images from [EventLanes](https://eventlanes.com) DSL specs embedded in markdown files and PR descriptions.

## How It Works

Write EventLanes DSL inside fenced code blocks in any markdown file or PR description:

````markdown
```eventlanes
cmd:CreateUser -> evt:UserCreated
evt:UserCreated -> rm:Users List
```
<!-- eventlanes-diagram -->
![Event Lanes Diagram](https://scr.eventlanes.app/scr/MYWwJgXAwgTgpgQwC5wKoGc4wAQFoB82cAbkhBlrIimAFAlkUxXJxh6EwjmYzrYAZAJbokQA/ddbb498db75f0350c0216a51713d4f6cf857901097be89bb355a156d0e4cc2fd)
<!-- /eventlanes-diagram -->
````

The action calls the EventLanes API and inserts a diagram image below the code block:

````markdown
```eventlanes
cmd:CreateUser -> evt:UserCreated
evt:UserCreated -> rm:Users List
```
<!-- eventlanes-diagram -->
![Event Lanes Diagram](https://scr.eventlanes.app/scr/MYWwJgXAwgTgpgQwC5wKoGc4wAQFoB82cAbkhBlrIimAFAlkUxXJxh6EwjmYzrYAZAJbokQA/ddbb498db75f0350c0216a51713d4f6cf857901097be89bb355a156d0e4cc2fd)
<!-- /eventlanes-diagram -->
````

Updates are idempotent — if the spec hasn't changed, the image URL stays the same and no update is made.

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| `files` | `push` | Scans markdown files, updates them, commits and pushes |
| `pr` | `pull_request`, `issues`, `issue_comment` | Reads the PR/issue body or comment, updates it via the GitHub API |
| `auto` (default) | any | Detects mode from the trigger event |

## Usage

### Update markdown files on push

```yaml
on:
  push:
    branches: [main]
    paths: ['**/*.md']

permissions:
  contents: write

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: eventlanes/action-diagrams@v1
        with:
          api-token: ${{ secrets.EVENTLANES_API_TOKEN }}
```

### Update PR descriptions, issues, and comments

```yaml
on:
  pull_request:
    types: [opened, edited]
  issues:
    types: [opened, edited]
  issue_comment:
    types: [created, edited]

permissions:
  pull-requests: write
  issues: write

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: eventlanes/action-diagrams@v1
        with:
          api-token: ${{ secrets.EVENTLANES_API_TOKEN }}
          mode: pr
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The `pr` mode handles all three trigger types automatically:
- **`pull_request`** — updates the PR body
- **`issues`** — updates the issue body
- **`issue_comment`** — updates the comment body (on both PRs and issues)

## Authentication

The action uses two different tokens:

- **`api-token`** — your EventLanes API token, used to generate diagram images. Store it as a repository secret (e.g. `EVENTLANES_API_TOKEN`).
- **`GITHUB_TOKEN`** — required in `pr` mode only. This is the token the action uses to call the GitHub API to update PR bodies, issue bodies, and comments. GitHub automatically provides `${{ secrets.GITHUB_TOKEN }}` in every workflow run — you just need to pass it as an environment variable and grant the appropriate permissions (`pull-requests: write`, `issues: write`). It is not needed in `files` mode, which commits and pushes changes via git instead.

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `api-token` | Bearer token for the EventLanes API | **required** |
| `api-url` | EventLanes API base URL | `https://eventlanes.app` |
| `mode` | `auto`, `files`, or `pr` | `auto` |
| `file-patterns` | Glob patterns for markdown files (comma-separated) | `**/*.md` |
| `commit-message` | Commit message when updating files | `Update EventLanes diagram images` |

## Outputs

| Output | Description |
|--------|-------------|
| `updated-count` | Number of diagrams updated |

## Error Handling

- Each code block is processed independently — a failure in one block won't stop others
- Invalid specs (API 422) are logged as warnings, not failures
- Only infrastructure errors (missing token, git failures) fail the action
- Push loop prevention: the action skips when triggered by `github-actions[bot]`
