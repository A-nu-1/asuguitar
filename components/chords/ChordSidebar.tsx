"use client";

type Section = {
  id: string;
  name: string;
  count: number;
};

type Props = {
  sections: Section[];
};

export default function ChordSidebar({ sections }: Props) {
function jumpTo(id: string) {
  const container = document.getElementById(
    "chord-records-scroll",
  );

  const target = document.getElementById(`chord-${id}`);

  if (!container || !target) return;

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const offset =
    targetRect.top - containerRect.top + container.scrollTop;

  container.scrollTo({
    top: offset - 8,
    behavior: "smooth",
  });
}
  return (
    <aside className="sticky top-4 max-h-[90vh] self-start overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-4 text-lg font-bold text-slate-800">
        Song sections
      </h2>

      <nav className="space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => jumpTo(section.id)}
            className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-3 text-left text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700"
          >
            <span>{section.name}</span>

            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">
              {section.count}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}