import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "a",
  "img",
  "hr",
  "blockquote",
];

/**
 * Contract/legal-document body is stored as raw HTML and rendered with
 * dangerouslySetInnerHTML in both the CRM and the partner portal – it must
 * never contain script/event-handler content, since template variable
 * values (e.g. contact name/address) come from user-entered data.
 */
export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      "*": ["style", "class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    disallowedTagsMode: "discard",
  });
}
