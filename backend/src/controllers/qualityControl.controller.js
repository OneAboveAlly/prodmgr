const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/auditLogger');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const prisma = new PrismaClient();

// Konfiguracja Multera do obsługi plików
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    // Upewnij się, że folder istnieje
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

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Limit 10MB
}).array('attachments', 10); // Maksymalnie 10 plików

// Middleware do obsługi przesyłania plików
const handleFileUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Błąd przesyłania pliku: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ message: `Nieznany błąd: ${err.message}` });
    }
    next();
  });
};

/**
 * Create a new quality check template
 */
const createQualityTemplate = async (req, res) => {
  try {
    const { name, description, items } = req.body;
    
    if (!name || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid template data. Name and items array are required.' });
    }
    
    const template = await prisma.qualityCheckTemplate.create({
      data: {
        name,
        description,
        items: JSON.stringify(items)
      }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'quality-control',
      targetId: template.id,
      meta: { template: { name, description } }
    });
    
    res.status(201).json({ template, message: 'Quality check template created successfully' });
  } catch (error) {
    console.error('Error creating quality template:', error);
    res.status(500).json({ message: 'Error creating quality check template' });
  }
};

/**
 * Get all quality check templates
 */
const getAllTemplates = async (req, res) => {
  try {
    const templates = await prisma.qualityCheckTemplate.findMany({
      orderBy: { name: 'asc' }
    });
    
    // Parse the items JSON for each template
    const parsedTemplates = templates.map(template => ({
      ...template,
      items: JSON.parse(template.items)
    }));
    
    res.json({ templates: parsedTemplates });
  } catch (error) {
    console.error('Error fetching quality templates:', error);
    res.status(500).json({ message: 'Error fetching quality check templates' });
  }
};

/**
 * Get a quality check template by ID
 */
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.qualityCheckTemplate.findUnique({
      where: { id }
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Quality check template not found' });
    }
    
    // Parse the items JSON
    template.items = JSON.parse(template.items);
    
    res.json({ template });
  } catch (error) {
    console.error('Error fetching quality template:', error);
    res.status(500).json({ message: 'Error fetching quality check template' });
  }
};

/**
 * Update a quality check template
 */
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, items } = req.body;
    
    if (!name || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid template data. Name and items array are required.' });
    }
    
    const existingTemplate = await prisma.qualityCheckTemplate.findUnique({
      where: { id }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ message: 'Quality check template not found' });
    }
    
    const updatedTemplate = await prisma.qualityCheckTemplate.update({
      where: { id },
      data: {
        name,
        description,
        items: JSON.stringify(items)
      }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'quality-control',
      targetId: id,
      meta: { 
        template: { name, description },
        previousName: existingTemplate.name 
      }
    });
    
    res.json({ template: {
      ...updatedTemplate,
      items: JSON.parse(updatedTemplate.items)
    }, message: 'Quality check template updated successfully' });
  } catch (error) {
    console.error('Error updating quality template:', error);
    res.status(500).json({ message: 'Error updating quality check template' });
  }
};

/**
 * Delete a quality check template
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingTemplate = await prisma.qualityCheckTemplate.findUnique({
      where: { id },
      include: {
        qualityChecks: { select: { id: true } }
      }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ message: 'Quality check template not found' });
    }
    
    // Check if the template is in use
    if (existingTemplate.qualityChecks.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete template that is being used by quality checks',
        checksCount: existingTemplate.qualityChecks.length
      });
    }
    
    await prisma.qualityCheckTemplate.delete({
      where: { id }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'quality-control',
      targetId: id,
      meta: { template: { name: existingTemplate.name } }
    });
    
    res.json({ message: 'Quality check template deleted successfully' });
  } catch (error) {
    console.error('Error deleting quality template:', error);
    res.status(500).json({ message: 'Error deleting quality check template' });
  }
};

/**
 * Perform a quality check
 */
