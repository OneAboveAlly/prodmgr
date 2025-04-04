// backend/src/controllers/ocr.controller.js
const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/auditLogger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Tesseract = require('tesseract.js');

const prisma = new PrismaClient();

// Configure storage for OCR images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/ocr');
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for OCR'), false);
  }
};

// Setup upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limit to 5MB
}).single('image');

// Middleware to handle file upload
const handleOcrUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ message: `Unknown error: ${err.message}` });
    }
    next();
  });
};

// Process OCR on an uploaded image
const processImageOcr = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    // Get the file path
    const filePath = req.file.path;
    
    // Optional parameters from request
    const { stepId, language = 'eng' } = req.body;
    
    // Perform OCR
    const { data } = await Tesseract.recognize(
      filePath,
      language,
      { logger: m => console.log(m) } // Optional progress logger
    );
    
    // Extract text and confidence
    const { text, confidence } = data;
    
    // Create OCR result record
    const ocrResult = await prisma.ocrResult.create({
      data: {
        filePath: req.file.path,
        fileName: req.file.originalname,
        text,
        confidence,
        stepId: stepId || null,
        userId: req.user.id
      }
    });
    
    // If stepId is provided, create an attachment for the step
    if (stepId) {
      // Verify step exists
      const step = await prisma.productionStep.findUnique({
        where: { id: stepId }
      });
      
      if (step) {
        await prisma.attachment.create({
          data: {
            filename: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimeType: req.file.mimetype,
            productionStepId: stepId,
            createdById: req.user.id
          }
        });
        
        // Add a comment with the OCR text
        await prisma.stepComment.create({
          data: {
            stepId,
            content: `OCR extracted text:\n\n${text}`,
            userId: req.user.id
          }
        });
      }
    }
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'ocr',
      module: 'production',
      targetId: stepId || null,
      meta: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        confidence,
        textLength: text.length
      }
    });
    
    res.json({
      success: true,
      text,
      confidence,
      file: {
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      },
      id: ocrResult.id
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({ message: 'Error processing image for OCR' });
  }
};

// Update OCR text (manual correction)
const updateOcrText = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'No text provided for update' });
    }
    
    // Find the OCR result
    const ocrResult = await prisma.ocrResult.findUnique({
      where: { id }
    });
    
    if (!ocrResult) {
      return res.status(404).json({ message: 'OCR result not found' });
    }
    
    // Check if user is authorized to update
    if (ocrResult.userId !== req.user.id && !req.user.permissions['production.manageAll']) {
      return res.status(403).json({ message: 'Not authorized to update this OCR result' });
    }
    
    // Update the text
    const updatedResult = await prisma.ocrResult.update({
      where: { id },
      data: {
        text,
        manuallyEdited: true
      }
    });
    
    // If associated with a step, update the comment
    if (ocrResult.stepId) {
      // Find the most recent comment with OCR text
      const comment = await prisma.stepComment.findFirst({
        where: {
          stepId: ocrResult.stepId,
          content: { contains: 'OCR extracted text' },
          userId: ocrResult.userId
        },
        orderBy: { createdAt: 'desc' }
      });
      
      if (comment) {
        await prisma.stepComment.create({
          data: {
            stepId: ocrResult.stepId,
            content: `Updated OCR text:\n\n${text}`,
            userId: req.user.id
          }
        });
      }
    }
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'ocr',
      targetId: id,
      meta: {
        stepId: ocrResult.stepId,
        previousTextLength: ocrResult.text.length,
        newTextLength: text.length
      }
    });
    
    res.json({
      success: true,
      text: updatedResult.text,
      message: 'OCR text updated successfully'
    });
  } catch (error) {
    console.error('OCR update error:', error);
    res.status(500).json({ message: 'Error updating OCR text' });
  }
};

// Get OCR history for a step
const getStepOcrHistory = async (req, res) => {
  try {
    const { stepId } = req.params;
    
    // Verify step exists
    const step = await prisma.productionStep.findUnique({
      where: { id: stepId },
      include: {
        guide: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Production step not found' });
    }
    
    // Get OCR results for this step
    const ocrResults = await prisma.ocrResult.findMany({
      where: { stepId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    res.json({
      step: {
        id: step.id,
        title: step.title,
        guide: step.guide
      },
      ocrResults
    });
  } catch (error) {
    console.error('Error fetching OCR history:', error);
    res.status(500).json({ message: 'Error retrieving OCR history for step' });
  }
};

module.exports = {
  handleOcrUpload,
  processImageOcr,
  updateOcrText,
  getStepOcrHistory
};