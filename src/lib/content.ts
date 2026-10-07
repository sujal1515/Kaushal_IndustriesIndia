/**
 * Editorial content for non-catalogue pages (Home, About, Quality, Export).
 * The PDF scopes the admin to the catalogue, resources and enquiries only
 * (blueprint §6.2), so this copy is managed in code.
 *
 * Every claim here is listed in docs/CLIENT-APPROVALS.md for sign-off.
 * Sections render only when their arrays are non-empty (e.g. leadership).
 */

export const proofPoints = [
  { value: "1964", label: "First manufacturing unit, Agra" },
  { value: "60+", label: "Countries supplied" },
  { value: "ISO 9001:2015", label: "Quality management system" },
  { value: "2 years", label: "Warranty, up to" },
];

export const exportRegions = [
  "Indian sub-continent",
  "Middle East",
  "Far East Asia",
  "Australia",
  "Africa",
  "Europe",
  "The Americas",
];

export const buyerTypes = [
  "Importers and distributors",
  "Wholesalers and private retailers",
  "Government and semi-government organisations, including UN bodies",
  "Export houses in New Delhi and Mumbai",
];

export const timeline = [
  { year: "1964", title: "First unit in Agra", body: "Kaushal Group sets up its first manufacturing unit in Agra, Uttar Pradesh, building engines for agriculture and irrigation." },
  { year: "Growth", title: "Into export markets", body: "Once the products earn acceptance in India, the group expands into international markets." },
  { year: "2002", title: "Foundry moves to Dholpur", body: "Kaushal Castings relocates to Dholpur, Rajasthan, 55 km from Agra, as the group's dedicated foundry." },
  { year: "Today", title: "60+ countries", body: "Engines, pumping sets, generating sets and castings supplied across six continents." },
];

export const groupCompanies = [
  {
    name: "Kaushal Industries",
    location: "Agra, Uttar Pradesh",
    body: "Manufacturer of stationary diesel engines, diesel pumping sets, diesel generating sets and centrifugal water pumps.",
  },
  {
    name: "Kaushal Castings",
    location: "Dholpur, Rajasthan",
    body: "Foundry producing graded grey iron and SG iron castings for engineering, agriculture, automotive and domestic use.",
  },
  {
    name: "International trading",
    location: "Agra",
    body: "Export of the group's own products alongside GI pipes, deep-well hand pumps and spares, ceramic sanitary ware, and ceramic wall and floor tiles.",
  },
];

export const capabilities = [
  { title: "Engine manufacture", body: "Air-cooled and water-cooled, high-speed and slow-speed stationary diesel engines in single and double cylinder builds." },
  { title: "Generating & pumping sets", body: "Engines coupled to alternators and centrifugal pumps on common bases, with panels, canopies and electric start as options." },
  { title: "In-house foundry", body: "Grey iron and SG iron casting with in-house tool making, sand and investment casting, and special moulding lines." },
  { title: "Machining & finishing", body: "Shot blasting, grinding and finish machining of cast components." },
  { title: "Testing", body: "Metallurgical analysis and hardness testing to control the physical and chemical properties of castings." },
  { title: "Custom builds", body: "Anti-clockwise rotation, extended crankshafts, pulleys, speed variators and safety cut-outs to buyer requirements." },
];

/** Add approved leadership profiles here; the About page hides the section while empty. */
export const leadership: { name: string; role: string; bio?: string }[] = [];

export const qualityPolicy = {
  statement:
    "Kaushal Industries is committed to producing and delivering products to customer specification — first time, every time.",
  philosophy: [
    "Understand customer needs and fulfil them.",
    "Deliver products of the right quality at the lowest possible price.",
    "Improve continuously to maximise customer satisfaction.",
  ],
  objectives: ["99% on-time delivery", "100% customer satisfaction"],
};

export const qualityControls = [
  { title: "Standard engine declarations", body: "Every published specification is declared for our standard engines, so you can compare models like for like." },
  { title: "Metallurgical analysis", body: "Castings are checked for chemical composition at our foundry before machining." },
  { title: "Hardness testing", body: "Hardness is tested in-house to confirm the physical properties of each casting batch." },
  { title: "Machining and finishing", body: "Shot blasting, grinding and machining are done in-house, keeping quality under one roof." },
];

export const warranty = {
  headline: "Up to 2 years warranty",
  body: "Our engines carry a warranty of up to two years. Coverage depends on the product and application — the terms for your order are confirmed with your quotation.",
};

export const disclaimer =
  "The information and data on this website are provided with the greatest care and in good faith. We do not claim them to be complete or free of error. To the best of our knowledge they are correct for the purpose of giving an idea of the quality of our products and to assist you in making a decision. All declarations are for our standard products; please confirm specifications with us before ordering.";
