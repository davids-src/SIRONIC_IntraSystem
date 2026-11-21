import { z } from "zod";

export const zPortainerStack = z.object({
  Id: z.number(),
  Name: z.string(),
  EndpointId: z.number().optional(),
  Status: z.number().optional(),
  AutoUpdate: z
    .object({
      Webhook: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const zPortainerStackList = z.array(zPortainerStack);

export const zPortainerContainer = z.object({
  Id: z.string(),
  Names: z.array(z.string()).default([]),
  Image: z.string().optional(),
  State: z.string().optional(),
  Status: z.string().optional(),
  Labels: z.record(z.string(), z.string()).optional(),
});

export const zPortainerContainerList = z.array(zPortainerContainer);
