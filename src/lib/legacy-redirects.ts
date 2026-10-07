/**
 * Legacy URL redirect map (blueprint §9.3). All 36 URLs found on www.kia-india.com
 * on 4 Oct 2026, mapped to their new equivalents. Served as permanent (308) redirects
 * from next.config.ts; src/proxy.ts adds a case-insensitive fallback.
 * Verify with: npm run test:redirects -- https://your-deployment
 */
export const legacyRedirects: { from: string; to: string }[] = [
  { from: "/index.html", to: "/" },
  { from: "/about_us.html", to: "/about" },
  { from: "/Kaushal_Industries.html", to: "/about" },
  { from: "/Kaushal_Group_Inc.html", to: "/about" },
  { from: "/Kaushal_Castings.html", to: "/products/castings" },
  { from: "/contact_us.html", to: "/contact" },
  { from: "/products.html", to: "/products" },
  { from: "/HighSpeedAirCooledDieselEngine.html", to: "/products/diesel-engines/high-speed-air-cooled-diesel-engine" },
  { from: "/HighSpeedWaterCooledDieselEngine.html", to: "/products/diesel-engines/high-speed-water-cooled-diesel-engine" },
  { from: "/SlowSpeedWaterCooledDieselEngine.html", to: "/products/diesel-engines/slow-speed-water-cooled-diesel-engine" },
  { from: "/SlowSpeedAirCooledDieselEngine.html", to: "/products/diesel-engines/slow-speed-air-cooled-diesel-engine" },
  { from: "/AirCooledGenSetsSinglePhase.html", to: "/products/generating-sets/air-cooled-generating-sets" },
  { from: "/CentrifugalWaterPumps.html", to: "/products/pumps/centrifugal-water-pumps" },
  { from: "/CornGrinder.html", to: "/products/agricultural-machinery/corn-grinder" },
  { from: "/CoffeePulper.html", to: "/products/agricultural-machinery/coffee-pulper" },
  { from: "/SpareParts.html", to: "/products/spare-parts" },
  { from: "/Castings.html", to: "/products/castings" },
  { from: "/quality.html", to: "/quality-certifications" },
  { from: "/certificates.html", to: "/quality-certifications" },
  { from: "/Awards.html", to: "/quality-certifications" },
  { from: "/Product_applic.html", to: "/applications" },
  { from: "/Concerte_Mixer.html", to: "/applications/construction" },
  { from: "/Concrete_Mixer_dslEng.html", to: "/applications/construction" },
  { from: "/Molinos_dslEng.html", to: "/applications/agriculture" },
  { from: "/Picadora_dslEng.html", to: "/applications/agriculture" },
  { from: "/WatrPmp_dslEng.html", to: "/applications/irrigation" },
  { from: "/Genratr_50dslEng.html", to: "/applications/power-generation" },
  { from: "/Genratr_60dslEng.html", to: "/applications/power-generation" },
  { from: "/spares.html", to: "/products/spare-parts" },
  { from: "/dslEng_spare.html", to: "/products/spare-parts" },
  { from: "/genrert_spare.html", to: "/products/spare-parts" },
  { from: "/centifPmp_spare.html", to: "/products/spare-parts" },
  { from: "/agriMchin_spare.html", to: "/products/spare-parts" },
  { from: "/castings_spare.html", to: "/products/spare-parts" },
  { from: "/disclamer.html", to: "/disclaimer" },
];

/** Lower-cased lookup for the proxy's case-insensitive fallback. */
export const legacyRedirectLookup: Record<string, string> = Object.fromEntries(
  legacyRedirects.map((r) => [r.from.toLowerCase(), r.to]),
);
