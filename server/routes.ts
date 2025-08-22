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

export async function registerRoutes(app: Express): Promise<Server> {
  // Local Auth middleware
  await setupLocalAuth(app);

  // Auth routes are handled in localAuth.ts

  // Needs routes
/**
 * List needs
 * @route GET /api/needs
 * @returns JSON data
 * @access Authenticated
 * @see storage.getNeeds
 */
  app.get('/api/needs', isAuthenticated, async (req: any, res) => {
    try {
      const needs = await storage.getNeeds();
      res.json(needs);
    } catch (error) {
      console.error("Error fetching needs:", error);
      res.status(500).json({ message: "Failed to fetch needs" });
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
  app.get('/api/needs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const need = await storage.getNeed(id);
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
 * Create need
 * @route POST /api/needs
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createNeed
 */
  app.post('/api/needs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const needData = insertNeedSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const need = await storage.createNeed(needData);
      res.status(201).json(need);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating need:", error);
      res.status(500).json({ message: "Failed to create need" });
    }
  });

/**
 * Replace need
 * @route PUT /api/needs/:id
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateNeed
 */
  app.put('/api/needs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertNeedSchema.partial().parse(req.body);
      const updatedNeed = await storage.updateNeed(id, updates);
      if (!updatedNeed) {
        return res.status(404).json({ message: "Need not found" });
      }
      res.json(updatedNeed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating need:", error);
      res.status(500).json({ message: "Failed to update need" });
    }
  });

/**
 * Update need
 * @route PATCH /api/needs/:id/status
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateNeedStatus
 */
  app.patch('/api/needs/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updatedNeed = await storage.updateNeedStatus(id, status);
      if (!updatedNeed) {
        return res.status(404).json({ message: "Need not found" });
      }
      res.json(updatedNeed);
    } catch (error) {
      console.error("Error updating need status:", error);
      res.status(500).json({ message: "Failed to update need status" });
    }
  });

/**
 * Update need
 * @route PATCH /api/needs/:id/progress
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateNeedProgress
 */
  app.patch('/api/needs/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { actualQuantity } = req.body;
      const updatedNeed = await storage.updateNeedProgress(id, actualQuantity);
      if (!updatedNeed) {
        return res.status(404).json({ message: "Need not found" });
      }
      res.json(updatedNeed);
    } catch (error) {
      console.error("Error updating need progress:", error);
      res.status(500).json({ message: "Failed to update need progress" });
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
  app.delete('/api/needs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNeed(id);
      res.json({ message: "Need deleted successfully" });
    } catch (error) {
      console.error("Error deleting need:", error);
      res.status(500).json({ message: "Failed to delete need" });
    }
  });

  // Progress tracking routes
/**
 * Create need
 * @route POST /api/needs/update-progress
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateNeedsProgressFromVessels
 */
  app.post('/api/needs/update-progress', isAuthenticated, async (req: any, res) => {
    try {
      await storage.updateNeedsProgressFromVessels();
      res.json({ message: "Needs progress updated successfully" });
    } catch (error) {
      console.error("Error updating needs progress:", error);
      res.status(500).json({ message: "Failed to update needs progress" });
    }
  });

/**
 * List needs
 * @route GET /api/needs/progress-report
 * @returns JSON data
 * @access Authenticated
 * @see storage.getNeedsProgressReport
 */
  app.get('/api/needs/progress-report', isAuthenticated, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const report = await storage.getNeedsProgressReport(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(report);
    } catch (error) {
      console.error("Error fetching needs progress report:", error);
      res.status(500).json({ message: "Failed to fetch needs progress report" });
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
  app.get('/api/requests', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log("Raw request body:", req.body);
      const requestData = insertRequestSchema.parse({
        ...req.body,
        createdBy: userId,
        uploadedFile: req.body.uploadedFile || null, // Allow null for draft requests
      });
      console.log("Parsed request data:", requestData);
      
      const request = await storage.createRequest(requestData);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating request:", error);
      res.status(500).json({ message: "Failed to create request" });
    }
  });

