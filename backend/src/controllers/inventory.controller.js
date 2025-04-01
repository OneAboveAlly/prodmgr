// backend/src/controllers/inventory.controller.js
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

// Pobieranie wszystkich przedmiotów magazynowych z paginacją
const getAllInventoryItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtrowanie
    const { search, category, lowStock } = req.query;
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    if (lowStock === 'true') {
      where.AND = [
        { minQuantity: { not: null } },
        {
          quantity: {
            lte: { ref: 'minQuantity' }
          }
        }
      ];
    }
    
    // Pobieranie danych
    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          attachments: true,
          transactions: {
            take: 5,
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
          }
        }
      }),
      prisma.inventoryItem.count({ where })
    ]);
    
    // Pobierz dostępne kategorie
    const categories = await prisma.inventoryItem.findMany({
      select: {
        category: true
      },
      distinct: ['category'],
      where: {
        category: {
          not: null
        }
      }
    });
    
    // Statystyki
    const stats = {
      totalItems: total,
      lowStockItems: await prisma.inventoryItem.count({
        where: {
          AND: [
            { minQuantity: { not: null } },
            {
              quantity: {
                lte: { ref: 'minQuantity' }
              }
            }
          ]
        }
      }),
      categories: categories.map(cat => cat.category).filter(Boolean)
    };
    
    res.json({
      items,
      stats,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania przedmiotów:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania przedmiotów magazynowych' });
  }
};

// Pobieranie szczegółów przedmiotu magazynowego
const getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        attachments: true,
        transactions: {
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
        },
        guideItems: {
          include: {
            guide: {
              select: {
                id: true,
                title: true,
                status: true,
                barcode: true
              }
            }
          }
        }
      }
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Przedmiot magazynowy nie znaleziony' });
    }
    
    // Oblicz zarezerwowaną ilość
    const reserved = item.guideItems
      .filter(gi => gi.reserved)
      .reduce((total, gi) => total + gi.quantity, 0);
    
    // Oblicz dostępną ilość
    const available = Math.max(0, item.quantity - reserved);
    
    // Dodaj informacje o rezerwacji i dostępności
    const itemWithAvailability = {
      ...item,
      available,
      reserved
    };
    
    res.json(itemWithAvailability);
  } catch (error) {
    console.error('Błąd podczas pobierania przedmiotu:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania przedmiotu magazynowego' });
  }
};

// Tworzenie nowego przedmiotu magazynowego
const createInventoryItem = async (req, res) => {
  try {
    const { name, description, unit, quantity, location, minQuantity, category, barcode } = req.body;
    
    // Generuj unikalny kod kreskowy, jeśli nie podano
    const uniqueBarcode = barcode || await barcodeGenerator.generateUniqueBarcode('mag');
    
    // Sprawdź, czy kod kreskowy już istnieje
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { barcode: uniqueBarcode }
    });
    
    if (existingItem) {
      return res.status(400).json({ message: 'Przedmiot o tym kodzie kreskowym już istnieje' });
    }
    
    // Utwórz nowy przedmiot w transakcji
    const item = await prisma.$transaction(async (tx) => {
      // Utwórz przedmiot
      const newItem = await tx.inventoryItem.create({
        data: {
          name,
          description,
          barcode: uniqueBarcode,
          unit,
          quantity: parseFloat(quantity) || 0,
          location,
          minQuantity: minQuantity ? parseFloat(minQuantity) : null,
          category,
          createdById: req.user.id
        }
      });
      
      // Jeśli podano początkową ilość, dodaj transakcję
      if (parseFloat(quantity) > 0) {
        await tx.inventoryTransaction.create({
          data: {
            itemId: newItem.id,
            quantity: parseFloat(quantity),
            type: 'ADD',
            reason: 'Początkowa ilość',
            userId: req.user.id
          }
        });
      }
      
      // Obsługa załączników
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await tx.attachment.create({
            data: {
              filename: file.originalname,
              path: file.path,
              size: file.size,
              mimeType: file.mimetype,
              inventoryItemId: newItem.id,
              createdById: req.user.id
            }
          });
        }
      }
      
      return newItem;
    });
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'inventory',
      targetId: item.id,
      meta: {
        item: {
          name,
          barcode: uniqueBarcode,
          quantity: parseFloat(quantity) || 0,
          unit
        }
      }
    });
    
    // Pobierz pełne dane przedmiotu
    const fullItem = await prisma.inventoryItem.findUnique({
      where: { id: item.id },
      include: {
        attachments: true,
        transactions: {
          take: 1,
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
        }
      }
    });
    
    res.status(201).json({
      item: fullItem,
      message: 'Przedmiot magazynowy utworzony pomyślnie'
    });
  } catch (error) {
    console.error('Błąd podczas tworzenia przedmiotu:', error);
    res.status(500).json({ message: 'Błąd podczas tworzenia przedmiotu magazynowego' });
  }
};

