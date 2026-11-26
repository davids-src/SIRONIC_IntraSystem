# @erp/infra-cli

CLI (`sironic-infra`) and MCP server (`sironic-infra-mcp`) over the `@erp/infra` facade. Both share one
tool registry (`src/tools.ts`), so an agent and a human get the same operations the web UI has:
stacks (Portainer), sites (domain → stack service; Cloudflare DNS, DNS-01 SSL, NPM proxy), events.

## Setup

Needs `MONGODB_URI`, `MONGODB_DB_NAME`, `SECRETS_ENCRYPTION_KEY` (read from the process env,
`--env-file`, `SIRONIC_ENV_FILE`, or `apps/erp/.env`). Run from `erp/`:

```sh
pnpm --filter @erp/infra-cli cli overview
pnpm --filter @erp/infra-cli cli sync          # first run: import stacks + sites from the live services
pnpm --filter @erp/infra-cli cli stack list
pnpm --filter @erp/infra-cli cli stack pull <stack>      # re-pull images + redeploy
pnpm --filter @erp/infra-cli cli site create ...         # DNS + SSL + proxy in one go
pnpm --filter @erp/infra-cli cli --help
```

## Templates, websites and logins

```sh
cli template list|get|create|delete          # reusable compose + default env
cli stack create <name> --template <tpl>     # start from a template
cli web list|get|create|set|check|delete     # WordPress / FTP-hosted sites (not on Portainer)
cli access add <web> --label "Prod SFTP" --host ftp.x.hu --user u --password '…'
cli access password <web> --label "Prod SFTP" --reveal   # audited; refused without --reveal
```

Passwords are AES-256-GCM encrypted at rest and never part of any list/get output.

## MCP (agents)

`.mcp.json`:

```json
{
  "mcpServers": {
    "sironic-infra": {
      "command": "pnpm",
      "args": ["--dir", "erp/packages/infra-cli", "mcp"]
    }
  }
}
```

## Safety

- Secret env values are masked (`***MASKED***`) by default; a masked compose can't be written back.
- Destructive tools (`stack_delete`, `site_delete`, `template_delete`, `web_delete`, `access_delete`) need the name typed as `confirm_name`.
- Every mutation is recorded in `infra_esemenyek` with actor `cli:<user>` / `mcp:<client>`.
