import { useState } from "react";
import { useSharePointFiles } from "../hooks/useSharePointFiles";

interface SharePointGalleryProps {
  siteId: string;
  path?: string;
  columns?: number;
  className?: string;
}

export function SharePointGallery({ siteId, path, columns = 3, className }: SharePointGalleryProps) {
  const { files, loading, error, refetch } = useSharePointFiles(siteId, path);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const images = files.filter(
    (f) => f.file?.mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)
  );

  if (loading) {
    return (
      <div className={className} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "0.75rem" }} aria-label="Loading gallery">
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <div key={i} style={{ aspectRatio: "1", backgroundColor: "var(--ew-surface, #f9fafb)", borderRadius: "0.5rem" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} style={{ color: "#ef4444", padding: "1rem" }}>
        <p>Failed to load gallery: {error.message}</p>
        <button type="button" onClick={refetch}>Retry</button>
      </div>
    );
  }

  if (images.length === 0) {
    return <div className={className} style={{ color: "var(--ew-text, #374151)", padding: "1rem", textAlign: "center" }}>No images found.</div>;
  }

  return (
    <>
      <div className={className} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "0.75rem" }} role="list" aria-label="SharePoint image gallery">
        {images.map((img) => {
          const url = img["@microsoft.graph.downloadUrl"] ?? img.webUrl ?? "";
          return (
            <button key={img.id} type="button" role="listitem" onClick={() => setLightboxUrl(url)} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "0.5rem", border: "none", padding: 0, cursor: "pointer", background: "var(--ew-surface, #f9fafb)" }} title={img.name}>
              <img src={url} alt={img.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          );
        })}
      </div>
      {lightboxUrl && (
        <div role="dialog" aria-label="Image lightbox" onClick={() => setLightboxUrl(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out" }}>
          <img src={lightboxUrl} alt="Full size" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "0.5rem" }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
