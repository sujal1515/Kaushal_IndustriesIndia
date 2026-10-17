/**
 * Every CMS-editable page: its sections, fields and default content.
 *
 * Defaults are the approved copy (see docs/CLIENT-APPROVALS.md). Editors' changes are stored in
 * Supabase (cms_pages / cms_drafts) and merged over these defaults, so a page always renders even
 * before anything is saved. Copy may use {tokens}; each field's hint lists the ones it supports.
 */
import { site } from "../site.ts";
import { definePage, image, link, list, markdown, select, seoSection, strings, text, textarea, type PageDef } from "./schema.ts";

const iconOptions = [
  { value: "box", label: "Box (packing)" },
  { value: "file", label: "Document" },
  { value: "ship", label: "Ship (logistics)" },
  { value: "globe", label: "Globe" },
  { value: "shield", label: "Shield (quality)" },
  { value: "factory", label: "Factory" },
];

const hero = (fields: { eyebrow?: boolean; lead?: boolean } = { eyebrow: true, lead: true }) => ({
  key: "hero",
  label: "Page header",
  fields: [
    ...(fields.eyebrow === false ? [] : [text("eyebrow", "Eyebrow", "Small label above the title.")]),
    text("title", "Title"),
    ...(fields.lead === false ? [] : [textarea("lead", "Introduction")]),
  ],
});

const legalHint = "Markdown: ## heading, - bullet, **bold**, [link](/path). Tokens: {company}, {email}, {domain}, {address}.";

/* ------------------------------------------------------------------ */
/* Site-wide                                                           */
/* ------------------------------------------------------------------ */

export const globalPage = definePage({
  key: "global",
  label: "Site-wide content",
  path: null,
  group: "Site-wide",
  description: "Footer, the closing call to action on every page, and lists shared by several pages.",
  sections: [
    {
      key: "footer",
      label: "Footer",
      fields: [textarea("description", "Company description", "Shown under the logo in the footer.")],
    },
    {
      key: "cta",
      label: "Closing call to action",
      description: "The request-for-quotation block above the footer on every page.",
      fields: [text("label", "Label"), text("title", "Heading"), text("lead", "Line under the heading"), text("button", "Button label")],
    },
    {
      key: "lists",
      label: "Shared lists",
      description: "Used on the home, about and export pages.",
      fields: [strings("exportRegions", "Export regions", "Region"), strings("buyerTypes", "Buyer types", "Buyer type")],
    },
  ],
  defaults: {
    footer: { description: site.description as string },
    cta: {
      label: "Request for quotation",
      title: "Tell us the model, quantity and destination.",
      lead: "We'll reply with a quotation.",
      button: "Request a quote",
    },
    lists: {
      exportRegions: ["Indian sub-continent", "Middle East", "Far East Asia", "Australia", "Africa", "Europe", "The Americas"],
      buyerTypes: [
        "Importers and distributors",
        "Wholesalers and private retailers",
        "Government and semi-government organisations, including UN bodies",
        "Export houses in New Delhi and Mumbai",
      ],
    },
  },
});

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

