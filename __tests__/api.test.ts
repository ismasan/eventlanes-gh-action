import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSpecImageUrl, ApiError } from '../src/api'

describe('getSpecImageUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns screenshot URL on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ screenshot_url: 'https://scr.eventlanes.app/scr/abc123' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const url = await getSpecImageUrl(
      'https://eventlanes.com',
      'test-token',
      'cmd:A -> evt:B',
    )

    expect(url).toBe('https://scr.eventlanes.app/scr/abc123')
    expect(mockFetch).toHaveBeenCalledWith('https://eventlanes.com/api/spec-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ spec: 'cmd:A -> evt:B' }),
    })
  })

  it('strips trailing slash from API URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ screenshot_url: 'https://scr.eventlanes.app/scr/abc123' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await getSpecImageUrl('https://eventlanes.com/', 'token', 'cmd:A -> evt:B')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://eventlanes.com/api/spec-image',
      expect.any(Object),
    )
  })

  it('throws ApiError on 422', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => '{"error":"Invalid spec"}',
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(
      getSpecImageUrl('https://eventlanes.com', 'token', 'invalid spec'),
    ).rejects.toThrow(ApiError)

    await expect(
      getSpecImageUrl('https://eventlanes.com', 'token', 'invalid spec'),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('422'),
    })
  })

  it('throws on network error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.stubGlobal('fetch', mockFetch)

    await expect(
      getSpecImageUrl('https://eventlanes.com', 'token', 'cmd:A -> evt:B'),
    ).rejects.toThrow('Network error')
  })
})
