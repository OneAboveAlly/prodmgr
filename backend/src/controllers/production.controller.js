// backend/src/controllers/production.controller.js
const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/auditLogger');
const { sendNotification } = require('../utils/notificationUtils');
const barcodeGenerator = require('../utils/barcodeGenerator');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

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

// Generate a structured barcode for production guides
const generateProductionBarcode = async () => {
  const year = new Date().getFullYear();
  
  // Get the count of guides for this year to generate sequential number
  const count = await prisma.productionGuide.count({
    where: {
      barcode: {
        startsWith: `PROD-${year}-`
      }
    }
  });
  
  // Format: PROD-YYYY-XXXX (XXXX is sequential padded with zeros)
  const sequentialNumber = (count + 1).toString().padStart(4, '0');
  return `PROD-${year}-${sequentialNumber}`;
};

// Enhanced create production guide function
const createProductionGuide = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      priority, 
      autoPriority,
      deadline,
      assignedUsers = []
    } = req.body;
    
    // Generate a structured barcode
    const uniqueBarcode = await generateProductionBarcode();
    
    // Create guide with enhanced fields
    const guide = await prisma.productionGuide.create({
      data: {
        title,
        description,
        priority: priority || 'NORMAL',
        autoPriority: autoPriority || false,
        deadline: deadline ? new Date(deadline) : null,
        barcode: uniqueBarcode,
        createdById: req.user.id
      }
    });
    
    // Log creation in change history
    await prisma.guideChangeHistory.create({
      data: {
        guideId: guide.id,
        userId: req.user.id,
        changeType: 'CREATE',
        fieldName: 'all',
        newValue: JSON.stringify({
          title,
          description,
          priority,
          autoPriority,
          deadline
        })
      }
    });
    
    // Assign users if provided
    if (assignedUsers.length > 0) {
      const userAssignments = assignedUsers.map(userId => ({
        userId,
        guideId: guide.id
      }));
      
      await prisma.guideAssignment.createMany({
        data: userAssignments
      });
      
      // Send notifications to assigned users
      for (const userId of assignedUsers) {
        await sendNotification(
          req.app.get('io'),
          prisma,
          userId,
          `You have been assigned to a new production guide: ${title}`,
          `/production/guides/${guide.id}`
        );
      }
    }
    
    // Attachments handling code remains the same
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const attachment = await prisma.attachment.create({
          data: {
            filename: file.originalname,
            path: file.path,
            size: file.size,
            mimeType: file.mimetype,
            productionGuideId: guide.id,
            createdById: req.user.id
          }
        });
        attachments.push(attachment);
      }
    }
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'production',
      targetId: guide.id,
      meta: { 
        guide: { 
          title, 
          description, 
          priority, 
          barcode: uniqueBarcode,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          autoPriority: autoPriority || false
        } 
      }
    });
    
    res.status(201).json({
      guide,
      attachments,
      message: 'Production guide created successfully'
    });
  } catch (error) {
    console.error('Error creating guide:', error);
    res.status(500).json({ message: 'Error creating production guide' });
  }
};

// Pobieranie wszystkich przewodników produkcyjnych z paginacją
const getAllProductionGuides = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtrowanie
    const { status, priority, search, createdBy } = req.query;
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (createdBy) {
      where.createdById = createdBy;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Pobieranie danych
    const [guides, total] = await Promise.all([
      prisma.productionGuide.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          steps: {
            select: {
              id: true,
              title: true,
              status: true
            }
          },
          attachments: true,
          inventory: {
            include: {
              item: true
            }
          }
        }
      }),
      prisma.productionGuide.count({ where })
    ]);
    
    // Podstawowe statystyki
    const stats = {
      totalGuides: total,
      inProgress: await prisma.productionGuide.count({ where: { status: 'IN_PROGRESS' } }),
      completed: await prisma.productionGuide.count({ where: { status: 'COMPLETED' } }),
      critical: await prisma.productionGuide.count({ where: { priority: 'CRITICAL' } })
    };
    
    res.json({
      guides,
      stats,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania przewodników:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania przewodników produkcyjnych' });
  }
};

