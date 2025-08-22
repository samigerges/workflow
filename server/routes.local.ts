import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupLocalAuth, isAuthenticated } from "./localAuth";
import {
  insertNeedSchema,
  insertRequestSchema,
  insertContractSchema,
  insertLetterOfCreditSchema,
  insertVesselSchema,
  insertDocumentVoteSchema,
  insertRequestVoteSchema,
  insertContractVoteSchema,
  insertVesselLetterOfCreditSchema,
  insertVesselLoadingPortSchema,
} from "@samy/shared";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

export async function registerLocalRoutes(app: Express): Promise<Server> {
  // Local Auth middleware
  await setupLocalAuth(app);

  // Auth routes are handled in localAuth.ts

  // Dashboard stats
/**
 * List dashboard
 * @route GET /api/dashboard/stats
 * @returns JSON data
 * @access Authenticated
 * @see storage.getRequests
 */
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getRequests();
      const contracts = await storage.getContracts();
      const vessels = await storage.getVessels();
      const lcs = await storage.getLettersOfCredit();

      const stats = {
        totalRequests: requests.length,
        totalContracts: contracts.length,
        totalVessels: vessels.length,
        totalLCs: lcs.length,
        pendingRequests: requests.filter(r => r.status === 'pending').length,
        activeContracts: contracts.filter(c => c.status === 'approved').length,
        vesselsInTransit: vessels.filter(v => v.status === 'nominated').length,
        activeLCs: lcs.filter(lc => lc.status === 'active').length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Needs routes
/**
 * List needs
 * @route GET /api/needs
 * @returns JSON data
 * @access Authenticated
 * @see storage.getNeeds
 */
  app.get("/api/needs", isAuthenticated, async (req, res) => {
    try {
      const needs = await storage.getNeeds();
      res.json(needs);
    } catch (error) {
      console.error("Error fetching needs:", error);
      res.status(500).json({ message: "Failed to fetch needs" });
    }
  });

/**
 * Create need
 * @route POST /api/needs
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createNeed
 */
  app.post("/api/needs", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertNeedSchema.parse(req.body);
      const need = await storage.createNeed(validatedData);
      res.status(201).json(need);
    } catch (error) {
      console.error("Error creating need:", error);
      res.status(500).json({ message: "Failed to create need" });
    }
  });

/**
 * Get needs by ID
 * @route GET /api/needs/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getNeed
 */
  app.get("/api/needs/:id", isAuthenticated, async (req, res) => {
    try {
      const need = await storage.getNeed(parseInt(req.params.id));
      if (!need) {
        return res.status(404).json({ message: "Need not found" });
      }
      res.json(need);
    } catch (error) {
      console.error("Error fetching need:", error);
      res.status(500).json({ message: "Failed to fetch need" });
    }
  });

/**
 * Update need
 * @route PATCH /api/needs/:id
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateNeed
 */
  app.patch("/api/needs/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertNeedSchema.partial().parse(req.body);
      const need = await storage.updateNeed(parseInt(req.params.id), validatedData);
      res.json(need);
    } catch (error) {
      console.error("Error updating need:", error);
      res.status(500).json({ message: "Failed to update need" });
    }
  });

/**
 * Delete need
 * @route DELETE /api/needs/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.deleteNeed
 */
  app.delete("/api/needs/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteNeed(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting need:", error);
      res.status(500).json({ message: "Failed to delete need" });
    }
  });

  // Requests routes
/**
 * List requests
 * @route GET /api/requests
 * @returns JSON data
 * @access Authenticated
 * @see storage.getRequests
 */
  app.get("/api/requests", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

/**
 * Create request
 * @route POST /api/requests
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createRequest
 */
  app.post("/api/requests", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRequestSchema.parse(req.body);
      const request = await storage.createRequest(validatedData);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating request:", error);
      res.status(500).json({ message: "Failed to create request" });
    }
  });

/**
 * Get requests by ID
 * @route GET /api/requests/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getRequest
 */
  app.get("/api/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const request = await storage.getRequest(parseInt(req.params.id));
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching request:", error);
      res.status(500).json({ message: "Failed to fetch request" });
    }
  });

