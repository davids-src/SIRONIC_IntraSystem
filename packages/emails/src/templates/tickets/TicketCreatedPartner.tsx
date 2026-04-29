import * as React from "react";
import { Language, useEmailTranslations } from "../../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";
import { Text } from "@react-email/components";

interface TicketCreatedPartnerProps {
  lang?: Language;
  contact_name: string;
  ticket_number: string;
  title: string;
  category: string;
  priority: string;
  created_at: string;
  id: string;
}

export const TicketCreatedPartner = ({
  lang = "hu",
  contact_name,
  ticket_number,
  title,
  category,
  priority,
  created_at,
  id,
}: TicketCreatedPartnerProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.ticket_received} - ${ticket_number}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.ticket_received} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Ticketjét rögzítettük, kollégánk hamarosan felveszi Önnel a kapcsolatot."
          : "Your ticket has been received and our colleague will contact you shortly."}
      </Text>

      <DataBlock
        rows={[
          { label: "Ticketszám / Ticket No.", value: ticket_number },
          { label: "Cím / Title", value: title },
          { label: "Kategória / Category", value: category },
          { label: "Prioritás / Priority", value: priority },
          { label: "Beküldve / Submitted", value: created_at },
        ]}
      />

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Ticket megtekintése" : "View Ticket",
          url: `https://portal.sironic.hu/tickets/${id}`,
        }}
      />
    </BaseLayout>
  );
};

const paragraph = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: 1.6,
  marginBottom: "16px",
};

export default TicketCreatedPartner;
