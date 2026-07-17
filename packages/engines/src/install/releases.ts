export type ArchiveFormat = "tar.gz" | "zip";

export type EngineRelease = Readonly<{
  archiveFormat: ArchiveFormat;
  artifactName: string;
  executableRelativePath: string;
  sha256: string;
  trustedOrigins: ReadonlySet<string>;
  url: URL;
  version: string;
}>;

const trustedGitHubOrigins = new Set([
  "https://github.com",
  "https://release-assets.githubusercontent.com",
]);

function jscpdRelease(
  artifactName: string,
  sha256: string,
  executableRelativePath = "jscpd",
): EngineRelease {
  return Object.freeze({
    archiveFormat: "tar.gz",
    artifactName,
    executableRelativePath,
    sha256,
    trustedOrigins: trustedGitHubOrigins,
    url: new URL(`https://github.com/kucherenko/jscpd/releases/download/v5.0.12/${artifactName}`),
    version: "5.0.12",
  });
}

export const ENGINE_RELEASES = Object.freeze({
  jscpd: Object.freeze({
    "darwin-arm64": jscpdRelease(
      "jscpd-darwin-arm64.tar.gz",
      "e4d8add23658938cb553c3cd8945d1163c206e36732e0cd742c511aad43c33c8",
    ),
    "darwin-x64": jscpdRelease(
      "jscpd-darwin-x64.tar.gz",
      "7a39fc68081846f36b9325a15cb84b1e5aa09629ec4012cede2fd18cedbd3b6f",
    ),
    "linux-arm64": jscpdRelease(
      "jscpd-linux-arm64-gnu.tar.gz",
      "d70607cc2bece42b04cca1995dc1f26b6aef77e15b87696fc5acbeffb299c486",
    ),
    "linux-x64": jscpdRelease(
      "jscpd-linux-x64-gnu.tar.gz",
      "c1107547ee52bc83131d6e62d1fc9c156d194c593a4532876cdb1584b4e1dc3b",
    ),
    "win32-x64": jscpdRelease(
      "jscpd-windows-x64-msvc.tar.gz",
      "05be6c72e6edf436dced3605544559b02c714d5b3fadaaca0133b42b11b7d86d",
      "jscpd.exe",
    ),
  }),
  pmd: Object.freeze({
    archiveFormat: "zip",
    artifactName: "pmd-dist-7.26.0-bin.zip",
    executableRelativePath:
      process.platform === "win32" ? "pmd-bin-7.26.0/bin/pmd.bat" : "pmd-bin-7.26.0/bin/pmd",
    sha256: "9f55cb7ff0e9f9a66dd2f005eaa370e84c8a4cd971b134aa14a930c4a283ebc9",
    trustedOrigins: trustedGitHubOrigins,
    url: new URL(
      "https://github.com/pmd/pmd/releases/download/pmd_releases/7.26.0/pmd-dist-7.26.0-bin.zip",
    ),
    version: "7.26.0",
  } satisfies EngineRelease),
});

export function releaseFor(
  engine: "jscpd" | "pmd",
  platform = process.platform,
  architecture = process.arch,
): EngineRelease {
  if (engine === "pmd") return ENGINE_RELEASES.pmd;
  const key = `${platform}-${architecture}` as keyof typeof ENGINE_RELEASES.jscpd;
  const release = ENGINE_RELEASES.jscpd[key];
  if (release === undefined) throw new Error(`Unsupported jscpd platform: ${platform}-${architecture}`);
  return release;
}
