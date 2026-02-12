import { describe, it, expect, vi, beforeEach } from 'vitest'

// Declare mock objects in hoisted scope so vi.mock factories can reference them
const { mockContext, mockOctokit } = vi.hoisted(() => {
  const mockContext = {
    eventName: 'pull_request',
    repo: { owner: 'test-owner', repo: 'test-repo' },
    payload: {} as Record<string, unknown>,
  }
  const mockOctokit = {
    rest: {
      pulls: { update: vi.fn() },
      issues: { update: vi.fn(), updateComment: vi.fn() },
    },
  }
  return { mockContext, mockOctokit }
})

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  getInput: vi.fn(),
}))

vi.mock('@actions/github', () => ({
  context: mockContext,
  getOctokit: () => mockOctokit,
}))

vi.mock('../src/api', () => ({
  getSpecImageUrl: vi.fn().mockResolvedValue('https://scr.eventlanes.app/scr/new123'),
}))

import { processMarkdown, runPrMode } from '../src/modes/pr'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GITHUB_TOKEN = 'test-token'
})

describe('processMarkdown', () => {
  it('returns unchanged text when no eventlanes blocks', async () => {
    const text = '# Just a heading\nSome text.'
    const result = await processMarkdown(text, 'https://api.test', 'tok')
    expect(result).toEqual({ updatedText: text, changeCount: 0 })
  })

  it('processes eventlanes blocks and returns updated text', async () => {
    const text = [
      '# Doc',
      '```eventlanes',
      'cmd:A -> evt:B',
      '```',
    ].join('\n')

    const result = await processMarkdown(text, 'https://api.test', 'tok')
    expect(result.changeCount).toBe(1)
    expect(result.updatedText).toContain('<!-- eventlanes-diagram -->')
    expect(result.updatedText).toContain('https://scr.eventlanes.app/scr/new123')
  })
})

describe('runPrMode', () => {
  describe('pull_request event', () => {
    beforeEach(() => {
      mockContext.eventName = 'pull_request'
    })

    it('updates PR body with diagrams', async () => {
      mockContext.payload = {
        pull_request: {
          number: 42,
          body: '```eventlanes\ncmd:A -> evt:B\n```',
        },
      }

      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(1)
      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 42,
        body: expect.stringContaining('<!-- eventlanes-diagram -->'),
      })
    })

    it('returns 0 when PR body is empty', async () => {
      mockContext.payload = { pull_request: { number: 42, body: '' } }
      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(0)
      expect(mockOctokit.rest.pulls.update).not.toHaveBeenCalled()
    })

    it('returns 0 when no eventlanes blocks in PR body', async () => {
      mockContext.payload = {
        pull_request: { number: 42, body: '# Just a heading' },
      }
      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(0)
    })

    it('returns 0 when no pull_request in payload', async () => {
      mockContext.payload = {}
      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(0)
    })
  })

  describe('issues event', () => {
    beforeEach(() => {
      mockContext.eventName = 'issues'
    })

    it('updates issue body with diagrams', async () => {
      mockContext.payload = {
        issue: {
          number: 7,
          body: '```eventlanes\ncmd:A -> evt:B\n```',
        },
      }

      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(1)
      expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 7,
        body: expect.stringContaining('<!-- eventlanes-diagram -->'),
      })
    })

    it('returns 0 when issue body is empty', async () => {
      mockContext.payload = { issue: { number: 7, body: '' } }
      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(0)
      expect(mockOctokit.rest.issues.update).not.toHaveBeenCalled()
    })

    it('returns 0 when no issue in payload', async () => {
      mockContext.payload = {}
      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(0)
    })
  })

  describe('issue_comment event', () => {
    beforeEach(() => {
      mockContext.eventName = 'issue_comment'
    })

    it('updates comment body with diagrams', async () => {
      mockContext.payload = {
        comment: {
          id: 999,
          body: '```eventlanes\ncmd:A -> evt:B\n```',
        },
      }

      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(1)
      expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 999,
        body: expect.stringContaining('<!-- eventlanes-diagram -->'),
      })
    })

    it('returns 0 when comment body is empty', async () => {
      mockContext.payload = { comment: { id: 999, body: '' } }
      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(0)
      expect(mockOctokit.rest.issues.updateComment).not.toHaveBeenCalled()
    })

    it('returns 0 when no comment in payload', async () => {
      mockContext.payload = {}
      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(0)
    })
  })

  describe('unsupported event', () => {
    it('returns 0 and warns for unknown event', async () => {
      mockContext.eventName = 'workflow_dispatch'
      mockContext.payload = {}
      const count = await runPrMode('https://api.test', 'tok')
      expect(count).toBe(0)
    })
  })
})