// Pobieranie szczegółów przewodnika produkcyjnego
const getProductionGuideById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const guide = await prisma.productionGuide.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        steps: {
          orderBy: { order: 'asc' },
          include: {
            attachments: true,
            comments: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                recipients: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true
                      }
                    }
                  }
                },
                attachments: true
              }
            },
            workSessions: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        attachments: true,
        inventory: {
          include: {
            item: true
          }
        }
      }
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Przewodnik produkcyjny nie znaleziony' });
    }
    
    // Obliczanie statystyk kroków
    const stepsStats = {
      total: guide.steps.length,
      completed: guide.steps.filter(step => step.status === 'COMPLETED').length,
      inProgress: guide.steps.filter(step => step.status === 'IN_PROGRESS').length,
      pending: guide.steps.filter(step => step.status === 'PENDING').length
    };
    
    // Obliczanie czasu
    let totalEstimatedTime = 0;
    let totalActualTime = 0;
    
    guide.steps.forEach(step => {
      if (step.estimatedTime) {
        totalEstimatedTime += step.estimatedTime;
      }
      if (step.actualTime) {
        totalActualTime += step.actualTime;
      }
    });
    
    const timeStats = {
      totalEstimatedTime,
      totalActualTime,
      progress: totalEstimatedTime > 0 ? (totalActualTime / totalEstimatedTime) * 100 : 0
    };
    
    // Zwróć rozszerzone dane
    res.json({
      guide,
      stats: {
        steps: stepsStats,
        time: timeStats
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania przewodnika:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania przewodnika produkcyjnego' });
  }
};

// Enhanced update function that tracks changes
const updateProductionGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      priority, 
      status, 
      deadline,
      autoPriority
    } = req.body;
    
    // Check if guide exists
    const existingGuide = await prisma.productionGuide.findUnique({
      where: { id }
    });
    
    if (!existingGuide) {
      return res.status(404).json({ message: 'Production guide not found' });
    }
    
    // Prepare update data
    const updateData = {};
    const changes = [];
    
    if (title !== undefined && title !== existingGuide.title) {
      updateData.title = title;
      changes.push({
        fieldName: 'title',
        oldValue: existingGuide.title,
        newValue: title
      });
    }
    
    if (description !== undefined && description !== existingGuide.description) {
      updateData.description = description;
      changes.push({
        fieldName: 'description',
        oldValue: existingGuide.description || '',
        newValue: description || ''
      });
    }
    
    if (priority !== undefined && priority !== existingGuide.priority) {
      updateData.priority = priority;
      changes.push({
        fieldName: 'priority',
        oldValue: existingGuide.priority,
        newValue: priority
      });
    }
    
    if (autoPriority !== undefined && autoPriority !== existingGuide.autoPriority) {
      updateData.autoPriority = autoPriority;
      changes.push({
        fieldName: 'autoPriority',
        oldValue: String(existingGuide.autoPriority),
        newValue: String(autoPriority)
      });
    }
    
    if (status !== undefined && status !== existingGuide.status) {
      updateData.status = status;
      changes.push({
        fieldName: 'status',
        oldValue: existingGuide.status,
        newValue: status
      });
    }
    
    if (deadline !== undefined) {
      const newDeadline = deadline ? new Date(deadline) : null;
      const oldDeadline = existingGuide.deadline;
      
      if ((newDeadline && !oldDeadline) || 
          (!newDeadline && oldDeadline) ||
          (newDeadline && oldDeadline && newDeadline.getTime() !== oldDeadline.getTime())) {
        updateData.deadline = newDeadline;
        changes.push({
          fieldName: 'deadline',
          oldValue: oldDeadline ? oldDeadline.toISOString() : 'null',
          newValue: newDeadline ? newDeadline.toISOString() : 'null'
        });
      }
    }
    
    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      
      // Update guide
      const updatedGuide = await prisma.productionGuide.update({
        where: { id },
        data: updateData
      });
      
      // Record all changes in history
      for (const change of changes) {
        await prisma.guideChangeHistory.create({
          data: {
            guideId: id,
            userId: req.user.id,
            changeType: 'UPDATE',
            fieldName: change.fieldName,
            oldValue: change.oldValue,
            newValue: change.newValue
          }
        });
      }
      
      // Audit logging
      await logAudit({
        userId: req.user.id,
        action: 'update',
        module: 'production',
        targetId: id,
        meta: {
          changes,
          previousData: {
            title: existingGuide.title,
            description: existingGuide.description,
            priority: existingGuide.priority,
            status: existingGuide.status,
            deadline: existingGuide.deadline,
            autoPriority: existingGuide.autoPriority
          },
          updatedData: updateData
        }
      });
      
      // Notification for status change
      if (status && status !== existingGuide.status) {
        // Get all users assigned to this guide
        const assignments = await prisma.guideAssignment.findMany({
          where: { guideId: id },
          select: { userId: true }
        });
        
        // Send notifications about status change
        for (const assignment of assignments) {
          await sendNotification(
            req.app.get('io'),
            prisma,
            assignment.userId,
            `Production guide "${updatedGuide.title}" status changed to ${status}`,
            `/production/guides/${id}`
          );
        }
      }
      
      res.json({
        guide: updatedGuide,
        message: 'Production guide updated successfully'
      });
    } else {
      res.json({
        guide: existingGuide,
        message: 'No changes to update'
      });
    }
  } catch (error) {
    console.error('Error updating guide:', error);
    res.status(500).json({ message: 'Error updating production guide' });
  }
};

// Usuwanie przewodnika produkcyjnego
const deleteProductionGuide = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Sprawdź, czy przewodnik istnieje
    const existingGuide = await prisma.productionGuide.findUnique({
      where: { id },
      include: {
        attachments: true
      }
    });
    
    if (!existingGuide) {
      return res.status(404).json({ message: 'Przewodnik produkcyjny nie znaleziony' });
    }
    
    // Usuń wszystkie załączniki fizycznie i z bazy danych
    if (existingGuide.attachments.length > 0) {
      for (const attachment of existingGuide.attachments) {
        try {
          fs.unlinkSync(attachment.path);
        } catch (error) {
          console.error(`Nie można usunąć pliku ${attachment.path}:`, error);
        }
      }
    }
    
    // Pobierz listę przedmiotów, które są zarezerwowane dla tego przewodnika
    const reservedItems = await prisma.guideInventory.findMany({
      where: {
        guideId: id,
        reserved: true
      },
      include: {
        item: true
      }
    });
    
    // Przeprowadź wszystkie operacje w transakcji
    await prisma.$transaction(async (tx) => {
      // Usuń przewodnik i wszystkie powiązane dane (kaskadowo)
      await tx.productionGuide.delete({
        where: { id }
      });
      
      // Jeśli jakieś przedmioty były zarezerwowane, zwolnij ich rezerwację
      for (const reservedItem of reservedItems) {
        // Dodaj transakcję zwolnienia rezerwacji
        await tx.inventoryTransaction.create({
          data: {
            itemId: reservedItem.itemId,
            quantity: reservedItem.quantity, // Dodatnia wartość oznacza zwrócenie do magazynu
            type: 'RELEASE',
            reason: `Zwolnienie rezerwacji z powodu usunięcia przewodnika ${existingGuide.title}`,
            guideId: id, // Zachowaj referencję mimo że przewodnik będzie usunięty
            userId: req.user.id
          }
        });
      }
    });
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'production',
      targetId: id,
      meta: {
        guide: {
          title: existingGuide.title,
          barcode: existingGuide.barcode,
          status: existingGuide.status
        },
        reservedItems: reservedItems.map(item => ({
          name: item.item.name,
          quantity: item.quantity,
          unit: item.item.unit
        }))
      }
    });
    
    res.json({ message: 'Przewodnik produkcyjny usunięty pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas usuwania przewodnika:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania przewodnika produkcyjnego' });
  }
};

// Usuwanie załącznika
const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });
    
    if (!attachment) {
      return res.status(404).json({ message: 'Załącznik nie znaleziony' });
    }
    
    // Usuń plik fizycznie
    try {
      fs.unlinkSync(attachment.path);
    } catch (error) {
      console.error(`Nie można usunąć pliku ${attachment.path}:`, error);
    }
    
    // Usuń rekord z bazy danych
    await prisma.attachment.delete({
      where: { id }
    });
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'attachment',
      targetId: id,
      meta: {
        filename: attachment.filename,
        size: attachment.size,
        productionGuideId: attachment.productionGuideId,
        productionStepId: attachment.productionStepId,
        commentId: attachment.commentId,
        inventoryItemId: attachment.inventoryItemId
      }
    });
    
    res.json({ message: 'Załącznik usunięty pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas usuwania załącznika:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania załącznika' });
  }
};

