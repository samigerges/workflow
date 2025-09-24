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
  description: z
    .string({ required_error: "Description is required" })
    .min(1, "Description is required")
    .max(4000, "Description must be 4000 characters or less"),
  quantity: z
    .number({ invalid_type_error: "Quantity is required" })
    .superRefine((val, ctx) => {
      if (!Number.isFinite(val)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity is required" });
        return;
      }
      if (val <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity must be greater than 0" });
      }
    }),
  unitOfMeasure: z
    .string({ required_error: "Unit of measure is required" })
    .min(1, "Unit of measure is required")
    .max(50, "Unit of measure must be 50 characters or less"),
  cargoType: z
    .string({ required_error: "Cargo type is required" })
    .min(1, "Cargo type is required")
    .max(100, "Cargo type must be 100 characters or less"),
  pricePerTon: z
    .number({ invalid_type_error: "Price per unit is required" })
    .superRefine((val, ctx) => {
      if (!Number.isFinite(val)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Price per unit is required" });
        return;
      }
      if (val <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Price per unit must be greater than 0" });
      }
    }),
  supplierName: z
    .string({ required_error: "Supplier name is required" })
    .min(1, "Supplier name is required")
    .max(200, "Supplier name must be 200 characters or less"),
  countryOfOrigin: z
    .string({ required_error: "Country of origin is required" })
    .min(1, "Country of origin is required")
    .max(100, "Country of origin must be 100 characters or less"),
  paymentCurrency: z
    .string({ required_error: "Payment currency is required" })
    .min(1, "Payment currency is required")
    .max(3, "Payment currency must be 3 characters"),
  paymentMethod: z
    .string({ required_error: "Payment method is required" })
    .min(1, "Payment method is required")
    .max(100, "Payment method must be 100 characters or less"),
  shippingMethod: z
    .string({ required_error: "Shipping method is required" })
    .min(1, "Shipping method is required")
    .max(100, "Shipping method must be 100 characters or less"),
  letterOfGuarantee: z
    .string({ required_error: "Letter of guarantee is required" })
    .min(1, "Letter of guarantee is required")
    .max(4000, "Letter of guarantee must be 4000 characters or less"),
  startDate: z
    .string({ required_error: "Start date is required" })
    .min(1, "Start date is required")
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: "Invalid date",
    }),
  endDate: z
    .string({ required_error: "End date is required" })
    .min(1, "End date is required")
    .refine((val) => !Number.isNaN(Date.parse(val)), {
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
  fileName: z.string().nullish(),
  fileUrl: z.string().nullish(),
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
