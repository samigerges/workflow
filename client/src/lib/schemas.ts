import { z } from "zod";

// Schema for creating needs
export const insertNeedSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  requiredQuantity: z.number(),
  unitOfMeasure: z.string(),
  fulfillmentStartDate: z.string(),
  fulfillmentEndDate: z.string(),
  departmentCode: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
});

export type Need = z.infer<typeof insertNeedSchema> & {
  id: number;
  createdAt?: string;
  updatedAt?: string;
};

// Schema for creating requests
export const insertRequestSchema = z.object({
  needId: z.number().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitOfMeasure: z.string().optional(),
  cargoType: z.string().optional(),
  pricePerTon: z.number().optional(),
  supplierName: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  paymentMethod: z.string().optional(),
  shippingMethod: z.string().optional(),
  letterOfGuarantee: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
  uploadedFile: z.string().optional(),
  createdBy: z.string().optional(),
});

// Schema for creating vessels
export const insertVesselSchema = z.object({
  contractId: z.number().optional(),
  vesselName: z.string().optional(),
  cargoType: z.string().optional(),
  quantity: z.number().optional(),
  countryOfOrigin: z.string().optional(),
  portOfDischarge: z.string().optional(),
  eta: z.string().optional(),
  insuranceCompany: z.string().optional(),
  inspectionCompany: z.string().optional(),
  shippingCompany: z.string().optional(),
  insuranceCost: z.string().optional(),
  inspectionCost: z.string().optional(),
  shippingCost: z.string().optional(),
  shippingInstructions: z.string().optional(),
  status: z.string().optional(),
});

// Schema for tracking shipments
export const insertShipmentSchema = z.object({
  vesselId: z.number(),
  loadingDate: z.string().optional(),
  billOfLadingNumber: z.string().optional(),
  norDate: z.string().optional(),
  actualArrivalTime: z.string().optional(),
  dischargeStartDate: z.string().optional(),
  dischargeEndDate: z.string().optional(),
  quantityUnloaded: z.number().optional(),
  status: z.string().optional(),
});

// Schema for final settlements
export const insertFinalSettlementSchema = z.object({
  requestId: z.number(),
  settlementDate: z.string(),
  finalInvoiceAmount: z.string().optional(),
  goodsCost: z.string().optional(),
  shippingCost: z.string().optional(),
  insurance: z.string().optional(),
  portCharges: z.string().optional(),
  customsDuties: z.string().optional(),
  otherFees: z.string().optional(),
  settlementNotes: z.string().optional(),
  status: z.string().optional(),
});
