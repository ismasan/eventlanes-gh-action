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

### Replace mode (`eventlanes!`)

Use a trailing `!` on the code fence to **replace** the code block entirely with the diagram image:

````markdown
```eventlanes!
cmd:CreateUser -> evt:UserCreated
evt:UserCreated -> rm:Users List
```
````

After the action runs, the code block is removed and only the rendered diagram remains:

```markdown
<!-- eventlanes-diagram -->
![Event Lanes Diagram](https://scr.eventlanes.app/scr/...)
<!-- /eventlanes-diagram -->
```

This is useful when you want to show only the diagram without the DSL source. Note that this is a one-shot operation — once the code block is replaced, subsequent runs leave the diagram marker as-is.

## Example

Type a code-fenced text model in a .md file in your repo, or a PR description, issue, or comment, and this action will generate and embed the image:

```eventlanes
## Node types
# UIs are placeholder for any user-facing interfaces
ui:Booking Page

# Commands are intents to update state
cmd:StartBooking
cmd:ConfirmPayment

# Events are the record of the state change
evt:BookingStarted
evt:PaymentConfirmed

# Read models are system state
# derived from events
rm:Pending Bookings

# Automations (A.K.A "Process Managers")
# Observe changes in read models or events
# And dispatch the next command in a workflow
aut:Payment Processor

# "Externals" are placeholders for 3rd parties
# or services outside of your system
ext:Stripe API

# Once node types are declared,
# you can define flows by refering to the node names

# 1. Start a booking and record an event
Booking Page -> StartBooking
StartBooking -(validate data)-> BookingStarted

# 2. Collect state in a read model
BookingStarted -> Pending Bookings

# 3. Pending bookings trigger an automation
Pending Bookings -> Payment Processor

# 4. Automation contacts some 3rd party
Payment Processor -(POST request)->Stripe API

# 5. Automation continues the workflow
Payment Processor -> ConfirmPayment -> PaymentConfirmed

# 6. Confirmed payments remove pending booking
PaymentConfirmed -(remove)-> Pending Bookings

# (*) You can also declare types as part of flows
# ex. cmd:CreateUser -> evt:UserCreated
```

<img width="1499" height="769" alt="CleanShot 2026-02-13 at 10 23 06" src="https://github.com/user-attachments/assets/457b1acd-451f-41c1-8a4b-9d69f6b566c7" />


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
      - uses: ismasan/eventlanes-gh-action@v1
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
      - uses: ismasan/eventlanes-gh-action@v1
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

- **`api-token`** — your EventLanes API token, used to generate diagram images. To configure it, go to your repo's **Settings → Secrets and variables → Actions**, click **New repository secret**, set the name to `EVENTLANES_API_TOKEN`, and paste your token as the value.
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
