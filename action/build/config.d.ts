export type GitHubEvent = Readonly<{
    pull_request?: Readonly<{
        base?: Readonly<{
            sha?: unknown;
        }>;
    }>;
}>;
export declare function assertSafeEvent(eventName: string): void;
export declare function resolveBase(explicitBase: string, event: GitHubEvent): string;
export declare function parseList(value: string): string[];
//# sourceMappingURL=config.d.ts.map