// Get change history for a guide
const getGuideChangeHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Check if guide exists
    const guide = await prisma.productionGuide.findUnique({
      where: { id }
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Production guide not found' });
    }
    
    // Get change history with pagination
    const [changes, total] = await Promise.all([
      prisma.guideChangeHistory.findMany({
        where: { guideId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.guideChangeHistory.count({ where: { guideId: id } })
    ]);
    
    res.json({
      changes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting guide history:', error);
    res.status(500).json({ message: 'Error retrieving guide change history' });
  }
};

// Operacje na krokach produkcyjnych

// Dodawanie kroku do przewodnika
const addProductionStep = async (req, res) => {
  try {
    const { guideId } = req.params;
    const { title, description, estimatedTime, assignedToRole, order } = req.body;
    
    // Sprawdź, czy przewodnik istnieje
    const guide = await prisma.productionGuide.findUnique({
      where: { id: guideId }
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Przewodnik produkcyjny nie znaleziony' });
    }
    
    // Sprawdź poprawność przypisanej roli (jeśli podano)
    if (assignedToRole) {
      const role = await prisma.role.findUnique({
        where: { id: assignedToRole }
      });
      
      if (!role) {
        return res.status(400).json({ message: 'Podana rola nie istnieje' });
      }
    }
    
    // Pobierz aktualną liczbę kroków, aby ustalić kolejność
    const stepsCount = await prisma.productionStep.count({
      where: { guideId }
    });
    
    // Dodaj nowy krok
    const newStep = await prisma.productionStep.create({
      data: {
        guideId,
        title,
        description,
        estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
        assignedToRole,
        order: order !== undefined ? parseInt(order) : stepsCount
      }
    });
    
    // Jeśli przesłano załączniki, dodaj je
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await prisma.attachment.create({
          data: {
            filename: file.originalname,
            path: file.path,
            size: file.size,
            mimeType: file.mimetype,
            productionStepId: newStep.id,
            createdById: req.user.id
          }
        });
      }
    }
    
    // Jeśli to pierwszy krok i przewodnik jest w stanie DRAFT, zaktualizuj jego status
    if (stepsCount === 0 && guide.status === 'DRAFT') {
      await prisma.productionGuide.update({
        where: { id: guideId },
        data: { status: 'IN_PROGRESS' }
      });
    }
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'productionStep',
      targetId: newStep.id,
      meta: {
        step: { title, description, estimatedTime, assignedToRole, order },
        guideId,
        guideTitle: guide.title
      }
    });
    
    // Powiadom użytkowników przypisanych do tej roli
    if (assignedToRole) {
      const usersWithRole = await prisma.userRole.findMany({
        where: { roleId: assignedToRole },
        select: { userId: true }
      });
      
      for (const userRole of usersWithRole) {
        const content = `Przypisano Cię do nowego kroku "${title}" w przewodniku "${guide.title}"`;
        const link = `/production/guides/${guideId}`;
        
        await sendNotification(req.app.get('io'), prisma, userRole.userId, content, link);
      }
    }
    
    // Pobierz pełne dane kroku
    const step = await prisma.productionStep.findUnique({
      where: { id: newStep.id },
      include: {
        attachments: true
      }
    });
    
    res.status(201).json({
      step,
      message: 'Krok produkcyjny dodany pomyślnie'
    });
  } catch (error) {
    console.error('Błąd podczas dodawania kroku:', error);
    res.status(500).json({ message: 'Błąd podczas dodawania kroku produkcyjnego' });
  }
};

// Aktualizacja kroku produkcyjnego
const updateProductionStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, estimatedTime, assignedToRole, order, status } = req.body;
    
    // Sprawdź, czy krok istnieje
    const existingStep = await prisma.productionStep.findUnique({
      where: { id },
      include: {
        guide: true
      }
    });
    
    if (!existingStep) {
      return res.status(404).json({ message: 'Krok produkcyjny nie znaleziony' });
    }
    
    // Sprawdź poprawność statusu
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Nieprawidłowy status kroku' });
    }
    
    // Sprawdź poprawność przypisanej roli
    if (assignedToRole) {
      const role = await prisma.role.findUnique({
        where: { id: assignedToRole }
      });
      
      if (!role) {
        return res.status(400).json({ message: 'Podana rola nie istnieje' });
      }
    }
    
    // Przygotuj dane do aktualizacji
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (estimatedTime !== undefined) updateData.estimatedTime = estimatedTime !== null ? parseInt(estimatedTime) : null;
    if (assignedToRole !== undefined) updateData.assignedToRole = assignedToRole;
    if (order !== undefined) updateData.order = parseInt(order);
    if (status) updateData.status = status;
    
    // Aktualizuj krok
    const updatedStep = await prisma.productionStep.update({
      where: { id },
      data: updateData
    });
    
    // Obsługa załączników
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await prisma.attachment.create({
          data: {
            filename: file.originalname,
            path: file.path,
            size: file.size,
            mimeType: file.mimetype,
            productionStepId: id,
            createdById: req.user.id
          }
        });
      }
    }
    
    // Aktualizacja statusu przewodnika, jeśli wszystkie kroki zostały zakończone
    if (status === 'COMPLETED') {
      const allSteps = await prisma.productionStep.findMany({
        where: { guideId: existingStep.guideId }
      });
      
      const allCompleted = allSteps.every(step => 
        step.id === id ? status === 'COMPLETED' : step.status === 'COMPLETED'
      );
      
      if (allCompleted) {
        await prisma.productionGuide.update({
          where: { id: existingStep.guideId },
          data: { status: 'COMPLETED' }
        });
      }
    }
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'productionStep',
      targetId: id,
      meta: {
        previousData: {
          title: existingStep.title,
          description: existingStep.description,
          estimatedTime: existingStep.estimatedTime,
          assignedToRole: existingStep.assignedToRole,
          order: existingStep.order,
          status: existingStep.status
        },
        updatedData: updateData,
        guideId: existingStep.guideId,
        guideTitle: existingStep.guide.title
      }
    });
    
    // Powiadomienia przy zmianie roli lub statusu
    if (assignedToRole && assignedToRole !== existingStep.assignedToRole) {
      const usersWithRole = await prisma.userRole.findMany({
        where: { roleId: assignedToRole },
        select: { userId: true }
      });
      
      for (const userRole of usersWithRole) {
        const content = `Przypisano Cię do kroku "${updatedStep.title}" w przewodniku "${existingStep.guide.title}"`;
        const link = `/production/guides/${existingStep.guideId}`;
        
        await sendNotification(req.app.get('io'), prisma, userRole.userId, content, link);
      }
    }
    
    if (status && status !== existingStep.status) {
      // Powiadom twórcę przewodnika i użytkowników pracujących przy tym kroku
      const workSessions = await prisma.stepWorkSession.findMany({
        where: { stepId: id },
        select: { userId: true },
        distinct: ['userId']
      });
      
      const userIds = [...new Set([existingStep.guide.createdById, ...workSessions.map(session => session.userId)])];
      
      for (const userId of userIds) {
        if (userId !== req.user.id) { // Nie wysyłaj do osoby, która dokonuje aktualizacji
          const content = `Status kroku "${updatedStep.title}" w przewodniku "${existingStep.guide.title}" został zmieniony na ${status}`;
          const link = `/production/guides/${existingStep.guideId}`;
          
          await sendNotification(req.app.get('io'), prisma, userId, content, link);
        }
      }
    }
    
    res.json({
      step: updatedStep,
      message: 'Krok produkcyjny zaktualizowany pomyślnie'
    });
  } catch (error) {
    console.error('Błąd podczas aktualizacji kroku:', error);
    res.status(500).json({ message: 'Błąd podczas aktualizacji kroku produkcyjnego' });
  }
};

