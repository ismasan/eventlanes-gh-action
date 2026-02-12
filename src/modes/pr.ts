import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  parseEventLanesBlocks,
  applyUpdates,
  countChanges,
  type DiagramUpdate,
} from '../markdown.js'
import { getSpecImageUrl } from '../api.js'

/**
 * Parse eventlanes blocks from markdown text, generate diagram images,
 * and return the updated text and change count.
 */
export async function processMarkdown(
  text: string,
  apiUrl: string,
  apiToken: string,
): Promise<{ updatedText: string; changeCount: number }> {
  const blocks = parseEventLanesBlocks(text)
  if (blocks.length === 0) {
    return { updatedText: text, changeCount: 0 }
  }

  core.info(`Found ${blocks.length} eventlanes block(s).`)

  const updates: DiagramUpdate[] = []

  for (const block of blocks) {
    try {
      const imageUrl = await getSpecImageUrl(apiUrl, apiToken, block.spec)
      updates.push({ block, imageUrl })
      core.info(`Generated image for block at line ${block.fenceStart + 1}`)
    } catch (err) {
      core.warning(
        `Failed to generate image for block at line ${block.fenceStart + 1}: ${err}`,
      )
    }
  }

  const changeCount = countChanges(updates)
  if (changeCount === 0) {
    return { updatedText: text, changeCount: 0 }
  }

  const updatedText = applyUpdates(text, updates)
  return { updatedText, changeCount }
}

/**
 * GitHub mode: read the body from a PR, issue, or comment,
 * find eventlanes blocks, generate images, and update via the GitHub API.
 */
export async function runPrMode(apiUrl: string, apiToken: string): Promise<number> {
  const token = process.env.GITHUB_TOKEN || core.getInput('github-token')
  if (!token) {
    throw new Error('GITHUB_TOKEN is required for PR mode')
  }

  const octokit = github.getOctokit(token)
  const { context } = github

  switch (context.eventName) {
    case 'pull_request':
    case 'pull_request_target':
      return processPullRequest(octokit, context, apiUrl, apiToken)
    case 'issues':
      return processIssue(octokit, context, apiUrl, apiToken)
    case 'issue_comment':
      return processComment(octokit, context, apiUrl, apiToken)
    default:
      core.warning(`Unsupported event: ${context.eventName}. Skipping.`)
      return 0
  }
}

async function processPullRequest(
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context,
  apiUrl: string,
  apiToken: string,
): Promise<number> {
  const prNumber = context.payload.pull_request?.number
  if (!prNumber) {
    core.warning('No pull request found in context. Skipping.')
    return 0
  }

  const body = context.payload.pull_request?.body || ''
  if (!body) {
    core.info('PR body is empty. Nothing to process.')
    return 0
  }

  const { updatedText, changeCount } = await processMarkdown(body, apiUrl, apiToken)
  if (changeCount === 0) {
    core.info('All diagrams are up to date.')
    return 0
  }

  await octokit.rest.pulls.update({
    ...context.repo,
    pull_number: prNumber,
    body: updatedText,
  })

  core.info(`Updated PR #${prNumber} body with ${changeCount} diagram(s).`)
  return changeCount
}

async function processIssue(
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context,
  apiUrl: string,
  apiToken: string,
): Promise<number> {
  const issueNumber = context.payload.issue?.number
  if (!issueNumber) {
    core.warning('No issue found in context. Skipping.')
    return 0
  }

  const body = context.payload.issue?.body || ''
  if (!body) {
    core.info('Issue body is empty. Nothing to process.')
    return 0
  }

  const { updatedText, changeCount } = await processMarkdown(body, apiUrl, apiToken)
  if (changeCount === 0) {
    core.info('All diagrams are up to date.')
    return 0
  }

  await octokit.rest.issues.update({
    ...context.repo,
    issue_number: issueNumber,
    body: updatedText,
  })

  core.info(`Updated issue #${issueNumber} body with ${changeCount} diagram(s).`)
  return changeCount
}

async function processComment(
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context,
  apiUrl: string,
  apiToken: string,
): Promise<number> {
  const commentId = context.payload.comment?.id
  if (!commentId) {
    core.warning('No comment found in context. Skipping.')
    return 0
  }

  const body = context.payload.comment?.body || ''
  if (!body) {
    core.info('Comment body is empty. Nothing to process.')
    return 0
  }

  const { updatedText, changeCount } = await processMarkdown(body, apiUrl, apiToken)
  if (changeCount === 0) {
    core.info('All diagrams are up to date.')
    return 0
  }

  await octokit.rest.issues.updateComment({
    ...context.repo,
    comment_id: commentId,
    body: updatedText,
  })

  core.info(`Updated comment ${commentId} with ${changeCount} diagram(s).`)
  return changeCount
}
