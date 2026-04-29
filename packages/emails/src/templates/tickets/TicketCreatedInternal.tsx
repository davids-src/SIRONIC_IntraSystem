import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, TextBlock, CtaGroup, SectionTitle } from "../base";

interface TicketCreatedInternalProps {
  lang?: Language;
  ticket_number: string;
  contact_name: string;
  category: string;
  priority: string;
  location?: string | null;
  affected_items?: string | null;
  description: string;
  id: string;
  title: string;
}

export const TicketCreatedInternal = ({
  lang = "hu",
  ticket_number,
  contact_name,
  category,
  priority,
  location,
  affected_items,
  description,
  id,
  title,
}: TicketCreatedInternalProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `[${priority}] ${t.new_ticket} - ${ticket_number}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.new_ticket} lang={lang}>
      <DataBlock
        rows={[
          { label: "Ticketszám / Ticket No.", value: ticket_number },
          { label: "Kontakt / Contact", value: contact_name },
          { label: "Kategória / Category", value: category },
          { label: "Prioritás / Priority", value: priority },
          { label: "Helyszín / Location", value: location },
          { label: "Érintett eszköz / Affected item", value: affected_items },
        ]}
      />

      <SectionTitle title="Leírás / Description" />
      <TextBlock>{description}</TextBlock>

      <CtaGroup
        primary={{
          label: t.crm_cta,
          url: `https://crm.sironic.hu/tickets/${id}`,
        }}
      />
    </BaseLayout>
  );
};

export default TicketCreatedInternal;
