export const demoUser = {
  id: 1,
  email: "demo@example.com",
  name: "Demo User",
  role: "admin",
};

export const needs = [
  { id: 1, title: "Demo Need", description: "Example need", status: "active" },
];

export const requests = [
  { id: 1, needId: 1, title: "Demo Request", status: "pending" },
];

export const contracts = [
  { id: 1, requestId: 1, title: "Demo Contract", status: "draft" },
];

export const lettersOfCredit = [
  { id: 1, number: "LC-001", status: "pending" },
];

export const vessels = [
  { id: 1, vesselName: "Demo Vessel", status: "nominated" },
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