// Aktualizacja przedmiotu magazynowego
const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, unit, location, minQuantity, category, barcode } = req.body;
    
    // Sprawdź, czy przedmiot istnieje
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id }
    });
    
    if (!existingItem) {
      return res.status(404).json({ message: 'Przedmiot magazynowy nie znaleziony' });
    }
    
    // Jeśli podano nowy kod kreskowy, sprawdź czy jest unikalny
    if (barcode && barcode !== existingItem.barcode) {
      const barcodeExists = await prisma.inventoryItem.findFirst({
        where: {
          barcode,
          id: { not: id }
        }
      });
      
      if (barcodeExists) {
        return res.status(400).json({ message: 'Przedmiot o tym kodzie kreskowym już istnieje' });
      }
    }
    
    // Przygotuj dane do aktualizacji
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (unit) updateData.unit = unit;
    if (location !== undefined) updateData.location = location;
    if (minQuantity !== undefined) updateData.minQuantity = minQuantity !== null ? parseFloat(minQuantity) : null;
    if (category !== undefined) updateData.category = category;
    if (barcode) updateData.barcode = barcode;
    updateData.updatedAt = new Date();
    
    // Aktualizuj przedmiot
    const updatedItem = await prisma.inventoryItem.update({
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
            inventoryItemId: id,
            createdById: req.user.id
          }
        });
      }
    }
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'inventory',
      targetId: id,
      meta: {
        previousData: {
          name: existingItem.name,
          description: existingItem.description,
          unit: existingItem.unit,
          location: existingItem.location,
          minQuantity: existingItem.minQuantity,
          category: existingItem.category,
          barcode: existingItem.barcode
        },
        updatedData: updateData
      }
    });
    
    // Sprawdź czy ilość spadła poniżej minimum i wyślij powiadomienie
    if (
      updatedItem.minQuantity !== null &&
      updatedItem.quantity <= updatedItem.minQuantity &&
      (existingItem.minQuantity === null || existingItem.quantity > existingItem.minQuantity)
    ) {
      // Znajdź użytkowników z uprawnieniami do zarządzania magazynem
      const managersWithPermission = await prisma.userPermission.findMany({
        where: {
          permission: {
            module: 'inventory',
            action: 'manage'
          },
          value: { gte: 2 }
        },
        select: { userId: true }
      });
      
      // Wyślij powiadomienia
      for (const manager of managersWithPermission) {
        const content = `⚠️ Niski stan magazynowy: ${updatedItem.name} (${updatedItem.quantity} ${updatedItem.unit})`;
        const link = `/inventory/items/${id}`;
        
        await sendNotification(req.app.get('io'), prisma, manager.userId, content, link);
      }
    }
    
    res.json({
      item: updatedItem,
      message: 'Przedmiot magazynowy zaktualizowany pomyślnie'
    });
  } catch (error) {
    console.error('Błąd podczas aktualizacji przedmiotu:', error);
    res.status(500).json({ message: 'Błąd podczas aktualizacji przedmiotu magazynowego' });
  }
};

