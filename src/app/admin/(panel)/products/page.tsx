import Link from "next/link";
import type { Metadata } from "next";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { formatDate, statusLabel } from "@/lib/utils";
import { AdminHeader, Pill, Select, Table, adminButton, statusTone } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  const supabase = await createSessionClient();
  const [{ data: categories }, productsRes] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    (() => {
      let q = supabase
        .from("products")
        .select("id, name, slug, status, updated_at, is_featured, category:categories(name, slug), product_models(count)")
        .order("sort_order");
      if (/^[0-9a-f-]{36}$/i.test(category)) q = q.eq("category_id", category);
      if (["draft", "published", "coming_soon", "discontinued"].includes(status)) q = q.eq("status", status);
      return q;
    })(),
  ]);
  const products = productsRes.data ?? [];

  return (
    <>
      <AdminHeader
        title="Products"
        description="Product families, their models and specifications."
        actions={
          <Link href="/admin/products/new" className={adminButton("primary")}>
            + New product
          </Link>
        }
      />
      {sp.deleted && <p className="mb-4 rounded-lg bg-accent-soft p-3 text-sm text-accent-strong">Product deleted.</p>}
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <Select name="category" defaultValue={category} aria-label="Category" className="!w-auto">
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={status} aria-label="Status" className="!w-auto">
          <option value="">All statuses</option>
          {Object.entries(statusLabel).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <button type="submit" className={adminButton("secondary")}>
          Filter
        </button>
      </form>
      <Table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Models</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const cat = p.category as unknown as { name: string; slug: string } | null;
            const models = (p.product_models as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <tr key={p.id} className="hover:bg-paper">
                <td>
                  <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  {p.is_featured && <span className="ml-2 text-xs text-accent">★ featured</span>}
                  <span className="block font-mono text-xs text-muted">/{cat?.slug}/{p.slug}</span>
                </td>
                <td>{cat?.name}</td>
                <td className="tabular-nums">{models}</td>
                <td>
                  <Pill tone={statusTone(p.status)}>{statusLabel[p.status]}</Pill>
                </td>
                <td className="whitespace-nowrap text-muted">{formatDate(p.updated_at)}</td>
              </tr>
            );
          })}
          {!products.length && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-muted">
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}
