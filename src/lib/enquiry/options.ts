// Option lists for the RFQ / contact forms. Values are stored; labels are shown.
// [CLARIFICATION] in the blueprint (§5.3): confirm timeline values and quantity units with the client.

export const TIMELINES = [
  { value: "immediate", label: "Immediately" },
  { value: "1-3-months", label: "Within 1–3 months" },
  { value: "3-6-months", label: "Within 3–6 months" },
  { value: "planning", label: "Planning / budgetary" },
] as const;

export const QUANTITY_UNITS = [
  { value: "units", label: "Units" },
  { value: "sets", label: "Sets" },
] as const;

export const BUYER_TYPES = [
  { value: "end-user", label: "End user" },
  { value: "dealer", label: "Dealer / retailer" },
  { value: "distributor", label: "Importer / distributor" },
  { value: "government", label: "Government / institution" },
  { value: "export-house", label: "Export house" },
  { value: "other", label: "Other" },
] as const;

export const ENQUIRY_TYPES = [
  { value: "rfq", label: "Request for quotation" },
  { value: "distributor", label: "Distributor enquiry" },
  { value: "contact", label: "General enquiry" },
] as const;

/** ISO 3166-1 alpha-2 codes; names come from Intl.DisplayNames so the list stays short. */
const CODES =
  "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(
    " ",
  );

let cached: { code: string; name: string }[] | null = null;

export function countries() {
  if (cached) return cached;
  const dn = new Intl.DisplayNames(["en"], { type: "region" });
  cached = CODES.map((code) => ({ code, name: dn.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name));
  return cached;
}

export function countryName(code: string | null | undefined) {
  if (!code) return "";
  return countries().find((c) => c.code === code)?.name ?? code;
}

export const COUNTRY_CODES = new Set(CODES);