export const homePage = definePage({
  key: "home",
  label: "Home",
  path: "/",
  group: "Pages",
  sections: [
    seoSection(),
    {
      key: "hero",
      label: "Hero",
      description: "The product photos and range list come from the catalogue (Catalogue → Categories).",
      fields: [
        text("eyebrow", "Eyebrow"),
        text("kicker", "Headline — first part"),
        text("display1", "Headline — large, line 1"),
        text("display2", "Headline — large, line 2"),
        text("rangeLabel", "Product range label"),
        textarea("lead", "Introduction"),
        list("specs", "Headline specs", "Spec", [text("label", "Label"), text("value", "Value"), text("unit", "Unit")], { max: 4 }),
        text("primaryCta", "Main button"),
        text("secondaryCta", "Quote link"),
      ],
    },
    {
      key: "proof",
      label: "Key figures",
      fields: [
        list("items", "Figures", "Figure", [text("value", "Figure", "A number (counts up), a number with +, or text. {models} = number of published engine models."), text("label", "Label")], {
          max: 4,
          titleKey: "label",
        }),
      ],
    },
    {
      key: "range",
      label: "Product range",
      description: "The six product lines themselves come from the catalogue.",
      fields: [text("label", "Section label"), text("title", "Heading"), textarea("lead", "Side text"), text("linkLabel", "Link label")],
    },
    { key: "marquee", label: "Scrolling ribbon", fields: [strings("items", "Phrases", "Phrase")] },
    {
      key: "industries",
      label: "Industries served",
      description: "The slides come from Catalogue → Applications.",
      fields: [text("label", "Section label"), text("title", "Heading"), textarea("lead", "Introduction")],
    },
    {
      key: "quality",
      label: "Quality band",
      fields: [text("eyebrow", "Eyebrow"), textarea("title", "Statement", undefined, 2), text("linkLabel", "Button label"), text("sealText", "Text around the seal", "Repeats around the ring; end it with ' · '.")],
    },
    {
      key: "export",
      label: "Export band",
      description: "The regions are edited under Site-wide content → Shared lists.",
      fields: [text("eyebrow", "Eyebrow"), textarea("body", "Statement", undefined, 2), text("linkLabel", "Link label")],
    },
    {
      key: "order",
      label: "How to order",
      fields: [text("label", "Section label"), text("title", "Heading"), list("steps", "Steps", "Step", [text("title", "Title"), textarea("body", "Description")], { max: 3 })],
    },
  ],
  defaults: {
    seo: {
      title: `${site.name} — Diesel Engines, Generating Sets & Pumps | Agra, India`,
      description: site.description as string,
    },
    hero: {
      eyebrow: "Manufacturer & exporter · Agra, India",
      kicker: "Diesel engines, generating sets and pumps",
      display1: "made in Agra",
      display2: "since 1964.",
      rangeLabel: "Product range",
      lead: "Stationary engines, pumping sets, gensets and castings, supplied to buyers in more than 60 countries.",
      specs: [
        { label: "Rated power", value: "3.5–28", unit: "bhp" },
        { label: "Speed", value: "850–1600", unit: "rpm" },
        { label: "Cooling", value: "Air & water", unit: "" },
      ],
      primaryCta: "Explore products",
      secondaryCta: "Request a quote",
    },
    proof: {
      items: [
        { value: "1964", label: "First manufacturing unit, Agra" },
        { value: "60+", label: "Countries supplied" },
        { value: "{models}", label: "Published engine models" },
        { value: "ISO 9001:2015", label: "Quality management system" },
      ],
    },
    range: {
      label: "Product range",
      title: "Six product lines, one manufacturer.",
      lead: "From the engine to the pump, alternator, mill and the castings inside them.",
      linkLabel: "All products",
    },
    marquee: {
      items: ["Diesel engines", "Generating sets", "Centrifugal pumps", "Agricultural machinery", "Grey & SG iron castings", "Spare parts", "Exported to 60+ countries"],
    },
    industries: {
      label: "Industries served",
      title: "Built for the field, the farm and the site.",
      lead: "Find the right engine, set or machine for the job it will do.",
    },
    quality: {
      eyebrow: "Quality & certifications",
      title: "ISO 9001:2015 quality management, and up to two years warranty.",
      linkLabel: "Quality, certificates & awards",
      sealText: "ISO 9001:2015 · Quality management system · Up to two years warranty · ",
    },
    export: {
      eyebrow: "Export markets",
      body: "Supplying importers, distributors and governments in 60+ countries.",
      linkLabel: "Export capability",
    },
    order: {
      label: "How to order",
      title: "From model to quotation in three steps.",
      steps: [
        { title: "Choose a product", body: "Browse a family, compare models in the spec table, or use the model finder to filter by power." },
        { title: "Send your requirement", body: "Press “Request a quote” — the product is filled in. Add quantity, application, destination and timeline." },
        { title: "Receive a quotation", body: "Our sales team reviews your enquiry and replies by email with pricing, lead time and shipping options." },
      ],
    },
  },
});

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

