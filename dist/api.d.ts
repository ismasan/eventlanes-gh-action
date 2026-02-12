export interface SpecImageResponse {
    screenshot_url: string;
}
export declare class ApiError extends Error {
    status: number;
    constructor(status: number, message: string);
}
/**
 * Call the EventLanes API to generate a screenshot URL for a DSL spec.
 */
export declare function getSpecImageUrl(apiUrl: string, apiToken: string, spec: string): Promise<string>;