// Usuwanie przedmiotu magazynowego
const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Sprawdź, czy przedmiot istnieje
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        attachments: true,
        guideItems: true
      }
    });
    
    if (!existingItem) {
      return res.status(404).json({ message: 'Przedmiot magazynowy nie znaleziony' });
    }
    
    // Sprawdź, czy przedmiot jest używany w jakimś przewodniku produkcyjnym
    if (existingItem.guideItems.length > 0) {
      return res.status(400).json({
        message: 'Nie można usunąć przedmiotu, który jest używany w przewodnikach produkcyjnych',
        guideItems: existingItem.guideItems
      });
    }
    
    // Usuń wszystkie załączniki fizycznie
    if (existingItem.attachments.length > 0) {
      for (const attachment of existingItem.attachments) {
        try {
          fs.unlinkSync(attachment.path);
        } catch (error) {
          console.error(`Nie można usunąć pliku ${attachment.path}:`, error);
        }
      }
    }
    
    // Usuń przedmiot i wszystkie powiązane dane
    await prisma.$transaction(async (tx) => {
      // Usuń transakcje związane z przedmiotem
      await tx.inventoryTransaction.deleteMany({
        where: { itemId: id }
      });
      
      // Usuń załączniki
      await tx.attachment.deleteMany({
        where: { inventoryItemId: id }
      });
      
      // Usuń przedmiot
      await tx.inventoryItem.delete({
        where: { id }
      });
    });
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'inventory',
      targetId: id,
      meta: {
        item: {
          name: existingItem.name,
          barcode: existingItem.barcode,
          quantity: existingItem.quantity,
          unit: existingItem.unit
        }
      }
    });
    
    res.json({ message: 'Przedmiot magazynowy usunięty pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas usuwania przedmiotu:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania przedmiotu magazynowego' });
  }
};

// Dodawanie ilości do przedmiotu
const addInventoryQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason } = req.body;
    
    // Sprawdź, czy przedmiot istnieje
    const item = await prisma.inventoryItem.findUnique({
      where: { id }
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Przedmiot magazynowy nie znaleziony' });
    }
    
    // Walidacja ilości
    const quantityValue = parseFloat(quantity);
    if (isNaN(quantityValue) || quantityValue <= 0) {
      return res.status(400).json({ message: 'Ilość musi być dodatnią liczbą' });
    }
    
    // Wykonaj operację w transakcji
    const result = await prisma.$transaction(async (tx) => {
      // Dodaj transakcję
      const transaction = await tx.inventoryTransaction.create({
        data: {
          itemId: id,
          quantity: quantityValue,
          type: 'ADD',
          reason: reason || 'Dodanie do magazynu',
          userId: req.user.id
        }
      });
      
      // Aktualizuj ilość przedmiotu
      const updatedItem = await tx.inventoryItem.update({
        where: { id },
        data: {
          quantity: { increment: quantityValue }
        }
      });
      
      return { transaction, updatedItem };
    });
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'add',
      module: 'inventory',
      targetId: id,
      meta: {
        itemId: id,
        itemName: item.name,
        quantity: quantityValue,
        newTotal: result.updatedItem.quantity,
        reason
      }
    });
    
    res.json({
      transaction: result.transaction,
      item: result.updatedItem,
      message: `Dodano ${quantityValue} ${item.unit} do przedmiotu "${item.name}"`
    });
  } catch (error) {
    console.error('Błąd podczas dodawania ilości:', error);
    res.status(500).json({ message: 'Błąd podczas dodawania ilości przedmiotu' });
  }
};

