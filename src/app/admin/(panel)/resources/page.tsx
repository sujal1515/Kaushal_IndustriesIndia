import Link from "next/link";
import type { Metadata } from "next";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { formatBytes, formatDate } from "@/lib/utils";
import { AdminHeader, Pill, Table, adminButton } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesAdminPage() {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const supabase = await createSessionClient();
  const { data } = await supabase.from("resources").select("*, product_resources(count)").order("type").order("sort_order");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <AdminHeader
        title="Resources"
        description="Brochures, data sheets, manuals, maintenance guides, certificates and awards. Expired certificates are hidden from the site automatically."
        actions={
          <Link href="/admin/resources/new" className={adminButton("primary")}>
            + Upload resource
          </Link>
        }
      />
      <Table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Linked products</th>
            <th>Validity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((r) => {
            const expired = r.valid_to && r.valid_to < today;
            return (
              <tr key={r.id} className="hover:bg-paper">
                <td>
                  <Link href={`/admin/resources/${r.id}`} className="font-medium hover:underline">
                    {r.title}
                  </Link>
                  <span className="block text-xs text-muted">
                    {r.issuer ?? ""} {formatBytes(r.file_size) ? `· ${formatBytes(r.file_size)}` : ""}
                  </span>
                </td>
                <td className="capitalize">{r.type.replace("_", " ")}</td>
                <td className="tabular-nums">{(r.product_resources as unknown as { count: number }[])[0]?.count ?? 0}</td>
                <td className="whitespace-nowrap text-muted">{r.valid_to ? `until ${formatDate(r.valid_to)}` : "—"}</td>
                <td>
                  {expired ? <Pill tone="danger">expired</Pill> : r.is_published ? <Pill tone="accent">published</Pill> : <Pill>hidden</Pill>}
                </td>
              </tr>
            );
          })}
          {!data?.length && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-muted">
                No resources yet.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}
