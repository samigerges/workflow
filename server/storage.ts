import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import {
  users,
  needs,
  requests,
  contracts,
  lettersOfCredit,
  vessels,
  documentVotes,
  requestVotes,
  contractVotes,
  vesselDocuments,
  vesselLettersOfCredit,
  vesselLoadingPorts,
  type Need,
  type InsertNeed,
  type Request,
  type InsertRequest,
  type Contract,
  type InsertContract,
  type LetterOfCredit,
  type InsertLetterOfCredit,
  type Vessel,
  type InsertVessel,
  type DocumentVote,
  type InsertDocumentVote,
  type RequestVote,
  type InsertRequestVote,
  type ContractVote,
  type InsertContractVote,
  type VesselDocument,
  type InsertVesselDocument,
  type VesselLetterOfCredit,
  type InsertVesselLetterOfCredit,
  type VesselLoadingPort,
  type InsertVesselLoadingPort,
} from "@samy/shared";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Additional options for better connection handling
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | null>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Need operations
  getNeeds(): Promise<Need[]>;
  getNeed(id: number): Promise<Need | null>;
  createNeed(need: InsertNeed): Promise<Need>;
  updateNeed(id: number, updates: Partial<InsertNeed>): Promise<Need | null>;
  deleteNeed(id: number): Promise<void>;
  updateNeedProgress(id: number, actualQuantity: number): Promise<Need | null>;
  updateNeedStatus(id: number, status: string): Promise<Need | null>;

  // Request operations
  getRequests(): Promise<Request[]>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequest(id: number, updates: Partial<InsertRequest>): Promise<Request | null>;
  deleteRequest(id: number): Promise<void>;
  updateRequestStatus(id: number, status: string): Promise<Request | null>;

  // Contract operations
  getContracts(): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | null>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract | null>;
  updateContractStatus(id: number, status: string): Promise<Contract | null>;
  deleteContract(id: number): Promise<void>;

  // Letter of Credit operations
  getLettersOfCredit(): Promise<LetterOfCredit[]>;
  getLetterOfCredit(id: number): Promise<LetterOfCredit | null>;
  createLetterOfCredit(lc: InsertLetterOfCredit): Promise<LetterOfCredit>;
  updateLetterOfCredit(id: number, updates: Partial<InsertLetterOfCredit>): Promise<LetterOfCredit | null>;
  deleteLetterOfCredit(id: number): Promise<void>;

  // Vessel operations
  getVessels(): Promise<Vessel[]>;
  getVessel(id: number): Promise<Vessel | null>;
  createVessel(vessel: InsertVessel): Promise<Vessel>;
  updateVessel(id: number, updates: Partial<InsertVessel>): Promise<Vessel | null>;
  updateVesselStatus(id: number, status: string): Promise<Vessel | null>;
  deleteVessel(id: number): Promise<void>;

  // Document vote operations
  getDocumentVotes(entityType: string, entityId: number): Promise<DocumentVote[]>;
  createDocumentVote(vote: InsertDocumentVote): Promise<DocumentVote>;

  // Request vote operations
  getRequestVotes(requestId: number): Promise<RequestVote[]>;
  createRequestVote(vote: InsertRequestVote): Promise<RequestVote>;

  // Contract vote operations
  getContractVotes(contractId: number): Promise<ContractVote[]>;
  createContractVote(vote: InsertContractVote): Promise<ContractVote>;

  // Vessel documents operations
  getVesselDocuments(vesselId: number): Promise<VesselDocument[]>;
  createVesselDocument(document: InsertVesselDocument): Promise<VesselDocument>;
  deleteVesselDocument(id: number): Promise<void>;

  // Vessel Letters of Credit operations
  getVesselLettersOfCredit(vesselId: number): Promise<VesselLetterOfCredit[]>;
  createVesselLetterOfCredit(vesselLc: InsertVesselLetterOfCredit): Promise<VesselLetterOfCredit>;
  deleteVesselLetterOfCredit(id: number): Promise<void>;
  getLCVessels(lcId: number): Promise<VesselLetterOfCredit[]>;
  getAllocatedQuantityForLC(lcId: number): Promise<number>;
  updateLCAllocatedQuantity(lcId: number): Promise<void>;

  // Vessel Loading Ports operations
  getVesselLoadingPorts(vesselId: number): Promise<VesselLoadingPort[]>;
  createVesselLoadingPort(port: InsertVesselLoadingPort): Promise<VesselLoadingPort>;
  updateVesselLoadingPort(id: number, updates: Partial<InsertVesselLoadingPort>): Promise<VesselLoadingPort | null>;
  deleteVesselLoadingPort(id: number): Promise<void>;

  // Progress tracking operations
  updateNeedsProgressFromVessels(): Promise<void>;
  getNeedsProgressReport(startDate?: Date, endDate?: Date): Promise<any[]>;
}

