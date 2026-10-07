import Link from "next/link";
import type { Metadata } from "next";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { statusLabel } from "@/lib/utils";
import { AdminHeader, Pill, Table, adminButton, statusTone } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsAdminPage() {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const supabase = await createSessionClient();
  const { data } = await supabase.from("applications").select("id, name, slug, status, sort_order, product_applications(count)").order("sort_order");
  return (
    <>
      <AdminHeader
        title="Applications & industries"
        description="Buyer-oriented pages that link products to their uses. Link products from each product's page."
        actions={
          <Link href="/admin/applications/new" className={adminButton("primary")}>
            + New application
          </Link>
        }
      />
      <Table>
        <thead>
          <tr>
            <th>#</th>
            <th>Application</th>
            <th>Products</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((a) => (
            <tr key={a.id} className="hover:bg-paper">
              <td className="text-muted">{a.sort_order}</td>
              <td>
                <Link href={`/admin/applications/${a.id}`} className="font-medium hover:underline">
                  {a.name}
                </Link>
                <span className="block font-mono text-xs text-muted">/applications/{a.slug}</span>
              </td>
              <td className="tabular-nums">{(a.product_applications as unknown as { count: number }[])[0]?.count ?? 0}</td>
              <td>
                <Pill tone={statusTone(a.status)}>{statusLabel[a.status]}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