// Usuwanie kroku produkcyjnego
const deleteProductionStep = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Sprawdź, czy krok istnieje
    const step = await prisma.productionStep.findUnique({
      where: { id },
      include: {
        guide: true,
        attachments: true
      }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Krok produkcyjny nie znaleziony' });
    }
    
    // Usuń wszystkie załączniki fizycznie
    if (step.attachments.length > 0) {
      for (const attachment of step.attachments) {
        try {
          fs.unlinkSync(attachment.path);
        } catch (error) {
          console.error(`Nie można usunąć pliku ${attachment.path}:`, error);
        }
      }
    }
    
    // Usuń krok (kaskadowo usunie załączniki, komentarze i sesje)
    await prisma.productionStep.delete({
      where: { id }
    });
    
    // Zaktualizuj kolejność pozostałych kroków
    const remainingSteps = await prisma.productionStep.findMany({
      where: { guideId: step.guideId },
      orderBy: { order: 'asc' }
    });
    
    for (let i = 0; i < remainingSteps.length; i++) {
      if (remainingSteps[i].order !== i) {
        await prisma.productionStep.update({
          where: { id: remainingSteps[i].id },
          data: { order: i }
        });
      }
    }
    
    // Jeśli to był ostatni krok, a przewodnik jest w trakcie, zmień status na DRAFT
    if (remainingSteps.length === 0 && step.guide.status === 'IN_PROGRESS') {
      await prisma.productionGuide.update({
        where: { id: step.guideId },
        data: { status: 'DRAFT' }
      });
    }
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'productionStep',
      targetId: id,
      meta: {
        step: {
          title: step.title,
          status: step.status,
          order: step.order
        },
        guideId: step.guideId,
        guideTitle: step.guide.title
      }
    });
    
    res.json({ message: 'Krok produkcyjny usunięty pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas usuwania kroku:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania kroku produkcyjnego' });
  }
};

// Rozpoczęcie pracy nad krokiem
const startWorkOnStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    // Sprawdź, czy krok istnieje
    const step = await prisma.productionStep.findUnique({
      where: { id },
      include: { guide: true }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Krok produkcyjny nie znaleziony' });
    }
    
    // Sprawdź, czy użytkownik ma aktywną sesję pracy dla tego kroku
    const activeSession = await prisma.stepWorkSession.findFirst({
      where: {
        stepId: id,
        userId: req.user.id,
        endTime: null
      }
    });
    
    if (activeSession) {
      return res.status(400).json({ message: 'Masz już aktywną sesję pracy dla tego kroku' });
    }
    
    // Sprawdź, czy użytkownik ma odpowiednią rolę (jeśli krok ma przypisaną rolę)
    if (step.assignedToRole) {
      const hasRole = await prisma.userRole.findFirst({
        where: {
          userId: req.user.id,
          roleId: step.assignedToRole
        }
      });
      
      if (!hasRole && !req.user.permissions['production.manageAll']) {
        return res.status(403).json({ message: 'Nie masz odpowiedniej roli, aby pracować nad tym krokiem' });
      }
    }
    
    // Rozpocznij sesję pracy
    const workSession = await prisma.stepWorkSession.create({
      data: {
        stepId: id,
        userId: req.user.id,
        startTime: new Date(),
        note
      }
    });
    
    // Zaktualizuj status kroku, jeśli nie jest jeszcze w trakcie
    if (step.status === 'PENDING') {
      await prisma.productionStep.update({
        where: { id },
        data: { status: 'IN_PROGRESS' }
      });
    }
    
    // Zaktualizuj status przewodnika, jeśli jest w stanie DRAFT
    if (step.guide.status === 'DRAFT') {
      await prisma.productionGuide.update({
        where: { id: step.guideId },
        data: { status: 'IN_PROGRESS' }
      });
    }
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'stepWorkSession',
      targetId: workSession.id,
      meta: {
        stepId: id,
        stepTitle: step.title,
        guideId: step.guideId,
        guideTitle: step.guide.title,
        note
      }
    });
    
    res.status(201).json({
      workSession,
      message: 'Sesja pracy rozpoczęta pomyślnie'
    });
  } catch (error) {
    console.error('Błąd podczas rozpoczynania pracy:', error);
    res.status(500).json({ message: 'Błąd podczas rozpoczynania pracy nad krokiem' });
  }
};

