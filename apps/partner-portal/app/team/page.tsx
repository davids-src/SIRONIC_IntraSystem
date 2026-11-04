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

type PlatformAdminRow = {
  id: string;
  email: string;
  displayName: string | null;
  role: "owner" | "admin" | "editor" | "viewer";
  permissions: string[];
  editable: boolean;
};

const PLATFORM_ROLE_LABEL: Record<PlatformAdminRow["role"], string> = {
  owner: "Tulajdonos",
  admin: "Admin",
  editor: "Szerkesztő",
  viewer: "Megtekintő",
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

  const [platformDeploymentId, setPlatformDeploymentId] = useState<string>("");
  const [platformAdmins, setPlatformAdmins] = useState<PlatformAdminRow[] | null>(null);
  const [platformLoadErr, setPlatformLoadErr] = useState<string | null>(null);
  const [platformActionErr, setPlatformActionErr] = useState<string | null>(null);
  const [permissionsDraft, setPermissionsDraft] = useState<Record<string, string>>({});
  const [platformBusy, setPlatformBusy] = useState<string | null>(null);

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

  useEffect(() => {
    if (platformDeploymentId || deployments.length === 0) return;
    const first = deployments[0];
    if (first) setPlatformDeploymentId(first._id);
  }, [deployments, platformDeploymentId]);

  const loadPlatformRoles = async (deploymentId: string) => {
    if (!deploymentId) return;
    setPlatformLoadErr(null);
    try {
      const res = await apiJson<{
        ok: boolean;
        admins?: PlatformAdminRow[];
        error?: string;
      }>(`/api/team/platform-roles?deployment_id=${encodeURIComponent(deploymentId)}`);
      if (!res.ok) {
        setPlatformAdmins(null);
        setPlatformLoadErr(res.error ?? "A platform jogosultságok nem tölthetők be.");
        return;
      }
      setPlatformAdmins(res.admins ?? []);
      setPermissionsDraft(
        Object.fromEntries(
          (res.admins ?? []).map((a) => [a.id, a.permissions.join(", ")]),
        ),
      );
    } catch (e) {
      setPlatformAdmins(null);
      setPlatformLoadErr(
        e instanceof ApiError ? e.message : "A platform jogosultságok nem tölthetők be.",
      );
    }
  };

  useEffect(() => {
    if (!platformDeploymentId) return;
    void loadPlatformRoles(platformDeploymentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformDeploymentId]);

  const updatePlatformRole = async (
    adminId: string,
    role: "admin" | "editor" | "viewer",
  ) => {
    setPlatformBusy(adminId);
    setPlatformActionErr(null);
    try {
      const res = await apiJsonBody<{ ok: boolean; error?: string }>(
        `/api/team/platform-roles/${adminId}`,
        "PATCH",
        { deployment_id: platformDeploymentId, role },
      );
      if (!res.ok) throw new Error(res.error ?? "Szerepkör mentése sikertelen.");
      await loadPlatformRoles(platformDeploymentId);
    } catch (e) {
      setPlatformActionErr(
        e instanceof Error ? e.message : "Szerepkör mentése sikertelen.",
      );
    } finally {
      setPlatformBusy(null);
    }
  };

  const savePlatformPermissions = async (adminId: string) => {
    const permissions = (permissionsDraft[adminId] ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    setPlatformBusy(adminId);
    setPlatformActionErr(null);
    try {
      const res = await apiJsonBody<{ ok: boolean; error?: string }>(
        `/api/team/platform-roles/${adminId}`,
        "PATCH",
        { deployment_id: platformDeploymentId, permissions },
      );
      if (!res.ok) throw new Error(res.error ?? "Jogosultságok mentése sikertelen.");
      await loadPlatformRoles(platformDeploymentId);
    } catch (e) {
      setPlatformActionErr(
        e instanceof Error ? e.message : "Jogosultságok mentése sikertelen.",
      );
    } finally {
      setPlatformBusy(null);
    }
  };

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

      <Card className="p-0 overflow-hidden">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 0 20px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700 }}>
              Platform-szintű jogosultság
            </h3>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-muted, #555)",
                marginTop: "2px",
              }}
            >
              A kiválasztott site saját admin felhasználói és szerepkörei. Az ERP által
              kezelt és a tulajdonos admin nem jelenik meg / nem módosítható itt.
            </p>
          </div>
          {deployments.length > 1 && (
            <Select value={platformDeploymentId} onValueChange={setPlatformDeploymentId}>
              <SelectTrigger style={{ width: "220px" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {deployments.map((d) => (
                  <SelectItem key={d._id} value={d._id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {platformLoadErr && (
          <p className="text-sm text-red-400 px-5 py-4" role="alert">
            {platformLoadErr}
          </p>
        )}
        {platformActionErr && (
          <p className="text-sm text-red-400 px-5" role="alert">
            {platformActionErr}
          </p>
        )}

        {!platformLoadErr && platformAdmins && platformAdmins.length === 0 && (
          <p style={{ padding: "24px", color: "var(--color-text-muted, #555)" }}>
            Nincs megjeleníthető admin ezen a site-on.
          </p>
        )}

        {!platformLoadErr && platformAdmins && platformAdmins.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}
            >
              <thead>
                <tr
                  style={{ borderBottom: "1px solid var(--color-border-subtle, #222)" }}
                >
                  <th style={{ textAlign: "left", padding: "10px 20px" }}>Felhasználó</th>
                  <th style={{ textAlign: "left", padding: "10px", minWidth: "140px" }}>
                    Szerepkör
                  </th>
                  <th style={{ textAlign: "left", padding: "10px", minWidth: "260px" }}>
                    Egyedi jogosultságok
                  </th>
                </tr>
              </thead>
              <tbody>
                {platformAdmins.map((a) => (
                  <tr
                    key={a.id}
                    style={{ borderBottom: "1px solid var(--color-border-subtle, #222)" }}
                  >
                    <td style={{ padding: "10px 20px" }}>
                      <div style={{ fontWeight: 600 }}>{a.displayName ?? a.email}</div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-text-muted, #555)",
                        }}
                      >
                        {a.email}
                      </div>
                    </td>
                    <td style={{ padding: "10px" }}>
                      {a.editable ? (
                        <Select
                          value={a.role}
                          onValueChange={(v) =>
                            void updatePlatformRole(
                              a.id,
                              v as "admin" | "editor" | "viewer",
                            )
                          }
                        >
                          <SelectTrigger
                            style={{
                              width: "140px",
                              opacity: platformBusy === a.id ? 0.6 : 1,
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Szerkesztő</SelectItem>
                            <SelectItem value="viewer">Megtekintő</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="default">{PLATFORM_ROLE_LABEL[a.role]}</Badge>
                      )}
                    </td>
                    <td style={{ padding: "10px" }}>
                      {a.editable ? (
                        <div
                          style={{ display: "flex", gap: "8px", alignItems: "center" }}
                        >
                          <Input
                            label=""
                            value={permissionsDraft[a.id] ?? ""}
                            onChange={(e) =>
                              setPermissionsDraft((prev) => ({
                                ...prev,
                                [a.id]: e.target.value,
                              }))
                            }
                            placeholder="pl. shop.orders, tbook.*"
                          />
                          <Button
                            variant="ghost"
                            onClick={() => void savePlatformPermissions(a.id)}
                            style={{ opacity: platformBusy === a.id ? 0.6 : 1 }}
                          >
                            Mentés
                          </Button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--color-text-muted, #555)" }}>—</span>
                      )}
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
