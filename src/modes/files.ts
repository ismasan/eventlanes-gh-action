import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as fs from 'fs/promises'
import {
  parseEventLanesBlocks,
  applyUpdates,
  countChanges,
  type DiagramUpdate,
} from '../markdown.js'
import { getSpecImageUrl } from '../api.js'

/**
 * Files mode: scan markdown files matching patterns, find eventlanes blocks,
 * generate images, update files, and commit+push changes.
 */
export async function runFilesMode(
  apiUrl: string,
  apiToken: string,
  filePatterns: string,
  commitMessage: string,
): Promise<number> {
  const patterns = filePatterns
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  const globber = await glob.create(patterns.join('\n'), { followSymbolicLinks: false })
  const files = await globber.glob()

  if (files.length === 0) {
    core.info('No markdown files found matching patterns.')
    return 0
  }

  core.info(`Found ${files.length} markdown file(s) to scan.`)

  let totalChanges = 0
  const changedFiles: string[] = []

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8')
    const blocks = parseEventLanesBlocks(content)

    if (blocks.length === 0) continue

    core.info(`Processing ${filePath}: ${blocks.length} block(s)`)

    const updates: DiagramUpdate[] = []

    for (const block of blocks) {
      try {
        const imageUrl = await getSpecImageUrl(apiUrl, apiToken, block.spec)
        updates.push({ block, imageUrl })
      } catch (err) {
        core.warning(
          `Failed to generate image in ${filePath} at line ${block.fenceStart + 1}: ${err}`,
        )
      }
    }

    const changeCount = countChanges(updates)
    if (changeCount === 0) continue

    const updatedContent = applyUpdates(content, updates)
    await fs.writeFile(filePath, updatedContent, 'utf-8')

    changedFiles.push(filePath)
    totalChanges += changeCount
    core.info(`Updated ${changeCount} diagram(s) in ${filePath}`)
  }

  if (changedFiles.length === 0) {
    core.info('All diagrams are up to date.')
    return 0
  }

  // Configure git and commit
  await exec.exec('git', ['config', 'user.name', 'github-actions[bot]'])
  await exec.exec('git', [
    'config',
    'user.email',
    '41898282+github-actions[bot]@users.noreply.github.com',
  ])
  await exec.exec('git', ['add', ...changedFiles])
  await exec.exec('git', ['commit', '-m', commitMessage])
  await exec.exec('git', ['push'])

  core.info(`Committed and pushed ${totalChanges} diagram update(s) across ${changedFiles.length} file(s).`)
  return totalChanges
}
