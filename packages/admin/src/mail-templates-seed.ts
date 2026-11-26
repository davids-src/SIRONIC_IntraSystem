import { seedMailTemplates, type BaselineMailTemplate } from "@erp/mail";

export const BASELINE_MAIL_TEMPLATES: BaselineMailTemplate[] = [
  {
    key: "user_invitation",
    subject: "Meghívó a SIRONIC rendszerbe",
    description: "Felhasználói meghívó linkkel",
    variables: ["name", "inviteLink", "expiresAt", "inviterName"],
    enabled: true,
    body: `<p>Kedves {{name}}!</p>
<p>{{inviterName}} meghívta Önt a SIRONIC rendszerbe.</p>
<p><a href="{{inviteLink}}">Regisztráció és jelszó beállítása</a></p>
<p>A link érvényes: {{expiresAt}}</p>
<p>Ha nem Ön kérte a meghívót, hagyja figyelmen kívül ezt az üzenetet.</p>`,
  },
  {
    key: "password_reset",
    subject: "Jelszó visszaállítása — SIRONIC",
    description: "Jelszó-visszaállító link admin által vagy önkiszolgáló folyamatból",
    variables: ["name", "resetLink", "expiresAt"],
    enabled: true,
    body: `<p>Kedves {{name}}!</p>
<p>Jelszó-visszaállítást kértünk a SIRONIC fiókjához.</p>
<p><a href="{{resetLink}}">Új jelszó beállítása</a></p>
<p>A link érvényes: {{expiresAt}}</p>
<p>Ha nem Ön kérte, hagyja figyelmen kívül ezt az üzenetet.</p>`,
  },
  {
    key: "ertesites_feladat_uj",
    subject: "Új feladat: {{cim}}",
    description:
      "Értesítés új feladatról — csak annak megy, aki az Értesítési központban bekapcsolta",
    variables: ["name", "cim", "szoveg", "link"],
    enabled: true,
    body: `<p>Kedves {{name}}!</p>
<p>Új feladatot kaptál a SIRONIC rendszerben:</p>
<p><strong>{{cim}}</strong></p>
<p>{{szoveg}}</p>
<p><a href="{{link}}">Megnyitás a rendszerben</a></p>
<p style="color:#666;font-size:12px">Ezt az e-mailt azért kapod, mert az Értesítési központban bekapcsoltad. Ugyanott ki is kapcsolhatod.</p>`,
  },
  {
    key: "ertesites_feladat_valtozas",
    subject: "Feladat változás: {{cim}}",
    description:
      "Értesítés a feladataid változásáról — csak annak megy, aki az Értesítési központban bekapcsolta",
    variables: ["name", "cim", "szoveg", "link"],
    enabled: true,
    body: `<p>Kedves {{name}}!</p>
<p>Változás történt az egyik feladatodon:</p>
<p><strong>{{cim}}</strong></p>
<p>{{szoveg}}</p>
<p><a href="{{link}}">Megnyitás a rendszerben</a></p>
<p style="color:#666;font-size:12px">Ezt az e-mailt azért kapod, mert az Értesítési központban bekapcsoltad. Ugyanott ki is kapcsolhatod.</p>`,
  },
  {
    key: "ertesites_jelzes",
    subject: "Jelzés: {{cim}}",
    description:
      "Jelzés e-mailben — csak annak megy, aki az Értesítési központban bekapcsolta",
    variables: ["name", "cim", "szoveg", "link"],
    enabled: true,
    body: `<p>Kedves {{name}}!</p>
<p>Új jelzésed érkezett a SIRONIC rendszerben:</p>
<p><strong>{{cim}}</strong></p>
<p>{{szoveg}}</p>
<p><a href="{{link}}">Megnyitás a rendszerben</a></p>
<p style="color:#666;font-size:12px">Ezt az e-mailt azért kapod, mert az Értesítési központban bekapcsoltad. Ugyanott ki is kapcsolhatod.</p>`,
  },
];

export async function seedEngineMailTemplates(): Promise<void> {
  await seedMailTemplates(BASELINE_MAIL_TEMPLATES);
}