/**
 * Replace request
 * @route PUT /api/requests/:id
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateRequest
 */
  app.put('/api/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertRequestSchema.partial().parse(req.body);
      const updatedRequest = await storage.updateRequest(id, updates);
      res.json(updatedRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating request:", error);
      res.status(500).json({ message: "Failed to update request" });
    }
  });

/**
 * Update request
 * @route PATCH /api/requests/:id/status
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateRequestStatus
 */
  app.patch('/api/requests/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updatedRequest = await storage.updateRequestStatus(id, status);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating request status:", error);
      res.status(500).json({ message: "Failed to update request status" });
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
  app.delete('/api/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRequest(id);
      res.json({ message: "Request deleted successfully" });
    } catch (error) {
      console.error("Error deleting request:", error);
      res.status(500).json({ message: "Failed to delete request" });
    }
  });

  // Request voting routes
/**
 * Get requests by ID
 * @route GET /api/requests/:id/votes
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getRequestVotes
 */
  app.get('/api/requests/:id/votes', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const votes = await storage.getRequestVotes(requestId);
      res.json(votes);
    } catch (error) {
      console.error("Error fetching request votes:", error);
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

/**
 * Create request
 * @route POST /api/requests/:id/votes
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.getRequestVotes
 */
  app.post('/api/requests/:id/votes', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user has already voted on this request
      const existingVotes = await storage.getRequestVotes(requestId);
      const userVote = existingVotes.find(vote => vote.userId === userId);
      
      if (userVote) {
        return res.status(400).json({ message: "You have already voted on this request. To change your vote, please contact an administrator." });
      }
      
      const voteData = insertRequestVoteSchema.parse({
        ...req.body,
        requestId,
        userId,
      });
      
      const vote = await storage.createRequestVote(voteData);
      res.status(201).json(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating vote:", error);
      res.status(500).json({ message: "Failed to create vote" });
    }
  });

  // Contract voting routes
