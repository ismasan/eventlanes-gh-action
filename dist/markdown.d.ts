export interface EventLanesBlock {
    /** The DSL spec text inside the fenced block */
    spec: string;
    /** Line index where the opening ``` fence starts */
    fenceStart: number;
    /** Line index where the closing ``` fence ends */
    fenceEnd: number;
    /** Existing image URL if marker already present, null otherwise */
    existingUrl: string | null;
    /** Line index where the existing marker starts (or null) */
    markerStart: number | null;
    /** Line index where the existing marker ends (or null) */
    markerEnd: number | null;
    /** If true (bang syntax), the code fence is replaced by the diagram */
    replace: boolean;
}
export interface DiagramUpdate {
    block: EventLanesBlock;
    imageUrl: string;
}
/**
 * Parse markdown text to find all ```eventlanes fenced code blocks.
 * Also detects existing <!-- eventlanes-diagram --> markers immediately after.
 */
export declare function parseEventLanesBlocks(markdown: string): EventLanesBlock[];
/**
 * Apply diagram updates to markdown text.
 * Processes updates in reverse order so line offsets remain valid.
 */
export declare function applyUpdates(markdown: string, updates: DiagramUpdate[]): string;
/**
 * Count how many updates would actually change the markdown.
 */
export declare function countChanges(updates: DiagramUpdate[]): number;
