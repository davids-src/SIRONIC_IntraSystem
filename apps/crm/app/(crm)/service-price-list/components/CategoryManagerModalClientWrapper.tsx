"use client";

import React, { useState } from "react";
import { Button } from "@crm/ui";
import { Settings2 } from "lucide-react";
import CategoryManagerModal from "./CategoryManagerModal";

export default function CategoryManagerModalClientWrapper() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        <Settings2 size={16} className="mr-2" />
        Kategóriák kezelése
      </Button>
      <CategoryManagerModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
