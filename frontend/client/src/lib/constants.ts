export const WORKFLOW_STEPS = [
  {
    id: 'statement_of_needs',
    title: 'Statement of Needs',
    description: 'Initial request',
    icon: 'file-text',
    order: 1
  },
  {
    id: 'contract_request',
    title: 'Contract Request',
    description: 'Review & approval',
    icon: 'file-contract',
    order: 2
  },
  {
    id: 'contract_drafting',
    title: 'Contract Drafting',
    description: 'Document creation',
    icon: 'edit',
    order: 3
  },
  {
    id: 'letter_of_credit',
    title: 'Letter of Credit',
    description: 'Financial setup',
    icon: 'university',
    order: 4
  },
  {
    id: 'vessel_nomination',
    title: 'Vessel Nomination',
    description: 'Ship assignment',
    icon: 'ship',
    order: 5
  },
  {
    id: 'shipping_instructions',
    title: 'Shipping Instructions',
    description: 'Loading guidelines',
    icon: 'clipboard-list',
    order: 6
  },
  {
    id: 'ship_loading',
    title: 'Ship Loading',
    description: 'Cargo loading',
    icon: 'package',
    order: 7
  },
  {
    id: 'notice_of_readiness',
    title: 'Notice of Readiness',
    description: 'Arrival notification',
    icon: 'bell',
    order: 8
  },
  {
    id: 'discharge',
    title: 'Discharge',
    description: 'Cargo unloading',
    icon: 'download',
    order: 9
  },
  {
    id: 'final_settlement',
    title: 'Final Settlement',
    description: 'Payment completion',
    icon: 'dollar-sign',
    order: 10
  }
];

export const REQUEST_STATUSES = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  contracted: { label: 'Contracted', color: 'bg-blue-100 text-blue-800' },
  applied: { label: 'Applied', color: 'bg-indigo-100 text-indigo-800' },
  in_progress: { label: 'In Progress', color: 'bg-cyan-100 text-cyan-800' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800' }
};

export const CONTRACT_STATUSES = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' }
};

export const LC_STATUSES = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  issued: { label: 'Issued', color: 'bg-green-100 text-green-800' },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
};

export const VESSEL_STATUSES = {
  nominated: { label: 'Nominated', color: 'bg-blue-100 text-blue-800' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  in_transit: { label: 'In Transit', color: 'bg-orange-100 text-orange-800' },
  arrived: { label: 'Arrived', color: 'bg-purple-100 text-purple-800' },
  discharged: { label: 'Discharged', color: 'bg-gray-100 text-gray-800' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800' }
};

export const CARGO_TYPES = [
  { value: "wheat", label: "Wheat" },
  { value: "oil", label: "Oil" },
  { value: "rice", label: "Rice" },
  { value: "sugar", label: "Sugar" },
  { value: "steel", label: "Steel" },
  { value: "corn", label: "Corn" },
  { value: "soybeans", label: "Soybeans" },
  { value: "cotton", label: "Cotton" },
  { value: "fertilizer", label: "Fertilizer" },
  { value: "machinery", label: "Machinery" },
  { value: "textiles", label: "Textiles" },
  { value: "chemicals", label: "Chemicals" },
  { value: "other", label: "Other" }
];

export const SHIPMENT_STATUSES = {
  loading: { label: 'Loading', color: 'bg-blue-100 text-blue-800' },
  loaded: { label: 'Loaded', color: 'bg-green-100 text-green-800' },
  in_transit: { label: 'In Transit', color: 'bg-orange-100 text-orange-800' },
  nor_issued: { label: 'NOR Issued', color: 'bg-purple-100 text-purple-800' },
  discharging: { label: 'Discharging', color: 'bg-yellow-100 text-yellow-800' },
  discharged: { label: 'Discharged', color: 'bg-gray-100 text-gray-800' }
};

export const SETTLEMENT_STATUSES = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' }
};


export const UNITS_OF_MEASURE = [
  'Tons',
  'Pieces',
  'Containers',
  'Pallets',
  'Kilograms',
  'Liters',
  'Cubic Meters',
  'Square Meters'
];

export const CURRENCIES = [
  'USD',
  'EUR',
  'SAR',
  'GBP',
  'JPY',
  'CNY'
];

export const PORTS = [
  'Alexandria Port',
  'Port Said Port',
  'Damietta Port',
  'Safaga Port',
  'Sokhna Port',
  'Dekheila Port',
  'Adabiya Port',
  'Nuweiba Port'
];

export const COUNTRIES = [
  'Russia',
  'Bulgaria',
  'Ukraine'
];
