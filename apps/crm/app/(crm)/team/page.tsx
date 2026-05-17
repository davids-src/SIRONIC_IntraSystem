"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/ui";
import { apiJson, apiJsonBody } from "@/lib/api-client";

export default function TeamPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite state
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("crm.staff");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await apiJson("/api/users");
      setUsers(data as any[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await apiJsonBody("/api/users/invite", "POST", {
        email,
        display_name: displayName,
        roleKeys: [role],
      });
      setInviteSuccess(`Sikeres meghívó küldve a következő címre: ${email}`);
      setEmail("");
      setDisplayName("");
      setRole("crm.staff");
      void fetchUsers();
    } catch (err: any) {
      setInviteError(err.message || "Hiba történt a meghívó küldésekor.");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Munkatársak kezelése"
        subtitle="Hívd meg kollégáidat, alvállalkozóidat a SIRONIC CRM rendszerbe"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Meghívó Űrlap */}
        <Card className="p-6 col-span-1 h-fit">
          <h3 className="text-lg font-bold mb-4">Új munkatárs meghívása</h3>
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            {inviteError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 p-2 rounded">
                {inviteSuccess}
              </div>
            )}
            <Input
              label="E-mail cím *"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kolléga@cegem.hu"
            />
            <Input
              label="Megjelenítendő név"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Kovács János"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Szerepkör</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crm.staff">
                    Munkatárs (Általános hozzáférés)
                  </SelectItem>
                  <SelectItem value="crm.admin">
                    Adminisztrátor (Teljes hozzáférés)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="primary" type="submit" disabled={inviting || !email.trim()}>
              {inviting ? "Küldés..." : "Meghívó küldése"}
            </Button>
          </form>
        </Card>

        {/* Felhasználók Listája */}
        <Card className="p-6 col-span-1 md:col-span-2">
          <h3 className="text-lg font-bold mb-4">Aktív és meghívott munkatársak</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Betöltés...</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-gray-500">
              Nincsenek még meghívott munkatársak.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 px-3 text-sm font-semibold text-gray-700">
                      Név / E-mail
                    </th>
                    <th className="py-2 px-3 text-sm font-semibold text-gray-700">
                      Szerepkör
                    </th>
                    <th className="py-2 px-3 text-sm font-semibold text-gray-700">
                      Státusz
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="font-medium text-sm">{u.display_name || "-"}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-700">
                        {u.roleKeys.includes("crm.admin") ? (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                            Adminisztrátor
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            Munkatárs
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm">
                        {u.invite_token ? (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                            Függőben (Meghívva)
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Aktív
                          </span>
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
    </div>
  );
}
