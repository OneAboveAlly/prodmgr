// backend/src/controllers/production.controller.js
const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/auditLogger');
const { sendNotification, sendProductionNotification } = require('../utils/notificationUtils');
const barcodeGenerator = require('../utils/barcodeGenerator');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const notificationController = require('./notification.controller');

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
  
  // Add a random component to avoid collision in case of concurrent requests
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  // Format: PROD-YYYY-XXXX-RRR (XXXX is sequential padded with zeros, RRR is random)
  const sequentialNumber = (count + 1).toString().padStart(4, '0');
  return `PROD-${year}-${sequentialNumber}-${random}`;
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
      assignedUsers = [],
      inventoryItems = [] // Nowe pole z listą przedmiotów magazynowych
    } = req.body;
    
    // Function to handle guide creation with retries for barcode uniqueness
    const createGuideWithRetry = async (retryCount = 0, maxRetries = 3) => {
      try {
        // Generate a structured barcode
        const uniqueBarcode = await generateProductionBarcode();
        
        // Create guide with enhanced fields and handle inventory reservation in transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create the guide
          const guide = await tx.productionGuide.create({
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
          await tx.guideChangeHistory.create({
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
            
            await tx.guideAssignment.createMany({
              data: userAssignments
            });
          }
          
          // Reserve inventory items if provided
          const reservedItems = [];
          const errors = [];
          
          if (inventoryItems && inventoryItems.length > 0) {
            for (const itemData of inventoryItems) {
              const { itemId, quantity, stepId = null } = itemData;
              
              // Check if item exists
              const item = await tx.inventoryItem.findUnique({
                where: { id: itemId }
              });
              
              if (!item) {
                errors.push({ itemId, error: 'Przedmiot nie istnieje' });
                continue;
              }
              
              // Validate quantity
              const quantityValue = parseFloat(quantity);
              if (isNaN(quantityValue) || quantityValue <= 0) {
                errors.push({ itemId, error: 'Ilość musi być dodatnią liczbą' });
                continue;
              }
              
              // Create reservation
              const guideItem = await tx.guideInventory.create({
                data: {
                  guideId: guide.id,
                  itemId,
                  quantity: quantityValue,
                  stepId,
                  reserved: true
                }
              });
              
              // Create reservation transaction
              await tx.inventoryTransaction.create({
                data: {
                  itemId,
                  quantity: 0, // Not changing actual quantity, just reserving
                  type: 'RESERVE',
                  reason: `Rezerwacja dla nowego przewodnika ${title} (${guide.barcode})`,
                  guideId: guide.id,
                  userId: req.user.id
                }
              });
              
              reservedItems.push({
                itemId,
                itemName: item.name,
                unit: item.unit,
                quantity: quantityValue,
                stepId
              });
            }
          }
          
          return { guide, reservedItems, errors, barcode: uniqueBarcode };
        });
        
        return result;
      } catch (error) {
        // If this is a unique constraint error on barcode, retry with a new barcode
        if (error.code === 'P2002' && error.meta?.target?.includes('barcode') && retryCount < maxRetries) {
          console.log(`Barcode collision detected. Retrying... (${retryCount + 1}/${maxRetries})`);
          return createGuideWithRetry(retryCount + 1, maxRetries);
        }
        
        // Otherwise, throw the error
        throw error;
      }
    };
    
    // Call our recursive function with retry logic
    const result = await createGuideWithRetry();
    
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
            productionGuideId: result.guide.id,
            createdById: req.user.id
          }
        });
        attachments.push(attachment);
      }
    }
    
    // Send notifications to assigned users
    if (assignedUsers.length > 0) {
      for (const userId of assignedUsers) {
        await sendNotification(
          req.app.get('io'),
          prisma,
          userId,
          `Zostałeś przypisany do nowego przewodnika produkcyjnego: ${title}`,
          `/production/guides/${result.guide.id}`
        );
        
        // Notify about reserved items if there are any
        if (result.reservedItems.length > 0) {
          await sendNotification(
            req.app.get('io'),
            prisma,
            userId,
            `Dla przewodnika "${title}" zarezerwowano ${result.reservedItems.length} pozycji z magazynu`,
            `/production/guides/${result.guide.id}/inventory`
          );
        }
      }
    }
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'production',
      targetId: result.guide.id,
      meta: { 
        guide: { 
          title, 
          description, 
          priority, 
          barcode: result.barcode,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          autoPriority: autoPriority || false,
          inventoryItemsCount: result.reservedItems.length
        } 
      }
    });
    
    res.status(201).json({
      guide: result.guide,
      attachments,
      reservedItems: result.reservedItems,
      inventoryErrors: result.errors,
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
    } else {
      // Domyślnie wyklucz zarchiwizowane przewodniki, chyba że użytkownik
      // jawnie zażąda ich wyświetlenia poprzez filtr 'status'
      where.status = {
        not: 'ARCHIVED'
      };
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
    
    // Pobieranie danych z pełnymi informacjami o krokach
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
              status: true,
              estimatedTime: true,
              actualTime: true,
              order: true
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
    
    // Oblicz dokładne statystyki czasu dla każdego przewodnika
    const processedGuides = guides.map(guide => {
      // Obliczanie czasu
      let totalEstimatedTime = 0;
      let totalActualTime = 0;
      
      if (guide.steps && guide.steps.length > 0) {
        guide.steps.forEach(step => {
          const estimatedTime = Number(step.estimatedTime || 0);
          totalEstimatedTime += estimatedTime;
          
          // Dla ukończonych kroków bez rzeczywistego czasu, użyj szacowanego
          let actualTime = Number(step.actualTime || 0);
          if (step.status === 'COMPLETED' && actualTime === 0) {
            actualTime = estimatedTime;
          }
          
          totalActualTime += actualTime;
          
          // Aktualizuj dane kroku
          step.estimatedTime = estimatedTime;
          step.actualTime = actualTime;
        });
      }
      
      // Dodaj statystyki do przewodnika
      if (!guide.stats) guide.stats = {};
      guide.stats.time = {
        totalEstimatedTime,
        totalActualTime,
        progress: totalEstimatedTime > 0 ? (totalActualTime / totalEstimatedTime) * 100 : 0
      };
      
      // Process assignedUsers on guide level for frontend compatibility
      if (guide.assignedUsers && Array.isArray(guide.assignedUsers)) {
        guide.assignedUsers = guide.assignedUsers.map(assignment => {
          // Get the first role from userRoles array or set a default
          const userRoleObj = assignment.user.userRoles && assignment.user.userRoles.length > 0
            ? assignment.user.userRoles[0]
            : null;
          
          // Extract the role name if available
          const roleObj = userRoleObj?.role || null;
          const roleName = roleObj?.name || 'User';
          
          return {
            ...assignment,
            user: {
              ...assignment.user,
              // Add role property for backward compatibility with frontend
              role: roleName,
              // Clean up the processed user object to avoid circular references
              userRoles: undefined
            }
          };
        });
      }
      
      return guide;
    });
    
    // Podstawowe statystyki
    const stats = {
      totalGuides: total,
      inProgress: await prisma.productionGuide.count({ where: { status: 'IN_PROGRESS' } }),
      completed: await prisma.productionGuide.count({ where: { status: 'COMPLETED' } }),
      critical: await prisma.productionGuide.count({ where: { priority: 'CRITICAL' } })
    };
    
    res.json({
      guides: processedGuides,
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
    const includeSteps = req.query.includeSteps === 'true';
    const includeStats = req.query.includeStats === 'true';
    const includeTimeData = req.query.includeTimeData === 'true';
    
    console.log(`Fetching guide with ID: ${id}, includeSteps: ${includeSteps}, includeStats: ${includeStats}, includeTimeData: ${includeTimeData}`);
    
    // Validate the ID to avoid database errors
    if (!id || typeof id !== 'string' || id.length < 10) {
      return res.status(400).json({ message: 'Nieprawidłowy identyfikator przewodnika' });
    }
    
    // Pobieranie danych
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
        steps: includeSteps ? {
          include: {
            // Fix: Use stepAssignments instead of assignedUsers (which doesn't exist on ProductionStep)
            stepAssignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    // Remove 'role' field which doesn't exist in User model
                    // role: true
                    // If you need role information, you may need to include userRoles relation
                    userRoles: {
                  include: {
                        role: true
                      }
                    }
                      }
                    }
                  }
                },
            // Optionally include other relevant relations if needed
            workEntries: true,
                attachments: true
          },
          orderBy: {
            order: 'asc'
          }
        } : false,
        attachments: true,
        assignedUsers: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                lastName: true,
                email: true,
                // Remove 'role' field which doesn't exist in User model
                // role: true
                // If you need role information, you may need to include userRoles relation
                userRoles: {
                  include: {
                    role: true
                  }
                }
              }
            }
          }
        },
        inventory: {
          include: {
            item: true
          }
        }
      }
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Nie znaleziono przewodnika produkcyjnego' });
    }
    
    // Ensure steps is always an array
    if (!guide.steps) guide.steps = [];
    
    // Process steps data and calculate stats if needed
    let stats = {};
    
    if (includeSteps && includeStats) {
      try {
        // Statystyki kroków
        const totalSteps = guide.steps.length;
        const completedSteps = guide.steps.filter(step => step.status === 'COMPLETED').length;
        const pendingSteps = guide.steps.filter(step => step.status === 'PENDING').length;
        const inProgressSteps = guide.steps.filter(step => step.status === 'IN_PROGRESS').length;
        
        stats.steps = {
          total: totalSteps,
          completed: completedSteps,
          pending: pendingSteps,
          inProgress: inProgressSteps,
          progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
        };
      } catch (err) {
        console.error('Error calculating step stats:', err);
        stats.steps = { total: 0, completed: 0, pending: 0, inProgress: 0, progress: 0 };
      }
    }
    
    // Process time data if needed
    if (includeSteps && includeTimeData) {
      try {
    // Obliczanie czasu
    let totalEstimatedTime = 0;
    let totalActualTime = 0;
    
        // Process each step and map stepAssignments to assignedUsers for frontend compatibility
        guide.steps = guide.steps.map(step => {
          try {
            if (!step) return { estimatedTime: 0, actualTime: 0 };
            
            const estimatedTime = Number(step.estimatedTime || 0);
            
            // For completed steps without actual time, use estimated time
            let actualTime = Number(step.actualTime || 0);
            if (step.status === 'COMPLETED' && actualTime === 0) {
              actualTime = estimatedTime;
            }
            
            totalEstimatedTime += estimatedTime;
            totalActualTime += actualTime;
            
            // Map stepAssignments to assignedUsers for backward compatibility with frontend
            const assignedUsers = step.stepAssignments?.map(assignment => {
              // Get the first role from userRoles array or set a default
              const userRoleObj = assignment.user.userRoles && assignment.user.userRoles.length > 0
                ? assignment.user.userRoles[0]
                : null;
              
              // Extract the role name if available
              const roleObj = userRoleObj?.role || null;
              const roleName = roleObj?.name || 'User';
              
              return {
                userId: assignment.user.id,
                user: {
                  ...assignment.user,
                  // Add role property for backward compatibility with frontend
                  role: roleName,
                  // Clean up the processed user object to avoid circular references
                  userRoles: undefined
                }
              };
            }) || [];
            
            // Return processed step with normalized values
            return {
              ...step,
              estimatedTime,
              actualTime,
              assignedUsers, // Add this field for frontend compatibility
              stepAssignments: undefined // Remove to avoid duplication
            };
          } catch (err) {
            console.error(`Error processing step ${step?.id}:`, err);
            return step;
          }
        });
        
        stats.time = {
      totalEstimatedTime,
      totalActualTime,
      progress: totalEstimatedTime > 0 ? (totalActualTime / totalEstimatedTime) * 100 : 0
    };
      } catch (err) {
        console.error('Error calculating time stats:', err);
        stats.time = { totalEstimatedTime: 0, totalActualTime: 0, progress: 0 };
      }
    }
    
    // Attach the calculated stats to the guide
    guide.stats = stats;
    
    res.json(guide);
  } catch (error) {
    console.error('Błąd podczas pobierania przewodnika:', error);
    res.status(500).json({ 
      message: 'Błąd podczas pobierania przewodnika produkcyjnego',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      autoPriority,
      assignedUsers = [],
      inventoryItems = [] // Nowe pole z przedmiotami magazynowymi
    } = req.body;
    
    // Check if guide exists
    const existingGuide = await prisma.productionGuide.findUnique({
      where: { id },
      include: {
        assignedUsers: {
          select: { userId: true }
        }
      }
    });
    
    if (!existingGuide) {
      return res.status(404).json({ message: 'Production guide not found' });
    }
    
    // Use a transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
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
    
      // Update guide
      let updatedGuide = existingGuide;
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      
        updatedGuide = await tx.productionGuide.update({
        where: { id },
        data: updateData
      });
      
      // Record all changes in history
      for (const change of changes) {
          await tx.guideChangeHistory.create({
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
      }
      
      // Handle user assignments if provided
      if (assignedUsers && assignedUsers.length > 0) {
        // Get current assignments
        const existingAssignments = existingGuide.assignedUsers.map(a => a.userId);
        
        // Determine users to add and remove
        const usersToAdd = assignedUsers.filter(userId => !existingAssignments.includes(userId));
        const usersToRemove = existingAssignments.filter(userId => !assignedUsers.includes(userId));
        
        // Remove assignments
        if (usersToRemove.length > 0) {
          await tx.guideAssignment.deleteMany({
            where: {
              guideId: id,
              userId: { in: usersToRemove }
            }
          });
          
          changes.push({
            fieldName: 'assignedUsers',
            oldValue: JSON.stringify(existingAssignments),
            newValue: JSON.stringify(assignedUsers),
            removed: usersToRemove
          });
        }
        
        // Add new assignments
        if (usersToAdd.length > 0) {
          const assignmentData = usersToAdd.map(userId => ({
            guideId: id,
            userId
          }));
          
          await tx.guideAssignment.createMany({
            data: assignmentData
          });
          
          if (usersToRemove.length === 0) {
            changes.push({
              fieldName: 'assignedUsers',
              oldValue: JSON.stringify(existingAssignments),
              newValue: JSON.stringify(assignedUsers),
              added: usersToAdd
            });
          }
          
          // Send notifications to newly assigned users
          for (const userId of usersToAdd) {
            // Notification will be sent outside the transaction
          }
        }
      }
      
      // Handle inventory items if provided
      const inventoryResults = {
        added: [],
        updated: [],
        removed: [],
        errors: []
      };
      
      if (inventoryItems && inventoryItems.length > 0) {
        // Get current inventory items
        const currentItems = await tx.guideInventory.findMany({
          where: { guideId: id },
          include: { item: true }
        });
        
        // Map of current items by ID for easy lookup
        const currentItemsMap = currentItems.reduce((map, item) => {
          map[item.itemId] = item;
          return map;
        }, {});
        
        // Process each inventory item
        for (const itemData of inventoryItems) {
          const { itemId, quantity, stepId = null } = itemData;
          
          try {
            // Verify item exists
            const item = await tx.inventoryItem.findUnique({
              where: { id: itemId }
            });
            
            if (!item) {
              inventoryResults.errors.push({ 
                itemId, 
                error: 'Przedmiot nie istnieje' 
              });
              continue;
            }
            
            // Validate quantity
            const quantityValue = parseFloat(quantity);
            if (isNaN(quantityValue) || quantityValue <= 0) {
              inventoryResults.errors.push({ 
                itemId, 
                error: 'Ilość musi być dodatnią liczbą' 
              });
              continue;
            }
            
            // Check if the item is already assigned to this guide
            const existingItem = currentItemsMap[itemId];
            
            if (existingItem) {
              // Update existing assignment if quantity or step changed
              if (existingItem.quantity !== quantityValue || existingItem.stepId !== stepId) {
                const updatedItem = await tx.guideInventory.update({
                  where: {
                    guideId_itemId: {
                      guideId,
                      itemId
                    }
                  },
                  data: {
                    quantity: quantityValue,
                    stepId
                  }
                });
                
                inventoryResults.updated.push({
                  itemId,
                  item: {
                    name: item.name,
                    unit: item.unit
                  },
                  oldQuantity: existingItem.quantity,
                  newQuantity: quantityValue,
                  stepId
                });
              }
              
              // Remove from map so we can track what's left to delete
              delete currentItemsMap[itemId];
            } else {
              // Create new assignment
              const newGuideItem = await tx.guideInventory.create({
                data: {
                  guideId: id,
                  itemId,
                  quantity: quantityValue,
                  stepId,
                  reserved: true
                }
              });
              
              // Create reservation transaction
              await tx.inventoryTransaction.create({
                data: {
                  itemId,
                  quantity: 0, // Not changing actual quantity, just reserving
                  type: 'RESERVE',
                  reason: `Rezerwacja dla przewodnika ${updatedGuide.title} (${updatedGuide.barcode})`,
                  guideId: id,
                  userId: req.user.id
                }
              });
              
              inventoryResults.added.push({
                itemId,
                item: {
                  name: item.name,
                  unit: item.unit
                },
                quantity: quantityValue,
                stepId
              });
            }
          } catch (error) {
            console.error(`Error processing inventory item ${itemId}:`, error);
            inventoryResults.errors.push({ 
              itemId, 
              error: error.message 
            });
          }
        }
        
        // Remove items that were not in the update
        const itemsToRemove = Object.values(currentItemsMap);
        for (const itemToRemove of itemsToRemove) {
          try {
            // Only release reserved items
            if (itemToRemove.reserved) {
              // Create transaction to release reservation
              await tx.inventoryTransaction.create({
                data: {
                  itemId: itemToRemove.itemId,
                  quantity: 0, // Not changing actual quantity, just releasing reservation
                  type: 'RELEASE',
                  reason: `Zwolnienie rezerwacji z przewodnika ${updatedGuide.title} (${updatedGuide.barcode})`,
                  guideId: id,
                  userId: req.user.id
                }
              });
            }
            
            // Delete the guide inventory item
            await tx.guideInventory.delete({
              where: {
                guideId_itemId: {
                  guideId: id,
                  itemId: itemToRemove.itemId
                }
              }
            });
            
            inventoryResults.removed.push({
              itemId: itemToRemove.itemId,
              item: {
                name: itemToRemove.item.name,
                unit: itemToRemove.item.unit
              },
              quantity: itemToRemove.quantity
            });
          } catch (error) {
            console.error(`Error removing inventory item ${itemToRemove.itemId}:`, error);
            inventoryResults.errors.push({ 
              itemId: itemToRemove.itemId, 
              error: error.message 
            });
          }
        }
        
        // Add inventory changes to change history if any
        if (inventoryResults.added.length > 0 || 
            inventoryResults.updated.length > 0 || 
            inventoryResults.removed.length > 0) {
          await tx.guideChangeHistory.create({
            data: {
              guideId: id,
              userId: req.user.id,
              changeType: 'UPDATE',
              fieldName: 'inventory',
              oldValue: JSON.stringify(currentItems.map(item => ({
                itemId: item.itemId,
                name: item.item.name,
                quantity: item.quantity
              }))),
              newValue: JSON.stringify(inventoryItems)
            }
          });
        }
      }
      
      return {
        updatedGuide,
        changes,
        inventoryResults
      };
    });
    
    // Actions outside the transaction
    
    // Send notifications for assigned users
    if (assignedUsers && assignedUsers.length > 0) {
      const existingAssignments = existingGuide.assignedUsers.map(a => a.userId);
      const usersToAdd = assignedUsers.filter(userId => !existingAssignments.includes(userId));
      
      for (const userId of usersToAdd) {
        await sendNotification(
          req.app.get('io'),
          prisma,
          userId,
          `Zostałeś przypisany do przewodnika produkcyjnego: ${result.updatedGuide.title}`,
          `/production/guides/${id}`
        );
      }
    }
      
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
          `Status przewodnika "${result.updatedGuide.title}" zmienił się na ${status}`,
            `/production/guides/${id}`
          );
        }
      }
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'production',
      targetId: id,
      meta: {
        changes: result.changes,
        inventoryChanges: {
          added: result.inventoryResults.added.length,
          updated: result.inventoryResults.updated.length,
          removed: result.inventoryResults.removed.length,
          errors: result.inventoryResults.errors.length
        },
        previousData: {
          title: existingGuide.title,
          description: existingGuide.description,
          priority: existingGuide.priority,
          status: existingGuide.status,
          deadline: existingGuide.deadline,
          autoPriority: existingGuide.autoPriority
        }
      }
    });
      
      res.json({
      guide: result.updatedGuide,
      inventoryResults: result.inventoryResults,
        message: 'Production guide updated successfully'
      });
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
    
    // Konwersja z sekund na minuty i zaokrąglenie w górę
    const actualTimeInMinutes = Math.ceil(totalDuration._sum.duration / 60);
    
    // Określ, czy krok powinien być oznaczony jako zakończony
    // 1. Jeśli użytkownik wyraźnie zażądał zakończenia kroku
    // 2. Lub jeśli rzeczywisty czas jest większy lub równy szacowanemu czasowi 
    const shouldComplete = completeStep || (step.estimatedTime > 0 && actualTimeInMinutes >= step.estimatedTime);
    
    // Aktualizuj krok
    await prisma.productionStep.update({
      where: { id },
      data: {
        actualTime: actualTimeInMinutes,
        status: shouldComplete ? 'COMPLETED' : step.status
      }
    });
    
    // Sprawdź czy wszystkie kroki są zakończone i zaktualizuj status przewodnika
    if (shouldComplete) {
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
      
      // Wysyłaj powiadomienie o ukończeniu kroku, jeśli został automatycznie oznaczony jako ukończony
      if (!completeStep && shouldComplete) {
        const stepOwner = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { firstName: true, lastName: true }
        });
        
        // Wysyłaj powiadomienie do twórcy przewodnika, jeśli nie jest to osoba, która ukończyła krok
        if (step.guide.createdById !== req.user.id) {
          await sendNotification(
            req.app.get('io'),
            prisma,
            step.guide.createdById,
            `Step "${step.title}" has been automatically completed by ${stepOwner.firstName} ${stepOwner.lastName}`,
            `/production/guides/${step.guideId}`
          );
        }
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
        autoCompleted: !completeStep && shouldComplete,
        completeStep: shouldComplete
      }
    });
    
    res.json({
      workSession,
      stepCompleted: shouldComplete,
      message: shouldComplete 
        ? 'Sesja pracy zakończona pomyślnie. Krok został oznaczony jako ukończony.' 
        : 'Sesja pracy zakończona pomyślnie.'
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
    
    // Calculate time limits
    const usedTotal = await prisma.stepWorkEntry.aggregate({
      where: {
        stepId: stepId,
      },
      _sum: { timeWorked: true }
    });

    const usedMinutes = usedTotal._sum.timeWorked || 0;
    const requestedMinutes = parseInt(timeWorked);
    
    // Check if adding this time would exceed the step's estimated time
    if (step.estimatedTime && (usedMinutes + requestedMinutes) > step.estimatedTime) {
      const availableMinutes = Math.max(0, step.estimatedTime - usedMinutes);
      return res.status(400).json({ 
        message: `Time limit for this step exceeded. Available: ${availableMinutes} min. Requested: ${requestedMinutes} min.`,
        estimatedTotal: step.estimatedTime,
        usedMinutes,
        requestedMinutes,
        availableMinutes
      });
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

// Update a work entry
const updateWorkEntry = async (req, res) => {
  try {
    const { id: entryId } = req.params;
    const { timeWorked, notes } = req.body;
    const userId = req.user.id;
    
    // Validate timeWorked
    if (timeWorked !== undefined && (!Number.isInteger(parseInt(timeWorked)) || parseInt(timeWorked) <= 0)) {
      return res.status(400).json({ message: 'Time worked must be a positive integer' });
    }
    
    // Find the entry
    const workEntry = await prisma.stepWorkEntry.findUnique({
      where: { id: entryId },
      include: {
        step: {
          include: {
            guide: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    if (!workEntry) {
      return res.status(404).json({ message: 'Work entry not found' });
    }
    
    // Check permissions - allow users with manage permission or the creator of the guide
    const hasManagePermission = req.user.permissions['production.manage'];
    const isGuideCreator = workEntry.step.guide.createdById === userId;
    
    if (!hasManagePermission && !isGuideCreator) {
      return res.status(403).json({ message: 'You do not have permission to edit this work entry' });
    }
    
    // Check if new time would exceed step limit
    if (timeWorked !== undefined && timeWorked !== workEntry.timeWorked) {
      const timeDifference = parseInt(timeWorked) - workEntry.timeWorked;
      
      if (timeDifference > 0 && workEntry.step.estimatedTime) {
        // Calculate current total time for this step
        const totalTime = await prisma.stepWorkEntry.aggregate({
          where: { stepId: workEntry.stepId },
          _sum: { timeWorked: true }
        });
        
        const currentTotal = (totalTime._sum.timeWorked || 0);
        
        // Check if new total would exceed estimate
        if ((currentTotal + timeDifference) > workEntry.step.estimatedTime) {
          const availableTime = Math.max(0, workEntry.step.estimatedTime - currentTotal + workEntry.timeWorked);
          return res.status(400).json({
            message: `Time limit exceeded. Available: ${availableTime} minutes. Requested change: +${timeDifference} minutes.`,
            availableTime,
            requestedChange: timeDifference
          });
        }
      }
    }
    
    // Update the entry
    const updateData = {};
    if (timeWorked !== undefined) updateData.timeWorked = parseInt(timeWorked);
    if (notes !== undefined) updateData.notes = notes;
    
    const updatedEntry = await prisma.stepWorkEntry.update({
      where: { id: entryId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        step: {
          select: {
            id: true,
            title: true,
            order: true
          }
        }
      }
    });
    
    // Log the update
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'workEntry',
      targetId: entryId,
      meta: {
        previousData: {
          timeWorked: workEntry.timeWorked,
          notes: workEntry.notes
        },
        newData: updateData,
        step: {
          id: workEntry.stepId,
          title: workEntry.step.title
        },
        user: {
          id: workEntry.userId,
          name: `${workEntry.user.firstName} ${workEntry.user.lastName}`
        }
      }
    });
    
    // If time was changed, also update step's actual time
    if (timeWorked !== undefined && timeWorked !== workEntry.timeWorked) {
      const newStepTotal = await prisma.stepWorkEntry.aggregate({
        where: { stepId: workEntry.stepId },
        _sum: { timeWorked: true }
      });
      
      await prisma.productionStep.update({
        where: { id: workEntry.stepId },
        data: { actualTime: newStepTotal._sum.timeWorked || 0 }
      });
    }
    
    // Notify the original user if someone else edited their entry
    if (userId !== workEntry.userId) {
      try {
        await sendNotification(
          req.app.get('io'),
          prisma,
          workEntry.userId,
          `Your time entry for step "${workEntry.step.title}" was updated by ${req.user.firstName} ${req.user.lastName}`,
          `/production/guides/${workEntry.step.guideId}/steps/${workEntry.stepId}`
        );
      } catch (notifyError) {
        console.error("Non-critical notification error:", notifyError);
      }
    }
    
    res.json({
      entry: updatedEntry,
      message: 'Work entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating work entry:', error);
    res.status(500).json({ message: 'Error updating work entry', error: error.message });
  }
};

// Get all work entries for a step
const getStepWorkEntries = async (req, res) => {
  try {
    const { id: stepId } = req.params;
    
    // Check if step exists
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
    
    const entries = await prisma.stepWorkEntry.findMany({
      where: { stepId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate total time
    const totalTime = entries.reduce((sum, entry) => sum + (entry.timeWorked || 0), 0);
    
    // Calculate per-user totals
    const userTotals = [];
    const userMap = new Map();
    
    entries.forEach(entry => {
      if (!entry.userId) return;
      
      if (userMap.has(entry.userId)) {
        userMap.set(entry.userId, userMap.get(entry.userId) + (entry.timeWorked || 0));
      } else {
        userMap.set(entry.userId, entry.timeWorked || 0);
      }
    });
    
    userMap.forEach((totalTime, userId) => {
      const user = entries.find(entry => entry.userId === userId)?.user;
      if (user) {
        userTotals.push({
          userId,
          firstName: user.firstName,
          lastName: user.lastName,
          totalTime
        });
      }
    });
    
    return res.json({
      entries,
      userTotals,
      totalTime,
      estimatedTotal: step.estimatedTime || 0,
      step: {
        id: step.id,
        title: step.title,
        order: step.order,
        guideId: step.guideId,
        guideTitle: step.guide?.title
      }
    });
  } catch (error) {
    console.error('Error getting step work entries:', error);
    return res.status(500).json({ message: 'Failed to get work entries', error: error.message });
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
    console.log(`Attempting to remove user ${userId} from guide ${guideId}`);

    // Use a transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Check if the assignment exists
      const assignment = await tx.guideAssignment.findUnique({
        where: {
          guideId_userId: {
            guideId,
            userId
          }
        }
      });

      if (!assignment) {
        throw new Error('User assignment not found');
      }

      // Delete the assignment first
      await tx.guideAssignment.delete({
        where: {
          guideId_userId: {
            guideId,
            userId
          }
        }
      });

      // Get user and guide info for notification and logging
      const [user, guide] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }),
        tx.productionGuide.findUnique({
          where: { id: guideId },
          select: {
            id: true,
            title: true
          }
        })
      ]);

      // After transaction completes, do non-critical operations
      try {
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
      } catch (logError) {
        console.error("Non-critical error in audit logging:", logError);
      }

      try {
        // Notify user if they exist
        if (user && guide && req.app.get('io')) {
          await sendNotification(
            req.app.get('io'),
            tx,
            userId,
            `You have been removed from production guide "${guide.title}"`,
            '/production/guides',
            req.user.id // Add the creator ID parameter
          );
        }
      } catch (notifyError) {
        console.error("Non-critical error in notification:", notifyError);
      }
    });

    // Respond with success
    res.json({ 
      message: "User assignment removed successfully" 
    });
  } catch (error) {
    console.error("Error removing user assignment:", error);
    if (error.message === 'User assignment not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ 
      message: "Error removing user from guide", 
      error: error.message 
    });
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

// Get users assigned to a specific step
const getStepAssignedUsers = async (req, res) => {
  try {
    const { stepId } = req.params;
    
    // Check if step exists
    const step = await prisma.productionStep.findUnique({
      where: { id: stepId }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Production step not found' });
    }
    
    // Get users assigned to the step
    const assignments = await prisma.stepAssignment.findMany({
      where: { stepId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Transform the result to return just the user objects
    const users = assignments.map(assignment => assignment.user);
    
    res.json(users);
  } catch (error) {
    console.error('Error getting step assigned users:', error);
    res.status(500).json({ message: 'Error retrieving assigned users', error: error.toString() });
  }
};

// Assign multiple users to a step
const assignUsersToStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    const { userIds, notify = true, notifyMessage } = req.body;
    
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Invalid userIds array' });
    }
    
    // Check if step exists
    const step = await prisma.productionStep.findUnique({
      where: { id: stepId },
      include: {
        guide: true
      }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Production step not found' });
    }
    
    // Pobierz obecnie przypisanych użytkowników
    const currentAssignments = await prisma.stepAssignment.findMany({
      where: { stepId }
    });
    
    const currentUserIds = currentAssignments.map(assignment => assignment.userId);
    
    // Identyfikuj użytkowników do usunięcia (tych, którzy są obecnie przypisani, ale nie ma ich w nowej liście)
    const userIdsToRemove = currentUserIds.filter(id => !userIds.includes(id));
    
    // Identyfikuj nowych użytkowników do przypisania
    const newUserIds = userIds.filter(id => !currentUserIds.includes(id));
    
    const results = [];
    const errors = [];
    
    // 1. Usuń przypisania dla tych, którzy zostali odznaczeni
    if (userIdsToRemove.length > 0) {
      for (const userId of userIdsToRemove) {
        try {
          await prisma.stepAssignment.delete({
            where: {
              stepId_userId: {
                stepId,
                userId
              }
            }
          });
          
          results.push({
            userId,
            success: true,
            removed: true,
            message: 'User assignment removed'
          });
        } catch (error) {
          console.error(`Error removing user ${userId} assignment:`, error);
          errors.push({ userId, error: error.message, operation: 'remove' });
        }
      }
    }
    
    // 2. Dodaj nowe przypisania
    for (const userId of newUserIds) {
      try {
        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, firstName: true, lastName: true }
        });
        
        if (!user) {
          errors.push({ userId, error: 'User not found', operation: 'add' });
          continue;
        }
        
        // Create the assignment
        await prisma.stepAssignment.create({
          data: {
            stepId,
            userId
          }
        });
        
        // Send notification if requested
        if (notify) {
          const message = notifyMessage 
            ? notifyMessage 
            : `You have been assigned to step "${step.title}" in production guide "${step.guide.title}"`;
          
          // Używamy nowej funkcji sendProductionNotification
          await sendProductionNotification(
            req.app.get('io'),
            prisma,
            userId,
            message,
            `/production/guides/${step.guideId}`,
            'STEP_ASSIGNED',
            req.user.id
          );
        }
        
        results.push({ 
          userId, 
          success: true, 
          added: true,
          message: 'User assigned successfully' 
        });
      } catch (error) {
        console.error(`Error assigning user ${userId}:`, error);
        errors.push({ userId, error: error.message, operation: 'add' });
      }
    }
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'assign',
      module: 'stepAssignment',
      targetId: stepId,
      meta: {
        stepId,
        stepTitle: step.title,
        guideId: step.guideId,
        guideTitle: step.guide.title,
        usersAdded: newUserIds.length,
        usersRemoved: userIdsToRemove.length,
        notify,
        notifyMessage
      }
    });
    
    res.json({
      success: true,
      results,
      errors,
      message: `Users assigned to step successfully`,
      summary: {
        added: newUserIds.length,
        removed: userIdsToRemove.length,
        errors: errors.length
      }
    });
  } catch (error) {
    console.error('Error assigning users to step:', error);
    res.status(500).json({ 
      message: 'Error assigning users to production step',
      error: error.message
    });
  }
};

// Remove a user assignment from a step
const removeUserFromStep = async (req, res) => {
  try {
    const { stepId, userId } = req.params;
    
    // Check if step exists
    const step = await prisma.productionStep.findUnique({
      where: { id: stepId },
      include: {
        guide: true
      }
    });
    
    if (!step) {
      return res.status(404).json({ message: 'Production step not found' });
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if assignment exists
    const assignment = await prisma.stepAssignment.findUnique({
      where: {
        stepId_userId: {
          stepId: stepId,
          userId: userId
        }
      }
    });
    
    if (!assignment) {
      return res.status(404).json({ message: 'User is not assigned to this step' });
    }
    
    // Remove the assignment
    await prisma.stepAssignment.delete({
      where: {
        stepId_userId: {
          stepId: stepId,
          userId: userId
        }
      }
    });
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'unassign',
      module: 'stepAssignment',
      targetId: stepId,
      meta: {
        stepId,
        stepTitle: step.title,
        guideId: step.guideId,
        guideTitle: step.guide.title,
        removedUserId: userId,
        user: {
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    });
    
    res.json({
      success: true,
      message: `User ${user.firstName} ${user.lastName} has been removed from the step`
    });
  } catch (error) {
    console.error('Error removing user from step:', error);
    res.status(500).json({ message: 'Error removing user from production step' });
  }
};

/**
 * Get all work entries for a specific guide
 */
const getGuideWorkEntries = async (req, res) => {
  try {
    const { id: guideId } = req.params;
    
    // Validate that the guide exists
    const guide = await prisma.productionGuide.findUnique({
      where: { id: guideId },
      include: {
        steps: {
          select: {
            id: true,
            title: true,
            order: true,
            estimatedTime: true
          }
        }
      }
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Production guide not found' });
    }
    
    const stepIds = guide.steps.map(step => step.id);
    
    // Get all work entries for these steps
    const workEntries = await prisma.stepWorkEntry.findMany({
      where: { 
        stepId: { in: stepIds }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        step: {
          select: {
            id: true,
            title: true,
            order: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate total time
    const totalTime = workEntries.reduce((sum, entry) => sum + (entry.timeWorked || 0), 0);
    
    // Calculate estimated total time
    const estimatedTotal = guide.steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0);
    
    // Calculate per-user totals
    const userTotals = [];
    const userMap = new Map();
    
    workEntries.forEach(entry => {
      if (!entry.userId) return;
      
      if (userMap.has(entry.userId)) {
        userMap.set(entry.userId, userMap.get(entry.userId) + (entry.timeWorked || 0));
      } else {
        userMap.set(entry.userId, entry.timeWorked || 0);
      }
    });
    
    userMap.forEach((totalTime, userId) => {
      const user = workEntries.find(entry => entry.userId === userId)?.user;
      if (user) {
        userTotals.push({
          userId,
          firstName: user.firstName,
          lastName: user.lastName,
          totalTime
        });
      }
    });
    
    return res.json({
      entries: workEntries,
      userTotals,
      totalTime,
      estimatedTotal
    });
  } catch (error) {
    console.error('Error getting guide work entries:', error);
    return res.status(500).json({ message: 'Failed to get work entries', error: error.message });
  }
};

// Archive a production guide
const archiveGuide = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if guide exists
    const guide = await prisma.productionGuide.findUnique({
      where: { id }
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Production guide not found' });
    }
    
    // Update the guide to archived status
    const updatedGuide = await prisma.productionGuide.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        archivedById: req.user.id
      }
    });
    
    // Log the archive action
    await logAudit({
      userId: req.user.id,
      action: 'archive',
      module: 'productionGuide',
      targetId: id,
      meta: {
        title: guide.title,
        previousStatus: guide.status
      }
    });
    
    return res.json({
      message: 'Guide archived successfully',
      guide: updatedGuide
    });
  } catch (error) {
    console.error('Error archiving guide:', error);
    return res.status(500).json({ message: 'Failed to archive guide', error: error.toString() });
  }
};

// Get all archived guides
const getArchivedGuides = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'archivedAt', sortOrder = 'desc' } = req.query;
    
    // Convert page and limit to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build the where condition
    const where = {
      status: 'ARCHIVED',
      OR: search ? [
        { title: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ] : undefined,
    };
    
    // Get guides
    const guides = await prisma.productionGuide.findMany({
      where,
      include: {
        archivedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: sortBy ? { [sortBy]: sortOrder } : undefined,
      skip,
      take: limitNum,
    });
    
    // Get total count for pagination
    const total = await prisma.productionGuide.count({ where });
    
    const totalPages = Math.ceil(total / limitNum);
    
    return res.json({
      guides,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error getting archived guides:', error);
    return res.status(500).json({ message: 'Failed to get archived guides', error: error.message });
  }
};

// Unarchive a guide
const unarchiveGuide = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if guide exists
    const guide = await prisma.productionGuide.findUnique({
      where: { id }
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Production guide not found' });
    }
    
    if (guide.status !== 'ARCHIVED') {
      return res.status(400).json({ message: 'Guide is not archived' });
    }
    
    // Determine the status to set
    let newStatus = 'DRAFT';
    if (guide.steps && guide.steps.length > 0) {
      const hasCompletedSteps = guide.steps.some(step => step.status === 'COMPLETED');
      const hasPendingSteps = guide.steps.some(step => step.status === 'PENDING');
      
      if (hasCompletedSteps && hasPendingSteps) {
        newStatus = 'IN_PROGRESS';
      } else if (hasCompletedSteps) {
        newStatus = 'COMPLETED';
      }
    }
    
    // Update guide
    const updatedGuide = await prisma.productionGuide.update({
      where: { id },
      data: {
        status: newStatus,
        archivedAt: null,
        archivedById: null
      }
    });
    
    // Log the unarchive action
    await logAudit({
      userId: req.user.id,
      action: 'unarchive',
      module: 'productionGuide',
      targetId: guide.id,
      meta: {
        title: guide.title,
        newStatus
      }
    });
    
    return res.json({
      message: 'Guide unarchived successfully',
      guide: updatedGuide
    });
  } catch (error) {
    console.error('Error unarchiving guide:', error);
    return res.status(500).json({ message: 'Failed to unarchive guide', error: error.message });
  }
};

// Funkcja umożliwiająca wydawanie zarezerwowanych przedmiotów
const withdrawReservedItems = async (req, res) => {
  try {
    const { guideId } = req.params;
    const { items } = req.body;
    
    // Sprawdź, czy przewodnik istnieje
    const guide = await prisma.productionGuide.findUnique({
      where: { id: guideId },
      include: {
        assignedUsers: {
          select: { userId: true }
        }
      }
    });
    
    if (!guide) {
      return res.status(404).json({ message: 'Przewodnik produkcyjny nie znaleziony' });
    }
    
    // Sprawdź, czy użytkownik jest przypisany do przewodnika
    const isAssigned = guide.assignedUsers.some(assignment => assignment.userId === req.user.id);
    
    if (!isAssigned) {
      return res.status(403).json({ 
        message: 'Nie masz uprawnień do pobierania przedmiotów z tego przewodnika. Musisz być przypisany do przewodnika.'
      });
    }
    
    // Waliduj tablicę przedmiotów
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Nieprawidłowa lista przedmiotów' });
    }
    
    const results = [];
    const errors = [];
    
    // Wykonaj operacje na każdym przedmiocie
    for (const itemData of items) {
      const { itemId, quantity } = itemData;
      
      try {
        // Sprawdź, czy przedmiot jest zarezerwowany dla przewodnika
        const guideItem = await prisma.guideInventory.findUnique({
          where: {
            guideId_itemId: {
              guideId,
              itemId
            }
          },
          include: {
            item: true
          }
        });
        
        if (!guideItem) {
          errors.push({ itemId, error: 'Przedmiot nie jest przypisany do tego przewodnika' });
          continue;
        }
        
        if (!guideItem.reserved) {
          errors.push({ itemId, error: 'Przedmiot nie jest zarezerwowany' });
          continue;
        }
        
        // Sprawdź, czy ilość jest prawidłowa
        const requestedQuantity = parseFloat(quantity);
        if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
          errors.push({ itemId, error: 'Ilość musi być dodatnią liczbą' });
          continue;
        }
        
        if (requestedQuantity > guideItem.quantity) {
          errors.push({ 
            itemId, 
            error: `Żądana ilość (${requestedQuantity}) przekracza zarezerwowaną ilość (${guideItem.quantity})` 
          });
          continue;
        }
        
        // Sprawdź, czy jest wystarczająca ilość w magazynie
        if (guideItem.item.quantity < requestedQuantity) {
          errors.push({ 
            itemId, 
            error: `Niewystarczająca ilość w magazynie. Dostępne: ${guideItem.item.quantity} ${guideItem.item.unit}` 
          });
          continue;
        }
        
        // Wykonaj transakcję wydania
        const result = await prisma.$transaction(async (tx) => {
          // Aktualizuj stan magazynowy
          const updatedItem = await tx.inventoryItem.update({
            where: { id: itemId },
            data: {
              quantity: {
                decrement: requestedQuantity
              }
            }
          });
          
          // Aktualizuj rezerwację
          let updatedGuideItem;
          
          if (requestedQuantity === guideItem.quantity) {
            // Jeśli wydano całą zarezerwowaną ilość, oznacz jako wydane
            updatedGuideItem = await tx.guideInventory.update({
              where: {
                guideId_itemId: {
                  guideId,
                  itemId
                }
              },
              data: {
                reserved: false,
                withdrawnById: req.user.id,
                withdrawnDate: new Date() // Dodajemy datę pobrania
              }
            });
          } else {
            // Jeśli wydano część, zmniejsz zarezerwowaną ilość i utwórz nowy wpis na wydane
            // Zmniejsz zarezerwowaną ilość
            updatedGuideItem = await tx.guideInventory.update({
              where: {
                guideId_itemId: {
                  guideId,
                  itemId
                }
              },
              data: {
                quantity: {
                  decrement: requestedQuantity
                }
              }
            });
            
            // Utwórz nowy wpis dla wydanej ilości
            await tx.guideInventory.create({
              data: {
                guideId,
                itemId,
                quantity: requestedQuantity,
                stepId: guideItem.stepId,
                reserved: false,
                withdrawnById: req.user.id,
                withdrawnDate: new Date() // Dodajemy datę pobrania
              }
            });
          }
          
          // Dodaj transakcję wydania
          const transaction = await tx.inventoryTransaction.create({
            data: {
              itemId,
              quantity: -requestedQuantity,
              type: 'ISSUE',
              reason: `Wydanie dla przewodnika ${guide.title} (${guide.barcode}) przez ${req.user.firstName} ${req.user.lastName}`,
              guideId,
              userId: req.user.id
            }
          });
          
          return {
            updatedItem,
            updatedGuideItem,
            transaction
          };
        });
        
        // Dodaj do wyników
        results.push({
          itemId,
          item: {
            name: guideItem.item.name,
            unit: guideItem.item.unit
          },
          quantity: requestedQuantity,
          remainingQuantity: result.updatedItem.quantity
        });
        
        // Logowanie audytu
        await logAudit({
          userId: req.user.id,
          action: 'withdraw',
          module: 'guideInventory',
          targetId: guideId,
          meta: {
            guideId,
            guideTitle: guide.title,
            itemId,
            itemName: guideItem.item.name,
            quantity: requestedQuantity,
            transactionId: result.transaction.id
          }
        });
      } catch (error) {
        console.error(`Błąd podczas wydawania przedmiotu ${itemId}:`, error);
        errors.push({ itemId, error: error.message });
      }
    }
    
    res.json({
      success: errors.length === 0,
      results,
      errors,
      message: results.length > 0
        ? `Wydano ${results.length} przedmiotów z przewodnika`
        : 'Nie wydano żadnych przedmiotów'
    });
  } catch (error) {
    console.error('Błąd podczas wydawania przedmiotów:', error);
    res.status(500).json({ message: 'Błąd podczas wydawania przedmiotów z przewodnika' });
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
  updateWorkEntry,
  getStepWorkEntries,
  assignItemsToStep,
  updateStepInventoryStatus,
  getStepAssignedUsers,
  assignUsersToStep,
  removeUserFromStep,
  getGuideWorkEntries,
  archiveGuide,
  getArchivedGuides,
  unarchiveGuide,
  withdrawReservedItems
};