# Admin guide

Sign in at `/admin`. What you see depends on your role:

| Role | Dashboard | Leads | Content (pages, media, FAQs) | Catalogue | Settings, users, activity log |
| --- | --- | --- | --- | --- | --- |
| Administrator | ✓ | ✓ | ✓ | ✓ | ✓ |
| Catalogue editor | ✓ | — | ✓ | ✓ | — |
| Sales | ✓ | ✓ | — | — | — |

## Dashboard

The figures cover the last 12 months and leave out spam: new unanswered leads, this month against
last month, the open pipeline (with estimated value in USD), win rate, and follow-ups due. Below are
enquiries per month, the pipeline by stage, top destinations, most requested products, lead sources,
your follow-ups, recent team activity, pages with unpublished drafts and catalogue totals.

## Leads

- **All enquiries** — search and filter by stage, type, priority, owner, source, follow-up, tag and
  date; sort by date, recent activity, follow-up or value. Tick rows to change stage, priority or
  owner in bulk (administrators can also delete). **Export CSV** exports the current filter.
- **Pipeline** — a board of open leads by stage plus anything won or lost in the last 90 days.
  Drag a card to another column, or use the menu on the card.
- **Follow-ups** — overdue, today and the next 7 days, for you or everyone.
- **Add lead** — for enquiries that arrive by phone, email, WhatsApp or at a trade show.
- **On a lead** — change stage and owner, add notes, set priority, follow-up date, estimated value,
  source, tags and the reason a lead was lost; email the buyer (replies come to your own inbox) and
  log calls. Everything is recorded in the lead's history.

Dates are entered and shown in India time.

## Content (CMS)

**Pages** lists every editable page. Each page is split into sections (header, introduction, lists of
items, search-engine title and description). Lists can be added to, reordered, duplicated and removed.

1. Edit, then **Save draft** (or Ctrl+S). The live site does not change.
2. **Preview** opens the real page showing your draft; a bar at the bottom lets you exit preview.
3. **Publish** puts it live within seconds. **Discard draft** goes back to what is live.
4. **Revision history** keeps every published version; **Restore** loads one into the draft.

Some copy supports tokens, e.g. `{product}` in “Quote for the {product}” or `{models}` (the number of
published engine models) in the home page figures; each field's hint lists its tokens. Legal pages use
simple formatting: `## heading`, `- bullet`, `**bold**`, `[link](/page)`.

Phone numbers, email, WhatsApp and the address live in **Settings**. Products, categories,
applications and documents live in **Catalogue**.

**Media library** — upload images (or drop them in), add a short description (alt text), copy a
path, or delete. Images can also be uploaded and chosen straight from the page editor, which also
offers the images that ship with the site.

## Catalogue

Products (with models, specification grids, images, applications, related products and documents),
categories and their specification columns, applications, resources (brochures, data sheets,
certificates, awards) and FAQs. **Duplicate** on a product makes a draft copy with all its models and
specifications. Changes appear on the site immediately.

## Activity log

Administrators can see every change to content, catalogue, leads, settings and users: who, when, and
which fields changed.
