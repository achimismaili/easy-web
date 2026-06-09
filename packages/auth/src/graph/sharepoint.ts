import type { Client } from "@microsoft/microsoft-graph-client";

/** A SharePoint site resource */
export interface SpSite {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

/** A SharePoint list item with dynamically typed fields */
export interface SpListItem {
  id: string;
  fields: Record<string, unknown>;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
}

/** A Drive item (file or folder) */
export interface SpDriveItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
  "@microsoft.graph.downloadUrl"?: string;
  webUrl?: string;
}

/** A thumbnail set */
export interface SpThumbnail {
  id: string;
  small?: { url: string; width: number; height: number };
  medium?: { url: string; width: number; height: number };
  large?: { url: string; width: number; height: number };
}

export async function getSite(
  client: Client,
  hostname: string,
  sitePath: string
): Promise<SpSite> {
  return client.api(`/sites/${hostname}:${sitePath}`).get();
}

export async function getListItems(
  client: Client,
  siteId: string,
  listId: string
): Promise<SpListItem[]> {
  const response = await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .expand("fields")
    .get();
  return response.value ?? [];
}

export async function getDocumentLibraryFiles(
  client: Client,
  siteId: string,
  driveId?: string,
  path?: string
): Promise<SpDriveItem[]> {
  let apiPath: string;
  if (driveId && path) {
    apiPath = `/sites/${siteId}/drives/${driveId}/root:${path}:/children`;
  } else if (driveId) {
    apiPath = `/sites/${siteId}/drives/${driveId}/root/children`;
  } else if (path) {
    apiPath = `/sites/${siteId}/drive/root:${path}:/children`;
  } else {
    apiPath = `/sites/${siteId}/drive/root/children`;
  }
  const response = await client.api(apiPath).get();
  return response.value ?? [];
}

export async function getFileContent(
  client: Client,
  siteId: string,
  itemId: string
): Promise<Blob> {
  return client
    .api(`/sites/${siteId}/drive/items/${itemId}/content`)
    .getStream();
}

export async function getImageThumbnails(
  client: Client,
  siteId: string,
  itemId: string
): Promise<SpThumbnail[]> {
  const response = await client
    .api(`/sites/${siteId}/drive/items/${itemId}/thumbnails`)
    .get();
  return response.value ?? [];
}