// Zakończenie pracy nad krokiem
const endWorkOnStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, completeStep } = req.body;
    
    // Sprawdź, czy krok istnieje
    const step = await prisma.productionStep.findUnique({
      where: { id },
      include: { guide: true }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Krok produkcyjny nie znaleziony' });
    }
    
    // Znajdź aktywną sesję pracy
    const activeSession = await prisma.stepWorkSession.findFirst({
      where: {
        stepId: id,
        userId: req.user.id,
        endTime: null
      }
    });
    
    if (!activeSession) {
      return res.status(400).json({ message: 'Nie masz aktywnej sesji pracy dla tego kroku' });
    }
    
    // Zakończ sesję pracy
    const now = new Date();
    const duration = Math.floor((now - new Date(activeSession.startTime)) / 1000); // Czas w sekundach
    
    const updatedNote = note
      ? (activeSession.note ? `${activeSession.note}\n\n${note}` : note)
      : activeSession.note;
    
    const workSession = await prisma.stepWorkSession.update({
      where: { id: activeSession.id },
      data: {
        endTime: now,
        duration,
        note: updatedNote
      }
    });
    
    // Zaktualizuj czas rzeczywisty kroku
    const totalDuration = await prisma.stepWorkSession.aggregate({
      where: { stepId: id },
      _sum: { duration: true }
    });
    
    await prisma.productionStep.update({
      where: { id },
      data: {
        actualTime: Math.ceil(totalDuration._sum.duration / 60), // Konwersja z sekund na minuty i zaokrąglenie w górę
        status: completeStep ? 'COMPLETED' : step.status
      }
    });
    
    // Jeśli oznaczono krok jako zakończony i wszystkie kroki są zakończone, zaktualizuj status przewodnika
    if (completeStep) {
      const allSteps = await prisma.productionStep.findMany({
        where: { guideId: step.guideId }
      });
      
      const allCompleted = allSteps.every(s => 
        s.id === id ? true : s.status === 'COMPLETED'
      );
      
      if (allCompleted) {
        await prisma.productionGuide.update({
          where: { id: step.guideId },
          data: { status: 'COMPLETED' }
        });
      }
    }
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'stepWorkSession',
      targetId: workSession.id,
      meta: {
        action: 'endWork',
        stepId: id,
        stepTitle: step.title,
        guideId: step.guideId,
        guideTitle: step.guide.title,
        duration,
        completeStep
      }
    });
    
    res.json({
      workSession,
      message: 'Sesja pracy zakończona pomyślnie'
    });
  } catch (error) {
    console.error('Błąd podczas kończenia pracy:', error);
    res.status(500).json({ message: 'Błąd podczas kończenia pracy nad krokiem' });
  }
};

// Add a work entry to a step (manual time input)
const addWorkEntry = async (req, res) => {
  try {
    const { id: stepId } = req.params;
    const { timeWorked, notes } = req.body;
    const userId = req.user.id;
    
    // Validate time worked
    if (!timeWorked || parseInt(timeWorked) <= 0) {
      return res.status(400).json({ message: 'Time worked must be a positive number' });
    }
    
    // Check if step exists
    const step = await prisma.productionStep.findUnique({
      where: { id: stepId },
      include: {
        guide: true
      }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Step not found' });
    }
    
    // Ensure the step is in progress
    if (step.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Cannot add work to a completed step' });
    }
    
    if (step.status === 'PENDING') {
      // Update step status to in progress
      await prisma.productionStep.update({
        where: { id: stepId },
        data: { status: 'IN_PROGRESS' }
      });
      
      // Update guide status if needed
      if (step.guide.status === 'DRAFT') {
        await prisma.productionGuide.update({
          where: { id: step.guideId },
          data: { status: 'IN_PROGRESS' }
        });
      }
    }
    
    // Create the work entry
    const workEntry = await prisma.stepWorkEntry.create({
      data: {
        stepId,
        userId,
        timeWorked: parseInt(timeWorked),
        notes
      }
    });
    
    // Update the step's actual time (total time worked)
    const totalWorked = await prisma.stepWorkEntry.aggregate({
      where: { stepId },
      _sum: { timeWorked: true }
    });
    
    await prisma.productionStep.update({
      where: { id: stepId },
      data: { 
        actualTime: totalWorked._sum.timeWorked,
        // If we've met or exceeded the estimated time, update status
        status: step.estimatedTime && totalWorked._sum.timeWorked >= step.estimatedTime 
          ? 'COMPLETED' 
          : 'IN_PROGRESS'
      }
    });
    
    // Audit logging
    await logAudit({
      userId,
      action: 'create',
      module: 'stepWork',
      targetId: workEntry.id,
      meta: {
        stepId,
        guideId: step.guideId,
        timeWorked: parseInt(timeWorked),
        totalWorked: totalWorked._sum.timeWorked
      }
    });
    
    res.status(201).json({
      workEntry,
      totalWorked: totalWorked._sum.timeWorked,
      message: 'Work entry added successfully'
    });
  } catch (error) {
    console.error('Error adding work entry:', error);
    res.status(500).json({ message: 'Error adding work entry' });
  }
};

// Get all work entries for a step
const getStepWorkEntries = async (req, res) => {
  try {
    const { id: stepId } = req.params;
    
    const entries = await prisma.stepWorkEntry.findMany({
      where: { stepId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate totals by user
    const userTotals = {};
    entries.forEach(entry => {
      const userId = entry.userId;
      if (!userTotals[userId]) {
        userTotals[userId] = {
          userId,
          firstName: entry.user.firstName,
          lastName: entry.user.lastName,
          totalTime: 0,
          entryCount: 0
        };
      }
      userTotals[userId].totalTime += entry.timeWorked;
      userTotals[userId].entryCount += 1;
    });
    
    res.json({
      entries,
      userTotals: Object.values(userTotals),
      totalTime: entries.reduce((sum, entry) => sum + entry.timeWorked, 0)
    });
  } catch (error) {
    console.error('Error getting work entries:', error);
    res.status(500).json({ message: 'Error retrieving work entries' });
  }
};

// Associate inventory items with a specific step
const assignItemsToStep = async (req, res) => {
  try {
    const { id: stepId } = req.params;
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid items array' });
    }
    
    // Verify the step exists
    const step = await prisma.productionStep.findUnique({
      where: { id: stepId },
      include: { guide: true }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Step not found' });
    }
    
    const results = [];
    const errors = [];
    
    // Process each item
    for (const item of items) {
      const { itemId, quantity } = item;
      
      if (!itemId || !quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
        errors.push({ itemId, error: 'Invalid item ID or quantity' });
        continue;
      }
      
      try {
        // Check if the item exists
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: itemId }
        });
        
        if (!inventoryItem) {
          errors.push({ itemId, error: 'Item not found' });
          continue;
        }
        
        // Check if already assigned to this step
        const existingAssignment = await prisma.stepInventory.findFirst({
          where: {
            stepId,
            itemId
          }
        });
        
        if (existingAssignment) {
          // Update existing assignment
          const updated = await prisma.stepInventory.update({
            where: { id: existingAssignment.id },
            data: {
              quantity: parseFloat(quantity),
              status: 'NEEDED'
            }
          });
          
          results.push({
            ...updated,
            item: {
              id: inventoryItem.id,
              name: inventoryItem.name,
              unit: inventoryItem.unit
            }
          });
        } else {
          // Create new assignment
          const created = await prisma.stepInventory.create({
            data: {
              stepId,
              itemId,
              quantity: parseFloat(quantity),
              status: 'NEEDED'
            }
          });
          
          results.push({
            ...created,
            item: {
              id: inventoryItem.id,
              name: inventoryItem.name,
              unit: inventoryItem.unit
            }
          });
        }
        
        // Notify warehouse staff
        const warehouseStaff = await prisma.userRole.findMany({
          where: {
            role: {
              name: "Warehouseman"
            }
          },
          select: {
            userId: true
          }
        });
        
        if (warehouseStaff.length > 0) {
          for (const staff of warehouseStaff) {
            await sendNotification(
              req.app.get('io'),
              prisma,
              staff.userId,
              `New item required for production: ${quantity} ${inventoryItem.unit} of ${inventoryItem.name}`,
              `/production/guides/${step.guideId}/steps/${stepId}`
            );
          }
        }
        
      } catch (error) {
        console.error(`Error processing item ${itemId}:`, error);
        errors.push({ itemId, error: error.message });
      }
    }
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'assign',
      module: 'stepInventory',
      targetId: stepId,
      meta: {
        guideId: step.guideId,
        stepId,
        items: results.map(r => ({
          itemId: r.itemId,
          quantity: r.quantity
        }))
      }
    });
    
    res.json({
      success: errors.length === 0,
      results,
      errors,
      message: `${results.length} items assigned to step, ${errors.length} errors`
    });
  } catch (error) {
    console.error('Error assigning items to step:', error);
    res.status(500).json({ message: 'Error assigning inventory items to step' });
  }
};