export const aboutPage = definePage({
  key: "about",
  label: "About",
  path: "/about",
  group: "Pages",
  sections: [
    seoSection(),
    hero(),
    {
      key: "intro",
      label: "Introduction",
      fields: [
        text("label", "Section label"),
        list("images", "Images", "Image", [image("image", "Image"), text("alt", "Description (alt text)"), select("fit", "Fit", [{ value: "contain", label: "Product (fit inside)" }, { value: "cover", label: "Photo (fill)" }])], { titleKey: "alt", max: 6 }),
        list("paragraphs", "Paragraphs", "Paragraph", [textarea("text", "Text", undefined, 4)], { max: 6 }),
      ],
    },
    {
      key: "history",
      label: "History",
      fields: [text("label", "Section label"), text("title", "Heading"), list("items", "Milestones", "Milestone", [text("year", "Year or label"), text("title", "Title"), textarea("body", "Description")], { titleKey: "title", max: 12 })],
    },
    {
      key: "capability",
      label: "Manufacturing capability",
      fields: [text("label", "Section label"), text("title", "Heading"), text("lead", "Introduction"), list("items", "Capabilities", "Capability", [text("title", "Title"), textarea("body", "Description")], { max: 12 })],
    },
    {
      key: "group",
      label: "Kaushal Group",
      fields: [text("eyebrow", "Eyebrow"), text("title", "Heading"), list("companies", "Companies", "Company", [text("name", "Name"), text("location", "Location"), textarea("body", "Description")], { max: 8 })],
    },
    {
      key: "export",
      label: "Export experience",
      description: "The regions are edited under Site-wide content → Shared lists.",
      fields: [text("eyebrow", "Eyebrow"), text("title", "Heading"), textarea("body", "Text"), text("linkLabel", "Button label")],
    },
    {
      key: "team",
      label: "Our team",
      fields: [text("eyebrow", "Eyebrow"), text("title", "Heading"), textarea("body", "Text"), textarea("quote", "Quote", undefined, 2)],
    },
    {
      key: "leadership",
      label: "Leadership",
      description: "The section stays hidden until at least one person is added.",
      fields: [text("label", "Section label"), text("title", "Heading"), list("people", "People", "Person", [text("name", "Name"), text("role", "Role"), textarea("bio", "Short bio")], { max: 12 })],
    },
  ],
  defaults: {
    seo: {
      title: "About Kaushal Industries — Manufacturer & Exporter Since 1964",
      description:
        "Kaushal Group set up its first manufacturing unit in Agra in 1964. Today Kaushal Industries and Kaushal Castings manufacture engines, pumping sets, generating sets and castings for 60+ countries.",
    },
    hero: {
      eyebrow: "About Kaushal Industries",
      title: "Power for agriculture, built in Agra since 1964.",
      lead: "India needed power, fast — specifically for agriculture and irrigation. Kaushal Group was founded to build it, and has been manufacturing diesel engines and allied products ever since.",
    },
    intro: {
      label: "Introduction",
      images: [
        { image: "/images/products/slow-speed-water-cooled.png", alt: "Slow speed water cooled diesel engine", fit: "contain" },
        { image: "/images/products/centrifugal-water-pump.png", alt: "Centrifugal water pump", fit: "contain" },
        { image: "/images/products/air-cooled-generating-set.png", alt: "Air cooled generating set", fit: "contain" },
        { image: "/images/products/castings-foundry.png", alt: "Molten iron being poured at the Kaushal foundry", fit: "cover" },
      ],
      paragraphs: [
        {
          text: "Movement is an essential ingredient of progress — even more so for independent India, a vast sub-continent that needed power for its farms. The founders of Kaushal Group chose to manufacture for the core of India's agricultural development.",
        },
        {
          text: "Our units manufacture diesel engines, diesel pumping sets, diesel generating sets, centrifugal pumps and castings. Once the products found acceptance in domestic markets, we took them to international markets — today buyers in more than 60 countries.",
        },
        { text: "Technology, training, automation and management systems are upgraded continuously to keep pace with developments in our field." },
      ],
    },
    history: {
      label: "History",
      title: "Six decades of movement.",
      items: [
        { year: "1964", title: "First unit in Agra", body: "Kaushal Group sets up its first manufacturing unit in Agra, Uttar Pradesh, building engines for agriculture and irrigation." },
        { year: "Growth", title: "Into export markets", body: "Once the products earn acceptance in India, the group expands into international markets." },
        { year: "2002", title: "Foundry moves to Dholpur", body: "Kaushal Castings relocates to Dholpur, Rajasthan, 55 km from Agra, as the group's dedicated foundry." },
        { year: "Today", title: "60+ countries", body: "Engines, pumping sets, generating sets and castings supplied across six continents." },
      ],
    },
    capability: {
      label: "Manufacturing capability",
      title: "Engine, pump, alternator coupling and foundry under one group.",
      lead: "From pattern to finished, tested product — the work stays in-house.",
      items: [
        { title: "Engine manufacture", body: "Air-cooled and water-cooled, high-speed and slow-speed stationary diesel engines in single and double cylinder builds." },
        { title: "Generating & pumping sets", body: "Engines coupled to alternators and centrifugal pumps on common bases, with panels, canopies and electric start as options." },
        { title: "In-house foundry", body: "Grey iron and SG iron casting with in-house tool making, sand and investment casting, and special moulding lines." },
        { title: "Machining & finishing", body: "Shot blasting, grinding and finish machining of cast components." },
        { title: "Testing", body: "Metallurgical analysis and hardness testing to control the physical and chemical properties of castings." },
        { title: "Custom builds", body: "Anti-clockwise rotation, extended crankshafts, pulleys, speed variators and safety cut-outs to buyer requirements." },
      ],
    },
    group: {
      eyebrow: "Kaushal Group",
      title: "A composite group of manufacturers and exporters.",
      companies: [
        { name: "Kaushal Industries", location: "Agra, Uttar Pradesh", body: "Manufacturer of stationary diesel engines, diesel pumping sets, diesel generating sets and centrifugal water pumps." },
        { name: "Kaushal Castings", location: "Dholpur, Rajasthan", body: "Foundry producing graded grey iron and SG iron castings for engineering, agriculture, automotive and domestic use." },
        {
          name: "International trading",
          location: "Agra",
          body: "Export of the group's own products alongside GI pipes, deep-well hand pumps and spares, ceramic sanitary ware, and ceramic wall and floor tiles.",
        },
      ],
    },
    export: {
      eyebrow: "Export experience",
      title: "Buyers on six continents.",
      body: "We supply importers, distributors, wholesalers and government and semi-government organisations — including bodies of the UN — as well as leading export houses in New Delhi and Mumbai.",
      linkLabel: "Export capability",
    },
    team: {
      eyebrow: "Our team",
      title: "People are the most important asset.",
      body: "Our management brings deep experience across production, finance, marketing and general management. We have built a qualified, dynamic team that strives for perfection in every field of operation.",
      quote: "“Movement is progress, and for us it has been the reason and the result.”",
    },
    leadership: { label: "Leadership", title: "The people behind Kaushal.", people: [] as { name: string; role: string; bio: string }[] },
  },
});

