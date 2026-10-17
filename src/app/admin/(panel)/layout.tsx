import { AdminSidebar, type NavGroup, type NavItem } from "@/components/admin/sidebar";
import { ROLE_LABEL, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import type { AdminRole } from "@/lib/types";
import { signOut } from "../_actions/auth";

type Item = NavItem & { roles?: AdminRole[] };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  let newCount = 0;
  let dueCount = 0;
  if (hasRole(staff, ["admin", "sales"])) {
    const supabase = await createSessionClient();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const [fresh, due] = await Promise.all([
      supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .lte("follow_up_at", endOfToday.toISOString())
        .not("status", "in", "(won,lost,spam)"),
    ]);
    newCount = fresh.count ?? 0;
    dueCount = due.count ?? 0;
  }

  const groups: { label?: string; items: Item[] }[] = [
    { items: [{ href: "/admin", label: "Dashboard" }] },
    {
      label: "Leads",
      items: [
        { href: "/admin/enquiries", label: "All enquiries", badge: newCount, roles: ["admin", "sales"], exact: true },
        { href: "/admin/enquiries/board", label: "Pipeline", roles: ["admin", "sales"] },
        { href: "/admin/enquiries/follow-ups", label: "Follow-ups", badge: dueCount, roles: ["admin", "sales"] },
      ],
    },
    {
      label: "Content",
      items: [
        { href: "/admin/content", label: "Pages", roles: ["admin", "editor"] },
        { href: "/admin/media", label: "Media library", roles: ["admin", "editor"] },
        { href: "/admin/faqs", label: "FAQs", roles: ["admin", "editor"] },
      ],
    },
    {
      label: "Catalogue",
      items: [
        { href: "/admin/products", label: "Products", roles: ["admin", "editor"] },
        { href: "/admin/categories", label: "Categories & specs", roles: ["admin", "editor"] },
        { href: "/admin/applications", label: "Applications", roles: ["admin", "editor"] },
        { href: "/admin/resources", label: "Resources", roles: ["admin", "editor"] },
      ],
    },
    {
      label: "Administration",
      items: [
        { href: "/admin/settings", label: "Settings", roles: ["admin"] },
        { href: "/admin/users", label: "Users", roles: ["admin"] },
        { href: "/admin/activity", label: "Activity log", roles: ["admin"] },
        { href: "/admin/account", label: "My account" },
      ],
    },
  ];
  const visible: NavGroup[] = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(staff.role)) }))
    .filter((g) => g.items.length);

  return (
    <div className="lg:flex">
      <AdminSidebar groups={visible} user={{ email: staff.email, role: ROLE_LABEL[staff.role] }} signOut={signOut} />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </div>
    </div>
  );
}
