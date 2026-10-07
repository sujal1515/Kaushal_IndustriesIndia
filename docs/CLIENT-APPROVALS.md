# Content requiring client approval before launch

The proposal (p.7) requires the client to approve every technical claim, product detail, certification reference and the final content.
Below is everything in this build that was migrated, edited or drafted. Where each item lives is noted so it can be corrected.

## Claims and conflicts found on the legacy site

| # | Item | Where in the build | Issue |
|---|---|---|---|
| 1 | "ISO 9001:2015 certified" | `src/lib/content.ts` (proofPoints), Home, Quality page | Legacy About page says certification was still "in process"; the hidden Group page says ISO 9001:2008 since 2004. Supply the current certificate (number and validity) or remove the claim. |
| 2 | "Up to 2 years warranty" | `content.ts` (`warranty`), Quality page | Taken from the legacy home page. Confirm the terms. |
| 3 | "60+ countries" and the region list | `content.ts`, `site.ts` | From the legacy profile. Confirm. |
| 4 | Engine range 3.5–28 bhp | Home hero, FAQ | Calculated from the published spec tables. The legacy profile claims engines up to 84 HP and gensets up to 65 kVA. Confirm the real range. |
| 5 | High Speed Air Cooled: legacy heading said "1500–1800 RPM, 3.5–15 BHP" | Product page key specs are computed from the model tables (1500–1600 rpm, 3.5–28 bhp) | Confirm which is correct, and whether the 15–28 bhp double-cylinder models belong to this family. |
| 6 | Slow Speed Air Cooled (15–28 bhp) and Water Cooled Generating Sets | Status **Coming soon** | Supply specifications or set them to Draft. |
| 7 | Export House certificate 2015–20 | Seeded with `valid_to = 2020-03-31`, so it's hidden as expired | Validity inferred from the file name. Supply the current certificate. |
| 8 | EEPC awards 2005–06 to 2010–11 | Quality page → Export awards | Keep or remove? |
| 9 | Quality objective "Sales growth by 25%" | Deliberately **omitted** (internal target) | Confirm. |
| 10 | Phone numbers, WhatsApp number (assumed +91 97197 01128), kia@kia-india.com | Admin → Settings / `site.ts` | Confirm they work and which number has WhatsApp. |

## Copy drafted or edited by the developer (no legacy source)

- Application pages (agriculture, irrigation, power generation, construction, food processing): `src/lib/data/seed.ts` → `seedApplications`, editable in Admin → Applications.
- Corn Grinder, Coffee Pulper, Spare Parts and generating set descriptions: the legacy pages had images only. Admin → Products.
- Export page: packing, documentation and logistics paragraphs (`src/app/(site)/export-markets/page.tsx`).
- Home "How to order" steps, and "reply usually within one business day" (Home, RFQ, thank-you pages). Confirm the service level.
- FAQs: answers are built from legacy spec data. Admin → FAQs.
- Privacy policy and website terms: **drafts for legal review** (`src/app/(site)/privacy-policy`, `website-terms`).

## Still needed from the client

Original high-resolution product, factory, team and testing photos (the legacy images are 278 px), a vector logo, brochures and data sheets, maintenance guides, current certificates, leadership names and bios (the About page section stays hidden until added in `content.ts`), and spec tables for gensets, pumps and agricultural machines.