/* ------------------------------------------------------------------ */
/* Quality & certifications                                            */
/* ------------------------------------------------------------------ */

export const qualityPage = definePage({
  key: "quality-certifications",
  label: "Quality & certifications",
  path: "/quality-certifications",
  group: "Pages",
  sections: [
    seoSection(),
    hero(),
    {
      key: "policy",
      label: "Quality policy",
      fields: [text("label", "Section label"), text("title", "Heading"), strings("philosophy", "Working philosophy", "Point"), text("objectivesLabel", "Objectives label"), strings("objectives", "Quality objectives", "Objective")],
    },
    {
      key: "controls",
      label: "Testing & quality controls",
      fields: [text("label", "Section label"), text("title", "Heading"), list("items", "Controls", "Control", [text("title", "Title"), textarea("body", "Description")], { max: 8 })],
    },
    {
      key: "band",
      label: "Certification & warranty band",
      fields: [text("eyebrow", "Certification label"), text("title", "Certification statement"), text("warrantyLabel", "Warranty label"), text("warrantyHeadline", "Warranty headline"), textarea("warrantyBody", "Warranty text")],
    },
    {
      key: "evidence",
      label: "Certificates & awards",
      description: "The documents themselves are managed in Catalogue → Resources.",
      fields: [text("certificatesLabel", "Certificates label"), text("certificatesTitle", "Certificates heading"), text("certificatesLead", "Certificates introduction"), text("awardsLabel", "Awards label"), text("awardsTitle", "Awards heading"), text("awardsLead", "Awards introduction")],
    },
  ],
  defaults: {
    seo: {
      title: "Quality, Certifications & Awards",
      description: "Kaushal Industries' quality policy, in-house quality controls, ISO 9001:2015 quality management system, current certificates, export awards and warranty.",
    },
    hero: {
      eyebrow: "Quality & certifications",
      title: "Right first time, every time.",
      lead: "Kaushal Industries is committed to producing and delivering products to customer specification — first time, every time.",
    },
    policy: {
      label: "Quality policy",
      title: "Our working philosophy.",
      philosophy: [
        "Understand customer needs and fulfil them.",
        "Deliver products of the right quality at the lowest possible price.",
        "Improve continuously to maximise customer satisfaction.",
      ],
      objectivesLabel: "Quality objectives",
      objectives: ["99% on-time delivery", "100% customer satisfaction"],
    },
    controls: {
      label: "Testing & quality controls",
      title: "Controlled from casting to finished engine.",
      items: [
        { title: "Standard engine declarations", body: "Every published specification is declared for our standard engines, so you can compare models like for like." },
        { title: "Metallurgical analysis", body: "Castings are checked for chemical composition at our foundry before machining." },
        { title: "Hardness testing", body: "Hardness is tested in-house to confirm the physical properties of each casting batch." },
        { title: "Machining and finishing", body: "Shot blasting, grinding and machining are done in-house, keeping quality under one roof." },
      ],
    },
    band: {
      eyebrow: "Certification",
      title: "Quality management system — ISO 9001:2015.",
      warrantyLabel: "Warranty",
      warrantyHeadline: "Up to 2 years warranty",
      warrantyBody:
        "Our engines carry a warranty of up to two years. Coverage depends on the product and application — the terms for your order are confirmed with your quotation.",
    },
    evidence: {
      certificatesLabel: "Downloadable evidence",
      certificatesTitle: "Certificates & registrations.",
      certificatesLead: "Open any certificate to view or save the full-size document.",
      awardsLabel: "Recognition",
      awardsTitle: "Export awards.",
      awardsLead: "Awarded by EEPC India for export performance.",
    },
  },
});

