import { describe, expect, it } from "vitest";
import {
  mapAlaprajz,
  mapHetiTerv,
  mapKoltseg,
  mapProjekt,
  mapSablon,
  migraljProjekt,
} from "./projekt";

const ids = {
  userIds: new Map([
    ["u1", "N1"],
    ["u2", "N2"],
  ]),
  partnerIds: { c1: "PN1" } as Record<string, string>,
  mediaByUrl: new Map([["https://f/1.png", "M1"]]),
};

describe("mapProjekt", () => {
  it("maps statuses, phases, checklist and drops tenantId-era fields", () => {
    const w: string[] = [];
    const r = mapProjekt(
      {
        _id: "p1",
        project_number: "PRJ-7",
        contact_id: "c1",
        assigned_to: "u1",
        name: " Irodaház ",
        status: "on_hold",
        portal_visible: true,
        phases: [
          { name: "B", status: "completed", order: 2 },
          { name: "A", status: "in_progress", order: 1 },
        ],
        checklist: [
          {
            _id: "k1",
            label: "Fotó",
            category: "documents",
            required: true,
            completed: true,
            uploaded_file_url: "https://f/1.png",
          },
          { _id: "k2", label: "Másik", uploaded_file_url: "https://f/missing.pdf" },
        ],
        staging_links: [
          {
            _id: "s1",
            label: "S",
            url: "https://s",
            approval_status: "changes_requested",
          },
        ],
        is_archived: true,
        archive_reason: "Régi",
      },
      ids,
      w,
    );
    expect(r).toMatchObject({
      azonosito: "PRJ-7",
      nev: "Irodaház",
      allapot: "felfuggesztett",
      partnerId: "PN1",
      felelosUserId: "N1",
      portalLathato: true,
      archivalt: true,
      archivalasOka: "Régi",
    });
    expect(r.fazisok.map((f) => [f.nev, f.allapot, f.szazalek])).toEqual([
      ["A", "folyamatban", 50],
      ["B", "kesz", 100],
    ]);
    expect(r.checklist[0]).toMatchObject({
      kategoria: "dokumentumok",
      mellekletMediaIds: ["M1"],
      kotelezo: true,
    });
    expect(r.checklist[1]?.legacyMellekletUrlok).toEqual(["https://f/missing.pdf"]);
    expect(r.stagingLinkek[0]?.jovahagyas).toBe("modositas_kerve");
    expect(w).toHaveLength(1);
  });

  it("warns on unknown status / unmappable partner and holds nothing back", () => {
    const w: string[] = [];
    const r = mapProjekt(
      { _id: "p2", project_number: "X", contact_id: "ghost", name: "N", status: "weird" },
      ids,
      w,
    );
    expect(r.allapot).toBe("nyitott");
    expect(r.partnerId).toBeUndefined();
    expect(w).toHaveLength(2);
  });

  it("closedAt only survives for closed projects", () => {
    const a = mapProjekt(
      {
        _id: "p",
        project_number: "X",
        name: "N",
        status: "closed",
        closed_at: "2026-01-02",
      },
      ids,
    );
    const b = mapProjekt(
      {
        _id: "p",
        project_number: "X",
        name: "N",
        status: "open",
        closed_at: "2026-01-02",
      },
      ids,
    );
    expect(a.lezarasIdopont).toBeInstanceOf(Date);
    expect(b.lezarasIdopont).toBeUndefined();
  });
});