// Update the status of inventory assigned to a step
const updateStepInventoryStatus = async (req, res) => {
  try {
    const { id: stepInventoryId } = req.params;
    const { status } = req.body;
    
    if (!['NEEDED', 'RESERVED', 'ISSUED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be NEEDED, RESERVED, or ISSUED' });
    }
    
    // Find the existing assignment
    const stepInventory = await prisma.stepInventory.findUnique({
      where: { id: stepInventoryId },
      include: {
        step: {
          include: {
            guide: true
          }
        },
        item: true
      }
    });
    
    if (!stepInventory) {
      return res.status(404).json({ message: 'Step inventory assignment not found' });
    }
    
    // Update the status
    const previousStatus = stepInventory.status;
    const updated = await prisma.stepInventory.update({
      where: { id: stepInventoryId },
      data: { status }
    });
    
    // If reserving or issuing, update inventory item's reservation
    if (status !== previousStatus) {
      if (status === 'RESERVED' && previousStatus !== 'RESERVED') {
        // Create inventory transaction for reservation
        await prisma.inventoryTransaction.create({
          data: {
            itemId: stepInventory.itemId,
            quantity: -stepInventory.quantity, // Negative for reservation
            type: 'RESERVE',
            reason: `Reserved for step "${stepInventory.step.title}" in guide "${stepInventory.step.guide.title}"`,
            guideId: stepInventory.step.guideId,
            userId: req.user.id
          }
        });
      } else if (previousStatus === 'RESERVED' && status !== 'RESERVED') {
        // Release reservation if changing from reserved to another status
        await prisma.inventoryTransaction.create({
          data: {
            itemId: stepInventory.itemId,
            quantity: stepInventory.quantity, // Positive for release
            type: 'RELEASE',
            reason: `Released reservation for step "${stepInventory.step.title}" in guide "${stepInventory.step.guide.title}"`,
            guideId: stepInventory.step.guideId,
            userId: req.user.id
          }
        });
      }
      
      if (status === 'ISSUED' && previousStatus !== 'ISSUED') {
        // Remove from inventory when issuing
        await prisma.inventoryTransaction.create({
          data: {
            itemId: stepInventory.itemId,
            quantity: -stepInventory.quantity, // Negative for removal
            type: 'REMOVE',
            reason: `Issued for step "${stepInventory.step.title}" in guide "${stepInventory.step.guide.title}"`,
            guideId: stepInventory.step.guideId,
            userId: req.user.id
          }
        });
        
        // Update inventory quantity
        await prisma.inventoryItem.update({
          where: { id: stepInventory.itemId },
          data: {
            quantity: {
              decrement: stepInventory.quantity
            }
          }
        });
      }
      
      // Notify assigned users about item status change
      const stepAssignments = await prisma.guideAssignment.findMany({
        where: { guideId: stepInventory.step.guideId },
        select: { userId: true }
      });
      
      for (const assignment of stepAssignments) {
        await sendNotification(
          req.app.get('io'),
          prisma,
          assignment.userId,
          `Inventory status changed: ${stepInventory.item.name} is now ${status} for step "${stepInventory.step.title}"`,
          `/production/guides/${stepInventory.step.guideId}/steps/${stepInventory.step.id}`
        );
      }
    }
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'stepInventory',
      targetId: stepInventoryId,
      meta: {
        previousStatus,
        newStatus: status,
        item: {
          id: stepInventory.itemId,
          name: stepInventory.item.name
        },
        step: {
          id: stepInventory.stepId,
          title: stepInventory.step.title
        },
        guide: {
          id: stepInventory.step.guideId,
          title: stepInventory.step.guide.title
        }
      }
    });
    
    res.json({
      stepInventory: updated,
      message: `Status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating step inventory status:', error);
    res.status(500).json({ message: 'Error updating inventory status' });
  }
};

// Add a comment to a step
const addStepComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, recipients } = req.body;
    
    // Check if step exists
    const step = await prisma.productionStep.findUnique({
      where: { id },
      include: { guide: true }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Production step not found' });
    }
    
    // Create comment in a transaction
    const comment = await prisma.$transaction(async (tx) => {
      // Create comment
      const newComment = await tx.stepComment.create({
        data: {
          stepId: id,
          content,
          userId: req.user.id
        }
      });
      
      // Add recipients if specified
      if (recipients && recipients.length > 0) {
        for (const userId of recipients) {
          await tx.commentRecipient.create({
            data: {
              commentId: newComment.id,
              userId
            }
          });
        }
      }
      
      // Add attachments if present
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await tx.attachment.create({
            data: {
              filename: file.originalname,
              path: file.path,
              size: file.size,
              mimeType: file.mimetype,
              commentId: newComment.id,
              createdById: req.user.id
            }
          });
        }
      }
      
      return newComment;
    });
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'stepComment',
      targetId: comment.id,
      meta: {
        stepId: id,
        stepTitle: step.title,
        guideId: step.guideId,
        guideTitle: step.guide.title,
        recipients
      }
    });
    
    // Send notifications to recipients
    if (recipients && recipients.length > 0) {
      for (const userId of recipients) {
        if (userId !== req.user.id) { // Don't notify the comment author
          const content = `New comment in step "${step.title}" in guide "${step.guide.title}"`;
          const link = `/production/guides/${step.guideId}`;
          
          await sendNotification(req.app.get('io'), prisma, userId, content, link);
        }
      }
    }
    
    // Get complete comment data
    const fullComment = await prisma.stepComment.findUnique({
      where: { id: comment.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        attachments: true
      }
    });
    
    res.status(201).json({
      comment: fullComment,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment to step' });
  }
};

// Assign a user to a guide
const assignUserToGuide = async (req, res) => {
  try {
    const { id: guideId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId field" });
    }

    // Check if guide exists
    const guide = await prisma.productionGuide.findUnique({ 
      where: { id: guideId } 
    });
    
    if (!guide) {
      return res.status(404).json({ message: "Production guide not found" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ 
      where: { id: userId } 
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already assigned
    const existingAssignment = await prisma.guideAssignment.findUnique({
      where: { 
        guideId_userId: { 
          guideId, 
          userId 
        } 
      }
    });
    
    if (existingAssignment) {
      return res.status(400).json({ message: "User already assigned to this guide" });
    }

    // Create assignment
    const assignment = await prisma.guideAssignment.create({
      data: { 
        guideId, 
        userId 
      }
    });

    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: "assign",
      module: "production",
      targetId: guideId,
      meta: {
        assignedUser: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`
        }
      }
    });

    // Send notification to assigned user
    await sendNotification(
      req.app.get('io'),
      prisma,
      user.id,
      `You have been assigned to production guide "${guide.title}"`,
      `/production/guides/${guide.id}`
    );

    res.status(201).json({
      assignment,
      message: `User ${user.firstName} ${user.lastName} assigned to guide successfully`
    });
  } catch (error) {
    console.error("Error assigning user:", error);
    res.status(500).json({ message: "Error assigning user to guide" });
  }
};

