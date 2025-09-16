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
  // Optional fields that may be populated from the backend
  actualQuantityReceived: z.number().optional(),
  maxPricePerUnit: z.number().optional(),
});

export type Need = z.infer<typeof insertNeedSchema> & {
  id: string;
  status: string;
  progressPercentage?: number;
  createdAt?: string;
  updatedAt?: string;
};

// Schema for creating requests
export const insertRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z.string().max(4000).optional(),
  quantity: z.number().optional(),
  unitOfMeasure: z.string().max(50).optional(),
  cargoType: z.string().max(100).optional(),
  pricePerTon: z.number().optional(),
  supplierName: z.string().max(200).optional(),
  countryOfOrigin: z.string().max(100).optional(),
  paymentMethod: z.string().max(100).optional(),
  shippingMethod: z.string().max(100).optional(),
  letterOfGuarantee: z.string().max(4000).optional(),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date",
    }),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date",
    }),
  status: z.string().max(50).optional(),
  uploadedFile: z.string().max(255).optional(),
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

// Schema for creating contracts (extending requests with additional fields)
export const insertContractSchema = z.object({
  requestId: z.number().optional(),
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
  incoterms: z.string().optional(),
  contractTerms: z.string().optional(),
  letterOfGuarantee: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reviewNotes: z.string().optional(),
  status: z.string().optional(),
  uploadedFile: z.string().optional(),
  createdBy: z.string().optional(),
});

// Complete type definitions with database fields
export type Request = z.infer<typeof insertRequestSchema> & {
  id: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Contract = z.infer<typeof insertContractSchema> & {
  id: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Vessel = z.infer<typeof insertVesselSchema> & {
  id: number;
  dischargedQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Shipment = z.infer<typeof insertShipmentSchema> & {
  id: number;
  createdAt?: string;
  updatedAt?: string;
};

export type FinalSettlement = z.infer<typeof insertFinalSettlementSchema> & {
  id: number;
  createdAt?: string;
  updatedAt?: string;
};

// Reports specific types
export interface DateRange {
  from: string;
  to: string;
}

export interface SupplierData {
  supplier: string;
  vessels: number;
  quantity: number;
  contracts: number;
}

export interface QuantityMetrics {
  totalContracted: number;
  arrivedQuantity: number;
  remainingQuantity: number;
}

export interface DisplayTotals {
  totalSuppliers: number;
  totalVessels: number;
  totalContracts: number;
  totalContracted: number;
  arrivedQuantity: number;
  remainingQuantity: number;
}

export interface VesselWithContract extends Vessel {
  supplierName: string;
  contractQuantity: number;
}
