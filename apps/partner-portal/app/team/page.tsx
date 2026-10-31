"use client";

import {
  PageHeader,
  Card,
  Button,
  Input,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/ui";
import { useEffect, useState } from "react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import { parseDeployment } from "@/lib/entity-parsers";
import type { PartnerSafeDeployment } from "@/lib/deployment-redact";

type TeamMember = {
  _id: string;
  email: string;
  display_name: string | null;
  roleKeys: string[];
};

type AccessRow = {
  portal_user_id: string;
  deployment_id: string;
  access_level: "view" | "manage";
};

export default function PartnerTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [deployments, setDeployments] = useState<PartnerSafeDeployment[]>([]);
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"partner.admin" | "partner.viewer">(
    "partner.viewer",
  );
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    try {
      const [membersRaw, deploymentsRaw, accessRaw] = await Promise.all([
        apiJson<TeamMember[]>("/api/team"),
        apiJson<unknown[]>("/api/deployments"),
        apiJson<AccessRow[]>("/api/team/access"),
      ]);
      setMembers(membersRaw);
      setDeployments(deploymentsRaw.map(parseDeployment));
      setAccess(accessRaw);
      setLoadErr(null);
    } catch {
      setLoadErr(
        "A csapat adatai nem tölthetők be. Csak partner admin érheti el ezt az oldalt.",
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const accessFor = (
    portalUserId: string,
    deploymentId: string,
  ): "none" | "view" | "manage" => {
    const row = access.find(
      (r) => r.portal_user_id === portalUserId && r.deployment_id === deploymentId,
    );
    return row?.access_level ?? "none";
  };

  const setAccessLevel = async (
    portalUserId: string,
    deploymentId: string,
    level: "none" | "view" | "manage",
  ) => {
    setActionErr(null);
    try {
      if (level === "none") {
        await apiJsonBody("/api/team/access", "DELETE", {
          portal_user_id: portalUserId,
          deployment_id: deploymentId,
        });
      } else {
        await apiJsonBody("/api/team/access", "PUT", {
          portal_user_id: portalUserId,
          deployment_id: deploymentId,
          access_level: level,
        });
      }
      await load();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Hozzáférés mentése sikertelen.");
    }
  };

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setActionErr(null);
    setActionMsg(null);
    try {
      await apiJsonBody("/api/team/invite", "POST", {
        email: inviteEmail.trim(),
        display_name: inviteName.trim() || null,
        roleKeys: [inviteRole],
      });
      setActionMsg("Meghívó elküldve.");
      setInviteEmail("");
      setInviteName("");
      await load();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Meghívás sikertelen.");
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (portalUserId: string) => {
    if (!confirm("Biztosan eltávolítod ezt a felhasználót?")) return;
    setActionErr(null);
    setActionMsg(null);
    try {
      await apiJsonBody(`/api/team/${portalUserId}`, "DELETE");
      setActionMsg("Felhasználó eltávolítva.");
      await load();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Eltávolítás sikertelen.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {loadErr && (
        <p className="text-sm text-red-400 px-1" role="alert">
          {loadErr}
        </p>
      )}
      {actionErr && (
        <p className="text-sm text-red-400 px-1" role="alert">
          {actionErr}
        </p>
      )}
      {actionMsg && <p className="text-sm text-green-400 px-1">{actionMsg}</p>}

      <PageHeader title="Csapat" subtitle="Partner portál felhasználók és hozzáférések" />

      <Card className="p-6">
        <h3 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "12px" }}>
          Meghívás
        </h3>
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div>
            <Label>E-mail</Label>
            <Input
              label=""
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="nev@cegem.hu"
            />
          </div>
          <div>
            <Label>Név</Label>
            <Input
              label=""
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Opcionális"
            />
          </div>
          <div>
            <Label>Szerepkör</Label>
            <Select
              value={inviteRole}
              onValueChange={(v) =>
                setInviteRole(v as "partner.admin" | "partner.viewer")
              }
            >
              <SelectTrigger style={{ width: "160px" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner.viewer">Megtekintő</SelectItem>
                <SelectItem value="partner.admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="primary"
            onClick={invite}
            style={{ opacity: inviting ? 0.6 : 1 }}
          >
            Meghívás küldése
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <h3
          style={{ fontSize: "0.875rem", fontWeight: 700, padding: "16px 20px 0 20px" }}
        >
          Tagok és hozzáférések
        </h3>
        {members.length === 0 ? (
          <p style={{ padding: "24px", color: "var(--color-text-muted, #555)" }}>
            Nincs csapattag.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}
            >
              <thead>
                <tr
                  style={{ borderBottom: "1px solid var(--color-border-subtle, #222)" }}
                >
                  <th style={{ textAlign: "left", padding: "10px 20px" }}>Felhasználó</th>
                  <th style={{ textAlign: "left", padding: "10px" }}>Szerepkör</th>
                  {deployments.map((d) => (
                    <th
                      key={d._id}
                      style={{ textAlign: "left", padding: "10px", minWidth: "140px" }}
                    >
                      {d.name}
                    </th>
                  ))}
                  <th style={{ padding: "10px 20px" }} />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m._id}
                    style={{ borderBottom: "1px solid var(--color-border-subtle, #222)" }}
                  >
                    <td style={{ padding: "10px 20px" }}>
                      <div style={{ fontWeight: 600 }}>{m.display_name ?? m.email}</div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-text-muted, #555)",
                        }}
                      >
                        {m.email}
                      </div>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <Badge
                        variant={
                          m.roleKeys.includes("partner.admin") ? "info" : "default"
                        }
                      >
                        {m.roleKeys.includes("partner.admin") ? "Admin" : "Megtekintő"}
                      </Badge>
                    </td>
                    {deployments.map((d) => (
                      <td key={d._id} style={{ padding: "10px" }}>
                        <Select
                          value={accessFor(m._id, d._id)}
                          onValueChange={(v) =>
                            setAccessLevel(m._id, d._id, v as "none" | "view" | "manage")
                          }
                        >
                          <SelectTrigger style={{ width: "120px" }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nincs</SelectItem>
                            <SelectItem value="view">Megtekintés</SelectItem>
                            <SelectItem value="manage">Kezelés</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    ))}
                    <td style={{ padding: "10px 20px" }}>
                      <Button variant="ghost" onClick={() => removeMember(m._id)}>
                        Eltávolítás
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
