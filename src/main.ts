import * as core from '@actions/core'
import * as github from '@actions/github'
import { runPrMode } from './modes/pr.js'
import { runFilesMode } from './modes/files.js'

type Mode = 'auto' | 'files' | 'pr'

function detectMode(): 'files' | 'pr' {
  const eventName = github.context.eventName
  if (
    eventName === 'pull_request' ||
    eventName === 'pull_request_target' ||
    eventName === 'issues' ||
    eventName === 'issue_comment'
  ) {
    return 'pr'
  }
  return 'files'
}

async function run(): Promise<void> {
  try {
    // Skip if triggered by the bot itself (prevent push loops)
    if (github.context.actor === 'github-actions[bot]') {
      core.info('Skipping: triggered by github-actions[bot]')
      return
    }

    const apiUrl = core.getInput('api-url')
    const apiToken = core.getInput('api-token', { required: true })
    const modeInput = core.getInput('mode') as Mode
    const filePatterns = core.getInput('file-patterns')
    const commitMessage = core.getInput('commit-message')

    const mode = modeInput === 'auto' ? detectMode() : modeInput
    core.info(`Running in ${mode} mode`)

    let updatedCount: number

    if (mode === 'pr') {
      updatedCount = await runPrMode(apiUrl, apiToken)
    } else {
      updatedCount = await runFilesMode(apiUrl, apiToken, filePatterns, commitMessage)
    }

    core.setOutput('updated-count', updatedCount)
    core.info(`Done. Updated ${updatedCount} diagram(s).`)
  } catch (err) {
    if (err instanceof Error) {
      core.setFailed(err.message)
    } else {
      core.setFailed(String(err))
    }
  }
}

run()