/**
 * Update request
 * @route PATCH /api/requests/:id
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateRequest
 */
  app.patch("/api/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRequestSchema.partial().parse(req.body);
      const request = await storage.updateRequest(parseInt(req.params.id), validatedData);
      res.json(request);
    } catch (error) {
      console.error("Error updating request:", error);
      res.status(500).json({ message: "Failed to update request" });
    }
  });

/**
 * Delete request
 * @route DELETE /api/requests/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.deleteRequest
 */
  app.delete("/api/requests/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteRequest(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting request:", error);
      res.status(500).json({ message: "Failed to delete request" });
    }
  });

  // Request votes
/**
 * Get requests by ID
 * @route GET /api/requests/:id/votes
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getRequestVotes
 */
  app.get("/api/requests/:id/votes", isAuthenticated, async (req, res) => {
    try {
      const votes = await storage.getRequestVotes(parseInt(req.params.id));
      res.json(votes);
    } catch (error) {
      console.error("Error fetching request votes:", error);
      res.status(500).json({ message: "Failed to fetch request votes" });
    }
  });

/**
 * Create request
 * @route POST /api/requests/:id/votes
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createRequestVote
 */
  app.post("/api/requests/:id/votes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRequestVoteSchema.parse({
        ...req.body,
        requestId: parseInt(req.params.id),
        userId: (req.user as any).id
      });
      const vote = await storage.createRequestVote(validatedData);
      res.status(201).json(vote);
    } catch (error) {
      console.error("Error creating request vote:", error);
      res.status(500).json({ message: "Failed to create request vote" });
    }
  });

  // Contracts routes
/**
 * List contracts
 * @route GET /api/contracts
 * @returns JSON data
 * @access Authenticated
 * @see storage.getContracts
 */
  app.get("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.getContracts();
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

/**
 * Create contract
 * @route POST /api/contracts
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createContract
 */
  app.post("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertContractSchema.parse(req.body);
      const contract = await storage.createContract(validatedData);
      res.status(201).json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

/**
 * Get contracts by ID
 * @route GET /api/contracts/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getContract
 */
  app.get("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.getContract(parseInt(req.params.id));
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

/**
 * Update contract
 * @route PATCH /api/contracts/:id
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateContract
 */
  app.patch("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertContractSchema.partial().parse(req.body);
      const contract = await storage.updateContract(parseInt(req.params.id), validatedData);
      res.json(contract);
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

/**
 * Delete contract
 * @route DELETE /api/contracts/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.deleteContract
 */
  app.delete("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteContract(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Contract votes
/**
 * Get contracts by ID
 * @route GET /api/contracts/:id/votes
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getContractVotes
 */
  app.get("/api/contracts/:id/votes", isAuthenticated, async (req, res) => {
    try {
      const votes = await storage.getContractVotes(parseInt(req.params.id));
      res.json(votes);
    } catch (error) {
      console.error("Error fetching contract votes:", error);
      res.status(500).json({ message: "Failed to fetch contract votes" });
    }
  });

/**
 * Create contract
 * @route POST /api/contracts/:id/votes
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createContractVote
 */
  app.post("/api/contracts/:id/votes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertContractVoteSchema.parse({
        ...req.body,
        contractId: parseInt(req.params.id),
        userId: (req.user as any).id
      });
      const vote = await storage.createContractVote(validatedData);
      res.status(201).json(vote);
    } catch (error) {
      console.error("Error creating contract vote:", error);
      res.status(500).json({ message: "Failed to create contract vote" });
    }
  });

  // Letters of Credit routes
/**
 * List letters-of-credit
 * @route GET /api/letters-of-credit
 * @returns JSON data
 * @access Authenticated
 * @see storage.getLettersOfCredit
 */
  app.get("/api/letters-of-credit", isAuthenticated, async (req, res) => {
    try {
      const lcs = await storage.getLettersOfCredit();
      res.json(lcs);
    } catch (error) {
      console.error("Error fetching letters of credit:", error);
      res.status(500).json({ message: "Failed to fetch letters of credit" });
    }
  });

/**
 * Create letters-of-credi
 * @route POST /api/letters-of-credit
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createLetterOfCredit
 */
  app.post("/api/letters-of-credit", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertLetterOfCreditSchema.parse(req.body);
      const lc = await storage.createLetterOfCredit(validatedData);
      res.status(201).json(lc);
    } catch (error) {
      console.error("Error creating letter of credit:", error);
      res.status(500).json({ message: "Failed to create letter of credit" });
    }
  });

