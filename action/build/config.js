export function assertSafeEvent(eventName) {
    if (eventName === "pull_request_target") {
        throw new Error("cpd-diff does not run in pull_request_target; use pull_request with read-only permissions");
    }
}
export function resolveBase(explicitBase, event) {
    if (explicitBase.trim().length > 0)
        return explicitBase.trim();
    const sha = event.pull_request?.base?.sha;
    if (typeof sha === "string" && sha.length > 0)
        return sha;
    throw new Error("base is required outside a pull_request event");
}
export function parseList(value) {
    return value.split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean);
}
//# sourceMappingURL=config.js.map