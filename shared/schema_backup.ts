import { pgTable, text, serial, varchar, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull().unique(),
  role: varchar("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Requests table  
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitOfMeasure: varchar("unit_of_measure").notNull(),
  pricePerTon: decimal("price_per_ton").notNull(),
  cargoType: varchar("cargo_type").notNull(),
  priority: varchar("priority").notNull().default("medium"),
  status: varchar("status").notNull().default("pending"),
  requiredDeliveryDate: timestamp("required_delivery_date"),
  businessJustification: text("business_justification"),
  expectedBenefits: text("expected_benefits"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contracts table
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
  contractNumber: varchar("contract_number").notNull(),
  contractValue: varchar("contract_value").notNull(),
  contractDate: timestamp("contract_date").notNull(),
  deliveryTerms: varchar("delivery_terms").notNull(),
  paymentTerms: varchar("payment_terms").notNull(),
  uploadedFile: varchar("uploaded_file"),
  status: varchar("status").notNull().default("draft"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Letters of Credit table
export const lettersOfCredit = pgTable("letters_of_credit", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  lcNumber: varchar("lc_number").notNull(),
  amount: varchar("amount").notNull(),
  bankName: varchar("bank_name").notNull(),
  issuingDate: timestamp("issuing_date").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  beneficiary: varchar("beneficiary").notNull(),
  paymentTerms: varchar("payment_terms").notNull(),
  status: varchar("status").notNull().default("active"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vessels table
export const vessels = pgTable("vessels", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  vesselName: varchar("vessel_name").notNull(),
  vesselType: varchar("vessel_type").notNull(),
  cargoCapacity: integer("cargo_capacity").notNull(),
  portOfLoading: varchar("port_of_loading").notNull(),
  portOfDischarge: varchar("port_of_discharge").notNull(),
  expectedArrival: timestamp("expected_arrival").notNull(),
  status: varchar("status").notNull().default("nominated"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  requests: many(requests),
  contracts: many(contracts),
  lettersOfCredit: many(lettersOfCredit),
  vessels: many(vessels),
  documentVotes: many(documentVotes),
}));

export const requestsRelations = relations(requests, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [requests.createdBy],
    references: [users.id],
  }),
  contracts: many(contracts),
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
}));

export const lettersOfCreditRelations = relations(lettersOfCredit, ({ one }) => ({
  contract: one(contracts, {
    fields: [lettersOfCredit.contractId],
    references: [contracts.id],
  }),
  createdByUser: one(users, {
    fields: [lettersOfCredit.createdBy],
    references: [users.id],
  }),
}));

export const vesselsRelations = relations(vessels, ({ one }) => ({
  contract: one(contracts, {
    fields: [vessels.contractId],
    references: [contracts.id],
  }),
  createdByUser: one(users, {
    fields: [vessels.createdBy],
    references: [users.id],
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

// Insert schemas
export const insertRequestSchema = createInsertSchema(requests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
});

export const insertVesselSchema = createInsertSchema(vessels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentVoteSchema = createInsertSchema(documentVotes).omit({
  id: true,
  createdAt: true,
});

// Types
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