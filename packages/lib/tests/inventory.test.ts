import { createProductDraft, generateSku, validateProduct } from "../src/inventory";

describe("inventory module foundation", () => {
  it("generates category-prefixed SKUs", () => {
    const sku = generateSku(
      { _id: "cat-1", name: "Electrical", skuPrefix: "ELEC" },
      42,
    );
    expect(sku).toBe("ELEC-000042");
  });

  it("creates product draft with metadata history", () => {
    const product = createProductDraft({
      category: { _id: "cat-1", name: "Electrical", skuPrefix: "ELEC" },
      part_number: "PN-001",
      net_price: 129.99,
      metadata: {
        net_price: 88.4,
        part_number: "SUP-PN-001",
        seller: "InternalSupplier",
      },
      skuSequence: 1,
    });

    expect(product.sku).toBe("ELEC-000001");
    expect(product.metadata_history).toHaveLength(1);
    expect(product.metadata.part_number).toBe("SUP-PN-001");
    expect(() => validateProduct(product)).not.toThrow();
  });
});
