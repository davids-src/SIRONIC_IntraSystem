import type { z } from "zod";
import type { zGithubPackageVersion, zGithubRun } from "./schemas";

export type GithubCredentials = { token: string };

export type GithubRun = z.infer<typeof zGithubRun>;
export type GithubPackageVersion = z.infer<typeof zGithubPackageVersion>;

export interface GithubClientConfig {
  baseUrl?: string; // default https://api.github.com
  token: string;
}

export interface WaitForRunOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}
