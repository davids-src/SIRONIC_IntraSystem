import { z } from "zod";

export const zGithubRun = z.object({
  id: z.number(),
  status: z.string(), // queued | in_progress | completed
  conclusion: z.string().nullable(),
  html_url: z.string().optional(),
  created_at: z.string().optional(),
  head_branch: z.string().nullable().optional(),
});

export const zGithubRunList = z.object({
  total_count: z.number(),
  workflow_runs: z.array(zGithubRun),
});

export const zGithubPackageVersion = z.object({
  id: z.number(),
  name: z.string(), // sha digest, e.g. "sha256:..."
  metadata: z
    .object({
      container: z.object({ tags: z.array(z.string()).default([]) }).optional(),
    })
    .optional(),
});

export const zGithubPackageVersionList = z.array(zGithubPackageVersion);
