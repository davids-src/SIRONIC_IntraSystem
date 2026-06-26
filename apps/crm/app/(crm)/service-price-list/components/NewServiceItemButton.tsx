"use client";

import React from "react";
import { Button } from "@crm/ui";
import { Plus } from "lucide-react";

export default function NewServiceItemButton() {
  return (
    <Button
      variant="primary"
      style={{ backgroundColor: "#E8271A", color: "white" }}
      onClick={() => document.dispatchEvent(new CustomEvent("open-new-service-item"))}
    >
      <Plus size={16} className="mr-2" />
      Új tétel
    </Button>
  );
}
