"use client";

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
  Textarea,
  Label,
} from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJsonBody, ApiError } from "@/lib/api-client";
import type { Contact } from "@crm/types";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [type, setType] = useState<Contact["type"]>("company");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Magyarország");
  const [notes, setNotes] = useState("");

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isIndividual = type === "individual";

  const handleTypeChange = (v: Contact["type"]) => {
    setType(v);
    if (v === "individual") {
      setTaxNumber("");
      setRegistrationNumber("");
    }
  };

  const saveBasic = async () => {
    if (!name.trim()) {
      setLoadErr("A név megadása kötelező.");
      return;
    }
    setSaving(true);
    setLoadErr(null);
    try {
      const raw = await apiJsonBody("/api/contacts", "POST", {
        type,
        name: name.trim(),
        short_name: shortName.trim() || null,
        tax_number: isIndividual ? null : taxNumber.trim() || null,
        registration_number: isIndividual ? null : registrationNumber.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
        address: {
          street: street.trim(),
          zip: zip.trim(),
          city: city.trim(),
          country: country.trim(),
        },
      });
      const newContact = raw as Contact;
      setCreatedId(newContact._id);
      setShowInviteDialog(true);
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const handleInviteYes = async () => {
    if (!createdId) return;
    if (!email.trim()) {
      setInviteError(
        "A partnernek nincs e-mail cím megadva. Kérjük előbb add meg a profil oldalán.",
      );
      return;
    }
    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch(`/api/contacts/${createdId}/invite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Hiba a meghívó küldésekor.");
        setInviting(false);
        return;
      }
      router.push(`/contacts/${createdId}`);
    } catch {
      setInviteError("Hálózati hiba. A partner létrejött, de a meghívó nem ment el.");
      setInviting(false);
    }
  };

  const handleInviteNo = () => {
    if (createdId) router.push(`/contacts/${createdId}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <PageHeader title="Új partner létrehozása" subtitle="Add meg az alapadatokat" />
        <Button variant="secondary" onClick={() => router.back()}>
          Vissza
        </Button>
      </div>

      {loadErr && (
        <p className="text-sm text-[var(--color-status-error)] px-1" role="alert">
          {loadErr}
        </p>
      )}

      <Card className="p-6 space-y-5">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Alapadatok</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          {/* Típus */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Típus</Label>
            <Select
              value={type}
              onValueChange={(v) => handleTypeChange(v as Contact["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Cég</SelectItem>
                <SelectItem value="individual">Magánszemély</SelectItem>
                <SelectItem value="one_time">Egyszeri partner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Teljes név */}
          <Input
            label="Szervezet / Személy neve *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-2"
          />

          {/* Rövid név */}
          <Input
            label="Becenév / Rövid név"
            placeholder="pl. SIRONIC, Kovács Kft."
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            className="col-span-2"
          />

          {/* Adószám */}
          <div className="col-span-2 flex flex-col gap-1">
            <Input
              label="Adószám"
              value={isIndividual ? "" : taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              disabled={isIndividual}
              placeholder={
                isIndividual ? "Magánszemélynél nem alkalmazható" : "12345678-1-41"
              }
            />
          </div>

          {/* Cégjegyzékszám */}
          <div className="col-span-2 flex flex-col gap-1">
            <Input
              label="Cégjegyzékszám"
              value={isIndividual ? "" : registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              disabled={isIndividual}
              placeholder={
                isIndividual ? "Magánszemélynél nem alkalmazható" : "01 09 123456"
              }
            />
          </div>

          {/* Telefon */}
          <Input
            label="Telefon"
            type="tel"
            placeholder="+36 30 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {/* Email */}
          <div className="flex flex-col gap-1">
            <Input
              label="E-mail"
              type="email"
              placeholder="iroda@pelda.hu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              Szükséges a portál meghívóhoz
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Cím</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <Input
            label="Utca, házszám"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="col-span-2"
          />
          <Input
            label="Irányítószám"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
          />
          <Input label="Város" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input
            label="Ország"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="col-span-2"
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Megjegyzések
        </h3>
        <div className="max-w-2xl">
          <Textarea
            label="Belső megjegyzés (nem látható a partnernek)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        <div className="mt-4">
          <Button variant="primary" disabled={saving} onClick={() => void saveBasic()}>
            {saving ? "Létrehozás…" : "Létrehozás"}
          </Button>
        </div>
      </Card>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <Card style={{ padding: "32px", width: "100%", maxWidth: "480px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>✉️</div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
                Portál meghívó küldése
              </h2>
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                A partner (<strong>{name}</strong>) sikeresen létrejött. Szeretnél portál
                meghívót küldeni az{" "}
                <strong>{email || "e-mail cím megadása nélkül"}</strong> e-mail címre?
              </p>
            </div>

            {inviteError && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  color: "#ef4444",
                  fontSize: "13px",
                }}
              >
                {inviteError}
              </div>
            )}

            {!email.trim() && (
              <div
                style={{
                  background: "rgba(234,179,8,0.1)",
                  border: "1px solid rgba(234,179,8,0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  color: "#ca8a04",
                  fontSize: "13px",
                }}
              >
                ⚠️ Nincs e-mail cím megadva – a meghívó nem küldhető. A partner profil
                oldalán pótolható.
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Button variant="ghost" onClick={handleInviteNo} disabled={inviting}>
                Nem, csak létrehozás
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleInviteYes()}
                disabled={inviting || !email.trim()}
              >
                {inviting ? "Küldés..." : "Igen, meghívó küldése"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
