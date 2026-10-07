// Domain types shared by the public site, the admin and the data layer.
// They mirror the Postgres schema in supabase/migrations (blueprint §7.2).

export type PublishStatus = "draft" | "published" | "coming_soon" | "discontinued";
export type EnquiryType = "rfq" | "contact" | "distributor";
export type EnquiryStatus = "new" | "contacted" | "quoted" | "won" | "lost" | "spam";
export type ResourceType =
  | "brochure"
  | "datasheet"
  | "certificate"
  | "award"
  | "manual"
  | "maintenance_guide"
  | "other";
export type AdminRole = "admin" | "editor" | "sales";
export type AttrDataType = "number" | "text" | "range";

export interface LabelValue {
  label: string;
  value: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  status: PublishStatus;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
}

export interface SpecAttribute {
  id: string;
  category_id: string;
  key: string;
  label: string;
  unit: string | null;
  data_type: AttrDataType;
  group_label: string | null;
  is_key_spec: boolean;
  is_filterable: boolean;
  sort_order: number;
}

export interface SpecValue {
  text: string | null;
  num: number | null;
}

export interface ProductModel {
  id: string;
  product_id: string;
  model_code: string;
  name: string | null;
  status: PublishStatus;
  sort_order: number;
  group_label: string | null;
  /** keyed by SpecAttribute.key */
  specs: Record<string, SpecValue>;
}

export interface ProductImage {
  id: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
}

export interface Application {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  body_md: string | null;
  image_path: string | null;
  sort_order: number;
  status: PublishStatus;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  description: string | null;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  language: string;
  is_published: boolean;
  valid_from: string | null;
  valid_to: string | null;
  issuer: string | null;
  certificate_number: string | null;
  sort_order: number;
  updated_at: string;
}

export interface Faq {
  id: string;
  question: string;
  answer_md: string;
  category_id: string | null;
  product_id: string | null;
  sort_order: number;
  is_published: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  summary: string | null;
  description_md: string | null;
  status: PublishStatus;
  is_featured: boolean;
  sort_order: number;
  /** Product-level filter facets, e.g. { "Cooling": "Air cooled" } */
  facets: Record<string, string>;
  /** Product-level key specifications shown when there is no model table */
  highlights: LabelValue[];
  descriptive_specs: LabelValue[];
  standard_equipment: string[];
  optional_extras: string[];
  notes: string[];
  seo_title: string | null;
  seo_description: string | null;
  legacy_path: string | null;
  updated_at: string;
}

/** Lightweight shape for cards and listings */
export interface ProductSummary extends Product {
  category_slug: string;
  category_name: string;
  primary_image: ProductImage | null;
  model_count: number;
  key_specs: LabelValue[];
}

export interface ProductDetail extends ProductSummary {
  category: Category;
  attributes: SpecAttribute[];
  models: ProductModel[];
  images: ProductImage[];
  resources: Resource[];
  applications: Application[];
  related: ProductSummary[];
  faqs: Faq[];
}

export interface SiteSettings {
  notification_emails: string[];
  phones: string[];
  whatsapp: string;
  email: string;
  address_lines: string[];
}

export interface Enquiry {
  id: string;
  type: EnquiryType;
  status: EnquiryStatus;
  product_id: string | null;
  model_id: string | null;
  product_name_snapshot: string | null;
  model_code_snapshot: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  application_id: string | null;
  application_other: string | null;
  destination_country: string | null;
  destination_city_port: string | null;
  timeline: string | null;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  buyer_country: string | null;
  buyer_type: string | null;
  message: string | null;
  consent: boolean;
  source_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  notify_sent_at: string | null;
  notify_error: string | null;
  ack_sent_at: string | null;
  ack_error: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}
