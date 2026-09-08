import type { z } from "zod";
import type { zPortainerContainer, zPortainerStack } from "./schemas";

export type PortainerCredentials = { api_key: string };

export type PortainerStack = z.infer<typeof zPortainerStack>;
export type ContainerSummary = z.infer<typeof zPortainerContainer>;

export interface PortainerClientConfig {
  baseUrl: string;
  apiKey: string;
  endpointId: number;
}

export interface StackEnvVar {
  name: string;
  value: string;
}
