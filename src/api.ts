export interface SpecImageResponse {
  screenshot_url: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Call the EventLanes API to generate a screenshot URL for a DSL spec.
 */
export async function getSpecImageUrl(
  apiUrl: string,
  apiToken: string,
  spec: string,
): Promise<string> {
  const url = `${apiUrl.replace(/\/+$/, '')}/api/spec-image`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ spec }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new ApiError(response.status, `API error ${response.status}: ${body}`)
  }

  const data = (await response.json()) as SpecImageResponse
  return data.screenshot_url
}
