/**
 * Default tool configuration.
 * - doc, wiki, drive, scopes: enabled by default
 * - perm: disabled by default (sensitive operation)
 */
export const DEFAULT_TOOLS_CONFIG = {
    doc: true,
    wiki: true,
    drive: true,
    perm: false,
    scopes: true,
    im: true,
    bitable: true,
    task: true,
    calendar: true,
    sheets: true,
};
/**
 * Resolve tools config with defaults.
 */
export function resolveToolsConfig(cfg) {
    return { ...DEFAULT_TOOLS_CONFIG, ...cfg };
}
//# sourceMappingURL=tools-config.js.map