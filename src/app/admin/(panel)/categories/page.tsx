import Link from "next/link";
import type { Metadata } from "next";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { statusLabel } from "@/lib/utils";
import { AdminHeader, Card, Pill, Table, statusTone } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { saveCategory } from "../../_actions/catalogue";
import { CategoryForm } from "./category-form";

export const metadata: Metadata = { title: "Categories & specs" };

export default async function CategoriesPage() {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const supabase = await createSessionClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, status, sort_order, products(count), spec_attributes(count)")
    .order("sort_order");

  return (
    <>
      <AdminHeader title="Categories & specs" description="Categories, their order on the site, and the spec attributes each category's products use." />
      <Table>
        <thead>
          <tr>
            <th>#</th>
            <th>Category</th>
            <th>Products</th>
            <th>Spec attributes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(categories ?? []).map((c) => (
            <tr key={c.id} className="hover:bg-paper">
              <td className="text-muted">{c.sort_order}</td>
              <td>
                <Link href={`/admin/categories/${c.id}`} className="font-medium hover:underline">
                  {c.name}
                </Link>
                <span className="block font-mono text-xs text-muted">/products/{c.slug}</span>
              </td>
              <td className="tabular-nums">{(c.products as unknown as { count: number }[])[0]?.count ?? 0}</td>
              <td className="tabular-nums">{(c.spec_attributes as unknown as { count: number }[])[0]?.count ?? 0}</td>
              <td>
                <Pill tone={statusTone(c.status)}>{statusLabel[c.status]}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Card title="New category" className="mt-8">
        <CategoryForm action={saveCategory.bind(null, null)} />
      </Card>
    </>
  );
}
