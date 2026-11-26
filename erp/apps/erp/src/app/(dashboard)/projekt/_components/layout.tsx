/**
 * Layout building blocks shared with the other modules' pages (detail / form chrome, delete
 * dialog). Re-exported so the Projekt pages import from one place.
 */
export {
  DangerZone,
  DetailHeader,
  EmptyNote,
  Facts,
  Section,
} from "../../eszkoz/_components/detail/detail-layout";
export {
  Field,
  FormActions,
  FormPage,
  FormSection,
  SELECT_CLASS,
} from "../../eszkoz/_components/form/form-layout";
export { ConfirmDeleteButton } from "../../eszkoz/_components/confirm-delete-button";

export const datum = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" })
    : undefined;
