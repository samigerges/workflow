import {
  users,
  requests,
  contracts,
  lettersOfCredit,
  vessels,
  agents,
  inspectionCompanies,
  shipments,
  finalSettlements,
  documents,
  documentVersions,
  approvalWorkflows,
  approvalWorkflowSteps,
  documentApprovals,
  approvalActions,
  documentComments,
  documentAuditLog,
  type User,
  type UpsertUser,
  type Request,
  type InsertRequest,
  type Contract,
  type InsertContract,
  type LetterOfCredit,
  type InsertLetterOfCredit,
  type Vessel,
  type InsertVessel,
  type Agent,
  type InsertAgent,
  type InspectionCompany,
  type InsertInspectionCompany,
  type Shipment,
  type InsertShipment,
  type FinalSettlement,
  type InsertFinalSettlement,
  type Document,
  type InsertDocument,
  type DocumentVersion,
  type InsertDocumentVersion,
  type ApprovalWorkflow,
  type InsertApprovalWorkflow,
  type ApprovalWorkflowStep,
  type InsertApprovalWorkflowStep,
  type DocumentApproval,
  type InsertDocumentApproval,
  type ApprovalAction,
  type InsertApprovalAction,
  type DocumentComment,
  type InsertDocumentComment,
  type DocumentAuditLog,
  type InsertDocumentAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Request operations
  createRequest(request: InsertRequest): Promise<Request>;
  getRequests(filters?: { status?: string; createdBy?: string; limit?: number }): Promise<Request[]>;
  getRequest(id: number): Promise<Request | undefined>;
  updateRequest(id: number, updates: Partial<InsertRequest>): Promise<Request>;
  deleteRequest(id: number): Promise<void>;
  
  // Contract operations
  createContract(contract: InsertContract): Promise<Contract>;
  getContracts(filters?: { status?: string; requestId?: number; limit?: number }): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | undefined>;
  updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract>;
  deleteContract(id: number): Promise<void>;
  
  // Letter of Credit operations
  createLetterOfCredit(lc: InsertLetterOfCredit): Promise<LetterOfCredit>;
  getLettersOfCredit(filters?: { status?: string; requestId?: number; limit?: number }): Promise<LetterOfCredit[]>;
  getLetterOfCredit(id: number): Promise<LetterOfCredit | undefined>;
  updateLetterOfCredit(id: number, updates: Partial<InsertLetterOfCredit>): Promise<LetterOfCredit>;
  deleteLetterOfCredit(id: number): Promise<void>;
  
  // Vessel operations
  createVessel(vessel: InsertVessel): Promise<Vessel>;
  getVessels(filters?: { status?: string; requestId?: number; limit?: number }): Promise<Vessel[]>;
  getVessel(id: number): Promise<Vessel | undefined>;
  updateVessel(id: number, updates: Partial<InsertVessel>): Promise<Vessel>;
  deleteVessel(id: number): Promise<void>;
  
  // Agent operations
  createAgent(agent: InsertAgent): Promise<Agent>;
  getAgentsByVessel(vesselId: number): Promise<Agent[]>;
  updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent>;
  deleteAgent(id: number): Promise<void>;
  
  // Inspection Company operations
  createInspectionCompany(company: InsertInspectionCompany): Promise<InspectionCompany>;
  getInspectionCompaniesByVessel(vesselId: number): Promise<InspectionCompany[]>;
  updateInspectionCompany(id: number, updates: Partial<InsertInspectionCompany>): Promise<InspectionCompany>;
  deleteInspectionCompany(id: number): Promise<void>;
  
  // Shipment operations
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  getShipments(filters?: { status?: string; vesselId?: number; limit?: number }): Promise<Shipment[]>;
  getShipment(id: number): Promise<Shipment | undefined>;
  updateShipment(id: number, updates: Partial<InsertShipment>): Promise<Shipment>;
  deleteShipment(id: number): Promise<void>;
  
  // Final Settlement operations
  createFinalSettlement(settlement: InsertFinalSettlement): Promise<FinalSettlement>;
  getFinalSettlements(filters?: { status?: string; requestId?: number; limit?: number }): Promise<FinalSettlement[]>;
  getFinalSettlement(id: number): Promise<FinalSettlement | undefined>;
  updateFinalSettlement(id: number, updates: Partial<InsertFinalSettlement>): Promise<FinalSettlement>;
  deleteFinalSettlement(id: number): Promise<void>;
  
  // Dashboard/Stats operations
  getDashboardStats(): Promise<{
    activeRequests: number;
    shipsInTransit: number;
    lcValue: number;
    completed: number;
  }>;

  // Document Management operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocuments(filters?: { status?: string; documentType?: string; relatedEntityType?: string; relatedEntityId?: number; limit?: number }): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  updateDocument(id: number, updates: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  // Document Version operations
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  getDocumentVersions(documentId: number): Promise<DocumentVersion[]>;
  getDocumentVersion(id: number): Promise<DocumentVersion | undefined>;
  updateDocumentVersion(id: number, updates: Partial<InsertDocumentVersion>): Promise<DocumentVersion>;

  // Approval Workflow operations
  createApprovalWorkflow(workflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow>;
  getApprovalWorkflows(documentType?: string): Promise<ApprovalWorkflow[]>;
  getApprovalWorkflow(id: number): Promise<ApprovalWorkflow | undefined>;
  updateApprovalWorkflow(id: number, updates: Partial<InsertApprovalWorkflow>): Promise<ApprovalWorkflow>;

  // Approval Workflow Step operations
  createApprovalWorkflowStep(step: InsertApprovalWorkflowStep): Promise<ApprovalWorkflowStep>;
  getApprovalWorkflowSteps(workflowId: number): Promise<ApprovalWorkflowStep[]>;
  updateApprovalWorkflowStep(id: number, updates: Partial<InsertApprovalWorkflowStep>): Promise<ApprovalWorkflowStep>;

  // Document Approval operations
  createDocumentApproval(approval: InsertDocumentApproval): Promise<DocumentApproval>;
  getDocumentApprovals(filters?: { documentId?: number; status?: string; requestedBy?: string }): Promise<DocumentApproval[]>;
  getDocumentApproval(id: number): Promise<DocumentApproval | undefined>;
  updateDocumentApproval(id: number, updates: Partial<InsertDocumentApproval>): Promise<DocumentApproval>;

  // Approval Action operations
  createApprovalAction(action: InsertApprovalAction): Promise<ApprovalAction>;
  getApprovalActions(approvalId: number): Promise<ApprovalAction[]>;

  // Document Comment operations
  createDocumentComment(comment: InsertDocumentComment): Promise<DocumentComment>;
  getDocumentComments(documentId: number, versionId?: number): Promise<DocumentComment[]>;
  updateDocumentComment(id: number, updates: Partial<InsertDocumentComment>): Promise<DocumentComment>;

  // Document Audit Log operations
  createDocumentAuditLog(log: InsertDocumentAuditLog): Promise<DocumentAuditLog>;
  getDocumentAuditLogs(documentId: number): Promise<DocumentAuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Request operations
  async createRequest(request: InsertRequest): Promise<Request> {
    const [created] = await db.insert(requests).values(request).returning();
    return created;
  }

  async getRequests(filters?: { status?: string; createdBy?: string; limit?: number }): Promise<Request[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(requests.status, filters.status));
    }
    if (filters?.createdBy) {
      conditions.push(eq(requests.createdBy, filters.createdBy));
    }
    
    let query = db.select().from(requests);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(requests.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getRequest(id: number): Promise<Request | undefined> {
    const [request] = await db.select().from(requests).where(eq(requests.id, id));
    return request;
  }

  async updateRequest(id: number, updates: Partial<InsertRequest>): Promise<Request> {
    const [updated] = await db
      .update(requests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(requests.id, id))
      .returning();
    return updated;
  }

  async deleteRequest(id: number): Promise<void> {
    await db.delete(requests).where(eq(requests.id, id));
  }

  // Contract operations
  async createContract(contract: InsertContract): Promise<Contract> {
    const [created] = await db.insert(contracts).values(contract).returning();
    return created;
  }

  async getContracts(filters?: { status?: string; requestId?: number; limit?: number }): Promise<Contract[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(contracts.status, filters.status));
    }
    if (filters?.requestId) {
      conditions.push(eq(contracts.requestId, filters.requestId));
    }
    
    let query = db.select().from(contracts);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(contracts.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract> {
    const [updated] = await db
      .update(contracts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updated;
  }

  async deleteContract(id: number): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  // Letter of Credit operations
  async createLetterOfCredit(lc: InsertLetterOfCredit): Promise<LetterOfCredit> {
    const [created] = await db.insert(lettersOfCredit).values(lc).returning();
    return created;
  }

  async getLettersOfCredit(filters?: { status?: string; contractId?: number; limit?: number }): Promise<LetterOfCredit[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(lettersOfCredit.status, filters.status));
    }
    if (filters?.contractId) {
      conditions.push(eq(lettersOfCredit.contractId, filters.contractId));
    }
    
    let query = db.select().from(lettersOfCredit);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(lettersOfCredit.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getLetterOfCredit(id: number): Promise<LetterOfCredit | undefined> {
    const [lc] = await db.select().from(lettersOfCredit).where(eq(lettersOfCredit.id, id));
    return lc;
  }

  async updateLetterOfCredit(id: number, updates: Partial<InsertLetterOfCredit>): Promise<LetterOfCredit> {
    const [updated] = await db
      .update(lettersOfCredit)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(lettersOfCredit.id, id))
      .returning();
    return updated;
  }

  async deleteLetterOfCredit(id: number): Promise<void> {
    await db.delete(lettersOfCredit).where(eq(lettersOfCredit.id, id));
  }

  // Vessel operations
  async createVessel(vessel: InsertVessel): Promise<Vessel> {
    const [created] = await db.insert(vessels).values(vessel).returning();
    return created;
  }

  async getVessels(filters?: { status?: string; contractId?: number; limit?: number }): Promise<Vessel[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(vessels.status, filters.status));
    }
    if (filters?.contractId) {
      conditions.push(eq(vessels.contractId, filters.contractId));
    }
    
    let query = db.select().from(vessels);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(vessels.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getVessel(id: number): Promise<Vessel | undefined> {
    const [vessel] = await db.select().from(vessels).where(eq(vessels.id, id));
    return vessel;
  }

  async updateVessel(id: number, updates: Partial<InsertVessel>): Promise<Vessel> {
    const [updated] = await db
      .update(vessels)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vessels.id, id))
      .returning();
    return updated;
  }

  async deleteVessel(id: number): Promise<void> {
    await db.delete(vessels).where(eq(vessels.id, id));
  }

  // Agent operations
  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [created] = await db.insert(agents).values(agent).returning();
    return created;
  }

  async getAgentsByVessel(vesselId: number): Promise<Agent[]> {
    return await db.select().from(agents).where(eq(agents.vesselId, vesselId));
  }

  async updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent> {
    const [updated] = await db
      .update(agents)
      .set(updates)
      .where(eq(agents.id, id))
      .returning();
    return updated;
  }

  async deleteAgent(id: number): Promise<void> {
    await db.delete(agents).where(eq(agents.id, id));
  }

  // Inspection Company operations
  async createInspectionCompany(company: InsertInspectionCompany): Promise<InspectionCompany> {
    const [created] = await db.insert(inspectionCompanies).values(company).returning();
    return created;
  }

  async getInspectionCompaniesByVessel(vesselId: number): Promise<InspectionCompany[]> {
    return await db.select().from(inspectionCompanies).where(eq(inspectionCompanies.vesselId, vesselId));
  }

  async updateInspectionCompany(id: number, updates: Partial<InsertInspectionCompany>): Promise<InspectionCompany> {
    const [updated] = await db
      .update(inspectionCompanies)
      .set(updates)
      .where(eq(inspectionCompanies.id, id))
      .returning();
    return updated;
  }

  async deleteInspectionCompany(id: number): Promise<void> {
    await db.delete(inspectionCompanies).where(eq(inspectionCompanies.id, id));
  }

  // Shipment operations
  async createShipment(shipment: InsertShipment): Promise<Shipment> {
    const [created] = await db.insert(shipments).values(shipment).returning();
    return created;
  }

  async getShipments(filters?: { status?: string; vesselId?: number; limit?: number }): Promise<Shipment[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(shipments.status, filters.status));
    }
    if (filters?.vesselId) {
      conditions.push(eq(shipments.vesselId, filters.vesselId));
    }
    
    let query = db.select().from(shipments);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(shipments.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getShipment(id: number): Promise<Shipment | undefined> {
    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, id));
    return shipment;
  }

  async updateShipment(id: number, updates: Partial<InsertShipment>): Promise<Shipment> {
    const [updated] = await db
      .update(shipments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning();
    return updated;
  }

  async deleteShipment(id: number): Promise<void> {
    await db.delete(shipments).where(eq(shipments.id, id));
  }

  // Final Settlement operations
  async createFinalSettlement(settlement: InsertFinalSettlement): Promise<FinalSettlement> {
    const [created] = await db.insert(finalSettlements).values(settlement).returning();
    return created;
  }

  async getFinalSettlements(filters?: { status?: string; requestId?: number; limit?: number }): Promise<FinalSettlement[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(finalSettlements.status, filters.status));
    }
    if (filters?.requestId) {
      conditions.push(eq(finalSettlements.requestId, filters.requestId));
    }
    
    let query = db.select().from(finalSettlements);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(finalSettlements.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getFinalSettlement(id: number): Promise<FinalSettlement | undefined> {
    const [settlement] = await db.select().from(finalSettlements).where(eq(finalSettlements.id, id));
    return settlement;
  }

  async updateFinalSettlement(id: number, updates: Partial<InsertFinalSettlement>): Promise<FinalSettlement> {
    const [updated] = await db
      .update(finalSettlements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(finalSettlements.id, id))
      .returning();
    return updated;
  }

  async deleteFinalSettlement(id: number): Promise<void> {
    await db.delete(finalSettlements).where(eq(finalSettlements.id, id));
  }

  // Dashboard/Stats operations
  async getDashboardStats(): Promise<{
    activeRequests: number;
    shipsInTransit: number;
    lcValue: number;
    completed: number;
  }> {
    const [activeRequestsResult] = await db
      .select({ count: count() })
      .from(requests)
      .where(eq(requests.status, 'pending'));

    const [shipsInTransitResult] = await db
      .select({ count: count() })
      .from(vessels)
      .where(eq(vessels.status, 'in_transit'));

    const [completedResult] = await db
      .select({ count: count() })
      .from(requests)
      .where(eq(requests.status, 'completed'));

    return {
      activeRequests: activeRequestsResult?.count || 0,
      shipsInTransit: shipsInTransitResult?.count || 0,
      lcValue: 0, // This would need to be calculated from actual LC amounts
      completed: completedResult?.count || 0,
    };
  }

  // Document Management operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async getDocuments(filters?: { status?: string; documentType?: string; relatedEntityType?: string; relatedEntityId?: number; limit?: number }): Promise<Document[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(documents.status, filters.status));
    }
    if (filters?.documentType) {
      conditions.push(eq(documents.documentType, filters.documentType));
    }
    if (filters?.relatedEntityType) {
      conditions.push(eq(documents.relatedEntityType, filters.relatedEntityType));
    }
    if (filters?.relatedEntityId) {
      conditions.push(eq(documents.relatedEntityId, filters.relatedEntityId));
    }
    
    let query = db.select().from(documents);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(documents.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async updateDocument(id: number, updates: Partial<InsertDocument>): Promise<Document> {
    const [updated] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Document Version operations
  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [newVersion] = await db
      .insert(documentVersions)
      .values(version)
      .returning();
    return newVersion;
  }

  async getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    return await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.uploadedAt));
  }

  async getDocumentVersion(id: number): Promise<DocumentVersion | undefined> {
    const [version] = await db.select().from(documentVersions).where(eq(documentVersions.id, id));
    return version;
  }

  async updateDocumentVersion(id: number, updates: Partial<InsertDocumentVersion>): Promise<DocumentVersion> {
    const [updated] = await db
      .update(documentVersions)
      .set(updates)
      .where(eq(documentVersions.id, id))
      .returning();
    return updated;
  }

  // Approval Workflow operations
  async createApprovalWorkflow(workflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow> {
    const [newWorkflow] = await db
      .insert(approvalWorkflows)
      .values(workflow)
      .returning();
    return newWorkflow;
  }

  async getApprovalWorkflows(documentType?: string): Promise<ApprovalWorkflow[]> {
    const baseQuery = db.select().from(approvalWorkflows);
    const query = documentType 
      ? baseQuery.where(eq(approvalWorkflows.documentType, documentType))
      : baseQuery;
    
    return await query.orderBy(desc(approvalWorkflows.createdAt));
  }

  async getApprovalWorkflow(id: number): Promise<ApprovalWorkflow | undefined> {
    const [workflow] = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.id, id));
    return workflow;
  }

  async updateApprovalWorkflow(id: number, updates: Partial<InsertApprovalWorkflow>): Promise<ApprovalWorkflow> {
    const [updated] = await db
      .update(approvalWorkflows)
      .set(updates)
      .where(eq(approvalWorkflows.id, id))
      .returning();
    return updated;
  }

  // Approval Workflow Step operations
  async createApprovalWorkflowStep(step: InsertApprovalWorkflowStep): Promise<ApprovalWorkflowStep> {
    const [newStep] = await db
      .insert(approvalWorkflowSteps)
      .values(step)
      .returning();
    return newStep;
  }

  async getApprovalWorkflowSteps(workflowId: number): Promise<ApprovalWorkflowStep[]> {
    return await db
      .select()
      .from(approvalWorkflowSteps)
      .where(eq(approvalWorkflowSteps.workflowId, workflowId))
      .orderBy(approvalWorkflowSteps.stepOrder);
  }

  async updateApprovalWorkflowStep(id: number, updates: Partial<InsertApprovalWorkflowStep>): Promise<ApprovalWorkflowStep> {
    const [updated] = await db
      .update(approvalWorkflowSteps)
      .set(updates)
      .where(eq(approvalWorkflowSteps.id, id))
      .returning();
    return updated;
  }

  // Document Approval operations
  async createDocumentApproval(approval: InsertDocumentApproval): Promise<DocumentApproval> {
    const [newApproval] = await db
      .insert(documentApprovals)
      .values(approval)
      .returning();
    return newApproval;
  }

  async getDocumentApprovals(filters?: { documentId?: number; status?: string; requestedBy?: string }): Promise<DocumentApproval[]> {
    const conditions = [];
    if (filters?.documentId) {
      conditions.push(eq(documentApprovals.documentId, filters.documentId));
    }
    if (filters?.status) {
      conditions.push(eq(documentApprovals.status, filters.status));
    }
    if (filters?.requestedBy) {
      conditions.push(eq(documentApprovals.requestedBy, filters.requestedBy));
    }
    
    const baseQuery = db.select().from(documentApprovals);
    const query = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
    
    return await query.orderBy(desc(documentApprovals.requestedAt));
  }

  async getDocumentApproval(id: number): Promise<DocumentApproval | undefined> {
    const [approval] = await db.select().from(documentApprovals).where(eq(documentApprovals.id, id));
    return approval;
  }

  async updateDocumentApproval(id: number, updates: Partial<InsertDocumentApproval>): Promise<DocumentApproval> {
    const [updated] = await db
      .update(documentApprovals)
      .set(updates)
      .where(eq(documentApprovals.id, id))
      .returning();
    return updated;
  }

  // Approval Action operations
  async createApprovalAction(action: InsertApprovalAction): Promise<ApprovalAction> {
    const [newAction] = await db
      .insert(approvalActions)
      .values(action)
      .returning();
    return newAction;
  }

  async getApprovalActions(approvalId: number): Promise<ApprovalAction[]> {
    return await db
      .select()
      .from(approvalActions)
      .where(eq(approvalActions.approvalId, approvalId))
      .orderBy(desc(approvalActions.actionDate));
  }

  // Document Comment operations
  async createDocumentComment(comment: InsertDocumentComment): Promise<DocumentComment> {
    const [newComment] = await db
      .insert(documentComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getDocumentComments(documentId: number, versionId?: number): Promise<DocumentComment[]> {
    const conditions = [eq(documentComments.documentId, documentId)];
    if (versionId) {
      conditions.push(eq(documentComments.versionId, versionId));
    }
    
    return await db
      .select()
      .from(documentComments)
      .where(and(...conditions))
      .orderBy(desc(documentComments.createdAt));
  }

  async updateDocumentComment(id: number, updates: Partial<InsertDocumentComment>): Promise<DocumentComment> {
    const [updated] = await db
      .update(documentComments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documentComments.id, id))
      .returning();
    return updated;
  }

  // Document Audit Log operations
  async createDocumentAuditLog(log: InsertDocumentAuditLog): Promise<DocumentAuditLog> {
    const [newLog] = await db
      .insert(documentAuditLog)
      .values(log)
      .returning();
    return newLog;
  }

  async getDocumentAuditLogs(documentId: number): Promise<DocumentAuditLog[]> {
    return await db
      .select()
      .from(documentAuditLog)
      .where(eq(documentAuditLog.documentId, documentId))
      .orderBy(desc(documentAuditLog.timestamp));
  }
}

export const storage = new DatabaseStorage();