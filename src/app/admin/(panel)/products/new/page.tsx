import type { Metadata } from "next";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { AdminHeader, Card } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { saveProduct } from "../../../_actions/catalogue";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const supabase = await createSessionClient();
  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");
  return (
    <>
      <AdminHeader back={{ href: "/admin/products", label: "Products" }} title="New product" description="Create the product family first; add models, images and links after saving." />
      <Card>
        <ProductForm categories={categories ?? []} action={saveProduct.bind(null, null)} />
      </Card>
    </>
  );
}
