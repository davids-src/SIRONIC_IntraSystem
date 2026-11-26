import type { z } from "zod";
import type { zPortainerContainer, zPortainerImage, zPortainerStack } from "./schemas";

export type PortainerCredentials = { api_key: string };

export type PortainerStack = z.infer<typeof zPortainerStack>;
export type ContainerSummary = z.infer<typeof zPortainerContainer>;
export type ImageSummary = z.infer<typeof zPortainerImage>;

export interface PortainerClientConfig {
  baseUrl: string;
  apiKey: string;
  endpointId: number;
  /** Self-hosted Portainer on a self-signed cert (internal network only) — opt-in, never for public providers. */
  insecureTls?: boolean;
}

export interface StackEnvVar {
  name: string;
  value: string;
}
