import { useState } from "react";
import { useSharePointFiles } from "../hooks/useSharePointFiles";
import type { SpDriveItem } from "../graph/sharepoint";

type SortKey = "name" | "size" | "modified";
type SortDir = "asc" | "desc";

interface SharePointFileListProps {
  siteId: string;
  path?: string;
  className?: string;
}

function formatSize(b?: number): string {
  if (b === undefined) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

export function SharePointFileList({ siteId, path, className }: SharePointFileListProps) {
  const { files, loading, error, refetch } = useSharePointFiles(siteId, path);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...files].sort((a: SpDriveItem, b: SpDriveItem) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "size") cmp = (a.size ?? 0) - (b.size ?? 0);
    else cmp = new Date(a.lastModifiedDateTime ?? 0).getTime() - new Date(b.lastModifiedDateTime ?? 0).getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (loading) return <p style={{ color: "var(--ew-text, #374151)" }}>Loading files…</p>;
  if (error) return <div><p style={{ color: "#ef4444" }}>Error: {error.message}</p><button type="button" onClick={refetch}>Retry</button></div>;
  if (files.length === 0) return <p>No files found.</p>;

  const thStyle = { padding: "0.75rem", textAlign: "left" as const, cursor: "pointer", borderBottom: "2px solid var(--ew-border, #e5e7eb)", color: "var(--ew-text, #374151)", fontWeight: 600 as const };

  return (
    <div className={className} style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr>
            {(["name", "modified", "size"] as SortKey[]).map((k) => (
              <th key={k} onClick={() => handleSort(k)} style={thStyle}>{k.charAt(0).toUpperCase() + k.slice(1)} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            ))}
            <th style={{ ...thStyle, cursor: "default" }}>Download</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((file) => (
            <tr key={file.id} style={{ borderBottom: "1px solid var(--ew-border, #e5e7eb)" }}>
              <td style={{ padding: "0.625rem 0.75rem" }}>{file.name}</td>
              <td style={{ padding: "0.625rem 0.75rem" }}>{formatDate(file.lastModifiedDateTime)}</td>
              <td style={{ padding: "0.625rem 0.75rem" }}>{formatSize(file.size)}</td>
              <td style={{ padding: "0.625rem 0.75rem" }}>
                {file["@microsoft.graph.downloadUrl"]
                  ? <a href={file["@microsoft.graph.downloadUrl"]} download={file.name} style={{ color: "var(--ew-primary, #6366f1)" }}>Download</a>
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