// Pobieranie ilości z przedmiotu
const removeInventoryQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason, forceRemove } = req.body;
    
    // Sprawdź, czy przedmiot istnieje
    const item = await prisma.inventoryItem.findUnique({
      where: { id }
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Przedmiot magazynowy nie znaleziony' });
    }
    
    // Walidacja ilości
    const quantityValue = parseFloat(quantity);
    if (isNaN(quantityValue) || quantityValue <= 0) {
      return res.status(400).json({ message: 'Ilość musi być dodatnią liczbą' });
    }
    
    // Oblicz zarezerwowaną ilość
    const reservedItems = await prisma.guideInventory.findMany({
      where: {
        itemId: id,
        reserved: true
      }
    });
    
    const reservedQuantity = reservedItems.reduce((total, item) => total + item.quantity, 0);
    const availableQuantity = item.quantity - reservedQuantity;
    
    // Sprawdź, czy jest wystarczająco dostępnego towaru
    if (quantityValue > availableQuantity && !forceRemove) {
      return res.status(400).json({
        message: 'Niewystarczająca ilość dostępnego towaru. Część jest zarezerwowana dla produkcji.',
        available: availableQuantity,
        reserved: reservedQuantity,
        requested: quantityValue,
        canForceRemove: req.user.permissions['inventory.manage'] >= 2
      });
    }
    
    // Sprawdź, czy jest wystarczająco towaru w ogóle
    if (quantityValue > item.quantity) {
      return res.status(400).json({
        message: 'Niewystarczająca ilość towaru w magazynie',
        available: item.quantity,
        requested: quantityValue
      });
    }
    
    // Wykonaj operację w transakcji
    const result = await prisma.$transaction(async (tx) => {
      // Dodaj transakcję
      const transaction = await tx.inventoryTransaction.create({
        data: {
          itemId: id,
          quantity: -quantityValue, // Ujemna wartość oznacza pobranie
          type: 'REMOVE',
          reason: reason || 'Pobranie z magazynu',
          userId: req.user.id
        }
      });
      
      // Aktualizuj ilość przedmiotu
      const updatedItem = await tx.inventoryItem.update({
        where: { id },
        data: {
          quantity: { decrement: quantityValue }
        }
      });
      
      return { transaction, updatedItem };
    });
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'remove',
      module: 'inventory',
      targetId: id,
      meta: {
        itemId: id,
        itemName: item.name,
        quantity: quantityValue,
        newTotal: result.updatedItem.quantity,
        reason,
        forceRemove: !!forceRemove && quantityValue > availableQuantity
      }
    });
    
    // Sprawdź czy ilość spadła poniżej minimum i wyślij powiadomienie
    if (result.updatedItem.minQuantity !== null && result.updatedItem.quantity <= result.updatedItem.minQuantity) {
      // Znajdź użytkowników z uprawnieniami do zarządzania magazynem
      const managersWithPermission = await prisma.userPermission.findMany({
        where: {
          permission: {
            module: 'inventory',
            action: 'manage'
          },
          value: { gte: 2 }
        },
        select: { userId: true }
      });
      
      // Wyślij powiadomienia
      for (const manager of managersWithPermission) {
        if (manager.userId !== req.user.id) { // Nie wysyłaj do osoby, która wykonuje operację
          const content = `⚠️ Niski stan magazynowy: ${item.name} (${result.updatedItem.quantity} ${item.unit})`;
          const link = `/inventory/items/${id}`;
          
          await sendNotification(req.app.get('io'), prisma, manager.userId, content, link);
        }
      }
    }
    
    res.json({
      transaction: result.transaction,
      item: result.updatedItem,
      message: `Pobrano ${quantityValue} ${item.unit} z przedmiotu "${item.name}"`
    });
  } catch (error) {
    console.error('Błąd podczas pobierania ilości:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania ilości przedmiotu' });
  }
};

