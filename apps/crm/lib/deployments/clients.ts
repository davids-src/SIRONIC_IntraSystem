import { IntegrationConnectionModel } from "@crm/db";
import {
  CloudflareClient,
  GithubClient,
  NpmClient,
  PortainerClient,
} from "@crm/integrations";
import type { StepClients } from "@crm/modules";
import type { IntegrationConnection, IntegrationProvider } from "@crm/types";
import { decryptSecret } from "@/lib/secret-crypto";

export async function loadIntegrationConnections(
  tenantId: string,
): Promise<IntegrationConnection[]> {
  const docs = await IntegrationConnectionModel.find({
    tenantId,
    is_active: true,
  }).lean();
  return docs as unknown as IntegrationConnection[];
}

/** Groups active connections by provider (MVP: first active connection per provider wins) and builds clients. */
export function buildStepClients(connections: IntegrationConnection[]): {
  clients: StepClients;
  connections: Partial<Record<IntegrationProvider, IntegrationConnection>>;
} {
  const byProvider: Partial<Record<IntegrationProvider, IntegrationConnection>> = {};
  for (const connection of connections) {
    if (!byProvider[connection.provider]) byProvider[connection.provider] = connection;
  }

  const clients: StepClients = {};

  if (byProvider.cloudflare) {
    const creds = JSON.parse(
      decryptSecret(byProvider.cloudflare.encrypted_credentials),
    ) as { api_token: string };
    clients.cloudflare = new CloudflareClient({
      baseUrl: byProvider.cloudflare.base_url,
      apiToken: creds.api_token,
      accountId: byProvider.cloudflare.meta?.account_id as string | undefined,
    });
  }
  if (byProvider.npm) {
    const creds = JSON.parse(decryptSecret(byProvider.npm.encrypted_credentials)) as {
      email: string;
      password: string;
    };
    clients.npm = new NpmClient({
      baseUrl: byProvider.npm.base_url,
      email: creds.email,
      password: creds.password,
      insecureTls: byProvider.npm.meta?.allow_insecure_tls === true,
    });
  }
  if (byProvider.portainer) {
    const creds = JSON.parse(
      decryptSecret(byProvider.portainer.encrypted_credentials),
    ) as { api_key: string };
    const endpointId = Number(byProvider.portainer.meta?.endpoint_id ?? 1);
    clients.portainer = new PortainerClient({
      baseUrl: byProvider.portainer.base_url,
      apiKey: creds.api_key,
      endpointId,
      insecureTls: byProvider.portainer.meta?.allow_insecure_tls === true,
    });
  }
  if (byProvider.github) {
    const creds = JSON.parse(decryptSecret(byProvider.github.encrypted_credentials)) as {
      token: string;
    };
    clients.github = new GithubClient({
      baseUrl: byProvider.github.base_url,
      token: creds.token,
    });
  }

  return { clients, connections: byProvider };
}

export async function buildStepClientsForTenant(tenantId: string): Promise<{
  clients: StepClients;
  connections: Partial<Record<IntegrationProvider, IntegrationConnection>>;
}> {
  const connections = await loadIntegrationConnections(tenantId);
  return buildStepClients(connections);
}