class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  }

  async createUser(user: UpsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | null> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0] || null;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const existingUser = await this.getUser(user.id);
    if (existingUser) {
      const updated = await this.updateUser(user.id, user);
      return updated!;
    } else {
      return await this.createUser(user);
    }
  }

  // Need operations
  async getNeeds(): Promise<Need[]> {
    return await db.select().from(needs).orderBy(desc(needs.createdAt));
  }

  async getNeed(id: number): Promise<Need | null> {
    const result = await db.select().from(needs).where(eq(needs.id, id));
    return result[0] || null;
  }

  async createNeed(need: InsertNeed): Promise<Need> {
    const result = await db.insert(needs).values(need).returning();
    return result[0];
  }

  async updateNeed(id: number, updates: Partial<InsertNeed>): Promise<Need | null> {
    const result = await db.update(needs).set(updates).where(eq(needs.id, id)).returning();
    return result[0] || null;
  }

  async deleteNeed(id: number): Promise<void> {
    await db.delete(needs).where(eq(needs.id, id));
  }

  async updateNeedProgress(id: number, actualQuantity: number): Promise<Need | null> {
    const need = await this.getNeed(id);
    if (!need) return null;
    
    const progressPercentage = need.requiredQuantity > 0 
      ? Math.min((actualQuantity / need.requiredQuantity) * 100, 100)
      : 0;
    
    const status = progressPercentage >= 100 ? 'fulfilled' : 
                  progressPercentage > 0 ? 'in_progress' : 'active';
    
    const result = await db.update(needs)
      .set({ 
        actualQuantityReceived: actualQuantity,
        progressPercentage: progressPercentage.toString(),
        status,
        updatedAt: new Date() 
      })
      .where(eq(needs.id, id))
      .returning();
    
    return result[0] || null;
  }

  async updateNeedStatus(id: number, status: string): Promise<Need | null> {
    const result = await db.update(needs)
      .set({ status, updatedAt: new Date() })
      .where(eq(needs.id, id))
      .returning();
    return result[0] || null;
  }

  // Request operations
  async getRequests(): Promise<Request[]> {
    return await db.select().from(requests).orderBy(desc(requests.createdAt));
  }

  async createRequest(request: InsertRequest): Promise<Request> {
    const result = await db.insert(requests).values(request).returning();
    return result[0];
  }

  async updateRequest(id: number, updates: Partial<InsertRequest>): Promise<Request | null> {
    const result = await db.update(requests).set(updates).where(eq(requests.id, id)).returning();
    return result[0] || null;
  }

  async deleteRequest(id: number): Promise<void> {
    await db.delete(requests).where(eq(requests.id, id));
  }

  async updateRequestStatus(id: number, status: string): Promise<Request | null> {
    const result = await db.update(requests).set({ status }).where(eq(requests.id, id)).returning();
    return result[0] || null;
  }

  // Contract operations
  async getContracts(): Promise<Contract[]> {
    return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async getContract(id: number): Promise<Contract | null> {
    const result = await db.select().from(contracts).where(eq(contracts.id, id));
    return result[0] || null;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    // Use transaction to ensure both contract creation and request status update succeed together
    const result = await db.transaction(async (tx) => {
      // Create the contract
      const contractResult = await tx.insert(contracts).values(contract).returning();
      const createdContract = contractResult[0];
      
      // Automatically update the request status to "contracted" when a contract is created
      if (contract.requestId) {
        await tx.update(requests)
          .set({ status: "contracted", updatedAt: new Date() })
          .where(eq(requests.id, contract.requestId));
      }
      
      return createdContract;
    });
    
    return result;
  }

  async updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract | null> {
    const result = await db.update(contracts).set(updates).where(eq(contracts.id, id)).returning();
    return result[0] || null;
  }

  async deleteContract(id: number): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  async updateContractStatus(id: number, status: string): Promise<Contract | null> {
    // Use transaction to ensure both contract status update and request status update succeed together
    const result = await db.transaction(async (tx) => {
      // Update the contract status
      const contractResult = await tx.update(contracts)
        .set({ status, updatedAt: new Date() })
        .where(eq(contracts.id, id))
        .returning();
      
      const updatedContract = contractResult[0];
      
      // If contract is approved, automatically update the request status to "applied"
      if (updatedContract && status === "approved" && updatedContract.requestId) {
        await tx.update(requests)
          .set({ status: "applied", updatedAt: new Date() })
          .where(eq(requests.id, updatedContract.requestId));
      }
      
      return updatedContract;
    });
    
    return result || null;
  }

  // Letter of Credit operations
  async getLettersOfCredit(): Promise<LetterOfCredit[]> {
    return await db.select().from(lettersOfCredit).orderBy(desc(lettersOfCredit.createdAt));
  }

  async getLetterOfCredit(id: number): Promise<LetterOfCredit | null> {
    const result = await db.select().from(lettersOfCredit).where(eq(lettersOfCredit.id, id));
    return result[0] || null;
  }

  async createLetterOfCredit(lc: InsertLetterOfCredit): Promise<LetterOfCredit> {
    const result = await db.insert(lettersOfCredit).values(lc).returning();
    return result[0];
  }

  async updateLetterOfCredit(id: number, updates: Partial<InsertLetterOfCredit>): Promise<LetterOfCredit | null> {
    const result = await db.update(lettersOfCredit).set(updates).where(eq(lettersOfCredit.id, id)).returning();
    return result[0] || null;
  }

  async deleteLetterOfCredit(id: number): Promise<void> {
    await db.delete(lettersOfCredit).where(eq(lettersOfCredit.id, id));
  }

  // Vessel operations
  async getVessels(): Promise<Vessel[]> {
    return await db.select().from(vessels).orderBy(desc(vessels.createdAt));
  }

  async getVessel(id: number): Promise<Vessel | null> {
    const result = await db.select().from(vessels).where(eq(vessels.id, id));
    return result[0] || null;
  }

  async createVessel(vessel: InsertVessel): Promise<Vessel> {
    const result = await db.insert(vessels).values(vessel).returning();
    return result[0];
  }

  async updateVessel(id: number, updates: Partial<InsertVessel>): Promise<Vessel | null> {
    const result = await db.update(vessels).set(updates).where(eq(vessels.id, id)).returning();
    return result[0] || null;
  }

  async deleteVessel(id: number): Promise<void> {
    await db.delete(vessels).where(eq(vessels.id, id));
  }

  async updateVesselStatus(id: number, status: string): Promise<Vessel | null> {
    const result = await db.update(vessels).set({ status }).where(eq(vessels.id, id)).returning();
    return result[0] || null;
  }

  // Document vote operations
  async getDocumentVotes(entityType: string, entityId: number): Promise<DocumentVote[]> {
    return await db.select()
      .from(documentVotes)
      .where(and(
        eq(documentVotes.entityType, entityType),
        eq(documentVotes.entityId, entityId)
      ))
      .orderBy(desc(documentVotes.createdAt));
  }

  async getAllDocumentVotes(): Promise<DocumentVote[]> {
    return await db.select()
      .from(documentVotes)
      .orderBy(desc(documentVotes.createdAt));
  }

  async createDocumentVote(vote: InsertDocumentVote): Promise<DocumentVote> {
    const result = await db.insert(documentVotes).values(vote).returning();
    return result[0];
  }

  // Request vote operations
  async getRequestVotes(requestId: number): Promise<RequestVote[]> {
    return await db.select({
      id: requestVotes.id,
      requestId: requestVotes.requestId,
      userId: requestVotes.userId,
      vote: requestVotes.vote,
      comment: requestVotes.comment,
      createdAt: requestVotes.createdAt,
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
      }
    })
      .from(requestVotes)
      .leftJoin(users, eq(requestVotes.userId, users.id))
      .where(eq(requestVotes.requestId, requestId))
      .orderBy(desc(requestVotes.createdAt));
  }

  async createRequestVote(vote: InsertRequestVote): Promise<RequestVote> {
    const result = await db.insert(requestVotes).values(vote).returning();
    return result[0];
  }

  // Contract vote operations
  async getContractVotes(contractId: number): Promise<ContractVote[]> {
    return await db.select({
      id: contractVotes.id,
      contractId: contractVotes.contractId,
      userId: contractVotes.userId,
      vote: contractVotes.vote,
      comment: contractVotes.comment,
      createdAt: contractVotes.createdAt,
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
      }
    })
      .from(contractVotes)
      .leftJoin(users, eq(contractVotes.userId, users.id))
      .where(eq(contractVotes.contractId, contractId))
      .orderBy(desc(contractVotes.createdAt));
  }

  async createContractVote(vote: InsertContractVote): Promise<ContractVote> {
    const result = await db.insert(contractVotes).values(vote).returning();
    return result[0];
  }

  // Vessel documents operations
  async getVesselDocuments(vesselId: number): Promise<VesselDocument[]> {
    return await db.select()
      .from(vesselDocuments)
      .where(eq(vesselDocuments.vesselId, vesselId))
      .orderBy(desc(vesselDocuments.uploadedAt));
  }

  async createVesselDocument(document: InsertVesselDocument): Promise<VesselDocument> {
    const result = await db.insert(vesselDocuments).values(document).returning();
    return result[0];
  }

  async deleteVesselDocument(id: number): Promise<void> {
    await db.delete(vesselDocuments).where(eq(vesselDocuments.id, id));
  }

  // Vessel Letters of Credit operations
  async getVesselLettersOfCredit(vesselId: number): Promise<VesselLetterOfCredit[]> {
    return await db.select()
      .from(vesselLettersOfCredit)
      .where(eq(vesselLettersOfCredit.vesselId, vesselId))
      .orderBy(desc(vesselLettersOfCredit.createdAt));
  }

  async createVesselLetterOfCredit(vesselLc: InsertVesselLetterOfCredit): Promise<VesselLetterOfCredit> {
    const result = await db.insert(vesselLettersOfCredit).values(vesselLc).returning();
    
    // Update LC allocated quantity after creating the relationship
    await this.updateLCAllocatedQuantity(vesselLc.lcId);
    
    return result[0];
  }

  async deleteVesselLetterOfCredit(id: number): Promise<void> {
    // Get the LC ID before deleting to update allocated quantity
    const vesselLc = await db.select()
      .from(vesselLettersOfCredit)
      .where(eq(vesselLettersOfCredit.id, id));
    
    if (vesselLc.length > 0) {
      const lcId = vesselLc[0].lcId;
      await db.delete(vesselLettersOfCredit).where(eq(vesselLettersOfCredit.id, id));
      
      // Update LC allocated quantity after deleting the relationship
      await this.updateLCAllocatedQuantity(lcId);
    }
  }

  async getLCVessels(lcId: number): Promise<VesselLetterOfCredit[]> {
    return await db.select()
      .from(vesselLettersOfCredit)
      .where(eq(vesselLettersOfCredit.lcId, lcId))
      .orderBy(desc(vesselLettersOfCredit.createdAt));
  }

  // Vessel Loading Ports operations
  async getVesselLoadingPorts(vesselId: number): Promise<VesselLoadingPort[]> {
    return await db.select()
      .from(vesselLoadingPorts)
      .where(eq(vesselLoadingPorts.vesselId, vesselId))
      .orderBy(vesselLoadingPorts.loadingDate);
  }

  async createVesselLoadingPort(port: InsertVesselLoadingPort): Promise<VesselLoadingPort> {
    const result = await db.insert(vesselLoadingPorts).values(port).returning();
    return result[0];
  }

  async updateVesselLoadingPort(id: number, updates: Partial<InsertVesselLoadingPort>): Promise<VesselLoadingPort | null> {
    const result = await db.update(vesselLoadingPorts)
      .set(updates)
      .where(eq(vesselLoadingPorts.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteVesselLoadingPort(id: number): Promise<void> {
    await db.delete(vesselLoadingPorts).where(eq(vesselLoadingPorts.id, id));
  }

  // Get allocated quantity for a specific LC
  async getAllocatedQuantityForLC(lcId: number): Promise<number> {
    const result = await db.select({ quantity: vesselLettersOfCredit.quantity })
      .from(vesselLettersOfCredit)
      .where(eq(vesselLettersOfCredit.lcId, lcId));
    
    const totalAllocated = result.reduce((sum, row) => sum + (row.quantity || 0), 0);
    return totalAllocated;
  }

  // Update LC's allocated quantity field based on vessel allocations
  async updateLCAllocatedQuantity(lcId: number): Promise<void> {
    const allocatedQuantity = await this.getAllocatedQuantityForLC(lcId);
    
    // Note: For now, we'll track this through calculations. 
    // If you want to add an 'allocatedQuantity' field to the LC table, we can do that.
    // This function ensures the allocated quantity is properly calculated when needed.
  }

  // Update needs progress based on vessel deliveries
  async updateNeedsProgressFromVessels(): Promise<void> {
    // Get all active needs
    const activeNeeds = await db.select().from(needs)
      .where(eq(needs.status, 'active'));
    
    for (const need of activeNeeds) {
      // Find related requests for this need
      const relatedRequests = await db.select().from(requests)
        .where(eq(requests.needId, need.id));
      
      let totalDelivered = 0;
      
      // For each request, find completed contracts and their vessel deliveries
      for (const request of relatedRequests) {
        const completedContracts = await db.select().from(contracts)
          .where(and(
            eq(contracts.requestId, request.id),
            eq(contracts.status, 'approved')
          ));
        
        for (const contract of completedContracts) {
          // Find vessels for this contract that have been discharged
          const dischargedVessels = await db.select().from(vessels)
            .where(and(
              eq(vessels.contractId, contract.id),
              eq(vessels.status, 'discharged')
            ));
          
          // Sum up actual quantities delivered within the fulfillment period
          for (const vessel of dischargedVessels) {
            if (vessel.actualQuantity && 
                vessel.dischargeEndDate &&
                vessel.dischargeEndDate >= need.fulfillmentStartDate &&
                vessel.dischargeEndDate <= need.fulfillmentEndDate) {
              totalDelivered += vessel.actualQuantity;
            }
          }
        }
      }
      
      // Update the need's progress
      await this.updateNeedProgress(need.id, totalDelivered);
    }
  }

  // Get needs progress report comparing requirements vs deliveries
  async getNeedsProgressReport(startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = db.select({
      needId: needs.id,
      needTitle: needs.title,
      category: needs.category,
      requiredQuantity: needs.requiredQuantity,
      actualQuantityReceived: needs.actualQuantityReceived,
      progressPercentage: needs.progressPercentage,
      status: needs.status,
      fulfillmentStartDate: needs.fulfillmentStartDate,
      fulfillmentEndDate: needs.fulfillmentEndDate,
      priority: needs.priority,
      unitOfMeasure: needs.unitOfMeasure,
    }).from(needs);
    
    if (startDate || endDate) {
      const conditions = [];
      if (startDate) {
        conditions.push(gte(needs.fulfillmentStartDate, startDate));
      }
      if (endDate) {
        conditions.push(lte(needs.fulfillmentEndDate, endDate));
      }
      query = query.where(and(...conditions));
    }
    
    const needsData = await query.orderBy(desc(needs.createdAt));
    
    // For each need, get detailed delivery information
    const progressReport = [];
    
    for (const need of needsData) {
      // Get all requests linked to this need
      const linkedRequests = await db.select({
        requestId: requests.id,
        requestTitle: requests.title,
        requestQuantity: requests.quantity,
        requestStatus: requests.status,
      }).from(requests)
        .where(eq(requests.needId, need.needId));
      
      // Get delivery details from vessels
      const deliveries = [];
      for (const request of linkedRequests) {
        const requestContracts = await db.select({
          contractId: contracts.id,
          contractStatus: contracts.status,
        }).from(contracts)
          .where(eq(contracts.requestId, request.requestId));
        
        for (const contract of requestContracts) {
          const contractVessels = await db.select({
            vesselId: vessels.id,
            vesselName: vessels.vesselName,
            actualQuantity: vessels.actualQuantity,
            dischargeEndDate: vessels.dischargeEndDate,
            status: vessels.status,
          }).from(vessels)
            .where(eq(vessels.contractId, contract.contractId));
          
          deliveries.push(...contractVessels.map(vessel => ({
            ...vessel,
            requestTitle: request.requestTitle,
            contractId: contract.contractId,
          })));
        }
      }
      
      progressReport.push({
        ...need,
        linkedRequests,
        deliveries,
        deliveryGap: need.requiredQuantity - need.actualQuantityReceived,
        isOnTrack: need.actualQuantityReceived >= need.requiredQuantity * 0.9, // 90% threshold
        daysRemaining: need.fulfillmentEndDate ? 
          Math.ceil((new Date(need.fulfillmentEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
      });
    }
    
    return progressReport;
  }
}

export const storage: IStorage = new DatabaseStorage();