const performQualityCheck = async (req, res) => {
  try {
    const { templateId, guideId, stepId, results, notes, passed } = req.body;
    
    if (!templateId || !results) {
      return res.status(400).json({ message: 'Template ID and results are required' });
    }
    
    // Verify the template exists
    const template = await prisma.qualityCheckTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Quality check template not found' });
    }
    
    // Create the quality check
    const qualityCheck = await prisma.qualityCheck.create({
      data: {
        templateId,
        guideId,
        stepId,
        userId: req.user.id,
        results: JSON.stringify(results),
        notes,
        passed: !!passed
      }
    });
    
    // Handle attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const attachment = await prisma.attachment.create({
          data: {
            filename: file.originalname,
            path: file.path,
            size: file.size,
            mimeType: file.mimetype,
            qualityCheckId: qualityCheck.id,
            createdById: req.user.id
          }
        });
        attachments.push(attachment);
      }
    }
    
    // Log the action
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'quality-check',
      targetId: qualityCheck.id,
      meta: { 
        templateId,
        guideId,
        stepId,
        passed: !!passed
      }
    });
    
    // If associated with a step, update the step status based on the quality check
    if (stepId && !passed) {
      await prisma.productionStep.update({
        where: { id: stepId },
        data: { 
          status: 'IN_PROGRESS', // Revert to in-progress if quality check failed
        }
      });
      
      // Log step status change
      await logAudit({
        userId: req.user.id,
        action: 'update',
        module: 'production-step',
        targetId: stepId,
        meta: { 
          status: 'IN_PROGRESS',
          reason: 'Failed quality check'
        }
      });
    }
    
    res.status(201).json({
      qualityCheck: {
        ...qualityCheck,
        results: JSON.parse(qualityCheck.results),
        attachments
      },
      message: 'Quality check performed successfully'
    });
  } catch (error) {
    console.error('Error performing quality check:', error);
    res.status(500).json({ message: 'Error performing quality check' });
  }
};

/**
 * Get quality checks for a guide
 */
