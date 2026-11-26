import { z } from "zod";

export const zPortainerStack = z.object({
  Id: z.number(),
  Name: z.string(),
  EndpointId: z.number().optional(),
  Type: z.number().optional(),
  Status: z.number().optional(),
  Env: z
    .array(z.object({ name: z.string(), value: z.string() }))
    .nullable()
    .optional(),
  CreationDate: z.number().optional(),
  UpdateDate: z.number().optional(),
  AutoUpdate: z
    .object({
      Webhook: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const zPortainerStackList = z.array(zPortainerStack);

export const zPortainerPort = z.object({
  IP: z.string().optional(),
  PrivatePort: z.number().optional(),
  PublicPort: z.number().optional(),
  Type: z.string().optional(),
});

export const zPortainerContainer = z.object({
  Id: z.string(),
  Names: z.array(z.string()).default([]),
  Image: z.string().optional(),
  ImageID: z.string().optional(),
  State: z.string().optional(),
  Status: z.string().optional(),
  Created: z.number().optional(),
  Labels: z.record(z.string(), z.string()).nullable().optional(),
  Ports: z.array(zPortainerPort).optional(),
  NetworkSettings: z
    .object({ Networks: z.record(z.string(), z.unknown()).optional() })
    .optional(),
});

export const zPortainerContainerList = z.array(zPortainerContainer);

export const zPortainerImage = z.object({
  Id: z.string(),
  RepoTags: z.array(z.string()).nullable().optional(),
  RepoDigests: z.array(z.string()).nullable().optional(),
  Created: z.number().optional(),
  Size: z.number().optional(),
  Containers: z.number().optional(),
});

export const zPortainerImageList = z.array(zPortainerImage);