// Remove a user assignment from a guide
const removeUserFromGuide = async (req, res) => {
  try {
    const { id: guideId, userId } = req.params;

    // Check if the assignment exists
    const assignment = await prisma.guideAssignment.findUnique({
      where: {
        guideId_userId: {
          guideId,
          userId
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ message: "User assignment not found" });
    }

    // Get user and guide info for notification and logging
    const [user, guide] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }),
      prisma.productionGuide.findUnique({
        where: { id: guideId },
        select: {
          id: true,
          title: true
        }
      })
    ]);

    // Delete the assignment
    await prisma.guideAssignment.delete({
      where: {
        guideId_userId: {
          guideId,
          userId
        }
      }
    });

    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: "unassign",
      module: "production",
      targetId: guideId,
      meta: {
        removedUser: {
          id: userId,
          name: user ? `${user.firstName} ${user.lastName}` : 'Unknown user'
        },
        guide: {
          id: guideId,
          title: guide ? guide.title : 'Unknown guide'
        }
      }
    });

    // Notify user if they exist
    if (user && guide) {
      await sendNotification(
        req.app.get('io'),
        prisma,
        userId,
        `You have been removed from production guide "${guide.title}"`,
        '/production/guides'
      );
    }

    res.json({ 
      message: "User assignment removed successfully" 
    });
  } catch (error) {
    console.error("Error removing user assignment:", error);
    res.status(500).json({ message: "Error removing user from guide" });
  }
};

// Get all users assigned to a guide
const getAssignedUsers = async (req, res) => {
  try {
    const { id: guideId } = req.params;

    // Check if guide exists
    const guide = await prisma.productionGuide.findUnique({
      where: { id: guideId },
      include: {
        assignedUsers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                login: true,
                userRoles: {
                  include: {
                    role: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!guide) {
      return res.status(404).json({ message: 'Production guide not found' });
    }

    // Format user data with roles
    const users = guide.assignedUsers.map(assignment => {
      const { user } = assignment;
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        login: user.login,
        roles: user.userRoles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name
        }))
      };
    });

    res.json({ users });
  } catch (error) {
    console.error('Error getting assigned users:', error);
    res.status(500).json({ message: 'Error retrieving assigned users' });
  }
};

