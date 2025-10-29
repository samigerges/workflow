import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const useReportsDataMock = vi.fn();
vi.mock("@/hooks/useReportsData", () => ({
  useReportsData: (...args: unknown[]) => useReportsDataMock(...args),
}));

const toastSpy = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock("@/components/layout/main-layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

const exportReportsMock = vi.fn();
const triggerFileDownloadMock = vi.fn();
vi.mock("@/lib/exports", () => ({
  exportReports: (...args: unknown[]) => exportReportsMock(...args),
  triggerFileDownload: (...args: unknown[]) => triggerFileDownloadMock(...args),
}));

import Reports from "../operations";

describe("Reports export", () => {
  const baseData = {
    displayTotals: {
      totalSuppliers: 2,
      totalVessels: 1,
      totalContracts: 1,
      totalContracted: 100,
      arrivedQuantity: 40,
      remainingQuantity: 60,
    },
    availableSuppliers: [],
    vesselsWithContractInfo: [
      {
        id: "v1",
        vesselName: "Test Vessel",
        supplierName: "Supplier A",
        contractPublicId: "C-001",
        contractReportId: "contract-1",
        contractQuantity: 100,
        cargoType: "Wheat",
        countryOfOrigin: "Egypt",
        quantity: 100,
        dischargedQuantity: 40,
        portOfDischarge: "Port",
        eta: "2024-01-01",
        status: "pending",
      },
    ],
    vessels: [
      {
        id: "v1",
        vesselName: "Test Vessel",
        contractId: "contract-1",
      },
    ],
    contracts: [
      {
        id: "contract-1",
        publicId: "C-001",
        supplierName: "Supplier A",
        quantity: 100,
        cargoType: "Wheat",
        countryOfOrigin: "Egypt",
        status: "Active",
        createdAt: "2024-01-01",
      },
    ],
    requests: [
      {
        id: "request-1",
        publicId: "R-001",
        supplierName: "Supplier A",
        quantity: 100,
        cargoType: "Wheat",
        countryOfOrigin: "Egypt",
        status: "Open",
        createdAt: "2024-01-01",
      },
    ],
    suppliersData: [
      {
        supplier: "Supplier A",
        vessels: 1,
        contracts: 1,
        quantity: 100,
      },
    ],
    quantityMetrics: {
      totalContracted: 100,
      arrivedQuantity: 40,
      remainingQuantity: 60,
    },
    selectedSupplierData: null,
    selectedSupplierLabel: null,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    useReportsDataMock.mockReturnValue(baseData);
    exportReportsMock.mockReset();
    triggerFileDownloadMock.mockReset();
    toastSpy.mockReset();
  });

  it("starts a download and shows a success toast when export succeeds", async () => {
    const blob = new Blob(["test"], { type: "text/csv" });
    exportReportsMock.mockResolvedValue({ blob, filename: "reports.csv", mimeType: "text/csv" });

    render(<Reports />);

    const exportButton = await screen.findByRole("button", { name: /export/i });
    await userEvent.click(exportButton);

    await waitFor(() => {
      expect(exportReportsMock).toHaveBeenCalledTimes(1);
      expect(triggerFileDownloadMock).toHaveBeenCalledWith({
        blob,
        filename: "reports.csv",
        mimeType: "text/csv",
      });
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Export ready",
        }),
      );
    });
  });

  it("shows an error toast when export fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    exportReportsMock.mockRejectedValue(new Error("boom"));

    render(<Reports />);

    const exportButton = await screen.findByRole("button", { name: /export/i });
    await userEvent.click(exportButton);

    await waitFor(() => {
      expect(triggerFileDownloadMock).not.toHaveBeenCalled();
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Export failed",
          variant: "destructive",
        }),
      );
    });

    errorSpy.mockRestore();
  });
});
