export const demoUser = {
  id: 1,
  email: "demo@example.com",
  name: "Demo User",
  role: "admin",
};

export const needs = [
  {
    id: 1,
    title: "Demo Need",
    description: "Example need",
    status: "active",
    fulfillmentStartDate: "2024-01-01T00:00:00.000Z",
    fulfillmentEndDate: "2024-02-01T00:00:00.000Z",
  },
];

export const requests = [
  { 
    id: 1, 
    needId: 1, 
    title: "Wheat Import Request", 
    description: "Bulk wheat import for Q1 2025",
    status: "approved",
    quantity: 5000,
    unitOfMeasure: "tons",
    cargoType: "wheat",
    pricePerTon: 250,
    supplierName: "Global Grains Ltd",
    countryOfOrigin: "Russia",
    paymentMethod: "LC",
    shippingMethod: "FOB",
    createdAt: "2024-01-15T08:00:00.000Z"
  },
  { 
    id: 2, 
    needId: 2, 
    title: "Rice Import Request", 
    description: "Premium rice import",
    status: "contracted",
    quantity: 3000,
    unitOfMeasure: "tons",
    cargoType: "rice",
    pricePerTon: 400,
    supplierName: "Eastern Supply Co",
    countryOfOrigin: "Ukraine",
    paymentMethod: "At sight",
    shippingMethod: "CIF",
    createdAt: "2024-02-10T10:30:00.000Z"
  },
  { 
    id: 3, 
    needId: 3, 
    title: "Steel Import Request", 
    description: "Industrial steel materials",
    status: "pending",
    quantity: 2000,
    unitOfMeasure: "tons",
    cargoType: "steel",
    pricePerTon: 800,
    supplierName: "Baltic Steel Works",
    countryOfOrigin: "Bulgaria",
    paymentMethod: "LC",
    shippingMethod: "FOB",
    createdAt: "2024-03-05T14:15:00.000Z"
  }
];

export const contracts = [
  { 
    id: 1, 
    requestId: 1, 
    title: "Wheat Import Contract", 
    description: "Contract for bulk wheat import",
    status: "approved",
    quantity: 5000,
    unitOfMeasure: "tons",
    cargoType: "wheat",
    pricePerTon: 250,
    supplierName: "Global Grains Ltd",
    countryOfOrigin: "Russia",
    paymentMethod: "LC",
    shippingMethod: "FOB",
    incoterms: "FOB",
    contractTerms: "Standard terms and conditions apply",
    startDate: "2024-01-20T00:00:00.000Z",
    endDate: "2024-06-20T00:00:00.000Z",
    createdAt: "2024-01-15T08:00:00.000Z"
  },
  { 
    id: 2, 
    requestId: 2, 
    title: "Rice Import Contract", 
    description: "Premium rice import contract",
    status: "approved",
    quantity: 3000,
    unitOfMeasure: "tons",
    cargoType: "rice",
    pricePerTon: 400,
    supplierName: "Eastern Supply Co",
    countryOfOrigin: "Ukraine",
    paymentMethod: "At sight",
    shippingMethod: "CIF",
    incoterms: "CIF",
    contractTerms: "Quality specifications as per contract",
    startDate: "2024-02-15T00:00:00.000Z",
    endDate: "2024-08-15T00:00:00.000Z",
    createdAt: "2024-02-10T10:30:00.000Z"
  },
  { 
    id: 3, 
    requestId: 3, 
    title: "Steel Import Contract", 
    description: "Industrial steel materials contract",
    status: "under_review",
    quantity: 2000,
    unitOfMeasure: "tons",
    cargoType: "steel",
    pricePerTon: 800,
    supplierName: "Baltic Steel Works",
    countryOfOrigin: "Bulgaria",
    paymentMethod: "LC",
    shippingMethod: "FOB",
    incoterms: "FOB",
    contractTerms: "Industrial grade specifications",
    startDate: "2024-03-10T00:00:00.000Z",
    endDate: "2024-09-10T00:00:00.000Z",
    createdAt: "2024-03-05T14:15:00.000Z"
  }
];

export const lettersOfCredit = [
  { id: 1, number: "LC-001", contractId: 1, status: "issued", amount: 1250000 },
  { id: 2, number: "LC-002", contractId: 2, status: "issued", amount: 1200000 },
  { id: 3, number: "LC-003", contractId: 3, status: "draft", amount: 1600000 }
];

export const vessels = [
  { 
    id: 1, 
    contractId: 1,
    vesselName: "Baltic Star", 
    status: "completed",
    cargoType: "wheat",
    quantity: 2500,
    dischargedQuantity: 2500,
    countryOfOrigin: "Russia",
    portOfDischarge: "Alexandria Port",
    eta: "2024-03-15T00:00:00.000Z",
    insuranceCompany: "Marine Insurance Corp",
    inspectionCompany: "Quality Inspectors Ltd",
    shippingCompany: "Ocean Freight Lines",
    createdAt: "2024-01-20T09:00:00.000Z"
  },
  { 
    id: 2, 
    contractId: 1,
    vesselName: "Grain Master", 
    status: "in_transit",
    cargoType: "wheat",
    quantity: 2500,
    dischargedQuantity: 0,
    countryOfOrigin: "Russia",
    portOfDischarge: "Alexandria Port",
    eta: "2024-04-20T00:00:00.000Z",
    insuranceCompany: "Marine Insurance Corp",
    inspectionCompany: "Quality Inspectors Ltd",
    shippingCompany: "Ocean Freight Lines",
    createdAt: "2024-01-25T11:30:00.000Z"
  },
  { 
    id: 3, 
    contractId: 2,
    vesselName: "Eastern Pride", 
    status: "discharged",
    cargoType: "rice",
    quantity: 3000,
    dischargedQuantity: 2800,
    countryOfOrigin: "Ukraine",
    portOfDischarge: "Damietta Port",
    eta: "2024-03-10T00:00:00.000Z",
    insuranceCompany: "Global Marine Insurance",
    inspectionCompany: "Cargo Survey Services",
    shippingCompany: "Baltic Shipping Co",
    createdAt: "2024-02-15T13:45:00.000Z"
  },
  { 
    id: 4, 
    contractId: 3,
    vesselName: "Steel Carrier", 
    status: "nominated",
    cargoType: "steel",
    quantity: 2000,
    dischargedQuantity: 0,
    countryOfOrigin: "Bulgaria",
    portOfDischarge: "Sokhna Port",
    eta: "2024-05-25T00:00:00.000Z",
    insuranceCompany: "Heavy Cargo Insurance",
    inspectionCompany: "Metal Quality Control",
    shippingCompany: "Industrial Shipping Lines",
    createdAt: "2024-03-10T16:20:00.000Z"
  }
];

export const documents: any[] = [];
export const entityDocuments: Record<string, any[]> = {};
export const documentVotes: Record<number, any[]> = {};
export const requestVotes: Record<number, any[]> = {};
export const contractVotes: Record<number, any[]> = {};

export const vesselLettersOfCredit: Record<number, any[]> = {
  1: [lettersOfCredit[0]],
};

export const vesselLoadingPorts: Record<number, any[]> = {};
export const shipments: any[] = [];
export const finalSettlements: any[] = [];
