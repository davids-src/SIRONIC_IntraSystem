import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, TextBlock, CtaGroup, SectionTitle } from "../base";
import { Text } from "@react-email/components";

interface TicketCommentToPartnerProps {
  lang?: Language;
  contact_name: string;
  ticket_number: string;
  title: string;
  message: string;
  id: string;
}

export const TicketCommentToPartner = ({
  lang = "hu",
  contact_name,
  ticket_number,
  title,
  message,
  id,
}: TicketCommentToPartnerProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.new_comment} - ${ticket_number}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.new_comment} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Új megjegyzés érkezett a ticketjéhez."
          : "A new comment has been added to your ticket."}
      </Text>

      <DataBlock
        rows={[
          { label: "Ticketszám / Ticket No.", value: ticket_number },
          { label: "Cím / Title", value: title },
        ]}
      />

      <SectionTitle title={lang === "hu" ? "Megjegyzés / Comment" : "Comment"} />
      <TextBlock>{message}</TextBlock>

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Válasz küldése" : "Send Reply",
          url: `https://portal.sironic.eu/tickets/${id}`,
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

export default TicketCommentToPartner;