// Assign multiple users to a guide
const assignMultipleUsersToGuide = async (req, res) => {
  try {
    const { id: guideId } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'userIds must be a non-empty array' });
    }

    // Check if guide exists
    const guide = await prisma.productionGuide.findUnique({
      where: { id: guideId }
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Production guide not found' });
    }

    // Get valid users
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    // Find already assigned users
    const existingAssignments = await prisma.guideAssignment.findMany({
      where: {
        guideId,
        userId: { in: userIds }
      },
      select: { userId: true }
    });

    const alreadyAssignedIds = new Set(existingAssignments.map(a => a.userId));
    const usersToAssign = users.filter(user => !alreadyAssignedIds.has(user.id));
    
    if (usersToAssign.length === 0) {
      return res.status(200).json({ 
        message: 'All users are already assigned to this guide',
        assignedCount: 0,
        skippedCount: userIds.length
      });
    }

    // Create new assignments in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const assignments = [];
      const notifications = [];
      
      // Create assignments
      for (const user of usersToAssign) {
        const assignment = await tx.guideAssignment.create({
          data: {
            guideId,
            userId: user.id
          }
        });
        assignments.push(assignment);
        
        // Create notification
        const notification = await tx.notification.create({
          data: {
            userId: user.id,
            content: `You have been assigned to production guide "${guide.title}"`,
            link: `/production/guides/${guideId}`,
            type: 'SYSTEM',
            createdById: req.user.id
          }
        });
        notifications.push({ userId: user.id, notification });
      }
      
      return { assignments, notifications };
    });
    
    // Send notifications
    const io = req.app.get('io');
    for (const item of results.notifications) {
      io.to(`user:${item.userId}`).emit(`notification:${item.userId}`, item.notification);
    }
    
    // Log audit entry
    await logAudit({
      userId: req.user.id,
      action: 'assign-multiple',
      module: 'production',
      targetId: guideId,
      meta: {
        guide: {
          id: guideId,
          title: guide.title
        },
        assignedUsers: usersToAssign.map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`
        })),
        assignedCount: usersToAssign.length,
        skippedCount: userIds.length - usersToAssign.length
      }
    });
    
    res.json({
      message: `${usersToAssign.length} users assigned to the guide`,
      assignedCount: usersToAssign.length,
      skippedCount: userIds.length - usersToAssign.length,
      assignedUsers: usersToAssign.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`
      }))
    });
  } catch (error) {
    console.error('Error assigning multiple users:', error);
    res.status(500).json({ message: 'Error assigning users to guide' });
  }
};

// Add manual work entry to a guide
const addManualWorkEntry = async (req, res) => {
  try {
    const { id: guideId } = req.params;
    const { durationMinutes, note } = req.body;
    const userId = req.user.id;

    if (!durationMinutes || durationMinutes <= 0) {
      return res.status(400).json({ message: 'Duration must be greater than 0 minutes' });
    }

    // Check if guide exists
    const guide = await prisma.productionGuide.findUnique({
      where: { id: guideId },
      include: {
        steps: true,
        assignedUsers: true
      }
    });

    if (!guide) {
      return res.status(404).json({ message: 'Production guide not found' });
    }

    // Check if user is assigned or has permission
    const isAssigned = guide.assignedUsers.some(a => a.userId === userId);
    const isManager = req.user.permissions['production.manageAll'];

    if (!isAssigned && !isManager) {
      return res.status(403).json({ message: 'You are not assigned to this guide' });
    }

    // Calculate time limits
    const estimatedTotal = guide.steps.reduce((sum, s) => sum + (s.estimatedTime || 0), 0);

    const usedTotal = await prisma.stepWorkEntry.aggregate({
      where: {
        step: { guideId },
      },
      _sum: { timeWorked: true }
    });

    const usedMinutes = usedTotal._sum.timeWorked || 0;

    if ((usedMinutes + durationMinutes) > estimatedTotal && estimatedTotal > 0) {
      return res.status(400).json({
        message: `Time limit for this guide exceeded. Available: ${Math.max(0, estimatedTotal - usedMinutes)} min.`,
        estimatedTotal,
        usedMinutes,
        requestedMinutes: durationMinutes,
        availableMinutes: Math.max(0, estimatedTotal - usedMinutes)
      });
    }

    // Find first incomplete step or use the first step
    const step = guide.steps.find(s => s.status !== 'COMPLETED') || guide.steps[0];
    
    if (!step) {
      return res.status(400).json({ message: 'No steps available for work entry' });
    }

    // Create the work entry
    const workEntry = await prisma.stepWorkEntry.create({
      data: {
        stepId: step.id,
        userId,
        timeWorked: durationMinutes,
        notes: note
      }
    });

    // Update step's actual time
    const totalWorked = await prisma.stepWorkEntry.aggregate({
      where: { stepId: step.id },
      _sum: { timeWorked: true }
    });

    await prisma.productionStep.update({
      where: { id: step.id },
      data: { 
        actualTime: totalWorked._sum.timeWorked,
        status: step.estimatedTime && totalWorked._sum.timeWorked >= step.estimatedTime 
          ? 'COMPLETED' 
          : 'IN_PROGRESS'
      }
    });

    // Check if guide should be completed
    const newUsedMinutes = usedMinutes + durationMinutes;
    if (newUsedMinutes >= estimatedTotal && estimatedTotal > 0) {
      await prisma.productionGuide.update({
        where: { id: guideId },
        data: { status: 'COMPLETED' }
      });
    } else if (guide.status === 'DRAFT') {
      await prisma.productionGuide.update({
        where: { id: guideId },
        data: { status: 'IN_PROGRESS' }
      });
    }

    // Audit logging
    await logAudit({
      userId,
      action: 'manualWork',
      module: 'production',
      targetId: guideId,
      meta: {
        durationMinutes,
        note,
        stepId: step.id,
        guideTitle: guide.title
      }
    });

    // Notification for guide creator
    if (guide.createdById !== userId) {
      const content = `Manual work time added to guide "${guide.title}" (${durationMinutes} min)`;
      const link = `/production/guides/${guideId}`;
      await sendNotification(req.app.get('io'), prisma, guide.createdById, content, link);
    }

    res.status(201).json({
      workEntry,
      step: {
        id: step.id,
        title: step.title,
        actualTime: totalWorked._sum.timeWorked
      },
      message: 'Work time recorded successfully'
    });
  } catch (error) {
    console.error('Error adding manual work entry:', error);
    res.status(500).json({ message: 'Error recording work time' });
  }
};

// Eksport wszystkich funkcji kontrolera
module.exports = {
  handleFileUpload,
  createProductionGuide,
  getAllProductionGuides,
  getProductionGuideById,
  updateProductionGuide,
  deleteProductionGuide,
  deleteAttachment,
  addProductionStep,
  updateProductionStep,
  deleteProductionStep,
  startWorkOnStep,
  endWorkOnStep,
  addStepComment,
  assignUserToGuide,
  removeUserFromGuide,
  getAssignedUsers,
  assignMultipleUsersToGuide,
  addManualWorkEntry,
  getGuideChangeHistory,
  addWorkEntry,
  getStepWorkEntries,
  assignItemsToStep,
  updateStepInventoryStatus
};