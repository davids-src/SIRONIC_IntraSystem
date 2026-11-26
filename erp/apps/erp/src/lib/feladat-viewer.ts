import type { FeladatViewer } from "@erp/feladat";

/** The session user in the shape `feladatApi` takes to decide what may be returned or written. */
export function toFeladatViewer(user: {
  id: string;
  permissions: string[];
}): FeladatViewer {
  return { userId: user.id, permissions: user.permissions };
}
