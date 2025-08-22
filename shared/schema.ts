import { pgTable, text, serial, varchar, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Needs table - captures requirements that drive contract requests
export const needs = pgTable("needs", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(), // e.g., 'raw_materials', 'equipment', 'services'
  requiredQuantity: integer("required_quantity").notNull(),
  unitOfMeasure: varchar("unit_of_measure").notNull(),
  maxPricePerUnit: decimal("max_price_per_unit"), // Budget constraint
  fulfillmentStartDate: timestamp("fulfillment_start_date").notNull(),
  fulfillmentEndDate: timestamp("fulfillment_end_date").notNull(),
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, critical
  departmentCode: varchar("department_code"),
  status: varchar("status").notNull().default("active"), // active, fulfilled, expired, cancelled
  actualQuantityReceived: integer("actual_quantity_received").notNull().default(0),
  progressPercentage: decimal("progress_percentage").notNull().default("0"), // calculated field
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  email: varchar("email").notNull().unique(),
  role: varchar("role").notNull().default("user"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Requests table  
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  needId: integer("need_id").references(() => needs.id, { onDelete: "cascade" }), // Links request to parent need
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitOfMeasure: varchar("unit_of_measure").notNull(),
  pricePerTon: decimal("price_per_ton").notNull(),
  cargoType: varchar("cargo_type").notNull(),
  countryOfOrigin: varchar("country_of_origin"),
  supplierName: varchar("supplier_name"),
  priority: varchar("priority").notNull().default("medium"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  departmentCode: varchar("department_code"),
  status: varchar("status").notNull().default("pending"),
  uploadedFile: varchar("uploaded_file"),
  documentStatus: varchar("document_status").default("pending"), // For voting status
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contracts table
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => requests.id, { onDelete: "cascade" }),
  supplierName: varchar("supplier_name"),
  cargoType: varchar("cargo_type"),
  countryOfOrigin: varchar("country_of_origin"),
  contractTerms: text("contract_terms"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  uploadedFile: varchar("uploaded_file"),
  status: varchar("status").notNull().default("draft"),
  reviewNotes: text("review_notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  quantity: integer("quantity"),
  incoterms: varchar("incoterms"),
});

// Letters of Credit table
export const lettersOfCredit = pgTable("letters_of_credit", {
  id: serial("id").primaryKey(),
  lcNumber: varchar("lc_number"),
  currency: varchar("currency"),
  quantity: integer("quantity").notNull().default(0),
  issuingBank: varchar("issuing_bank"),
  advisingBank: varchar("advising_bank"),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  termsConditions: text("terms_conditions"),
  uploadedFile: varchar("uploaded_file").notNull(),
  status: varchar("status").notNull().default("active"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vessels table (updated to support multiple LCs and loading ports)
export const vessels = pgTable("vessels", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
  vesselName: varchar("vessel_name"),
  cargoType: varchar("cargo_type"),
  quantity: integer("quantity").notNull().default(0),
  countryOfOrigin: varchar("country_of_origin"),
  portOfDischarge: varchar("port_of_discharge"),
  eta: timestamp("eta"),
  shippingInstructions: text("shipping_instructions"),
  instructionsFile: varchar("instructions_file"),
  status: varchar("status").notNull().default("nominated"),
  // FOB/CIF terms and company details
  tradeTerms: varchar("trade_terms").notNull().default("FOB"), // FOB or CIF
  insuranceCompany: varchar("insurance_company"),
  inspectionCompany: varchar("inspection_company"),
  shippingCompany: varchar("shipping_company"),
  // Costs for FOB (only applicable when tradeTerms = 'FOB')
  insuranceCost: decimal("insurance_cost"),
  inspectionCost: decimal("inspection_cost"),
  shippingCost: decimal("shipping_cost"),
  // Discharge tracking fields
  arrivalDate: timestamp("arrival_date"),
  dischargeStartDate: timestamp("discharge_start_date"),
  dischargeEndDate: timestamp("discharge_end_date"),
  actualQuantity: integer("actual_quantity"),
  // Customs release documentation
  customsReleaseDate: timestamp("customs_release_date"),
  customsReleaseNumber: varchar("customs_release_number"),
  customsReleaseFile: varchar("customs_release_file"),
  customsReleaseStatus: varchar("customs_release_status").notNull().default("pending"), // pending, received, verified
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vessel Letters of Credit junction table (many-to-many relationship)
export const vesselLettersOfCredit = pgTable("vessel_letters_of_credit", {
  id: serial("id").primaryKey(),
  vesselId: integer("vessel_id").notNull().references(() => vessels.id, { onDelete: "cascade" }),
  lcId: integer("lc_id").notNull().references(() => lettersOfCredit.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(0), // Quantity allocated from this LC to this vessel
  notes: text("notes"), // Additional notes for this LC-vessel relationship
  createdAt: timestamp("created_at").defaultNow(),
});

// Vessel Loading Ports table (one-to-many relationship)
export const vesselLoadingPorts = pgTable("vessel_loading_ports", {
  id: serial("id").primaryKey(),
  vesselId: integer("vessel_id").notNull().references(() => vessels.id, { onDelete: "cascade" }),
  portName: varchar("port_name").notNull(),
  portCode: varchar("port_code"), // Port code if available
  country: varchar("country"),
  loadingDate: timestamp("loading_date"),
  expectedQuantity: integer("expected_quantity").notNull().default(0),
  actualQuantity: integer("actual_quantity"),
  loadingStatus: varchar("loading_status").notNull().default("pending"), // pending, in_progress, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document voting system
export const documentVotes = pgTable("document_votes", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  vote: varchar("vote").notNull(),
  comment: text("comment"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Request voting system for managers
export const requestVotes = pgTable("request_votes", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  vote: varchar("vote").notNull(), // 'yes' or 'no'
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contract voting system
export const contractVotes = pgTable("contract_votes", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  vote: varchar("vote").notNull(), // 'yes' or 'no'
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vessel documents table
export const vesselDocuments = pgTable("vessel_documents", {
  id: serial("id").primaryKey(),
  vesselId: integer("vessel_id").notNull().references(() => vessels.id, { onDelete: "cascade" }),
  documentType: varchar("document_type").notNull(), // bill_of_lading, commercial_invoice, packing_list, etc.
  documentName: varchar("document_name").notNull(),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  notes: text("notes"),
});

// Relations
export const needsRelations = relations(needs, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [needs.createdBy],
    references: [users.id],
  }),
  requests: many(requests),
}));

export const usersRelations = relations(users, ({ many }) => ({
  needs: many(needs),
  requests: many(requests),
  contracts: many(contracts),
  lettersOfCredit: many(lettersOfCredit),
  vessels: many(vessels),
  documentVotes: many(documentVotes),
}));

export const requestsRelations = relations(requests, ({ one, many }) => ({
  need: one(needs, {
    fields: [requests.needId],
    references: [needs.id],
  }),
  createdByUser: one(users, {
    fields: [requests.createdBy],
    references: [users.id],
  }),
  contracts: many(contracts),
  votes: many(requestVotes),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  request: one(requests, {
    fields: [contracts.requestId],
    references: [requests.id],
  }),
  createdByUser: one(users, {
    fields: [contracts.createdBy],
    references: [users.id],
  }),
  lettersOfCredit: many(lettersOfCredit),
  vessels: many(vessels),
  votes: many(contractVotes),
}));

export const lettersOfCreditRelations = relations(lettersOfCredit, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [lettersOfCredit.createdBy],
    references: [users.id],
  }),
  vessels: many(vessels),
}));

export const vesselsRelations = relations(vessels, ({ one, many }) => ({
  contract: one(contracts, {
    fields: [vessels.contractId],
    references: [contracts.id],
  }),
  createdByUser: one(users, {
    fields: [vessels.createdBy],
    references: [users.id],
  }),
  documents: many(vesselDocuments),
  lettersOfCredit: many(vesselLettersOfCredit),
  loadingPorts: many(vesselLoadingPorts),
}));

export const vesselLettersOfCreditRelations = relations(vesselLettersOfCredit, ({ one }) => ({
  vessel: one(vessels, {
    fields: [vesselLettersOfCredit.vesselId],
    references: [vessels.id],
  }),
  letterOfCredit: one(lettersOfCredit, {
    fields: [vesselLettersOfCredit.lcId],
    references: [lettersOfCredit.id],
  }),
}));

export const vesselLoadingPortsRelations = relations(vesselLoadingPorts, ({ one }) => ({
  vessel: one(vessels, {
    fields: [vesselLoadingPorts.vesselId],
    references: [vessels.id],
  }),
}));

export const documentVotesRelations = relations(documentVotes, ({ one }) => ({
  user: one(users, {
    fields: [documentVotes.userId],
    references: [users.id],
  }),
  uploadedByUser: one(users, {
    fields: [documentVotes.uploadedBy],
    references: [users.id],
  }),
}));

export const requestVotesRelations = relations(requestVotes, ({ one }) => ({
  request: one(requests, {
    fields: [requestVotes.requestId],
    references: [requests.id],
  }),
  user: one(users, {
    fields: [requestVotes.userId],
    references: [users.id],
  }),
}));

export const contractVotesRelations = relations(contractVotes, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractVotes.contractId],
    references: [contracts.id],
  }),
  user: one(users, {
    fields: [contractVotes.userId],
    references: [users.id],
  }),
}));

export const vesselDocumentsRelations = relations(vesselDocuments, ({ one }) => ({
  vessel: one(vessels, {
    fields: [vesselDocuments.vesselId],
    references: [vessels.id],
  }),
  uploadedByUser: one(users, {
    fields: [vesselDocuments.uploadedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertNeedSchema = createInsertSchema(needs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  actualQuantityReceived: true,
  progressPercentage: true,
}).extend({
  fulfillmentStartDate: z.string().transform(val => new Date(val)),
  fulfillmentEndDate: z.string().transform(val => new Date(val)),
});

export const insertRequestSchema = createInsertSchema(requests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  requiredDeliveryDate: z.string().optional().transform(val => val ? new Date(val) : null)
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLetterOfCreditSchema = createInsertSchema(lettersOfCredit).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  unitPrice: z.string().transform(val => val)
});

export const insertVesselSchema = createInsertSchema(vessels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  eta: z.string().optional().transform(val => val ? new Date(val) : null),
  arrivalDate: z.string().optional().transform(val => val ? new Date(val) : null),
  dischargeStartDate: z.string().optional().transform(val => val ? new Date(val) : null),
  dischargeEndDate: z.string().optional().transform(val => val ? new Date(val) : null),
  customsReleaseDate: z.string().optional().transform(val => val ? new Date(val) : null),
  insuranceCost: z.string().optional().transform(val => val ? val : null),
  inspectionCost: z.string().optional().transform(val => val ? val : null),
  shippingCost: z.string().optional().transform(val => val ? val : null),
  unitPrice: z.string().optional().transform(val => val ? val : null)
});

export const insertDocumentVoteSchema = createInsertSchema(documentVotes).omit({
  id: true,
  createdAt: true,
});

export const insertRequestVoteSchema = createInsertSchema(requestVotes).omit({
  id: true,
  createdAt: true,
});

export const insertContractVoteSchema = createInsertSchema(contractVotes).omit({
  id: true,
  createdAt: true,
});

export const insertVesselDocumentSchema = createInsertSchema(vesselDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertVesselLetterOfCreditSchema = createInsertSchema(vesselLettersOfCredit).omit({
  id: true,
  createdAt: true,
});

export const insertVesselLoadingPortSchema = createInsertSchema(vesselLoadingPorts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  loadingDate: z.string().optional().transform(val => val ? new Date(val) : null),
});

// Types
export type InsertNeed = z.infer<typeof insertNeedSchema>;
export type Need = typeof needs.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requests.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertLetterOfCredit = z.infer<typeof insertLetterOfCreditSchema>;
export type LetterOfCredit = typeof lettersOfCredit.$inferSelect;
export type InsertVessel = z.infer<typeof insertVesselSchema>;
export type Vessel = typeof vessels.$inferSelect;
export type InsertDocumentVote = z.infer<typeof insertDocumentVoteSchema>;
export type DocumentVote = typeof documentVotes.$inferSelect;
export type InsertRequestVote = z.infer<typeof insertRequestVoteSchema>;
export type RequestVote = typeof requestVotes.$inferSelect;
export type InsertContractVote = z.infer<typeof insertContractVoteSchema>;
export type ContractVote = typeof contractVotes.$inferSelect;
export type InsertVesselDocument = z.infer<typeof insertVesselDocumentSchema>;
export type VesselDocument = typeof vesselDocuments.$inferSelect;
export type InsertVesselLetterOfCredit = z.infer<typeof insertVesselLetterOfCreditSchema>;
export type VesselLetterOfCredit = typeof vesselLettersOfCredit.$inferSelect;
export type InsertVesselLoadingPort = z.infer<typeof insertVesselLoadingPortSchema>;
export type VesselLoadingPort = typeof vesselLoadingPorts.$inferSelect;