/* ------------------------------------------------------------------ */
/* Export markets                                                      */
/* ------------------------------------------------------------------ */

export const exportPage = definePage({
  key: "export-markets",
  label: "Export markets",
  path: "/export-markets",
  group: "Pages",
  sections: [
    seoSection(),
    hero(),
    {
      key: "regions",
      label: "Regions served",
      description: "The regions are edited under Site-wide content → Shared lists.",
      fields: [text("label", "Section label"), text("title", "Heading"), text("countries", "Highlighted cell")],
    },
    {
      key: "capabilities",
      label: "Export capabilities",
      fields: [list("items", "Capabilities", "Capability", [select("icon", "Icon", iconOptions), text("title", "Title"), textarea("body", "Description"), link("link", "Link (optional)")], { max: 6 })],
    },
    {
      key: "buyers",
      label: "Who we supply",
      description: "The buyer types are edited under Site-wide content → Shared lists.",
      fields: [text("eyebrow", "Eyebrow"), text("title", "Heading")],
    },
    {
      key: "distributors",
      label: "Distributor enquiries",
      fields: [text("eyebrow", "Eyebrow"), text("title", "Heading"), textarea("body", "Text"), text("button", "Button label")],
    },
  ],
  defaults: {
    seo: {
      title: "Export Markets — Engines, Pumps & Gensets Supplied to 60+ Countries",
      description:
        "Kaushal Industries exports diesel engines, pumping sets, generating sets and castings to the Middle East, Africa, Asia, Australia, Europe and the Americas. Distributor enquiries welcome.",
    },
    hero: {
      eyebrow: "Export markets",
      title: "From Agra to more than 60 countries.",
      lead: "We supply importers, distributors and government buyers worldwide — and the export houses of New Delhi and Mumbai.",
    },
    regions: { label: "Regions served", title: "Six continents, one specification.", countries: "60+ countries" },
    capabilities: {
      items: [
        {
          icon: "box",
          title: "Packing for export",
          body: "Every engine model is published with its approximate packed case size and gross weight, so you can plan container loads and freight before you ask for a quotation.",
          link: { label: "See case sizes by model", href: "/products/diesel-engines#model-finder" },
        },
        {
          icon: "file",
          title: "Documentation",
          body: "Tell us your destination country and import requirements in your enquiry; we confirm the export documents we will provide with your quotation.",
          link: { label: "", href: "" },
        },
        {
          icon: "ship",
          title: "Logistics",
          body: "Share your destination port or city and required timeline. We quote lead time and shipping options for your order.",
          link: { label: "", href: "" },
        },
      ],
    },
    buyers: { eyebrow: "Who we supply", title: "Trusted by trade and government buyers." },
    distributors: {
      eyebrow: "Distributor enquiries",
      title: "Represent Kaushal engines and pumps in your market.",
      body: "Tell us about your company, territory and the product lines you are interested in.",
      button: "Become a distributor",
    },
  },
});

/* ------------------------------------------------------------------ */
/* Catalogue landing pages                                             */
/* ------------------------------------------------------------------ */

