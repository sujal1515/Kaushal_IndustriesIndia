import type { Metadata } from "next";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { AdminHeader, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { NoAccess } from "@/components/admin/no-access";
import { deleteFaq, saveFaq } from "../../_actions/catalogue";

export const metadata: Metadata = { title: "FAQs" };

type Faq = { id: string; question: string; answer_md: string; category_id: string | null; sort_order: number; is_published: boolean };

function FaqFields({ faq, categories }: { faq?: Faq; categories: { id: string; name: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Field label="Question" className="sm:col-span-4">
        <Input name="question" defaultValue={faq?.question} required />
      </Field>
      <Field label="Answer" className="sm:col-span-4">
        <Textarea name="answer_md" rows={3} defaultValue={faq?.answer_md} required />
      </Field>
      <Field label="Show on category pages" className="sm:col-span-2">
        <Select name="category_id" defaultValue={faq?.category_id ?? ""}>
          <option value="">General (Resources page only)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Sort order">
        <Input name="sort_order" type="number" defaultValue={faq?.sort_order ?? 0} />
      </Field>
      <div className="flex items-end">
        <Checkbox name="is_published" defaultChecked={faq?.is_published ?? true} label="Published" />
      </div>
    </div>
  );
}

export default async function FaqsAdminPage() {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const supabase = await createSessionClient();
  const [{ data: faqs }, { data: categories }] = await Promise.all([
    supabase.from("faqs").select("*").order("sort_order"),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  return (
    <>
      <AdminHeader title="FAQs" description="Shown on the Resources page; category FAQs also appear on that category's product pages." />
      <div className="grid gap-4">
        {(faqs ?? []).map((f) => (
          <Card key={f.id}>
            <ActionForm
              action={saveFaq.bind(null, f.id)}
              submitLabel="Save"
              footer={null}
            >
              <FaqFields faq={f} categories={categories ?? []} />
            </ActionForm>
            <div className="mt-3 border-t border-line pt-3">
              <ActionForm action={deleteFaq.bind(null, f.id)} submitLabel="Delete" variant="danger" confirm="Delete this FAQ?" />
            </div>
          </Card>
        ))}
        <Card title="Add a question">
          <ActionForm action={saveFaq.bind(null, null)} submitLabel="Add FAQ">
            <FaqFields categories={categories ?? []} />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