describe("mapKoltseg", () => {
  const ismert = new Set(["p1"]);
  it("maps a valid expense and keeps unmapped receipt URL", () => {
    const r = mapKoltseg(
      {
        _id: "e1",
        project_id: "p1",
        expense_type: "fuel",
        amount: 5000,
        date: "2026-02-01",
        recorded_by: "u2",
        receipt_image_url: "https://f/x.png",
      },
      ids,
      ismert,
    );
    expect(r).toMatchObject({
      tipus: "uzemanyag",
      penznem: "HUF",
      rogzitoUserId: "N2",
      legacyBizonylatUrl: "https://f/x.png",
    });
  });
  it("skips orphans and unmappable recorders", () => {
    const w: string[] = [];
    expect(
      mapKoltseg(
        { _id: "e", project_id: "nope", amount: 1, date: "2026-01-01" },
        ids,
        ismert,
        w,
      ),
    ).toBeNull();
    expect(
      mapKoltseg(
        {
          _id: "e",
          project_id: "p1",
          amount: 1,
          date: "2026-01-01",
          recorded_by: "ghost",
        },
        ids,
        ismert,
        w,
      ),
    ).toBeNull();
    expect(w).toHaveLength(2);
  });
});

describe("mapHetiTerv", () => {
  it("maps status/priority and links as opaque legacy ids", () => {
    const r = mapHetiTerv(
      {
        _id: "w1",
        assignee_id: "u1",
        week_number: 10,
        year: 2026,
        title: "T",
        status: "blocked",
        priority: "urgent",
        ticket_id: "t1",
        is_archived: true,
        archive_reason: "x",
        created_by: "u2",
      },
      ids.userIds,
    );
    expect(r).toMatchObject({
      allapot: "blokkolt",
      prioritas: "surgos",
      hibajegyLegacyId: "t1",
      felelosUserId: "N1",
      letrehozoUserId: "N2",
      archivalt: true,
    });
  });
  it("skips an unmappable assignee and an invalid week", () => {
    const w: string[] = [];
    expect(
      mapHetiTerv(
        {
          _id: "w",
          assignee_id: "ghost",
          week_number: 1,
          year: 2026,
          title: "T",
          created_by: "u1",
        },
        ids.userIds,
        w,
      ),
    ).toBeNull();
    expect(
      mapHetiTerv(
        {
          _id: "w",
          assignee_id: "u1",
          week_number: 60,
          year: 2026,
          title: "T",
          created_by: "u1",
        },
        ids.userIds,
        w,
      ),
    ).toBeNull();
    expect(w).toHaveLength(2);
  });
});

describe("mapSablon / mapAlaprajz", () => {
  it("orders template items and archives inactive templates", () => {
    const r = mapSablon(
      {
        _id: "t",
        name: "Kamera",
        is_active: false,
        items: [
          { text: "B", order: 2 },
          { text: "A", order: 1, is_required: true },
        ],
      },
      ids.userIds,
    );
    expect(r.tetelek.map((t) => t.szoveg)).toEqual(["A", "B"]);
    expect(r.tetelek[0]?.kotelezo).toBe(true);
    expect(r.archivalt).toBe(true);
  });
  it("maps markers, clamps coordinates and maps the file", () => {
    const w: string[] = [];
    const r = mapAlaprajz(
      {
        _id: "f",
        contact_id: "c1",
        name: "1. emelet",
        image_url: "https://f/1.png",
        markers: [
          { x_percent: 120, y_percent: 5, marker_type: "camera", ticket_id: "t1" },
        ],
      },
      ids,
      w,
    );
    expect(r).toMatchObject({ partnerId: "PN1", fajlMediaId: "M1" });
    expect(r.jelolok[0]).toMatchObject({
      x: 100,
      tipus: "kamera",
      hibajegyLegacyId: "t1",
    });
    expect(w).toHaveLength(0);
  });
});

describe("migraljProjekt", () => {
  it("collects warnings across collections", () => {
    const r = migraljProjekt(
      {
        projects: [{ _id: "p1", project_number: "A", name: "N" }],
        expenses: [{ _id: "e", project_id: "zzz", amount: 1, date: "2026-01-01" }],
        weeklyPlans: [],
        templates: [],
        floorplans: [],
      },
      ids,
    );
    expect(r.projektek).toHaveLength(1);
    expect(r.koltsegek).toHaveLength(0);
    expect(r.figyelmeztetesek).toHaveLength(1);
  });
});
