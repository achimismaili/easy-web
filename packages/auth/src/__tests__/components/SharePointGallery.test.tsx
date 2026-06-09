import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SharePointGallery } from "../../components/SharePointGallery";

const mockHook = vi.fn();
vi.mock("../../hooks/useSharePointFiles", () => ({ useSharePointFiles: () => mockHook() }));

describe("SharePointGallery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading skeleton when loading", () => {
    mockHook.mockReturnValue({ files: [], loading: true, error: null, refetch: vi.fn() });
    const { container } = render(<SharePointGallery siteId="s1" />);
    expect(container.querySelector('[aria-label="Loading gallery"]')).toBeTruthy();
  });

  it("shows empty message when no images", () => {
    mockHook.mockReturnValue({ files: [], loading: false, error: null, refetch: vi.fn() });
    render(<SharePointGallery siteId="s1" />);
    expect(screen.getByText("No images found.")).toBeInTheDocument();
  });

  it("renders image items from files list", () => {
    mockHook.mockReturnValue({
      files: [{ id: "1", name: "photo.jpg", file: { mimeType: "image/jpeg" }, "@microsoft.graph.downloadUrl": "https://example.com/photo.jpg" }],
      loading: false, error: null, refetch: vi.fn(),
    });
    render(<SharePointGallery siteId="s1" />);
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