// Rezerwowanie przedmiotów do przewodnika produkcyjnego
const addItemsToProductionGuide = async (req, res) => {
  try {
    const { guideId } = req.params;
    const { items } = req.body;
    
    // Sprawdź, czy przewodnik istnieje
    const guide = await prisma.productionGuide.findUnique({
      where: { id: guideId }
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Przewodnik produkcyjny nie znaleziony' });
    }
    
    // Waliduj tablicę przedmiotów
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Nieprawidłowa lista przedmiotów' });
    }
    
    const results = [];
    const errors = [];
    
    // Wykonaj operacje na każdym przedmiocie
    for (const itemData of items) {
      const { itemId, quantity, stepId } = itemData;
      
      try {
        // Sprawdź, czy przedmiot istnieje
        const item = await prisma.inventoryItem.findUnique({
          where: { id: itemId }
        });
        
        if (!item) {
          errors.push({ itemId, error: 'Przedmiot nie istnieje' });
          continue;
        }
        
        // Sprawdź, czy ilość jest prawidłowa
        const quantityValue = parseFloat(quantity);
        if (isNaN(quantityValue) || quantityValue <= 0) {
          errors.push({ itemId, error: 'Ilość musi być dodatnią liczbą' });
          continue;
        }
        
        // Sprawdź, czy krok istnieje (jeśli podano)
        if (stepId) {
          const step = await prisma.productionStep.findFirst({
            where: {
              id: stepId,
              guideId
            }
          });
          
          if (!step) {
            errors.push({ itemId, error: 'Podany krok nie należy do tego przewodnika' });
            continue;
          }
        }
        
        // Sprawdź, czy przedmiot jest już dodany do tego przewodnika
        const existingItem = await prisma.guideInventory.findUnique({
          where: {
            guideId_itemId: {
              guideId,
              itemId
            }
          }
        });
        
        // Wykonaj operację w transakcji
        const result = await prisma.$transaction(async (tx) => {
          let guideItem;
          
          if (existingItem) {
            // Aktualizuj istniejący wpis
            guideItem = await tx.guideInventory.update({
              where: {
                guideId_itemId: {
                  guideId,
                  itemId
                }
              },
              data: {
                quantity: quantityValue,
                stepId: stepId || existingItem.stepId,
                reserved: true
              }
            });
            
            // Dodaj transakcję aktualizacji rezerwacji
            await tx.inventoryTransaction.create({
              data: {
                itemId,
                quantity: 0, // Nie zmieniamy ilości, tylko aktualizujemy rezerwację
                type: 'RESERVE',
                reason: `Aktualizacja rezerwacji dla przewodnika ${guide.title} (${guide.barcode})`,
                guideId,
                userId: req.user.id
              }
            });
          } else {
            // Utwórz nowy wpis
            guideItem = await tx.guideInventory.create({
              data: {
                guideId,
                itemId,
                quantity: quantityValue,
                stepId,
                reserved: true
              }
            });
            
            // Dodaj transakcję rezerwacji
            await tx.inventoryTransaction.create({
              data: {
                itemId,
                quantity: -quantityValue, // Ujemna wartość pokazuje rezerwację
                type: 'RESERVE',
                reason: `Rezerwacja dla przewodnika ${guide.title} (${guide.barcode})`,
                guideId,
                userId: req.user.id
              }
            });
          }
          
          return guideItem;
        });
        
        // Dodaj do wyników
        results.push({
          itemId,
          item: {
            name: item.name,
            unit: item.unit
          },
          quantity: quantityValue,
          stepId,
          guideItemId: result.id
        });
        
        // Logowanie audytu
        await logAudit({
          userId: req.user.id,
          action: existingItem ? 'update' : 'create',
          module: 'guideInventory',
          targetId: result.id,
          meta: {
            guideId,
            guideTitle: guide.title,
            itemId,
            itemName: item.name,
            quantity: quantityValue,
            stepId
          }
        });
      } catch (error) {
        console.error(`Błąd podczas dodawania przedmiotu ${itemId}:`, error);
        errors.push({ itemId, error: error.message });
      }
    }
    
    res.json({
      success: errors.length === 0,
      results,
      errors,
      message: results.length > 0
        ? `Dodano ${results.length} przedmiotów do przewodnika`
        : 'Nie dodano żadnych przedmiotów'
    });
  } catch (error) {
    console.error('Błąd podczas dodawania przedmiotów do przewodnika:', error);
    res.status(500).json({ message: 'Błąd podczas dodawania przedmiotów do przewodnika' });
  }
};

