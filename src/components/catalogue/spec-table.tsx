import { formatSpec } from "@/lib/data/catalogue";
import type { ProductModel, SpecAttribute } from "@/lib/types";
import { TrackedLink } from "@/components/site/tracked";

/**
 * Full technical table (blueprint §4.3): one table per configuration group,
 * models as rows, attributes as columns. The model column is sticky so the table
 * stays readable when it scrolls horizontally on small screens.
 */
export function SpecTables({
  productName,
  productSlug,
  categorySlug,
  attributes,
  models,
}: {
  productName: string;
  productSlug: string;
  categorySlug: string;
  attributes: SpecAttribute[];
  models: ProductModel[];
}) {
  const used = attributes.filter((a) => models.some((m) => m.specs[a.key]));
  // Attributes whose value is identical across every model are shown once, above the table.
  const constant = used.filter((a) => {
    const vals = models.map((m) => formatSpec(m.specs[a.key], a.unit));
    return models.length > 1 && vals.every((v) => v === vals[0]);
  });
  const varying = used.filter((a) => !constant.includes(a));

  const groups = new Map<string, ProductModel[]>();
  for (const m of models) {
    const g = m.group_label ?? "Models";
    groups.set(g, [...(groups.get(g) ?? []), m]);
  }

  return (
    // min-w-0 on grid items: lets wide tables scroll inside their frame instead of widening the page.
    <div className="grid min-w-0 gap-10 [&>*]:min-w-0">
      {constant.length > 0 && (
        <dl className="flex flex-wrap gap-x-12 gap-y-4">
          {constant.map((a) => (
            <div key={a.key}>
              <dt className="font-mono text-[0.875rem] font-medium uppercase leading-snug text-accent">{a.label}</dt>
              <dd className="mt-1 text-[1.125rem] font-medium">{formatSpec(models[0].specs[a.key], a.unit)}</dd>
            </div>
          ))}
        </dl>
      )}
      {[...groups.entries()].map(([group, rows]) => (
        <div key={group} className="print-break-avoid">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h3 className="h3">{group}</h3>
            <p className="font-mono text-[0.875rem] font-medium uppercase text-muted">
              {rows.length} model{rows.length === 1 ? "" : "s"}
              <span className="ml-2 hidden sm:inline md:hidden">· scroll →</span>
            </p>
          </div>
          <div
            className="scroll-shadow overflow-x-auto [contain:paint] border-y border-line"
            data-grid-draw="cells rows:tr"
            role="region"
            aria-label={`${productName} — ${group} specifications`}
            tabIndex={0}
          >
            <table className="w-full min-w-max border-collapse text-[1rem]">
              <caption className="sr-only">
                {productName}, {group.toLowerCase()} — technical specification by model
              </caption>
              <thead>
                <tr className="border-b border-line text-left align-bottom">
                  <th scope="col" className="sticky left-0 z-10 bg-paper py-4 pl-0 pr-5 font-mono text-[0.875rem] font-medium uppercase text-accent">
                    Model
                  </th>
                  {varying.map((a) => (
                    <th key={a.key} scope="col" className="px-5 py-4 font-medium">
                      <span className="block whitespace-nowrap font-mono text-[0.875rem] uppercase text-accent">{a.label}</span>
                      {a.unit && <span className="mt-0.5 block font-mono text-[0.75rem] font-normal text-muted">{a.unit}</span>}
                    </th>
                  ))}
                  <th scope="col" className="no-print px-5 py-4">
                    <span className="sr-only">Quote</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} id={`model-${m.model_code}`} className="group border-b border-line transition-colors last:border-0 target:bg-accent-soft hover:bg-stone">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-paper py-4 pl-0 pr-5 text-left font-mono font-medium tracking-tight transition-colors group-hover:bg-stone group-target:bg-accent-soft"
                    >
                      {m.model_code}
                    </th>
                    {varying.map((a) => (
                      <td key={a.key} className="whitespace-nowrap px-5 py-4 font-medium tabular-nums">
                        {formatSpec(m.specs[a.key], null)}
                      </td>
                    ))}
                    <td className="no-print px-5 py-3 text-right">
                      <TrackedLink
                        href={`/request-a-quote?product=${productSlug}&category=${categorySlug}&model=${encodeURIComponent(m.model_code)}`}
                        event="quote_start"
                        params={{ location: "spec_table", product: productSlug, model: m.model_code }}
                        className="u-link whitespace-nowrap font-mono text-[0.875rem] font-medium uppercase text-accent transition-colors hover:text-accent-strong"
                        aria-label={`Request a quote for model ${m.model_code}`}
                      >
                        Quote →
                      </TrackedLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
