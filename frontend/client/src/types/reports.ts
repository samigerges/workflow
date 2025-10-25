export interface SupplierFilterOption {
  value: string;
  label: string;
}

export interface SupplierFilterValue {
  contractId: string;
  supplierKey: string;
}

export const SUPPLIER_FILTER_SEPARATOR = "::";