// Usuwanie przedmiotu z przewodnika produkcyjnego
const removeItemFromProductionGuide = async (req, res) => {
  try {
    const { guideId, itemId } = req.params;
    
    // Sprawdź, czy przedmiot jest przypisany do przewodnika
    const guideItem = await prisma.guideInventory.findUnique({
      where: {
        guideId_itemId: {
          guideId,
          itemId
        }
      },
      include: {
        guide: true,
        item: true
      }
    });
    
    if (!guideItem) {
      return res.status(404).json({ message: 'Przedmiot nie jest przypisany do tego przewodnika' });
    }
    
    // Usuń przypisanie i zaktualizuj transakcje
    await prisma.$transaction(async (tx) => {
      // Usuń przypisanie
      await tx.guideInventory.delete({
        where: {
          guideId_itemId: {
            guideId,
            itemId
          }
        }
      });
      
      // Dodaj transakcję zwolnienia rezerwacji
      if (guideItem.reserved) {
        await tx.inventoryTransaction.create({
          data: {
            itemId,
            quantity: guideItem.quantity, // Dodatnia wartość oznacza zwolnienie
            type: 'RELEASE',
            reason: `Usunięcie z przewodnika ${guideItem.guide.title} (${guideItem.guide.barcode})`,
            guideId,
            userId: req.user.id
          }
        });
      }
    });
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'guideInventory',
      targetId: `${guideId}_${itemId}`,
      meta: {
        guideId,
        guideTitle: guideItem.guide.title,
        itemId,
        itemName: guideItem.item.name,
        quantity: guideItem.quantity,
        wasReserved: guideItem.reserved
      }
    });
    
    res.json({
      message: `Usunięto przedmiot "${guideItem.item.name}" z przewodnika`
    });
  } catch (error) {
    console.error('Błąd podczas usuwania przedmiotu z przewodnika:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania przedmiotu z przewodnika' });
  }
};

// Aktualizacja statusu rezerwacji przedmiotu w przewodniku
const updateReservationStatus = async (req, res) => {
  try {
    const { guideId, itemId } = req.params;
    const { reserved } = req.body;
    
    // Sprawdź, czy przedmiot jest przypisany do przewodnika
    const guideItem = await prisma.guideInventory.findUnique({
      where: {
        guideId_itemId: {
          guideId,
          itemId
        }
      },
      include: {
        guide: true,
        item: true
      }
    });
    
    if (!guideItem) {
      return res.status(404).json({ message: 'Przedmiot nie jest przypisany do tego przewodnika' });
    }
    
    // Jeśli status nie zmienia się, zakończ
    if (guideItem.reserved === reserved) {
      return res.json({
        guideItem,
        message: `Przedmiot już ${reserved ? 'jest' : 'nie jest'} zarezerwowany`
      });
    }
    
    // Aktualizuj status rezerwacji i dodaj transakcję
    const updatedItem = await prisma.$transaction(async (tx) => {
      // Aktualizuj status
      const updated = await tx.guideInventory.update({
        where: {
          guideId_itemId: {
            guideId,
            itemId
          }
        },
        data: {
          reserved
        }
      });
      
      // Dodaj odpowiednią transakcję
      await tx.inventoryTransaction.create({
        data: {
          itemId,
          quantity: reserved ? -guideItem.quantity : guideItem.quantity, // Ujemna dla rezerwacji, dodatnia dla zwolnienia
          type: reserved ? 'RESERVE' : 'RELEASE',
          reason: `${reserved ? 'Rezerwacja' : 'Zwolnienie rezerwacji'} w przewodniku ${guideItem.guide.title} (${guideItem.guide.barcode})`,
          guideId,
          userId: req.user.id
        }
      });
      
      return updated;
    });
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'guideInventory',
      targetId: `${guideId}_${itemId}`,
      meta: {
        guideId,
        guideTitle: guideItem.guide.title,
        itemId,
        itemName: guideItem.item.name,
        quantity: guideItem.quantity,
        reserved: reserved,
        previouslyReserved: guideItem.reserved
      }
    });
    
    res.json({
      guideItem: updatedItem,
      message: `Przedmiot ${reserved ? 'zarezerwowany' : 'zwolniony z rezerwacji'} pomyślnie`
    });
  } catch (error) {
    console.error('Błąd podczas aktualizacji statusu rezerwacji:', error);
    res.status(500).json({ message: 'Błąd podczas aktualizacji statusu rezerwacji' });
  }
};

