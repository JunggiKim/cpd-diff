import { spawn } from "node:child_process";

export type EngineExecutionErrorKind =
  | "invalid-output"
  | "nonzero-exit"
  | "output-limit"
  | "spawn"
  | "timeout";

export class EngineExecutionError extends Error {
  readonly exitCode: number | null;
  readonly kind: EngineExecutionErrorKind;
  readonly stderr: string;

  constructor(kind: EngineExecutionErrorKind, message: string, exitCode: number | null, stderr = "") {
    super(message);
    this.name = "EngineExecutionError";
    this.kind = kind;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

export type ProcessRequest = Readonly<{
  args: readonly string[];
  command: string;
  cwd: string;
  maximumOutputBytes: number;
  timeoutMilliseconds: number;
}>;

export type ProcessResult = Readonly<{
  stderr: string;
  stdout: string;
}>;

export async function runProcess(request: ProcessRequest): Promise<ProcessResult> {
  validateRequest(request);
  return await new Promise<ProcessResult>((resolve, reject) => {
    const child = spawn(request.command, [...request.args], {
      cwd: request.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let forcedError: EngineExecutionError | undefined;

    const terminate = (error: EngineExecutionError) => {
      if (forcedError !== undefined) return;
      forcedError = error;
      child.kill("SIGKILL");
    };
    const collect = (target: Buffer[]) => (chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > request.maximumOutputBytes) {
        terminate(new EngineExecutionError("output-limit", "Engine output limit exceeded", null));
        return;
      }
      target.push(chunk);
    };

    child.stdout.on("data", collect(stdout));
    child.stderr.on("data", collect(stderr));
    const timeout = setTimeout(
      () => terminate(new EngineExecutionError("timeout", "Engine execution timed out", null)),
      request.timeoutMilliseconds,
    );
    timeout.unref();

    child.once("error", (cause) => {
      clearTimeout(timeout);
      reject(new EngineExecutionError("spawn", `Engine process could not start: ${cause.message}`, null));
    });
    child.once("close", (exitCode) => {
      clearTimeout(timeout);
      if (forcedError !== undefined) {
        reject(forcedError);
        return;
      }
      try {
        const result = { stdout: decode(stdout), stderr: decode(stderr) };
        if (exitCode !== 0) {
          reject(
            new EngineExecutionError(
              "nonzero-exit",
              `Engine exited with code ${String(exitCode)}`,
              exitCode,
              result.stderr,
            ),
          );
          return;
        }
        resolve(result);
      } catch {
        reject(new EngineExecutionError("invalid-output", "Engine output is not valid UTF-8", exitCode));
      }
    });
  });
}

function validateRequest(request: ProcessRequest): void {
  if (request.command.length === 0) throw new Error("Engine command is required");
  if (!Number.isSafeInteger(request.timeoutMilliseconds) || request.timeoutMilliseconds < 1) {
    throw new Error("Engine timeout must be a positive integer");
  }
  if (!Number.isSafeInteger(request.maximumOutputBytes) || request.maximumOutputBytes < 1) {
    throw new Error("Engine output limit must be a positive integer");
  }
}

function decode(chunks: readonly Buffer[]): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
}
