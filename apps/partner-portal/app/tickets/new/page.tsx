"use client";

import {
  PageHeader,
  Card,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@crm/ui";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Plus } from "lucide-react";
import { useState } from "react";

export default function NewTicketPage() {
  const router = useRouter();

  const [devices, setDevices] = useState<string[]>([]);
  const [deviceInput, setDeviceInput] = useState("");

  const addDevice = () => {
    if (deviceInput.trim() && !devices.includes(deviceInput.trim())) {
      setDevices([...devices, deviceInput.trim()]);
      setDeviceInput("");
    }
  };

  const removeDevice = (device: string) => {
    setDevices(devices.filter((d) => d !== device));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to save ticket
    router.push("/tickets");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Új ticket bejelentése"
        subtitle="Kérjük, írd le részletesen a problémát vagy igényt."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
              Alapadatok
            </h3>

            <Input
              label="Tárgy / Rövid megnevezés *"
              placeholder="Pl. Szerver elérhetetlen a központi irodában"
              required
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partner-ticket-type">Típus *</Label>
                <Select defaultValue="incident">
                  <SelectTrigger id="partner-ticket-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incident">Hibabejelentés</SelectItem>
                    <SelectItem value="service_request">Szervizigény</SelectItem>
                    <SelectItem value="maintenance">Karbantartás</SelectItem>
                    <SelectItem value="security">Biztonságtechnika</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partner-ticket-priority">Prioritás *</Label>
                <Select defaultValue="medium">
                  <SelectTrigger id="partner-ticket-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Alacsony</SelectItem>
                    <SelectItem value="medium">Közepes</SelectItem>
                    <SelectItem value="high">Magas</SelectItem>
                    <SelectItem value="critical">Kritikus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
              Helyszín és Eszközök
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Érintett rendszer *"
                placeholder="Pl. Hálózat, Kamera, Beléptető..."
                required
              />
              <Input label="Helyszín" placeholder="Pl. Központi iroda, 2. emelet" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                Érintett eszközök (opcionális)
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={deviceInput}
                  onChange={(e) => setDeviceInput(e.target.value)}
                  placeholder="Eszköz neve vagy IP címe..."
                  className="flex-1"
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addDevice())
                  }
                />
                <Button type="button" variant="secondary" onClick={addDevice}>
                  <Plus size={16} />
                </Button>
              </div>
              {devices.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {devices.map((device) => (
                    <div
                      key={device}
                      className="flex items-center gap-1 bg-[var(--color-bg-secondary)] px-2 py-1 rounded-md text-sm border border-[var(--color-border-subtle)]"
                    >
                      {device}
                      <button
                        type="button"
                        onClick={() => removeDevice(device)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-status-error)] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
              Részletek
            </h3>

            <Textarea
              label="Leírás *"
              placeholder="Kérjük, írd le a lehető legrészletesebben a tapasztaltakat..."
              required
              className="min-h-[150px] resize-y"
            />

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                Csatolmányok (Képek, logok)
              </label>
              <div className="border-2 border-dashed border-[var(--color-border-default)] rounded-lg p-8 flex flex-col items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-bg-secondary)] transition-all cursor-pointer">
                <UploadCloud size={32} className="mb-2" />
                <span className="text-sm font-medium">
                  Kattints ide a feltöltéshez, vagy húzd ide a fájlokat.
                </span>
                <span className="text-xs mt-1 opacity-70">
                  Max 5 fájl, egyenként max 10MB (Kép, PDF, TXT)
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Mégse
          </Button>
          <Button type="submit" variant="primary">
            Beküldés
          </Button>
        </div>
      </form>
    </div>
  );
}