// Pobieranie historii transakcji przedmiotu
const getItemTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Sprawdź, czy przedmiot istnieje
    const item = await prisma.inventoryItem.findUnique({
      where: { id }
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Przedmiot magazynowy nie znaleziony' });
    }
    
    // Pobierz transakcje z paginacją
    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where: { itemId: id },
        skip,
        take: limit,
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
      }),
      prisma.inventoryTransaction.count({
        where: { itemId: id }
      })
    ]);
    
    res.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania historii transakcji:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania historii transakcji' });
  }
};

// Generowanie raportu stanu magazynu
const generateInventoryReport = async (req, res) => {
  try {
    const { category, lowStock } = req.query;
    
    // Przygotuj filtry
    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (lowStock === 'true') {
      where.AND = [
        { minQuantity: { not: null } },
        {
          quantity: {
            lte: { ref: 'minQuantity' }
          }
        }
      ];
    }
    
    // Pobierz dane
    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        guideItems: {
          where: {
            reserved: true
          }
        }
      }
    });
    
    // Przygotuj dane raportu
    const reportItems = items.map(item => {
      const reserved = item.guideItems.reduce((total, gi) => total + gi.quantity, 0);
      const available = Math.max(0, item.quantity - reserved);
      
      return {
        id: item.id,
        name: item.name,
        barcode: item.barcode,
        category: item.category || 'Bez kategorii',
        location: item.location || 'Nie określono',
        unit: item.unit,
        quantity: item.quantity,
        reserved,
        available,
        minQuantity: item.minQuantity,
        status: item.minQuantity !== null && item.quantity <= item.minQuantity
          ? 'Niski stan'
          : available <= 0
            ? 'Brak dostępnych (zarezerwowane)'
            : 'OK'
      };
    });
    
    // Statystyki
    const stats = {
      totalItems: reportItems.length,
      totalQuantity: reportItems.reduce((total, item) => total + item.quantity, 0),
      reservedQuantity: reportItems.reduce((total, item) => total + item.reserved, 0),
      availableQuantity: reportItems.reduce((total, item) => total + item.available, 0),
      lowStockItems: reportItems.filter(item => item.status === 'Niski stan').length,
      categories: [...new Set(reportItems.map(item => item.category))]
    };
    
    // Generuj timestamp dla raportu
    const timestamp = new Date().toISOString();
    
    // Logowanie audytu
    await logAudit({
      userId: req.user.id,
      action: 'report',
      module: 'inventory',
      targetId: null,
      meta: {
        timestamp,
        filters: { category, lowStock },
        stats
      }
    });
    
    res.json({
      report: {
        title: 'Raport Stanu Magazynu',
        timestamp,
        items: reportItems,
        stats
      }
    });
  } catch (error) {
    console.error('Błąd podczas generowania raportu:', error);
    res.status(500).json({ message: 'Błąd podczas generowania raportu' });
  }
};

module.exports = {
  handleFileUpload,
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addInventoryQuantity,
  removeInventoryQuantity,
  addItemsToProductionGuide,
  removeItemFromProductionGuide,
  updateReservationStatus,
  getItemTransactions,
  generateInventoryReport
};