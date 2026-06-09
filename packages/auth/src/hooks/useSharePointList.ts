import { useState, useEffect, useCallback } from "react";
import { useGraphClient } from "./useGraphClient";
import { getListItems, type SpListItem } from "../graph/sharepoint";

export interface UseSharePointListReturn {
  items: SpListItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSharePointList(
  siteId: string,
  listId: string
): UseSharePointListReturn {
  const { client, isReady } = useGraphClient();
  const [items, setItems] = useState<SpListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => setRefetchTrigger((n) => n + 1), []);

  useEffect(() => {
    if (!client || !isReady || !siteId || !listId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getListItems(client, siteId, listId)
      .then((data) => { if (!cancelled) setItems(data); })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client, isReady, siteId, listId, refetchTrigger]);

  return { items, loading, error, refetch };
}
