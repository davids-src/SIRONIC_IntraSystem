import * as React from "react";
import { Language, useEmailTranslations } from "../../../i18n";
import { BaseLayout, DataBlock, TextBlock, CtaGroup, SectionTitle } from "../base";

interface TicketCommentToInternalProps {
  lang?: Language;
  ticket_number: string;
  contact_name: string;
  message: string;
  id: string;
}

export const TicketCommentToInternal = ({
  lang = "hu",
  ticket_number,
  contact_name,
  message,
  id,
}: TicketCommentToInternalProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.partner_comment} - ${ticket_number}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.partner_comment} lang={lang}>
      <DataBlock
        rows={[
          { label: "Ticketszám / Ticket No.", value: ticket_number },
          { label: "Kontakt / Contact", value: contact_name },
        ]}
      />

      <SectionTitle title="Megjegyzés / Comment" />
      <TextBlock>{message}</TextBlock>

      <CtaGroup
        primary={{
          label: t.crm_cta,
          url: `https://crm.sironic.hu/tickets/${id}`,
        }}
      />
    </BaseLayout>
  );
};

export default TicketCommentToInternal;
