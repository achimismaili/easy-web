import { useSharePointList } from "../hooks/useSharePointList";

interface SharePointListViewProps {
  siteId: string;
  listId: string;
  columns?: string[];
  className?: string;
}

export function SharePointListView({ siteId, listId, columns, className }: SharePointListViewProps) {
  const { items, loading, error, refetch } = useSharePointList(siteId, listId);

  if (loading) return <p style={{ color: "var(--ew-text, #374151)" }}>Loading list…</p>;
  if (error) return <div><p style={{ color: "#ef4444" }}>Error: {error.message}</p><button type="button" onClick={refetch}>Retry</button></div>;
  if (items.length === 0) return <p>No items found.</p>;

  const cols = columns?.length
    ? columns
    : Object.keys(items[0]?.fields ?? {}).filter((k) => !k.startsWith("_") && k !== "id" && k !== "@odata.etag").slice(0, 8);

  const cellStyle = { padding: "0.625rem 0.75rem", color: "var(--ew-text, #374151)", maxWidth: "20rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const };

  return (
    <div className={className} style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col} style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid var(--ew-border, #e5e7eb)", color: "var(--ew-text, #374151)", fontWeight: 600 }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid var(--ew-border, #e5e7eb)" }}>
              {cols.map((col) => (
                <td key={col} style={cellStyle}>{String(item.fields?.[col] ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
