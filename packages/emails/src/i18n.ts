export type Language = "hu" | "en";

export const translations = {
  hu: {
    greeting: "Kedves {name},",
    auto_email_note: "Ez egy automatikus értesítő e-mail.",
    portal_cta: "Megtekintés a portálon",
    crm_cta: "Megnyitás a CRM-ben",
    download_pdf: "PDF letöltése",
    valid_until: "Érvényes",
    signed_at: "Aláírás időpontja",

    // Header labels
    new_ticket: "Új ticket",
    ticket_received: "Ticket rögzítve",
    ticket_update: "Ticket frissítés",
    new_comment: "Új megjegyzés",
    partner_comment: "Partner megjegyzés",
    worklog: "Munkalap",
    completion_certificate: "Teljesítési igazolás",
    certificate_signed: "Igazolás aláírva",
    quotation: "Árajánlat",
    offer_accepted: "Ajánlat elfogadva",
    project_started: "Projekt indítás",
    project_update: "Projekt frissítés",
    approval_required: "Jóváhagyás szükséges",
    version_approved: "Verzió jóváhagyva",
    changes_requested: "Módosítás kérés",
    material_received: "Anyag érkezett",
    portal_invitation: "Portál meghívó",
    password_reset: "Jelszó visszaállítás",

    // Common data block labels
    contact: "Kontakt",
    category: "Kategória",
    priority: "Prioritás",
    location: "Helyszín",
    title: "Cím",
    time: "Időpont",
  },
  en: {
    greeting: "Dear {name},",
    auto_email_note: "This is an automated notification email.",
    portal_cta: "View on Portal",
    crm_cta: "Open in CRM",
    download_pdf: "Download PDF",
    valid_until: "Valid until",
    signed_at: "Signed at",

    // Header labels
    new_ticket: "New Ticket",
    ticket_received: "Ticket Received",
    ticket_update: "Ticket Update",
    new_comment: "New Comment",
    partner_comment: "Partner Comment",
    worklog: "Worklog",
    completion_certificate: "Completion Certificate",
    certificate_signed: "Certificate Signed",
    quotation: "Quotation",
    offer_accepted: "Offer Accepted",
    project_started: "Project Started",
    project_update: "Project Update",
    approval_required: "Approval Required",
    version_approved: "Version Approved",
    changes_requested: "Changes Requested",
    material_received: "Material Received",
    portal_invitation: "Portal Invitation",
    password_reset: "Password Reset",

    // Common data block labels
    contact: "Contact",
    category: "Category",
    priority: "Priority",
    location: "Location",
    title: "Title",
    time: "Time",
  },
};

export const useEmailTranslations = (lang: Language = "hu") => {
  return translations[lang] || translations["hu"];
};
