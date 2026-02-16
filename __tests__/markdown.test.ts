import { describe, it, expect } from 'vitest'
import { parseEventLanesBlocks, applyUpdates, countChanges } from '../src/markdown'

describe('parseEventLanesBlocks', () => {
  it('finds a single eventlanes block', () => {
    const md = [
      '# My Doc',
      '',
      '```eventlanes',
      'cmd:CreateUser -> evt:UserCreated',
      '```',
      '',
      'Some text after.',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].spec).toBe('cmd:CreateUser -> evt:UserCreated')
    expect(blocks[0].fenceStart).toBe(2)
    expect(blocks[0].fenceEnd).toBe(4)
    expect(blocks[0].existingUrl).toBeNull()
    expect(blocks[0].markerStart).toBeNull()
    expect(blocks[0].markerEnd).toBeNull()
  })

  it('finds multiple eventlanes blocks', () => {
    const md = [
      '```eventlanes',
      'cmd:A -> evt:B',
      '```',
      '',
      '```eventlanes',
      'cmd:C -> evt:D',
      '```',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].spec).toBe('cmd:A -> evt:B')
    expect(blocks[1].spec).toBe('cmd:C -> evt:D')
  })

  it('detects existing markers', () => {
    const md = [
      '```eventlanes',
      'cmd:A -> evt:B',
      '```',
      '<!-- eventlanes-diagram -->',
      '![Event Lanes Diagram](https://example.com/old.png)',
      '<!-- /eventlanes-diagram -->',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].existingUrl).toBe('https://example.com/old.png')
    expect(blocks[0].markerStart).toBe(3)
    expect(blocks[0].markerEnd).toBe(5)
  })

  it('handles multiline specs', () => {
    const md = [
      '```eventlanes',
      'cmd:CreateUser -> evt:UserCreated',
      'evt:UserCreated -> rm:Users List',
      'rm:Users List -> aut:Notifier',
      '```',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].spec).toBe(
      'cmd:CreateUser -> evt:UserCreated\nevt:UserCreated -> rm:Users List\nrm:Users List -> aut:Notifier',
    )
  })

  it('skips empty eventlanes blocks', () => {
    const md = ['```eventlanes', '', '```'].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(0)
  })

  it('ignores non-eventlanes code blocks', () => {
    const md = [
      '```javascript',
      'console.log("hello")',
      '```',
      '',
      '```eventlanes',
      'cmd:A -> evt:B',
      '```',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].spec).toBe('cmd:A -> evt:B')
  })

  it('handles unclosed fence gracefully', () => {
    const md = ['```eventlanes', 'cmd:A -> evt:B'].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(0)
  })

  it('handles malformed marker (no closing tag)', () => {
    const md = [
      '```eventlanes',
      'cmd:A -> evt:B',
      '```',
      '<!-- eventlanes-diagram -->',
      '![Event Lanes Diagram](https://example.com/old.png)',
      'some other content',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(1)
    // Malformed marker should be ignored
    expect(blocks[0].existingUrl).toBeNull()
    expect(blocks[0].markerStart).toBeNull()
  })

  it('handles indented fences', () => {
    const md = [
      '  ```eventlanes',
      '  cmd:A -> evt:B',
      '  ```',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].spec).toBe('cmd:A -> evt:B')
  })

  it('detects eventlanes! blocks with replace: true', () => {
    const md = [
      '# My Doc',
      '',
      '```eventlanes!',
      'cmd:CreateUser -> evt:UserCreated',
      '```',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].spec).toBe('cmd:CreateUser -> evt:UserCreated')
    expect(blocks[0].replace).toBe(true)
  })

  it('regular eventlanes blocks have replace: false', () => {
    const md = [
      '```eventlanes',
      'cmd:A -> evt:B',
      '```',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].replace).toBe(false)
  })
})