export const productsPage = definePage({
  key: "products",
  label: "Products (overview)",
  path: "/products",
  group: "Pages",
  description: "The category and product content itself is managed in Catalogue.",
  sections: [seoSection(), hero(), { key: "labels", label: "Labels", fields: [text("viewCategory", "Category link", "{category} = category name in lower case.")] }],
  defaults: {
    seo: {
      title: "Products — Diesel Engines, Generating Sets, Pumps & Castings",
      description: "Browse Kaushal Industries' full range: stationary diesel engines, diesel generating sets, centrifugal water pumps, agricultural machinery, castings and spare parts.",
    },
    hero: {
      eyebrow: "Products",
      title: "The complete Kaushal range.",
      lead: "Six product lines, each manufactured and tested in-house. Choose a category to compare families and models.",
    },
    labels: { viewCategory: "View {category}" },
  },
});

export const applicationsPage = definePage({
  key: "applications",
  label: "Applications (overview)",
  path: "/applications",
  group: "Pages",
  description: "Each application's own content is managed in Catalogue → Applications.",
  sections: [seoSection(), hero(), { key: "labels", label: "Labels", fields: [text("cardLink", "Card link", "{application} = application name in lower case.")] }],
  defaults: {
    seo: {
      title: "Applications & Industries",
      description: "Diesel engines, pumping sets, generating sets and machinery for agriculture, irrigation, power generation, construction and food processing.",
    },
    hero: {
      eyebrow: "Applications & industries",
      title: "Matched to the work it will do.",
      lead: "Start from your application and we'll point you to the engines, sets and machines built for it.",
    },
    labels: { cardLink: "Products for {application}" },
  },
});

export const resourcesPage = definePage({
  key: "resources",
  label: "Resources",
  path: "/resources",
  group: "Pages",
  description: "Documents and FAQs themselves are managed in Catalogue → Resources and Content → FAQs.",
  sections: [
    seoSection(),
    hero(),
    {
      key: "empty",
      label: "When no documents are published",
      fields: [text("title", "Heading"), textarea("body", "Text"), text("linkLabel", "Link label")],
    },
    {
      key: "sections",
      label: "Section headings",
      fields: [text("certificatesNav", "Certificates — menu label"), text("certificatesLabel", "Certificates — label"), text("certificatesTitle", "Certificates — heading"), text("faqsNav", "FAQs — menu label"), text("faqsTitle", "FAQs — heading"), text("faqsPrompt", "FAQs — contact prompt")],
    },
  ],
  defaults: {
    seo: {
      title: "Resources — Brochures, Data Sheets, Certificates & FAQs",
      description: "Download Kaushal Industries brochures, technical data sheets and certificates, and find answers to common questions about our engines, generating sets and pumps.",
    },
    hero: { eyebrow: "Resources", title: "Documents and answers.", lead: "Brochures, data sheets, certificates and the questions buyers ask most often." },
    empty: {
      title: "Need a brochure or data sheet?",
      body: "Full specifications for every published model are on each product page — print any page as a spec sheet. For a brochure, ask us and we'll email it.",
      linkLabel: "Request documents",
    },
    sections: {
      certificatesNav: "Certificates & awards",
      certificatesLabel: "Evidence",
      certificatesTitle: "Certificates & awards.",
      faqsNav: "FAQs",
      faqsTitle: "Questions buyers ask.",
      faqsPrompt: "Can't find your answer?",
    },
  },
});

/* ------------------------------------------------------------------ */
/* Forms & system pages                                                */
/* ------------------------------------------------------------------ */

export const contactPage = definePage({
  key: "contact",
  label: "Contact",
  path: "/contact",
  group: "Forms & system pages",
  description: "Phone numbers, email, WhatsApp and the address are edited in Administration → Settings.",
  sections: [
    seoSection(),
    hero(),
    { key: "form", label: "Message form", fields: [text("title", "Heading"), text("lead", "Introduction")] },
    { key: "address", label: "Address block", fields: [text("contactLabel", "Contact person label"), text("contactPerson", "Contact person"), text("mapLabel", "Map description")] },
  ],
  defaults: {
    seo: {
      title: "Contact Kaushal Industries — Agra, India",
      description: "Contact Kaushal Industries, 12/55 Nagla Balchand, Nunhai, Agra 282006, India. Call, WhatsApp or email our sales team, or send us a message.",
    },
    hero: {
      eyebrow: "Contact",
      title: "Talk to our sales team.",
      lead: "Call, WhatsApp or email us — or send a message below. For pricing, the quickest route is a request for quotation.",
    },
    form: { title: "Send a message", lead: "General questions, spares, documents or anything else." },
    address: { contactLabel: "Contact", contactPerson: site.contact.contactPerson as string, mapLabel: "Kaushal Industries, Nunhai, Agra" },
  },
});

