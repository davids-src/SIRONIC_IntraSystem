"use client";

import React, { useState, useEffect } from "react";
import { Search, UserCircle, Check } from "lucide-react";
import type { Contact, PricingSettings } from "@crm/types";
import { Input, Badge } from "@crm/ui";

interface PartnerPricePanelProps {
  pricingSettings: PricingSettings | null;
  onPartnerSelect: (multiplier: number | null, partnerName: string | null) => void;
}

export function PartnerPricePanel({
  pricingSettings,
  onPartnerSelect,
}: PartnerPricePanelProps) {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!search.trim() || !isOpen) {
      setContacts([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/contacts?search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setContacts(data.slice(0, 5)); // top 5 results
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, isOpen]);

  const handleSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setIsOpen(false);
    setSearch("");

    // Calculate multiplier based on contact pricing profile
    if (!pricingSettings || !contact.pricing_contract_type) {
      onPartnerSelect(1.0, contact.name);
      return;
    }

    // Default to 'individual' if missing
    const role =
      contact.partner_role === "subcontractor_employer" ||
      contact.partner_role === "mixed"
        ? "subcontractor_employer"
        : "client";
    const cat = contact.client_category || "smb";
    let contract = contact.pricing_contract_type || "occasional";

    // For clients
    let key = "individual";
    if (role === "client") {
      if (cat === "individual") key = "individual";
      else if (cat === "enterprise") key = "enterprise";
      else if (cat === "smb") {
        if (contract === "occasional") key = "smb_occasional";
        else if (contract === "6month") key = "smb_6month";
        else if (contract === "1year") key = "smb_1year";
        else if (contract === "2year") key = "smb_2year";
        else key = "smb_occasional";
      }
    } else {
      // Subcontractor
      if (
        contact.subcontractor_presence_type === "daily_presence" ||
        contact.subcontractor_presence_type === "both"
      )
        key = "subcontractor_presence";
      else key = "subcontractor_project";
    }

    const mult = (pricingSettings.client_multipliers as any)?.[key] ?? 1.0;
    onPartnerSelect(mult, contact.name);
  };

  const handleClear = () => {
    setSelectedContact(null);
    onPartnerSelect(null, null);
  };

  return (
    <div className="relative w-full sm:w-[260px]">
      {selectedContact ? (
        <div className="flex items-center justify-between border-2 border-brand bg-brand/5 dark:bg-brand/10 rounded-md px-3 py-2">
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs text-brand font-bold uppercase tracking-wider">
              Kiválasztott partner
            </span>
            <span className="text-sm font-semibold truncate">{selectedContact.name}</span>
          </div>
          <button
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold px-2 py-1 rounded bg-muted/50 hover:bg-muted"
          >
            Törlés
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            label=""
            placeholder="Partner áraihoz keresés..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            className="pl-9"
          />
          {isOpen && search && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border shadow-lg rounded-md z-50 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="p-3 text-sm text-muted-foreground text-center animate-pulse">
                  Keresés...
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Nincs találat
                </div>
              ) : (
                contacts.map((c) => (
                  <div
                    key={c._id}
                    className="flex flex-col px-3 py-2 hover:bg-muted cursor-pointer border-b border-border/50 last:border-0"
                    onClick={() => handleSelect(c)}
                  >
                    <span className="font-semibold text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.email || c.phone || "Nincs elérhetőség"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
