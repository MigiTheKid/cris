/** Cabeçalho de página + aviso honesto de "planejado" por milestone. */
export function PagePlaceholder({
  eyebrow,
  title,
  sub,
  milestone,
  items,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  milestone: string;
  items?: string[];
}) {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="page-title">{title}</h1>
          {sub && <p className="page-sub">{sub}</p>}
        </div>
      </div>

      <div className="glass" style={{ borderRadius: 18, padding: 24, maxWidth: 560 }}>
        <div className="eyebrow" style={{ color: "var(--brand-teal)" }}>
          Planejado · {milestone}
        </div>
        {items && items.length > 0 && (
          <ul
            style={{ margin: "14px 0 0", paddingLeft: 18, color: "var(--text-2)", lineHeight: 2 }}
          >
            {items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