describe('applyUpdates', () => {
  it('inserts a new marker after the closing fence', () => {
    const md = [
      '# Doc',
      '```eventlanes',
      'cmd:A -> evt:B',
      '```',
      'After text.',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    const result = applyUpdates(md, [
      { block: blocks[0], imageUrl: 'https://example.com/new.png' },
    ])

    expect(result).toBe(
      [
        '# Doc',
        '```eventlanes',
        'cmd:A -> evt:B',
        '```',
        '<!-- eventlanes-diagram -->',
        '![Event Lanes Diagram](https://example.com/new.png)',
        '<!-- /eventlanes-diagram -->',
        'After text.',
      ].join('\n'),
    )
  })

  it('replaces an existing marker', () => {
    const md = [
      '```eventlanes',
      'cmd:A -> evt:B',
      '```',
      '<!-- eventlanes-diagram -->',
      '![Event Lanes Diagram](https://example.com/old.png)',
      '<!-- /eventlanes-diagram -->',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    const result = applyUpdates(md, [
      { block: blocks[0], imageUrl: 'https://example.com/new.png' },
    ])

    expect(result).toBe(
      [
        '```eventlanes',
        'cmd:A -> evt:B',
        '```',
        '<!-- eventlanes-diagram -->',
        '![Event Lanes Diagram](https://example.com/new.png)',
        '<!-- /eventlanes-diagram -->',
      ].join('\n'),
    )
  })

  it('skips update when URL is identical', () => {
    const url = 'https://example.com/same.png'
    const md = [
      '```eventlanes',
      'cmd:A -> evt:B',
      '```',
      '<!-- eventlanes-diagram -->',
      `![Event Lanes Diagram](${url})`,
      '<!-- /eventlanes-diagram -->',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    const result = applyUpdates(md, [{ block: blocks[0], imageUrl: url }])

    // Should be unchanged
    expect(result).toBe(md)
  })

  it('handles multiple blocks correctly (reverse order)', () => {
    const md = [
      '```eventlanes',
      'cmd:A -> evt:B',
      '```',
      '',
      '```eventlanes',
      'cmd:C -> evt:D',
      '```',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    const result = applyUpdates(md, [
      { block: blocks[0], imageUrl: 'https://example.com/1.png' },
      { block: blocks[1], imageUrl: 'https://example.com/2.png' },
    ])

    expect(result).toBe(
      [
        '```eventlanes',
        'cmd:A -> evt:B',
        '```',
        '<!-- eventlanes-diagram -->',
        '![Event Lanes Diagram](https://example.com/1.png)',
        '<!-- /eventlanes-diagram -->',
        '',
        '```eventlanes',
        'cmd:C -> evt:D',
        '```',
        '<!-- eventlanes-diagram -->',
        '![Event Lanes Diagram](https://example.com/2.png)',
        '<!-- /eventlanes-diagram -->',
      ].join('\n'),
    )
  })

  it('returns unchanged markdown when no updates', () => {
    const md = '# Just a doc\nNo code blocks here.'
    const result = applyUpdates(md, [])
    expect(result).toBe(md)
  })

  it('bang block replaces the code fence with image marker', () => {
    const md = [
      '# Doc',
      '```eventlanes!',
      'cmd:A -> evt:B',
      '```',
      'After text.',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    const result = applyUpdates(md, [
      { block: blocks[0], imageUrl: 'https://example.com/new.png' },
    ])

    expect(result).toBe(
      [
        '# Doc',
        '<!-- eventlanes-diagram -->',
        '![Event Lanes Diagram](https://example.com/new.png)',
        '<!-- /eventlanes-diagram -->',
        'After text.',
      ].join('\n'),
    )
  })

  it('bang block with existing marker replaces fence + marker', () => {
    const md = [
      '# Doc',
      '```eventlanes!',
      'cmd:A -> evt:B',
      '```',
      '<!-- eventlanes-diagram -->',
      '![Event Lanes Diagram](https://example.com/old.png)',
      '<!-- /eventlanes-diagram -->',
      'After text.',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    const result = applyUpdates(md, [
      { block: blocks[0], imageUrl: 'https://example.com/new.png' },
    ])

    expect(result).toBe(
      [
        '# Doc',
        '<!-- eventlanes-diagram -->',
        '![Event Lanes Diagram](https://example.com/new.png)',
        '<!-- /eventlanes-diagram -->',
        'After text.',
      ].join('\n'),
    )
  })

  it('handles mixed bang and non-bang blocks', () => {
    const md = [
      '```eventlanes!',
      'cmd:A -> evt:B',
      '```',
      '',
      '```eventlanes',
      'cmd:C -> evt:D',
      '```',
    ].join('\n')

    const blocks = parseEventLanesBlocks(md)
    expect(blocks[0].replace).toBe(true)
    expect(blocks[1].replace).toBe(false)

    const result = applyUpdates(md, [
      { block: blocks[0], imageUrl: 'https://example.com/1.png' },
      { block: blocks[1], imageUrl: 'https://example.com/2.png' },
    ])

    expect(result).toBe(
      [
        '<!-- eventlanes-diagram -->',
        '![Event Lanes Diagram](https://example.com/1.png)',
        '<!-- /eventlanes-diagram -->',
        '',
        '```eventlanes',
        'cmd:C -> evt:D',
        '```',
        '<!-- eventlanes-diagram -->',
        '![Event Lanes Diagram](https://example.com/2.png)',
        '<!-- /eventlanes-diagram -->',
      ].join('\n'),
    )
  })
})

describe('countChanges', () => {
  it('counts only updates with different URLs', () => {
    const blocks = parseEventLanesBlocks(
      [
        '```eventlanes',
        'cmd:A -> evt:B',
        '```',
        '<!-- eventlanes-diagram -->',
        '![Event Lanes Diagram](https://example.com/same.png)',
        '<!-- /eventlanes-diagram -->',
        '',
        '```eventlanes',
        'cmd:C -> evt:D',
        '```',
      ].join('\n'),
    )

    const updates = [
      { block: blocks[0], imageUrl: 'https://example.com/same.png' }, // no change
      { block: blocks[1], imageUrl: 'https://example.com/new.png' }, // change
    ]

    expect(countChanges(updates)).toBe(1)
  })
})
