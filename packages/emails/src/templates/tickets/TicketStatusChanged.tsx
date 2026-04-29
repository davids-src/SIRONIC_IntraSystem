import * as React from "react";
import { Language, useEmailTranslations } from "../../../i18n";
import { BaseLayout, DataBlock, TextBlock, CtaGroup, SectionTitle } from "../base";
import { Text } from "@react-email/components";

interface TicketStatusChangedProps {
  lang?: Language;
  contact_name: string;
  ticket_number: string;
  title: string;
  old_status: string;
  new_status: string;
  resolution_notes?: string | null;
  id: string;
}

export const TicketStatusChanged = ({
  lang = "hu",
  contact_name,
  ticket_number,
  title,
  old_status,
  new_status,
  resolution_notes,
  id,
}: TicketStatusChangedProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.ticket_update} - ${ticket_number}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.ticket_update} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "A lenti ticket státusza frissült."
          : "The status of the ticket below has been updated."}
      </Text>

      <DataBlock
        rows={[
          { label: "Ticketszám / Ticket No.", value: ticket_number },
          { label: "Cím / Title", value: title },
          {
            label: "Előző státusz / Previous status",
            value: <span style={{ color: "#6b7280" }}>{old_status}</span>,
          },
          {
            label: "Új státusz / New status",
            value: (
              <span style={{ color: "#e53935", fontWeight: 600 }}>{new_status}</span>
            ),
          },
        ]}
      />

      {resolution_notes && (
        <>
          <SectionTitle title={lang === "hu" ? "Megjegyzés / Notes" : "Notes"} />
          <TextBlock>{resolution_notes}</TextBlock>
        </>
      )}

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

export default TicketStatusChanged;
