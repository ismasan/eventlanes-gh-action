export interface EventLanesBlock {
  /** The DSL spec text inside the fenced block */
  spec: string
  /** Line index where the opening ``` fence starts */
  fenceStart: number
  /** Line index where the closing ``` fence ends */
  fenceEnd: number
  /** Existing image URL if marker already present, null otherwise */
  existingUrl: string | null
  /** Line index where the existing marker starts (or null) */
  markerStart: number | null
  /** Line index where the existing marker ends (or null) */
  markerEnd: number | null
  /** If true (bang syntax), the code fence is replaced by the diagram */
  replace: boolean
}

export interface DiagramUpdate {
  block: EventLanesBlock
  imageUrl: string
}

/**
 * Parse markdown text to find all ```eventlanes fenced code blocks.
 * Also detects existing <!-- eventlanes-diagram --> markers immediately after.
 */
export function parseEventLanesBlocks(markdown: string): EventLanesBlock[] {
  const lines = markdown.split('\n')
  const blocks: EventLanesBlock[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Look for opening fence: ```eventlanes or ```eventlanes! (with optional leading whitespace)
    const fenceMatch = line.match(/^\s*```eventlanes(!?)\s*$/)
    if (fenceMatch) {
      const fenceStart = i
      const replace = fenceMatch[1] === '!'
      const specLines: string[] = []
      i++

      // Collect spec lines until closing fence
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        specLines.push(lines[i])
        i++
      }

      if (i >= lines.length) {
        // Unclosed fence, skip
        break
      }

      const fenceEnd = i
      const spec = specLines.join('\n').trim()
      i++

      // Check for existing marker immediately after the closing fence
      let existingUrl: string | null = null
      let markerStart: number | null = null
      let markerEnd: number | null = null

      if (i < lines.length && lines[i].trim() === '<!-- eventlanes-diagram -->') {
        markerStart = i
        i++
        // Look for the image line and closing marker
        while (i < lines.length) {
          if (lines[i].trim() === '<!-- /eventlanes-diagram -->') {
            markerEnd = i
            i++
            break
          }
          // Extract URL from ![...](url)
          const imgMatch = lines[i].match(/^!\[.*?\]\((.*?)\)$/)
          if (imgMatch) {
            existingUrl = imgMatch[1]
          }
          i++
        }
        // If we didn't find closing marker, reset
        if (markerEnd === null) {
          markerStart = null
          existingUrl = null
        }
      }

      if (spec.length > 0) {
        blocks.push({
          spec,
          fenceStart,
          fenceEnd,
          existingUrl,
          markerStart,
          markerEnd,
          replace,
        })
      }
    } else {
      i++
    }
  }

  return blocks
}

/**
 * Apply diagram updates to markdown text.
 * Processes updates in reverse order so line offsets remain valid.
 */
export function applyUpdates(markdown: string, updates: DiagramUpdate[]): string {
  if (updates.length === 0) return markdown

  const lines = markdown.split('\n')

  // Sort by fenceStart descending (bottom-up) so earlier offsets stay valid
  const sorted = [...updates].sort((a, b) => b.block.fenceStart - a.block.fenceStart)

  for (const update of sorted) {
    const { block, imageUrl } = update

    // Skip if URL hasn't changed
    if (block.existingUrl === imageUrl) continue

    const markerLines = [
      '<!-- eventlanes-diagram -->',
      `![Event Lanes Diagram](${imageUrl})`,
      '<!-- /eventlanes-diagram -->',
    ]

    if (block.replace) {
      // Bang syntax: replace fence (and marker if present) with just the marker
      const end = block.markerEnd !== null ? block.markerEnd : block.fenceEnd
      lines.splice(
        block.fenceStart,
        end - block.fenceStart + 1,
        ...markerLines,
      )
    } else if (block.markerStart !== null && block.markerEnd !== null) {
      // Replace existing marker
      lines.splice(
        block.markerStart,
        block.markerEnd - block.markerStart + 1,
        ...markerLines,
      )
    } else {
      // Insert new marker after closing fence
      lines.splice(block.fenceEnd + 1, 0, ...markerLines)
    }
  }

  return lines.join('\n')
}

/**
 * Count how many updates would actually change the markdown.
 */
export function countChanges(updates: DiagramUpdate[]): number {
  return updates.filter((u) => u.block.existingUrl !== u.imageUrl).length
}