const getGuideQualityChecks = async (req, res) => {
  try {
    const { guideId } = req.params;
    
    const qualityChecks = await prisma.qualityCheck.findMany({
      where: { guideId },
      include: {
        template: true,
        user: {
          select: { id: true, firstName: true, lastName: true }
        },
        step: {
          select: { id: true, title: true }
        },
        attachments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Parse the results JSON for each check
    const parsedChecks = qualityChecks.map(check => ({
      ...check,
      results: JSON.parse(check.results),
      template: {
        ...check.template,
        items: JSON.parse(check.template.items)
      }
    }));
    
    res.json({ qualityChecks: parsedChecks });
  } catch (error) {
    console.error('Error fetching guide quality checks:', error);
    res.status(500).json({ message: 'Error fetching quality checks for guide' });
  }
};

/**
 * Get quality checks for a production step
 */
const getStepQualityChecks = async (req, res) => {
  try {
    const { stepId } = req.params;
    
    const qualityChecks = await prisma.qualityCheck.findMany({
      where: { stepId },
      include: {
        template: true,
        user: {
          select: { id: true, firstName: true, lastName: true }
        },
        attachments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Parse the results JSON for each check
    const parsedChecks = qualityChecks.map(check => ({
      ...check,
      results: JSON.parse(check.results),
      template: {
        ...check.template,
        items: JSON.parse(check.template.items)
      }
    }));
    
    res.json({ qualityChecks: parsedChecks });
  } catch (error) {
    console.error('Error fetching step quality checks:', error);
    res.status(500).json({ message: 'Error fetching quality checks for step' });
  }
};

/**
 * Get quality check details by ID
 */
const getQualityCheckById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const qualityCheck = await prisma.qualityCheck.findUnique({
      where: { id },
      include: {
        template: true,
        user: {
          select: { id: true, firstName: true, lastName: true }
        },
        guide: {
          select: { id: true, title: true, barcode: true }
        },
        step: {
          select: { id: true, title: true }
        },
        attachments: true
      }
    });
    
    if (!qualityCheck) {
      return res.status(404).json({ message: 'Quality check not found' });
    }
    
    // Parse the JSON fields
    qualityCheck.results = JSON.parse(qualityCheck.results);
    qualityCheck.template.items = JSON.parse(qualityCheck.template.items);
    
    res.json({ qualityCheck });
  } catch (error) {
    console.error('Error fetching quality check:', error);
    res.status(500).json({ message: 'Error fetching quality check details' });
  }
};

/**
 * Get quality control statistics
 */
const getQualityStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const endDate = to ? new Date(to) : new Date();
    
    // Overall pass/fail rate
    const checkCounts = await prisma.qualityCheck.groupBy({
      by: ['passed'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    });
    
    // Convert to an object
    const passFailStats = checkCounts.reduce((acc, item) => {
      acc[item.passed ? 'passed' : 'failed'] = item._count.id;
      return acc;
    }, { passed: 0, failed: 0 });
    
    // Calculate pass rate percentage
    const totalChecks = passFailStats.passed + passFailStats.failed;
    const passRate = totalChecks > 0 ? (passFailStats.passed / totalChecks) * 100 : 0;
    
    // Most common failure points
    const failureItems = await prisma.$queryRaw`
      SELECT 
        result_item->>'name' as item_name, 
        COUNT(*) as failure_count
      FROM 
        (
          SELECT 
            jsonb_array_elements(results::jsonb) as result_item
          FROM "QualityCheck"
          WHERE passed = false
          AND "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
        ) as results_expanded
      WHERE 
        result_item->>'passed' = 'false'
      GROUP BY 
        item_name
      ORDER BY 
        failure_count DESC
      LIMIT 10
    `;
    
    // Quality check trends over time
    const timelineTrend = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        passed,
        COUNT(*) as count
      FROM "QualityCheck"
      WHERE "createdAt" >= ${startDate}
      AND "createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', "createdAt"), passed
      ORDER BY date ASC
    `;
    
    res.json({
      passFailStats,
      passRate: Math.round(passRate * 100) / 100,
      failureItems,
      timelineTrend
    });
  } catch (error) {
    console.error('Error fetching quality statistics:', error);
    res.status(500).json({ message: 'Error fetching quality control statistics' });
  }
};

/**
 * Export quality checks to CSV
 */
const exportQualityChecksToCSV = async (req, res) => {
  try {
    const { guideId, stepId, from, to, passed } = req.query;
    
    // Buduj filtr na podstawie parametrów zapytania
    const where = {};
    
    if (guideId) where.guideId = guideId;
    if (stepId) where.stepId = stepId;
    
    // Filtrowanie według daty
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    
    // Filtrowanie według statusu (zaliczone/niezaliczone)
    if (passed === 'true') where.passed = true;
    if (passed === 'false') where.passed = false;
    
    // Pobierz dane z bazy
    const qualityChecks = await prisma.qualityCheck.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
        guide: { select: { title: true, barcode: true } },
        step: { select: { title: true } },
        template: { select: { name: true } }
      }
    });
    
    // Generuj nagłówki CSV
    const headers = [
      'ID kontroli', 
      'Szablon', 
      'Przewodnik', 
      'Kod kreskowy', 
      'Krok', 
      'Wykonał', 
      'Data', 
      'Zaliczone', 
      'Uwagi'
    ];
    
    // Generuj wiersze CSV
    const rows = qualityChecks.map(check => [
      check.id,
      check.template.name,
      check.guide?.title || 'N/D',
      check.guide?.barcode || 'N/D',
      check.step?.title || 'N/D',
      `${check.user.firstName} ${check.user.lastName}`,
      new Date(check.createdAt).toLocaleString(),
      check.passed ? 'TAK' : 'NIE',
      check.notes || ''
    ]);
    
    // Połącz wszystko w jeden string CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Loguj operację w dzienniku audytu
    await logAudit({
      userId: req.user.id,
      action: 'export',
      module: 'quality',
      targetId: null,
      meta: { 
        filters: req.query,
        count: qualityChecks.length
      }
    });
    
    // Ustaw nagłówki odpowiedzi
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="quality_checks_${Date.now()}.csv"`);
    
    // Wyślij CSV
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting quality checks:', error);
    res.status(500).json({ message: 'Error exporting quality check data' });
  }
};

module.exports = {
  handleFileUpload,
  createQualityTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  performQualityCheck,
  getGuideQualityChecks,
  getStepQualityChecks,
  getQualityCheckById,
  getQualityStats,
  exportQualityChecksToCSV
}; 