export const quotePage = definePage({
  key: "request-a-quote",
  label: "Request a quote",
  path: "/request-a-quote",
  group: "Forms & system pages",
  sections: [
    seoSection(),
    {
      key: "hero",
      label: "Page header",
      fields: [text("eyebrow", "Eyebrow"), text("title", "Title"), text("titleWithProduct", "Title when a product is chosen", "{product} = product name."), textarea("lead", "Introduction"), text("replyNote", "Reply-time note"), text("whatsappLabel", "WhatsApp link label")],
    },
  ],
  defaults: {
    seo: {
      title: "Request a Quote",
      description: "Request a quotation for Kaushal diesel engines, generating sets, pumps, agricultural machinery, castings or spare parts. Tell us the product, quantity, destination and timeline.",
    },
    hero: {
      eyebrow: "Request for quotation",
      title: "Request a quote",
      titleWithProduct: "Quote for the {product}",
      lead: "Tell us what you need, how many, and where it's going. We'll reply with pricing, lead time and shipping options.",
      replyNote: "Reply by email, usually within one business day",
      whatsappLabel: "WhatsApp us",
    },
  },
});

export const thankYouPage = definePage({
  key: "thank-you",
  label: "Thank-you page",
  path: "/request-a-quote/thank-you",
  group: "Forms & system pages",
  sections: [
    {
      key: "messages",
      label: "Messages",
      fields: [
        text("rfqTitle", "Title after a quotation request"),
        text("messageTitle", "Title after a message"),
        text("lead", "Introduction"),
        text("emailSent", "Added when a confirmation email was sent"),
        text("reference", "Reference label"),
        text("browse", "Main button"),
        text("home", "Second button"),
        text("missingEmail", "Help text (email on)"),
        text("addSomething", "Help text (email off)"),
        text("contactLink", "Contact link"),
      ],
    },
  ],
  defaults: {
    messages: {
      rfqTitle: "Your quotation request is in.",
      messageTitle: "Thank you — message received.",
      lead: "Our team will reply by email, usually within one business day.",
      emailSent: "A confirmation has been sent to your inbox.",
      reference: "Your reference:",
      browse: "Continue browsing",
      home: "Home",
      missingEmail: "Didn't get the confirmation email? Check your spam folder or",
      addSomething: "Need to add something?",
      contactLink: "contact us directly",
    },
  },
});

export const searchPage = definePage({
  key: "search",
  label: "Search",
  path: "/search",
  group: "Forms & system pages",
  sections: [{ key: "hero", label: "Page header", fields: [text("eyebrow", "Eyebrow"), text("title", "Title"), text("placeholder", "Search box hint")] }],
  defaults: { hero: { eyebrow: "Search", title: "Find a product or model.", placeholder: "Try “EF1A”, “water cooled” or “irrigation”" } },
});

export const notFoundPage = definePage({
  key: "not-found",
  label: "Page not found (404)",
  path: null,
  group: "Forms & system pages",
  sections: [
    {
      key: "hero",
      label: "Message",
      fields: [text("eyebrow", "Eyebrow"), text("title", "Title"), textarea("lead", "Text"), text("placeholder", "Search box hint"), text("productsButton", "Main button"), text("contactButton", "Second button"), text("pricePrompt", "Prompt"), text("priceLink", "Prompt link")],
    },
  ],
  defaults: {
    hero: {
      eyebrow: "404",
      title: "This page has moved or doesn't exist.",
      lead: "Our website has a new structure. Search for a product or model code, or start from the product range.",
      placeholder: "Product or model code",
      productsButton: "View products",
      contactButton: "Contact us",
      pricePrompt: "Looking for a price?",
      priceLink: "Request a quote",
    },
  },
});

/* ------------------------------------------------------------------ */
/* Legal                                                               */
/* ------------------------------------------------------------------ */

const legal = (key: string, label: string, path: string, seo: { title: string; description: string }, title: string, body: string) =>
  definePage({
    key,
    label,
    path,
    group: "Legal",
    sections: [seoSection(), { key: "page", label: "Page", fields: [text("title", "Title"), text("updated", "Last updated"), markdown("body", "Text", legalHint, 24)] }],
    defaults: { seo, page: { title, updated: "October 2026", body } },
  });

