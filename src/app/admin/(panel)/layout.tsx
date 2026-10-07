import { AdminSidebar, type NavItem } from "@/components/admin/sidebar";
import { ROLE_LABEL, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { signOut } from "../_actions/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  let newCount = 0;
  if (hasRole(staff, ["admin", "sales"])) {
    const supabase = await createSessionClient();
    const { count } = await supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new");
    newCount = count ?? 0;
  }

  const items: (NavItem & { roles?: string[] })[] = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/enquiries", label: "Enquiries", badge: newCount, roles: ["admin", "sales"] },
    { href: "/admin/products", label: "Products", roles: ["admin", "editor"] },
    { href: "/admin/categories", label: "Categories & specs", roles: ["admin", "editor"] },
    { href: "/admin/applications", label: "Applications", roles: ["admin", "editor"] },
    { href: "/admin/resources", label: "Resources", roles: ["admin", "editor"] },
    { href: "/admin/faqs", label: "FAQs", roles: ["admin", "editor"] },
    { href: "/admin/settings", label: "Settings", roles: ["admin"] },
    { href: "/admin/users", label: "Users", roles: ["admin"] },
    { href: "/admin/account", label: "My account" },
  ];

  return (
    <div className="lg:flex">
      <AdminSidebar
        items={items.filter((i) => !i.roles || i.roles.includes(staff.role))}
        user={{ email: staff.email, role: ROLE_LABEL[staff.role] }}
        signOut={signOut}
      />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </div>
    </div>
  );
}
