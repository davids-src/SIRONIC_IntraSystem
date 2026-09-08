# Deferred — Observability

**Status:** Explicitly deferred (decision D5). Do not implement metrics/log backends in Track 1–3.

This document locks a **seam** so Deployment / portal UI do not need redesign when observability arrives (program phase P8).

---

## 1. Why defer

- Need stable deploy + auth first.
- Choice between push-to-platform vs Prometheus/Loki/Grafana is still open.
- Billing packages already store resource _entitlements_; usage verification can wait.

---

## 2. Seam on `Deployment`

Reserve optional fields (add now or when coding models — prefer **stub in types as optional future**):

```ts
observability?: {
  ingest_token_id?: string;      // Secret ref
  last_heartbeat_at?: Date | null;
  last_error_at?: Date | null;
  health_status?: "unknown" | "healthy" | "degraded" | "down";
}
```

Do **not** build UI beyond showing `health_status` if present (hidden until P8).

---

## 3. Future ingest API (push model)

```http
POST /api/ingest/v1/metrics
Authorization: Bearer <deployment_ingest_token>

{
  "deployment_id": "...",
  "sent_at": "ISO-8601",
  "metrics": [
    { "name": "http_requests", "value": 123, "labels": { "status": "200" } }
  ],
  "logs": [
    { "level": "error", "message": "...", "ts": "ISO-8601" }
  ]
}
```

Store in `deployment_metric_samples` / `deployment_log_entries` with TTL indexes — **or** forward to Loki later without changing the POST shape.

---

## 4. Future query API

```http
GET /api/deployments/:id/metrics?from=&to=&name=
GET /api/deployments/:id/logs?from=&to=&level=
```

CRM + portal both call these; portal scoped by access.

---

## 5. Alternate backend (Prometheus/Loki)

If P8 chooses Grafana stack:

- Keep ingest as optional OTel collector endpoint.
- CRM embeds Grafana panels via signed URLs **or** queries Prometheus HTTP API.
- Deployment model still only needs `health_status` + external dashboard UID in `observability.meta`.

---

## 6. Billing interaction

Package `resources` + optional `rules[]` (see billing doc) evaluate against metric names like `disk_used_gb`, `cpu_avg`. Until then, rules are inert.

---

## 7. Template responsibility (later)

Deploy contract gains:

- `POST` heartbeat every N minutes from template.
- Structured logging middleware.

Not required for initial template MVP.
