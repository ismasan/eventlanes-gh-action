/**
 * Parse eventlanes blocks from markdown text, generate diagram images,
 * and return the updated text and change count.
 */
export declare function processMarkdown(text: string, apiUrl: string, apiToken: string): Promise<{
    updatedText: string;
    changeCount: number;
}>;
/**
 * GitHub mode: read the body from a PR, issue, or comment,
 * find eventlanes blocks, generate images, and update via the GitHub API.
 */
export declare function runPrMode(apiUrl: string, apiToken: string): Promise<number>;
//# sourceMappingURL=pr.d.ts.map