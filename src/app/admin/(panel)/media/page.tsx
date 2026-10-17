import type { Metadata } from "next";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { AdminHeader } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { MediaLibrary } from "@/components/admin/media-library";
import type { MediaAsset } from "../../_actions/media";

export const metadata: Metadata = { title: "Media library" };

export default async function MediaPage() {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("id, path, file_name, alt_text, mime_type, file_size, width, height, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  return (
    <>
      <AdminHeader title="Media library" description="Images for page content. Upload here or straight from the page editor; give each a short description for accessibility and search." />
      {error && <p className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error.message}</p>}
      <MediaLibrary assets={(data ?? []) as MediaAsset[]} />
    </>
  );
}
