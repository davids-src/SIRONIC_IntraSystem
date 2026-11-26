import { describe, expect, it } from "vitest";
import {
  fileNeedsCrop,
  isAllowedUploadContentType,
  isPdfContentType,
  isPdfFilename,
  officeContentType,
} from "./upload-constraints";

describe("upload-constraints", () => {
  it("allows images and pdf", () => {
    expect(isAllowedUploadContentType("image/jpeg")).toBe(true);
    expect(isAllowedUploadContentType("application/pdf")).toBe(true);
    expect(isAllowedUploadContentType("application/octet-stream", "manual.pdf")).toBe(
      true,
    );
    expect(isAllowedUploadContentType("application/zip")).toBe(false);
  });

  it("allows Word / Excel only where documents are asked for", () => {
    expect(
      isAllowedUploadContentType("application/octet-stream", "koltsegvetes.xlsx"),
    ).toBe(false);
    expect(
      isAllowedUploadContentType("application/octet-stream", "Szerzodes.DOCX", {
        documents: true,
      }),
    ).toBe(true);
    expect(
      isAllowedUploadContentType("application/zip", "x.zip", { documents: true }),
    ).toBe(false);
    expect(officeContentType("a.xls")).toBe("application/vnd.ms-excel");
  });

  it("detects pdf by filename and content type", () => {
    expect(isPdfFilename("bom.pdf")).toBe(true);
    expect(isPdfContentType("application/pdf")).toBe(true);
  });

  it("skips crop for pdf and svg", () => {
    expect(fileNeedsCrop(new File([], "a.pdf", { type: "application/pdf" }))).toBe(false);
    expect(fileNeedsCrop(new File([], "a.svg", { type: "image/svg+xml" }))).toBe(false);
    expect(fileNeedsCrop(new File([], "a.jpg", { type: "image/jpeg" }))).toBe(true);
  });
});
