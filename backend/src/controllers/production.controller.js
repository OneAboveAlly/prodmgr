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

// Tworzenie nowego przewodnika produkcyjnego
const createProductionGuide = async (req, res) => {
  try {
    const { title, description, priority, barcode } = req.body;
    
    // Generuj unikalny kod kreskowy, jeśli nie podano
    const uniqueBarcode = barcode || await barcodeGenerator.generateUniqueBarcode('prod');
    
    // Sprawdź, czy kod kreskowy już istnieje
    const existingGuide = await prisma.productionGuide.findUnique({
      where: { barcode: uniqueBarcode }
    });
    
    if (existingGuide) {
      return res.status(400).json({ message: 'Przewodnik o tym kodzie kreskowym już istnieje' });
    }
    
    // Utwórz nowy przewodnik
    const guide = await prisma.productionGuide.create({
      data: {
        title,
        description,
        priority: priority || 'NORMAL',
        barcode: uniqueBarcode,
        createdById: req.user.id
      }
    });
    
    // Obsługa załączników
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
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'production',
      targetId: guide.id,
      meta: { guide: { title, description, priority, barcode: uniqueBarcode } }
    });
    
    res.status(201).json({
      guide,
      attachments,
      message: 'Przewodnik produkcyjny utworzony pomyślnie'
    });
  } catch (error) {
    console.error('Błąd podczas tworzenia przewodnika:', error);
    res.status(500).json({ message: 'Błąd podczas tworzenia przewodnika produkcyjnego' });
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

// Aktualizacja przewodnika produkcyjnego
const updateProductionGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, barcode } = req.body;
    
    // Sprawdź, czy przewodnik istnieje
    const existingGuide = await prisma.productionGuide.findUnique({
      where: { id }
    });
    
    if (!existingGuide) {
      return res.status(404).json({ message: 'Przewodnik produkcyjny nie znaleziony' });
    }
    
    // Jeśli podano nowy kod kreskowy, sprawdź czy jest unikalny
    if (barcode && barcode !== existingGuide.barcode) {
      const barcodeExists = await prisma.productionGuide.findFirst({
        where: {
          barcode,
          id: { not: id }
        }
      });
      
      if (barcodeExists) {
        return res.status(400).json({ message: 'Przewodnik o tym kodzie kreskowym już istnieje' });
      }
    }
    
    // Przygotuj dane do aktualizacji
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (status) updateData.status = status;
    if (barcode) updateData.barcode = barcode;
    updateData.updatedAt = new Date();
    
    // Aktualizuj przewodnik
    const updatedGuide = await prisma.productionGuide.update({
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
            productionGuideId: id,
            createdById: req.user.id
          }
        });
      }
    }
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'production',
      targetId: id,
      meta: {
        previousData: {
          title: existingGuide.title,
          description: existingGuide.description,
          priority: existingGuide.priority,
          status: existingGuide.status,
          barcode: existingGuide.barcode
        },
        updatedData: updateData
      }
    });
    
    // Powiadomienie jeśli zmieniono status
    if (status && status !== existingGuide.status) {
      // Pobierz użytkowników przypisanych do kroków tego przewodnika
      const usersInvolvedInSteps = await prisma.stepWorkSession.findMany({
        where: {
          step: {
            guideId: id
          }
        },
        select: {
          userId: true
        },
        distinct: ['userId']
      });
      
      const userIds = [...new Set(usersInvolvedInSteps.map(session => session.userId))];
      
      // Wyślij powiadomienia
      for (const userId of userIds) {
        const content = `Status przewodnika "${updatedGuide.title}" został zmieniony na ${status}`;
        const link = `/production/guides/${id}`;
        
        await sendNotification(req.app.get('io'), prisma, userId, content, link);
      }
    }
    
    res.json({
      guide: updatedGuide,
      message: 'Przewodnik produkcyjny zaktualizowany pomyślnie'
    });
  } catch (error) {
    console.error('Błąd podczas aktualizacji przewodnika:', error);
    res.status(500).json({ message: 'Błąd podczas aktualizacji przewodnika produkcyjnego' });
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

// Dodawanie komentarza do kroku
const addStepComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, recipients } = req.body;
    
    // Sprawdź, czy krok istnieje
    const step = await prisma.productionStep.findUnique({
      where: { id },
      include: { guide: true }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Krok produkcyjny nie znaleziony' });
    }
    
    // Dodaj komentarz w transakcji
    const comment = await prisma.$transaction(async (tx) => {
      // Utwórz komentarz
      const newComment = await tx.stepComment.create({
        data: {
          stepId: id,
          content,
          userId: req.user.id
        }
      });
      
      // Dodaj odbiorców, jeśli zostali określeni
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
      
      // Dodaj załączniki, jeśli są
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
    
    // Logowanie audytu
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
    
    // Wyślij powiadomienia do odbiorców
    if (recipients && recipients.length > 0) {
      for (const userId of recipients) {
        if (userId !== req.user.id) { // Nie wysyłaj do osoby, która dodaje komentarz
          const content = `Nowy komentarz w kroku "${step.title}" w przewodniku "${step.guide.title}"`;
          const link = `/production/guides/${step.guideId}`;
          
          await sendNotification(req.app.get('io'), prisma, userId, content, link);
        }
      }
    }
    
    // Pobierz pełne dane komentarza
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
      message: 'Komentarz dodany pomyślnie'
    });
  } catch (error) {
    console.error('Błąd podczas dodawania komentarza:', error);
    res.status(500).json({ message: 'Błąd podczas dodawania komentarza' });
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
  addStepComment
};