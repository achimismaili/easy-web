import { useState, useEffect, useCallback } from "react";
import { useGraphClient } from "./useGraphClient";
import { getDocumentLibraryFiles, type SpDriveItem } from "../graph/sharepoint";

export interface UseSharePointFilesReturn {
  files: SpDriveItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSharePointFiles(
  siteId: string,
  path?: string
): UseSharePointFilesReturn {
  const { client, isReady } = useGraphClient();
  const [files, setFiles] = useState<SpDriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => setRefetchTrigger((n) => n + 1), []);

  useEffect(() => {
    if (!client || !isReady || !siteId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDocumentLibraryFiles(client, siteId, undefined, path)
      .then((data) => { if (!cancelled) setFiles(data); })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client, isReady, siteId, path, refetchTrigger]);

  return { files, loading, error, refetch };
}