/**
 * Get contracts by ID
 * @route GET /api/contracts/:id/votes
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getContractVotes
 */
  app.get('/api/contracts/:id/votes', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const votes = await storage.getContractVotes(contractId);
      res.json(votes);
    } catch (error) {
      console.error("Error fetching contract votes:", error);
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

/**
 * Create contract
 * @route POST /api/contracts/:id/votes
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.getContractVotes
 */
  app.post('/api/contracts/:id/votes', isAuthenticated, async (req: any, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user has already voted on this contract
      const existingVotes = await storage.getContractVotes(contractId);
      const userVote = existingVotes.find(vote => vote.userId === userId);
      
      if (userVote) {
        return res.status(400).json({ message: "You have already voted on this contract. To change your vote, please contact an administrator." });
      }
      
      const voteData = insertContractVoteSchema.parse({
        ...req.body,
        contractId,
        userId,
      });
      
      const vote = await storage.createContractVote(voteData);
      res.status(201).json(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating vote:", error);
      res.status(500).json({ message: "Failed to create vote" });
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
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/contracts', isAuthenticated, upload.single('contractFile'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Log incoming data for debugging
      console.log("Raw contract data received:", req.body);
      console.log("File received:", req.file?.filename);
      
      // Prepare data for validation
      const rawData = {
        ...req.body,
        requestId: parseInt(req.body.requestId),
        quantity: req.body.quantity ? parseInt(req.body.quantity) : null,
        uploadedFile: req.file?.filename,
        createdBy: userId,
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      };
      
      console.log("Processed data for validation:", rawData);
      
      const contractData = insertContractSchema.parse(rawData);
      
      const contract = await storage.createContract(contractData);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Contract validation errors:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

/**
 * Replace contract
 * @route PUT /api/contracts/:id
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateContract
 */
  app.put('/api/contracts/:id', isAuthenticated, upload.single('contractFile'), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Log incoming data for debugging
      console.log("Raw contract update data received:", req.body);
      console.log("File received:", req.file?.filename);
      
      // Prepare data for validation with proper type conversion
      const updateData: any = { ...req.body };
      
      // Convert numeric fields if present
      if (updateData.requestId) updateData.requestId = parseInt(updateData.requestId);
      if (updateData.quantity) updateData.quantity = parseInt(updateData.quantity);
      
      // Convert dates if present
      if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
      if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
      
      // Add file if uploaded
      if (req.file) {
        updateData.uploadedFile = req.file.filename;
      }
      
      console.log("Processed contract update data:", updateData);
      
      const updates = insertContractSchema.partial().parse(updateData);
      const updatedContract = await storage.updateContract(id, updates);
      res.json(updatedContract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Contract update validation errors:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

/**
 * Update contract
 * @route PATCH /api/contracts/:id/status
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateContractStatus
 */
  app.patch('/api/contracts/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updatedContract = await storage.updateContractStatus(id, status);
      res.json(updatedContract);
    } catch (error) {
      console.error("Error updating contract status:", error);
      res.status(500).json({ message: "Failed to update contract status" });
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
  app.patch('/api/vessels/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updatedVessel = await storage.updateVesselStatus(id, status);
      res.json(updatedVessel);
    } catch (error) {
      console.error("Error updating vessel status:", error);
      res.status(500).json({ message: "Failed to update vessel status" });
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
  app.get('/api/letters-of-credit', isAuthenticated, async (req: any, res) => {
    try {
      const lettersOfCredit = await storage.getLettersOfCredit();
      
      // Add allocated quantity to each LC
      const lettersWithAllocated = await Promise.all(
        lettersOfCredit.map(async (lc) => {
          const allocatedQuantity = await storage.getAllocatedQuantityForLC(lc.id);
          return {
            ...lc,
            allocatedQuantity,
            remainingQuantity: lc.quantity - allocatedQuantity
          };
        })
      );
      
      res.json(lettersWithAllocated);
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
  app.post('/api/letters-of-credit', isAuthenticated, upload.single('lcFile'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Log incoming data for debugging
      console.log("Raw LC data received:", req.body);
      console.log("File received:", req.file?.filename);
      
      // Check if file is uploaded (now mandatory)
      if (!req.file) {
        return res.status(400).json({ message: "LC documentation file is required" });
      }
      
      // Prepare data for validation with proper type conversion
      const rawData = {
        ...req.body,
        unitPrice: req.body.unitPrice ? req.body.unitPrice.toString() : "0", // Convert to string for decimal field
        quantity: req.body.quantity ? parseInt(req.body.quantity) : 0, // Convert to number
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : null,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
        uploadedFile: req.file.filename, // No longer optional
        createdBy: userId,
      };
      
      console.log("Processed LC data for validation:", rawData);
      
      const lcData = insertLetterOfCreditSchema.parse(rawData);
      
      const lc = await storage.createLetterOfCredit(lcData);
      res.status(201).json(lc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("LC validation errors:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating letter of credit:", error);
      res.status(500).json({ message: "Failed to create letter of credit" });
    }
  });

/**
 * Replace letters-of-credi
 * @route PUT /api/letters-of-credit/:id
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.getUser
 */
  app.put('/api/letters-of-credit/:id', isAuthenticated, upload.single('lcFile'), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const userRole = user?.role;
      
      // Check role permissions - allow all authenticated users for LC updates
      if (!userRole) {
        return res.status(403).json({ message: "User role not found." });
      }
      
      // Log incoming data for debugging
      console.log("Raw LC update data received:", req.body);
      console.log("File received:", req.file?.filename);
      console.log("User ID:", userId, "Role:", userRole);
      
      // Get existing LC to preserve uploadedFile if no new file provided
      const existingLC = await storage.getLetterOfCredit(id);
      if (!existingLC) {
        return res.status(404).json({ message: "Letter of Credit not found" });
      }
      
      console.log("Existing LC found:", existingLC.id, "Current file:", existingLC.uploadedFile);
      
      // Prepare data for validation with proper type conversion
      const updateData: any = { ...req.body };
      
      // Convert unitPrice to string for decimal field if present
      if (updateData.unitPrice) updateData.unitPrice = updateData.unitPrice.toString();
      
      // Convert quantity to number if present
      if (updateData.quantity) updateData.quantity = parseInt(updateData.quantity);
      
      // Convert dates if present
      if (updateData.issueDate) updateData.issueDate = new Date(updateData.issueDate);
      if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);
      
      // Handle file upload - use new file if provided, otherwise keep existing
      if (req.file) {
        updateData.uploadedFile = req.file.filename;
        console.log("New file uploaded:", req.file.filename);
      } else if (existingLC.uploadedFile) {
        // Preserve existing file to ensure NOT NULL constraint is satisfied
        updateData.uploadedFile = existingLC.uploadedFile;
        console.log("Preserving existing file:", existingLC.uploadedFile);
      } else {
        console.error("No file provided and no existing file found for LC:", id);
        return res.status(400).json({ message: "LC documentation is required" });
      }
      
      console.log("Processed LC update data:", updateData);
      
      const updates = insertLetterOfCreditSchema.partial().parse(updateData);
      console.log("Validated updates:", updates);
      
      const updatedLC = await storage.updateLetterOfCredit(id, updates);
      console.log("LC updated successfully:", updatedLC?.id);
      
      res.json(updatedLC);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("LC update validation errors:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
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
  app.delete('/api/letters-of-credit/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      await storage.deleteLetterOfCredit(id);
      res.json({ success: true, message: "Letter of Credit deleted successfully" });
    } catch (error) {
      console.error("Error deleting letter of credit:", error);
      res.status(500).json({ message: "Failed to delete letter of credit" });
    }
  });

  // Get vessels associated with a specific LC
/**
 * Get letters-of-credit by ID
 * @route GET /api/letters-of-credit/:id/vessels
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getLCVessels
 */
  app.get('/api/letters-of-credit/:id/vessels', isAuthenticated, async (req: any, res) => {
    try {
      const lcId = parseInt(req.params.id);
      console.log("Fetching vessels for LC ID:", lcId);
      
      const lcVessels = await storage.getLCVessels(lcId);
      console.log("LC vessels found:", lcVessels);
      
      // Return the vessel relationships directly with vesselId and quantity
      res.json(lcVessels);
    } catch (error) {
      console.error("Error fetching LC vessels:", error);
      res.status(500).json({ message: "Failed to fetch LC vessels" });
    }
  });

  // Get allocated quantity for a specific LC
/**
 * Get letters-of-credit by ID
 * @route GET /api/letters-of-credit/:id/allocated-quantity
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getAllocatedQuantityForLC
 */
  app.get('/api/letters-of-credit/:id/allocated-quantity', isAuthenticated, async (req: any, res) => {
    try {
      const lcId = parseInt(req.params.id);
      const allocatedQuantity = await storage.getAllocatedQuantityForLC(lcId);
      res.json({ allocatedQuantity });
    } catch (error) {
      console.error("Error fetching allocated quantity:", error);
      res.status(500).json({ message: "Failed to fetch allocated quantity" });
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
  app.get('/api/vessels', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/vessels', isAuthenticated, upload.single('instructionsFile'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Parse numeric fields
      const vesselData = insertVesselSchema.parse({
        ...req.body,
        contractId: req.body.contractId ? parseInt(req.body.contractId) : undefined,
        lcId: req.body.lcId ? parseInt(req.body.lcId) : undefined,
        quantity: req.body.quantity ? parseInt(req.body.quantity) : 0,
        actualQuantity: req.body.actualQuantity ? parseInt(req.body.actualQuantity) : undefined,
        instructionsFile: req.file?.filename,
        createdBy: userId,
      });
      
      const vessel = await storage.createVessel(vesselData);
      res.status(201).json(vessel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating vessel:", error);
      res.status(500).json({ message: "Failed to create vessel" });
    }
  });

/**
 * Replace vessel
 * @route PUT /api/vessels/:id
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateVessel
 */
  app.put('/api/vessels/:id', isAuthenticated, upload.fields([
    { name: 'instructionsFile', maxCount: 1 },
    { name: 'customsReleaseFile', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      
      console.log("Vessel update request body:", req.body);
      console.log("Files received:", req.files);
      
      // Handle file uploads
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const instructionsFile = files?.instructionsFile?.[0];
      const customsReleaseFile = files?.customsReleaseFile?.[0];
      
      // Parse dates for discharge tracking
      const updateData: any = { ...req.body };
      
      if (updateData.arrivalDate) updateData.arrivalDate = new Date(updateData.arrivalDate);
      if (updateData.dischargeStartDate) updateData.dischargeStartDate = new Date(updateData.dischargeStartDate);
      if (updateData.dischargeEndDate) updateData.dischargeEndDate = new Date(updateData.dischargeEndDate);
      if (updateData.customsReleaseDate) updateData.customsReleaseDate = new Date(updateData.customsReleaseDate);
      
      // Parse numeric fields
      const updates = insertVesselSchema.partial().parse({
        ...updateData,
        contractId: updateData.contractId ? parseInt(updateData.contractId) : undefined,
        lcId: updateData.lcId ? parseInt(updateData.lcId) : undefined,
        quantity: updateData.quantity ? parseInt(updateData.quantity) : undefined,
        actualQuantity: updateData.actualQuantity ? parseInt(updateData.actualQuantity) : undefined,
        instructionsFile: instructionsFile?.filename || updateData.instructionsFile,
        customsReleaseFile: customsReleaseFile?.filename || updateData.customsReleaseFile,
      });
      
      console.log("Processed vessel updates:", updates);
      
      // Check if customs release document was uploaded and automatically change status to completed
      if (customsReleaseFile) {
        updates.status = 'completed';
        updates.customsReleaseStatus = 'received'; // Set customs release status to received when document is uploaded
        console.log("Customs release document uploaded - automatically setting vessel status to 'completed'");
      }
      
      const updatedVessel = await storage.updateVessel(id, updates);
      res.json(updatedVessel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Vessel update validation error:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating vessel:", error);
      res.status(500).json({ message: "Failed to update vessel" });
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
  app.delete('/api/vessels/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      await storage.deleteVessel(id);
      res.json({ success: true, message: "Vessel deleted successfully" });
    } catch (error) {
      console.error("Error deleting vessel:", error);
      res.status(500).json({ message: "Failed to delete vessel" });
    }
  });

  // Vessel documents routes
/**
 * Get vessels by ID
 * @route GET /api/vessels/:id/documents
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getVesselDocuments
 */
  app.get('/api/vessels/:id/documents', isAuthenticated, async (req: any, res) => {
    try {
      const vesselId = parseInt(req.params.id);
      const documents = await storage.getVesselDocuments(vesselId);
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
 * @see storage.createVesselDocument
 */
  app.post('/api/vessels/:id/documents', isAuthenticated, upload.single('document'), async (req: any, res) => {
    try {
      const vesselId = parseInt(req.params.id);
      const userId = req.user.id;
      const { documentType, documentName, notes } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Document file is required" });
      }

      const document = await storage.createVesselDocument({
        vesselId,
        documentType,
        documentName,
        fileName: req.file.filename,
        filePath: req.file.path,
        uploadedBy: userId,
        notes: notes || null,
      });

      // Check if this is a customs release document and automatically update vessel status
      if (documentType === 'customs_release') {
        await storage.updateVessel(vesselId, {
          status: 'completed',
          customsReleaseStatus: 'received',
          customsReleaseFile: req.file.filename,
        });
        console.log(`Customs release document uploaded for vessel ${vesselId} - status changed to 'completed'`);
      }

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading vessel document:", error);
      res.status(500).json({ message: "Failed to upload vessel document" });
    }
  });

/**
 * Delete vessel
 * @route DELETE /api/vessels/:vesselId/documents/:documentId
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.deleteVesselDocument
 */
  app.delete('/api/vessels/:vesselId/documents/:documentId', isAuthenticated, async (req: any, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      await storage.deleteVesselDocument(documentId);
      res.json({ success: true, message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting vessel document:", error);
      res.status(500).json({ message: "Failed to delete vessel document" });
    }
  });

  // Vessel Letters of Credit routes
/**
 * Get vessels by ID
 * @route GET /api/vessels/:id/letters-of-credit
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getVesselLettersOfCredit
 */
  app.get('/api/vessels/:id/letters-of-credit', isAuthenticated, async (req: any, res) => {
    try {
      const vesselId = parseInt(req.params.id);
      const vesselLCs = await storage.getVesselLettersOfCredit(vesselId);
      res.json(vesselLCs);
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
  app.post('/api/vessels/:id/letters-of-credit', isAuthenticated, async (req: any, res) => {
    try {
      const vesselId = parseInt(req.params.id);
      const vesselLcData = insertVesselLetterOfCreditSchema.parse({
        ...req.body,
        vesselId,
        lcId: parseInt(req.body.lcId),
        quantity: parseInt(req.body.quantity) || 0,
      });
      
      const vesselLc = await storage.createVesselLetterOfCredit(vesselLcData);
      res.status(201).json(vesselLc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating vessel letter of credit:", error);
      res.status(500).json({ message: "Failed to create vessel letter of credit" });
    }
  });

/**
 * Delete vessel
 * @route DELETE /api/vessels/:vesselId/letters-of-credit/:lcId
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.deleteVesselLetterOfCredit
 */
  app.delete('/api/vessels/:vesselId/letters-of-credit/:lcId', isAuthenticated, async (req: any, res) => {
    try {
      const lcId = parseInt(req.params.lcId);
      await storage.deleteVesselLetterOfCredit(lcId);
      res.json({ success: true, message: "Vessel letter of credit removed successfully" });
    } catch (error) {
      console.error("Error removing vessel letter of credit:", error);
      res.status(500).json({ message: "Failed to remove vessel letter of credit" });
    }
  });

  // Vessel Loading Ports routes
/**
 * Get vessels by ID
 * @route GET /api/vessels/:id/loading-ports
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getVesselLoadingPorts
 */
  app.get('/api/vessels/:id/loading-ports', isAuthenticated, async (req: any, res) => {
    try {
      const vesselId = parseInt(req.params.id);
      const loadingPorts = await storage.getVesselLoadingPorts(vesselId);
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
  app.post('/api/vessels/:id/loading-ports', isAuthenticated, async (req: any, res) => {
    try {
      const vesselId = parseInt(req.params.id);
      const portData = insertVesselLoadingPortSchema.parse({
        ...req.body,
        vesselId,
        expectedQuantity: parseInt(req.body.expectedQuantity) || 0,
        actualQuantity: req.body.actualQuantity ? parseInt(req.body.actualQuantity) : null,
      });
      
      const loadingPort = await storage.createVesselLoadingPort(portData);
      res.status(201).json(loadingPort);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating vessel loading port:", error);
      res.status(500).json({ message: "Failed to create vessel loading port" });
    }
  });

/**
 * Replace vessel
 * @route PUT /api/vessels/:vesselId/loading-ports/:portId
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.updateVesselLoadingPort
 */
  app.put('/api/vessels/:vesselId/loading-ports/:portId', isAuthenticated, async (req: any, res) => {
    try {
      const portId = parseInt(req.params.portId);
      const updates = insertVesselLoadingPortSchema.partial().parse({
        ...req.body,
        expectedQuantity: req.body.expectedQuantity ? parseInt(req.body.expectedQuantity) : undefined,
        actualQuantity: req.body.actualQuantity ? parseInt(req.body.actualQuantity) : undefined,
      });
      
      const updatedPort = await storage.updateVesselLoadingPort(portId, updates);
      res.json(updatedPort);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating vessel loading port:", error);
      res.status(500).json({ message: "Failed to update vessel loading port" });
    }
  });

/**
 * Delete vessel
 * @route DELETE /api/vessels/:vesselId/loading-ports/:portId
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.deleteVesselLoadingPort
 */
  app.delete('/api/vessels/:vesselId/loading-ports/:portId', isAuthenticated, async (req: any, res) => {
    try {
      const portId = parseInt(req.params.portId);
      await storage.deleteVesselLoadingPort(portId);
      res.json({ success: true, message: "Loading port deleted successfully" });
    } catch (error) {
      console.error("Error deleting vessel loading port:", error);
      res.status(500).json({ message: "Failed to delete vessel loading port" });
    }
  });

  // Document voting routes
/**
 * Get document-votes by ID
 * @route GET /api/document-votes/:entityType/:entityId
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 * @see storage.getDocumentVotes
 */
  app.get('/api/document-votes/:entityType/:entityId', isAuthenticated, async (req: any, res) => {
    try {
      const { entityType, entityId } = req.params;
      const votes = await storage.getDocumentVotes(entityType, parseInt(entityId));
      res.json(votes);
    } catch (error) {
      console.error("Error fetching document votes:", error);
      res.status(500).json({ message: "Failed to fetch document votes" });
    }
  });

  // General documents route for the documents page
/**
 * List documents
 * @route GET /api/documents
 * @returns JSON data
 * @access Authenticated
 * @see storage.getDocumentVotes
 */
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      // Get all document votes as our document list
      const allVotes = await storage.getDocumentVotes("", 0); // Get all document votes
      res.json(allVotes);
    } catch (error) {
      console.error("Error fetching all documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

/**
 * Create upload-documen
 * @route POST /api/upload-document
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createVesselDocument
 */
  app.post('/api/upload-document', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { entityType, entityId, documentType, title } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Handle vessel documents differently - use the vessel document system
      if (entityType === 'vessel') {
        const vesselDocumentData = {
          vesselId: parseInt(entityId),
          documentType: documentType || 'other',
          documentName: title || req.file.originalname,
          fileName: req.file.originalname,
          filePath: req.file.filename,
          uploadedBy: userId,
          notes: req.body.notes || '',
        };

        const vesselDocument = await storage.createVesselDocument(vesselDocumentData);

        // Check if this is a customs release document and automatically update vessel status
        if (documentType === 'customs_release') {
          await storage.updateVessel(parseInt(entityId), {
            status: 'completed',
            customsReleaseStatus: 'received',
            customsReleaseFile: req.file.filename,
          });
          console.log(`Customs release document uploaded for vessel ${entityId} - status changed to 'completed'`);
        }

        res.status(201).json(vesselDocument);
      } else {
        // For other entity types, use the document vote system
        const voteData = insertDocumentVoteSchema.parse({
          entityType,
          entityId: parseInt(entityId),
          fileName: req.file.originalname,
          filePath: req.file.filename,
          userId,
          vote: 'pending', // Initial status
          uploadedBy: userId,
        });
        
        const documentVote = await storage.createDocumentVote(voteData);
        res.status(201).json(documentVote);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

/**
 * Create document-vote
 * @route POST /api/document-votes/:id/vote
 * @param req.params.id Resource identifier
 * @param req.body Request payload
 * @returns JSON data
 * @access Authenticated
 * @see storage.createDocumentVote
 */
  app.post('/api/document-votes/:id/vote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { vote, comment } = req.body;
      const documentId = parseInt(req.params.id);
      
      // Validate that comment is provided for reject votes
      if (vote === 'reject' && (!comment || comment.trim() === '')) {
        return res.status(400).json({ message: "Comment is required when rejecting a document" });
      }

      const voteData = insertDocumentVoteSchema.parse({
        entityType: req.body.entityType || 'document',
        entityId: documentId,
        fileName: req.body.fileName || 'vote',
        filePath: req.body.filePath || 'vote',
        userId,
        vote,
        comment,
        uploadedBy: userId,
      });
      
      const documentVote = await storage.createDocumentVote(voteData);
      res.status(201).json(documentVote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error submitting vote:", error);
      res.status(500).json({ message: "Failed to submit vote" });
    }
  });

  // File serving route
/**
 * Get files by ID
 * @route GET /api/files/:filename
 * @param req.params.id Resource identifier
 * @returns JSON data
 * @access Authenticated
 */
  app.get('/api/files/:filename', isAuthenticated, (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}