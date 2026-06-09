import { useMemo } from "react";
import { useMsal, useAccount } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { createGraphClient } from "../graph/client";
import type { Client } from "@microsoft/microsoft-graph-client";

export interface UseGraphClientReturn {
  client: Client | null;
  isReady: boolean;
  error: Error | null;
}

export function useGraphClient(): UseGraphClientReturn {
  const { instance, accounts, inProgress } = useMsal();
  const account = useAccount(accounts[0] ?? {});

  const client = useMemo(() => {
    if (!account || inProgress !== InteractionStatus.None) {
      return null;
    }
    try {
      return createGraphClient(instance, account);
    } catch {
      return null;
    }
  }, [instance, account, inProgress]);

  const isReady = client !== null;

  return { client, isReady, error: null };
}
