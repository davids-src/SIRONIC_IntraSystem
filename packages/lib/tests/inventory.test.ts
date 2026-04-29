import {
  createPriceListItemDraft,
  generateItemNumber,
  validatePriceListItem,
} from "../src/inventory";

describe("price list module foundation", () => {
  it("generates AR- item numbers", () => {
    const itemNumber = generateItemNumber(42);
    expect(itemNumber).toBe("AR-000042");
  });

  it("creates price list draft with stable item number", () => {
    const item = createPriceListItemDraft({
      _id: "pl1",
      tenantId: "tenant1",
      type: "service",
      name: "IT üzemeltetés (havi díj)",
      description: "Havi díj sávonként",
      category: "Munkadíjak",
      unit: "hónap",
      net_price: 12999,
      currency: "HUF",
      tax_rate: 27,
      is_active: true,
      notes: null,
      itemNumberSequence: 1,
    });

    expect(item.item_number).toBe("AR-000001");
    expect(item.type).toBe("service");
    expect(() => validatePriceListItem(item)).not.toThrow();
  });
});