/**
 * Get letters-of-credit by ID
 * @route GET /api/letters-of-credit/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getLetterOfCredit
 */
  app.get("/api/letters-of-credit/:id", isAuthenticated, async (req, res) => {
    try {
      const lc = await storage.getLetterOfCredit(parseInt(req.params.id));
      if (!lc) {
        return res.status(404).json({ message: "Letter of credit not found" });
      }
      res.json(lc);
    } catch (error) {
      console.error("Error fetching letter of credit:", error);
      res.status(500).json({ message: "Failed to fetch letter of credit" });
    }
  });

/**
 * Update letters-of-credi
 * @route PATCH /api/letters-of-credit/:id
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateLetterOfCredit
 */
  app.patch("/api/letters-of-credit/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertLetterOfCreditSchema.partial().parse(req.body);
      const lc = await storage.updateLetterOfCredit(parseInt(req.params.id), validatedData);
      res.json(lc);
    } catch (error) {
      console.error("Error updating letter of credit:", error);
      res.status(500).json({ message: "Failed to update letter of credit" });
    }
  });

/**
 * Delete letters-of-credi
 * @route DELETE /api/letters-of-credit/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.deleteLetterOfCredit
 */
  app.delete("/api/letters-of-credit/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteLetterOfCredit(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting letter of credit:", error);
      res.status(500).json({ message: "Failed to delete letter of credit" });
    }
  });

  // Vessels routes
/**
 * List vessels
 * @route GET /api/vessels
 * @returns JSON data
 * @access Authenticated
 * @see storage.getVessels
 */
  app.get("/api/vessels", isAuthenticated, async (req, res) => {
    try {
      const vessels = await storage.getVessels();
      res.json(vessels);
    } catch (error) {
      console.error("Error fetching vessels:", error);
      res.status(500).json({ message: "Failed to fetch vessels" });
    }
  });

/**
 * Create vessel
 * @route POST /api/vessels
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createVessel
 */
  app.post("/api/vessels", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVesselSchema.parse(req.body);
      const vessel = await storage.createVessel(validatedData);
      res.status(201).json(vessel);
    } catch (error) {
      console.error("Error creating vessel:", error);
      res.status(500).json({ message: "Failed to create vessel" });
    }
  });

/**
 * Get vessels by ID
 * @route GET /api/vessels/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getVessel
 */
  app.get("/api/vessels/:id", isAuthenticated, async (req, res) => {
    try {
      const vessel = await storage.getVessel(parseInt(req.params.id));
      if (!vessel) {
        return res.status(404).json({ message: "Vessel not found" });
      }
      res.json(vessel);
    } catch (error) {
      console.error("Error fetching vessel:", error);
      res.status(500).json({ message: "Failed to fetch vessel" });
    }
  });

/**
 * Update vessel
 * @route PATCH /api/vessels/:id
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateVessel
 */
  app.patch("/api/vessels/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVesselSchema.partial().parse(req.body);
      const vessel = await storage.updateVessel(parseInt(req.params.id), validatedData);
      res.json(vessel);
    } catch (error) {
      console.error("Error updating vessel:", error);
      res.status(500).json({ message: "Failed to update vessel" });
    }
  });

/**
 * Update vessel
 * @route PATCH /api/vessels/:id/status
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateVesselStatus
 */
  app.patch("/api/vessels/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const vessel = await storage.updateVesselStatus(parseInt(req.params.id), status);
      res.json(vessel);
    } catch (error) {
      console.error("Error updating vessel status:", error);
      res.status(500).json({ message: "Failed to update vessel status" });
    }
  });

/**
 * Delete vessel
 * @route DELETE /api/vessels/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.deleteVessel
 */
  app.delete("/api/vessels/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteVessel(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vessel:", error);
      res.status(500).json({ message: "Failed to delete vessel" });
    }
  });

  // Vessel documents
/**
 * Get vessels by ID
 * @route GET /api/vessels/:id/documents
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getVesselDocuments
 */
  app.get("/api/vessels/:id/documents", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getVesselDocuments(parseInt(req.params.id));
      res.json(documents);
    } catch (error) {
      console.error("Error fetching vessel documents:", error);
      res.status(500).json({ message: "Failed to fetch vessel documents" });
    }
  });