export const privacyPage = legal(
  "privacy-policy",
  "Privacy policy",
  "/privacy-policy",
  { title: "Privacy Policy", description: "How Kaushal Industries collects, uses and protects the personal data you share through this website." },
  "Privacy policy",
  `This policy explains how {company} (“we”, “us”) handles personal data collected through {domain}. We collect only what we need to answer your enquiry and improve this website.

## What we collect

- **Enquiry details** you submit through our quotation, distributor and contact forms: your name, company, email address, phone number, country, buyer type, and the details of your requirement (product, model, quantity, application, destination and timeline, and your message).
- **Technical data** sent with a form submission: the page you submitted from, your browser’s user agent, and a one-way hash of your IP address used to prevent spam. We do not store your raw IP address.
- **Analytics data**, only if you allow analytics cookies: pages viewed, products viewed, downloads and form interactions, collected through Google Analytics via Google Tag Manager.

## How we use it

- To respond to your enquiry, prepare quotations and follow up on your request.
- To send you an acknowledgement of your enquiry by email.
- To protect the website and our team from spam and abuse.
- To understand, in aggregate, how buyers use this website, if you have allowed analytics.

We do not sell your personal data and we do not use it for advertising.

## Who processes it

Enquiries are stored in our database hosted by Supabase and delivered to our sales team by email through our transactional email provider. If you allow analytics, Google processes analytics data. Loading the interactive map on our contact page shares data with Google Maps. These providers process data on our behalf under their own terms.

## Cookies

We use analytics cookies only with your consent, which you can change at any time through “Cookie settings” in the footer. Our administrators’ sign-in uses strictly necessary cookies. We set no advertising cookies.

## How long we keep it

We keep enquiry records for as long as needed to respond to you, manage any resulting business relationship, and meet our legal and accounting obligations, after which they are deleted.

## Your rights

You may ask us to access, correct or delete the personal data we hold about you, or withdraw your consent, by emailing [{email}](mailto:{email}). We will respond within a reasonable time and in line with applicable law, including India’s Digital Personal Data Protection Act, 2023.

## Contact

{company}, {address}. Email [{email}](mailto:{email}).`,
);

export const termsPage = legal(
  "website-terms",
  "Website terms of use",
  "/website-terms",
  { title: "Website Terms of Use", description: "Terms governing the use of the Kaushal Industries website." },
  "Website terms of use",
  `By using this website you accept these terms. If you do not agree, please do not use the website.

## Information on this website

Product information, specifications and images are provided for general guidance and relate to our standard products. They do not form an offer or a contract. Specifications may change without notice; please confirm them with us before ordering. See our [disclaimer](/disclaimer).

## Quotations and orders

Submitting a request for quotation does not create a contract. Any sale is governed by the quotation, order confirmation and terms we issue to you directly.

## Intellectual property

The content of this website — text, images, specifications, logos and design — belongs to {company} or its licensors. You may view, print and download it for evaluating our products; any other use requires our written permission.

## Acceptable use

You must not misuse this website, including by submitting false enquiries, attempting to gain unauthorised access, or interfering with its operation.

## Links

We are not responsible for the content of third-party websites linked from this site.

## Liability

To the extent permitted by law, we are not liable for any loss arising from use of, or reliance on, this website.

## Governing law

These terms are governed by the laws of India.

## Contact

Questions about these terms: [{email}](mailto:{email}).`,
);

export const disclaimerPage = legal(
  "disclaimer",
  "Disclaimer",
  "/disclaimer",
  { title: "Disclaimer", description: "Disclaimer for information and specifications published on the Kaushal Industries website." },
  "Disclaimer",
  "The information and data on this website are provided with the greatest care and in good faith. We do not claim them to be complete or free of error. To the best of our knowledge they are correct for the purpose of giving an idea of the quality of our products and to assist you in making a decision. All declarations are for our standard products; please confirm specifications with us before ordering.",
);

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const cmsPages = {
  global: globalPage,
  home: homePage,
  about: aboutPage,
  "quality-certifications": qualityPage,
  "export-markets": exportPage,
  products: productsPage,
  applications: applicationsPage,
  resources: resourcesPage,
  contact: contactPage,
  "request-a-quote": quotePage,
  "thank-you": thankYouPage,
  search: searchPage,
  "not-found": notFoundPage,
  "privacy-policy": privacyPage,
  "website-terms": termsPage,
  disclaimer: disclaimerPage,
} as const;

export type PageKey = keyof typeof cmsPages;
export type PageContent<K extends PageKey> = (typeof cmsPages)[K]["defaults"];

export const isPageKey = (k: string): k is PageKey => k in cmsPages;
export const pageDef = (k: PageKey) => cmsPages[k] as unknown as PageDef;