/**
 * Create vessel
 * @route POST /api/vessels/:id/documents
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createDocument
 */
  app.post("/api/vessels/:id/documents", isAuthenticated, upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const document = await storage.createDocument({
        type: req.body.type,
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        vesselId: parseInt(req.params.id),
        uploadedBy: (req.user as any).id,
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading vessel document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Vessel letters of credit
/**
 * Get vessels by ID
 * @route GET /api/vessels/:id/letters-of-credit
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getVesselLettersOfCredit
 */
  app.get("/api/vessels/:id/letters-of-credit", isAuthenticated, async (req, res) => {
    try {
      const lcs = await storage.getVesselLettersOfCredit(parseInt(req.params.id));
      res.json(lcs);
    } catch (error) {
      console.error("Error fetching vessel letters of credit:", error);
      res.status(500).json({ message: "Failed to fetch vessel letters of credit" });
    }
  });

/**
 * Create vessel
 * @route POST /api/vessels/:id/letters-of-credit
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createVesselLetterOfCredit
 */
  app.post("/api/vessels/:id/letters-of-credit", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVesselLetterOfCreditSchema.parse({
        ...req.body,
        vesselId: parseInt(req.params.id)
      });
      const vlc = await storage.createVesselLetterOfCredit(validatedData);
      res.status(201).json(vlc);
    } catch (error) {
      console.error("Error creating vessel letter of credit:", error);
      res.status(500).json({ message: "Failed to create vessel letter of credit" });
    }
  });

  // Vessel loading ports
/**
 * Get vessels by ID
 * @route GET /api/vessels/:id/loading-ports
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getVesselLoadingPorts
 */
  app.get("/api/vessels/:id/loading-ports", isAuthenticated, async (req, res) => {
    try {
      const loadingPorts = await storage.getVesselLoadingPorts(parseInt(req.params.id));
      res.json(loadingPorts);
    } catch (error) {
      console.error("Error fetching vessel loading ports:", error);
      res.status(500).json({ message: "Failed to fetch vessel loading ports" });
    }
  });

/**
 * Create vessel
 * @route POST /api/vessels/:id/loading-ports
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createVesselLoadingPort
 */
  app.post("/api/vessels/:id/loading-ports", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVesselLoadingPortSchema.parse({
        ...req.body,
        vesselId: parseInt(req.params.id)
      });
      const loadingPort = await storage.createVesselLoadingPort(validatedData);
      res.status(201).json(loadingPort);
    } catch (error) {
      console.error("Error creating vessel loading port:", error);
      res.status(500).json({ message: "Failed to create vessel loading port" });
    }
  });

  // Documents routes
/**
 * List documents
 * @route GET /api/documents
 * @returns JSON data
 * @access Authenticated
 * @see storage.getDocuments
 */
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

/**
 * Get documents by ID
 * @route GET /api/documents/:id
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getDocument
 */
  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getDocument(parseInt(req.params.id));
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

/**
 * Get documents by ID
 * @route GET /api/documents/:id/download
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getDocument
 */
  app.get("/api/documents/:id/download", isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getDocument(parseInt(req.params.id));
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const filePath = path.join(process.cwd(), document.path);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      res.download(filePath, document.originalName);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Document votes
/**
 * Get documents by ID
 * @route GET /api/documents/:id/votes
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getDocumentVotes
 */
  app.get("/api/documents/:id/votes", isAuthenticated, async (req, res) => {
    try {
      const votes = await storage.getDocumentVotes(parseInt(req.params.id));
      res.json(votes);
    } catch (error) {
      console.error("Error fetching document votes:", error);
      res.status(500).json({ message: "Failed to fetch document votes" });
    }
  });

/**
 * Create document
 * @route POST /api/documents/:id/votes
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createDocumentVote
 */
  app.post("/api/documents/:id/votes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDocumentVoteSchema.parse({
        ...req.body,
        documentId: parseInt(req.params.id),
        userId: (req.user as any).id
      });
      const vote = await storage.createDocumentVote(validatedData);
      res.status(201).json(vote);
    } catch (error) {
      console.error("Error creating document vote:", error);
      res.status(500).json({ message: "Failed to create document vote" });
    }
  });

  return createServer(app);
}