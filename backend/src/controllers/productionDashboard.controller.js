const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get production dashboard overview data
 */
const getDashboardOverview = async (req, res) => {
  try {
    // Get counts of guides by status
    const guideStatusCounts = await prisma.productionGuide.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    // Convert to an object with status as key
    const guidesByStatus = guideStatusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {});

    // Get active work sessions for production steps
    const activeWorkSessions = await prisma.stepWorkSession.count({
      where: {
        endTime: null
      }
    });

    // Get guides that are close to deadline (within 24 hours)
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    
    const nearDeadlineGuides = await prisma.productionGuide.count({
      where: {
        deadline: {
          lte: tomorrowDate,
          gt: new Date()
        },
        status: {
          not: 'COMPLETED'
        }
      }
    });

    // Get guides with critical priority
    const criticalGuides = await prisma.productionGuide.count({
      where: {
        priority: 'CRITICAL',
        status: {
          not: 'COMPLETED'
        }
      }
    });

    // Get top 5 most active production guides
    const mostActiveGuides = await prisma.stepWorkSession.groupBy({
      by: ['step', 'stepId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5,
      where: {
        step: {
          guide: {
            status: {
              not: 'COMPLETED'
            }
          }
        }
      },
      include: {
        step: {
          include: {
            guide: {
              select: {
                id: true,
                title: true,
                priority: true,
                barcode: true
              }
            }
          }
        }
      }
    });

    res.json({
      guidesByStatus,
      activeWorkSessions,
      nearDeadlineGuides,
      criticalGuides,
      mostActiveGuides: mostActiveGuides.map(item => ({
        guideId: item.step.guide.id,
        guideTitle: item.step.guide.title,
        guidePriority: item.step.guide.priority,
        barcode: item.step.guide.barcode,
        stepId: item.stepId,
        stepTitle: item.step.title,
        activityCount: item._count.id
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};

/**
 * Get user productivity metrics
 */
const getUserProductivity = async (req, res) => {
  try {
    const { userId, period } = req.query;
    const targetUserId = userId || req.user.id;
    
    // Set date range based on period
    const startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7); // Default to week
    }

    // Get completed steps
    const completedSteps = await prisma.stepWorkEntry.count({
      where: {
        userId: targetUserId,
        createdAt: {
          gte: startDate
        },
        step: {
          status: 'COMPLETED'
        }
      }
    });

    // Get total time worked
    const timeWorked = await prisma.stepWorkEntry.aggregate({
      where: {
        userId: targetUserId,
        createdAt: {
          gte: startDate
        }
      },
      _sum: {
        timeWorked: true
      }
    });

    // Get guides worked on
    const guidesWorkedOn = await prisma.$queryRaw`
      SELECT DISTINCT g.id, g.title, g.barcode, g.priority
      FROM "StepWorkEntry" swe
      JOIN "ProductionStep" ps ON swe."stepId" = ps.id
      JOIN "ProductionGuide" g ON ps."guideId" = g.id
      WHERE swe."userId" = ${targetUserId}
      AND swe."createdAt" >= ${startDate}
    `;

    // Get daily productivity data
    const dailyProductivity = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', swe."createdAt") as day,
        SUM(swe."timeWorked") as minutes_worked,
        COUNT(DISTINCT swe."stepId") as steps_worked
      FROM "StepWorkEntry" swe
      WHERE swe."userId" = ${targetUserId}
      AND swe."createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('day', swe."createdAt")
      ORDER BY day ASC
    `;

    res.json({
      completedSteps,
      timeWorked: timeWorked._sum.timeWorked || 0,
      guidesWorkedOn,
      dailyProductivity
    });
  } catch (error) {
    console.error('Error fetching user productivity:', error);
    res.status(500).json({ message: 'Error fetching user productivity data' });
  }
};

/**
 * Get bottleneck analysis for production process
 */
const getProductionBottlenecks = async (req, res) => {
  try {
    // Find steps that have been in progress for the longest time
    const longRunningSteps = await prisma.productionStep.findMany({
      where: {
        status: 'IN_PROGRESS'
      },
      include: {
        guide: {
          select: {
            id: true,
            title: true,
            priority: true,
            barcode: true
          }
        },
        workEntries: {
          select: {
            id: true,
            createdAt: true,
            timeWorked: true
          }
        }
      },
      orderBy: {
        updatedAt: 'asc'
      },
      take: 10
    });

    // Calculate steps with the highest average time vs. estimated time
    const stepsWithTimeOverruns = await prisma.$queryRaw`
      SELECT 
        ps.id, 
        ps.title, 
        ps."estimatedTime",
        g.id as "guideId",
        g.title as "guideTitle",
        g.barcode,
        SUM(swe."timeWorked") as "actualTime",
        (SUM(swe."timeWorked") - ps."estimatedTime") as "timeDifference"
      FROM "ProductionStep" ps
      JOIN "ProductionGuide" g ON ps."guideId" = g.id
      LEFT JOIN "StepWorkEntry" swe ON swe."stepId" = ps.id
      WHERE ps."estimatedTime" IS NOT NULL
      AND ps.status = 'COMPLETED'
      GROUP BY ps.id, ps.title, ps."estimatedTime", g.id, g.title, g.barcode
      HAVING SUM(swe."timeWorked") > ps."estimatedTime"
      ORDER BY (SUM(swe."timeWorked") - ps."estimatedTime") DESC
      LIMIT 10
    `;

    // Find steps with inventory issues (needed but not reserved/issued)
    const stepsWithInventoryIssues = await prisma.stepInventory.findMany({
      where: {
        status: 'NEEDED',
        step: {
          status: {
            not: 'COMPLETED'
          }
        }
      },
      include: {
        step: {
          select: {
            id: true,
            title: true,
            guide: {
              select: {
                id: true,
                title: true,
                barcode: true,
                priority: true
              }
            }
          }
        },
        item: {
          select: {
            id: true,
            name: true,
            barcode: true,
            quantity: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({
      longRunningSteps: longRunningSteps.map(step => ({
        stepId: step.id,
        stepTitle: step.title,
        guideId: step.guide.id,
        guideTitle: step.guide.title,
        barcode: step.guide.barcode,
        priority: step.guide.priority,
        daysInProgress: Math.round((Date.now() - new Date(step.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
        totalTimeWorked: step.workEntries.reduce((sum, entry) => sum + (entry.timeWorked || 0), 0)
      })),
      stepsWithTimeOverruns,
      stepsWithInventoryIssues
    });
  } catch (error) {
    console.error('Error fetching bottleneck analysis:', error);
    res.status(500).json({ message: 'Error analyzing production bottlenecks' });
  }
};

/**
 * Get resource utilization stats
 */
const getResourceUtilization = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const endDate = to ? new Date(to) : new Date();
    
    // Get top 10 most used inventory items
    const topInventoryItems = await prisma.inventoryTransaction.groupBy({
      by: ['itemId'],
      where: {
        type: 'REMOVE',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 10
    });

    // Get detailed information for these items
    const itemDetails = await Promise.all(
      topInventoryItems.map(async item => {
        const itemInfo = await prisma.inventoryItem.findUnique({
          where: { id: item.itemId },
          select: {
            id: true,
            name: true,
            barcode: true,
            unit: true,
            quantity: true,
            category: true
          }
        });
        
        return {
          ...itemInfo,
          totalUsed: Math.abs(item._sum.quantity)
        };
      })
    );

    // Get worker utilization (time spent working vs available time)
    const workerUtilization = await prisma.$queryRaw`
      SELECT 
        u.id, 
        u."firstName", 
        u."lastName", 
        SUM(swe."timeWorked") as "totalMinutesWorked"
      FROM "User" u
      JOIN "StepWorkEntry" swe ON swe."userId" = u.id
      WHERE swe."createdAt" >= ${startDate}
      AND swe."createdAt" <= ${endDate}
      GROUP BY u.id, u."firstName", u."lastName"
      ORDER BY "totalMinutesWorked" DESC
      LIMIT 10
    `;

    res.json({
      topInventoryItems: itemDetails,
      workerUtilization
    });
  } catch (error) {
    console.error('Error fetching resource utilization:', error);
    res.status(500).json({ message: 'Error fetching resource utilization data' });
  }
};

/**
 * Get production capacity planning data
 */
const getCapacityPlanning = async (req, res) => {
  try {
    // Get upcoming guides by deadline
    const upcomingGuides = await prisma.productionGuide.findMany({
      where: {
        deadline: {
          gt: new Date()
        },
        status: {
          not: 'COMPLETED'
        }
      },
      include: {
        steps: {
          select: {
            id: true,
            title: true,
            estimatedTime: true,
            status: true,
            assignedToRole: true
          }
        }
      },
      orderBy: {
        deadline: 'asc'
      },
      take: 20
    });

    // Calculate estimated completion times and resource needs
    const capacityData = upcomingGuides.map(guide => {
      const totalEstimatedTime = guide.steps.reduce((sum, step) => 
        sum + (step.estimatedTime || 0), 0);
        
      const pendingEstimatedTime = guide.steps
        .filter(step => step.status !== 'COMPLETED')
        .reduce((sum, step) => sum + (step.estimatedTime || 0), 0);
        
      // Group remaining work by role
      const workByRole = guide.steps
        .filter(step => step.status !== 'COMPLETED' && step.assignedToRole)
        .reduce((roles, step) => {
          const role = step.assignedToRole;
          if (!roles[role]) roles[role] = 0;
          roles[role] += step.estimatedTime || 0;
          return roles;
        }, {});
      
      return {
        guideId: guide.id,
        guideTitle: guide.title,
        barcode: guide.barcode,
        deadline: guide.deadline,
        daysToDeadline: Math.round((new Date(guide.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        totalEstimatedTime,
        pendingEstimatedTime,
        completionPercentage: Math.round(((totalEstimatedTime - pendingEstimatedTime) / totalEstimatedTime) * 100) || 0,
        workByRole
      };
    });

    res.json({
      capacityData
    });
  } catch (error) {
    console.error('Error fetching capacity planning data:', error);
    res.status(500).json({ message: 'Error fetching capacity planning data' });
  }
};

/**
 * Get dashboard statistics based on time range
 */
const getDashboardStats = async (req, res) => {
  try {
    const { range = 'month' } = req.query;
    
    // Calculate date range based on the selected period
    const today = new Date();
    let startDate;
    
    switch (range) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1); // Default to month
    }
    
    // Get counts of guides by status
    const guideStatusCounts = await prisma.productionGuide.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });
    
    // Convert to an object with status as key
    const guidesByStatus = guideStatusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {});
    
    // Get statistics for the dashboard
    const [
      activeUsers,
      totalProjects,
      openTasks,
      completedTasks,
      lowStockItems,
      taskStatusData,
      projectProgressData,
      recentActivity,
      resourceUtilization,
      upcomingDeadlines
    ] = await Promise.all([
      // Active users count
      prisma.user.count({
        where: {
          isActive: true,
          lastActivity: {
            gte: startDate
          }
        }
      }),
      
      // Total projects count (production guides)
      prisma.productionGuide.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),
      
      // Open tasks count (steps not completed)
      prisma.productionStep.count({
        where: {
          status: {
            not: 'COMPLETED'
          },
          createdAt: {
            gte: startDate
          }
        }
      }),
      
      // Completed tasks count
      prisma.productionStep.count({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: startDate
          }
        }
      }),
      
      // Low stock items
      prisma.inventoryItem.findMany({
        where: {
          minQuantity: { not: null },
          quantity: {
            lte: prisma.inventoryItem.fields.minQuantity
          }
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          minQuantity: true,
          unit: true
        }
      }),
      
      // Task status distribution
      prisma.productionStep.groupBy({
        by: ['status'],
        _count: {
          id: true
        },
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),
      
      // Project progress data (top 5 active projects)
      prisma.productionGuide.findMany({
        where: {
          status: 'IN_PROGRESS'
        },
        select: {
          id: true,
          title: true,
          status: true,
          steps: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 5
      }),
      
      // Recent activity from audit logs
      prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      }),
      
      // Resource utilization (worker productivity)
      prisma.user.findMany({
        where: {
          isActive: true,
          stepWorkEntries: {
            some: {
              createdAt: {
                gte: startDate
              }
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          stepWorkEntries: {
            where: {
              createdAt: {
                gte: startDate
              }
            },
            select: {
              timeWorked: true
            }
          }
        },
        take: 4
      }),
      
      // Upcoming deadlines
      prisma.productionGuide.findMany({
        where: {
          deadline: { not: null },
          status: { not: 'COMPLETED' }
        },
        select: {
          id: true,
          title: true,
          deadline: true
        },
        orderBy: {
          deadline: 'asc'
        },
        take: 5
      })
    ]);
    
    // Format task status data
    const formattedTaskStatus = taskStatusData.map(item => {
      // Tłumaczenie statusów na polski
      const polishStatusNames = {
        'COMPLETED': 'Zakończone',
        'IN_PROGRESS': 'W trakcie',
        'PENDING': 'Oczekujące',
        'BLOCKED': 'Zablokowane',
        'CANCELLED': 'Anulowane',
        'DELAYED': 'Opóźnione',
        'ON_HOLD': 'Wstrzymane'
      };
      
      return {
        name: polishStatusNames[item.status] || item.status,
        value: item._count.id
      };
    });
    
    // Format project progress data
    const formattedProjectProgress = projectProgressData.map(guide => {
      const totalSteps = guide.steps.length;
      const completedSteps = guide.steps.filter(step => step.status === 'COMPLETED').length;
      
      return {
        name: guide.title.length > 15 ? guide.title.substring(0, 15) + '...' : guide.title,
        completed: completedSteps,
        remaining: totalSteps - completedSteps
      };
    });
    
    // Format recent activity
    const formattedRecentActivity = recentActivity.map(log => ({
      user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      action: log.action,
      target: log.module,
      time: getTimeAgo(log.createdAt)
    }));
    
    // Format resource utilization
    const formattedResourceUtilization = resourceUtilization.map(user => {
      const totalMinutes = user.stepWorkEntries.reduce(
        (sum, entry) => sum + entry.timeWorked, 0
      );
      
      return {
        name: `${user.firstName} ${user.lastName}`,
        usage: Math.min(100, Math.round(totalMinutes / 480 * 100)) // Assuming 8-hour workday (480 minutes)
      };
    });
    
    // Format upcoming deadlines
    const formattedDeadlines = upcomingDeadlines.map(guide => {
      const deadline = new Date(guide.deadline);
      const today = new Date();
      const diffTime = Math.abs(deadline - today);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        project: guide.title,
        deadline: guide.deadline,
        daysLeft: diffDays
      };
    });
    
    // Calculate inventory alerts
    const inventoryAlerts = lowStockItems.map(item => ({
      item: item.name,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      unit: item.unit
    }));
    
    // Get productivity trend data (last 6 months)
    const productivityTrend = await Promise.all(
      Array.from({ length: 6 }).map(async (_, idx) => {
        const endDate = new Date();
        endDate.setDate(1); // First day of current month
        endDate.setHours(0, 0, 0, 0);
        
        const monthOffset = idx;
        const startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - monthOffset);
        
        const endOfPeriod = new Date(startDate);
        endOfPeriod.setMonth(startDate.getMonth() + 1);
        endOfPeriod.setDate(0); // Last day of month
        endOfPeriod.setHours(23, 59, 59, 999);
        
        // Get total work entries for the month
        const workData = await prisma.stepWorkEntry.aggregate({
          where: {
            createdAt: {
              gte: startDate,
              lte: endOfPeriod
            }
          },
          _sum: {
            timeWorked: true
          }
        });
        
        // Get completed steps count
        const completedSteps = await prisma.productionStep.count({
          where: {
            status: 'COMPLETED',
            updatedAt: {
              gte: startDate,
              lte: endOfPeriod
            }
          }
        });
        
        // Calculate productivity score (basic algorithm: ratio of completed work to time spent)
        // This is just an example - real productivity metrics would be more complex
        const timeWorked = workData._sum.timeWorked || 0;
        const productivity = timeWorked > 0 
          ? Math.min(100, Math.round((completedSteps / (timeWorked / 480)) * 100)) 
          : 0;
        
        // Polish month names
        const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 
                         'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
        
        return {
          date: months[startDate.getMonth()],
          productivity
        };
      })
    );
    
    // Reverse to get chronological order
    const productivityData = productivityTrend.reverse();

    res.json({
      activeUsers,
      totalProjects,
      openTasks,
      completedTasks,
      guidesByStatus,
      taskStatusData: formattedTaskStatus,
      projectProgress: formattedProjectProgress,
      recentActivity: formattedRecentActivity,
      resourceUtilization: formattedResourceUtilization,
      upcomingDeadlines: formattedDeadlines,
      inventoryAlerts,
      productivityData
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Error retrieving dashboard statistics' });
  }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  
  if (diffSec < 60) {
    return `${diffSec} sekund temu`;
  } else if (diffMin < 60) {
    return diffMin === 1 ? '1 minutę temu' : `${diffMin} minut temu`;
  } else if (diffHour < 24) {
    return diffHour === 1 ? '1 godzinę temu' : `${diffHour} godzin temu`;
  } else if (diffDay < 7) {
    return diffDay === 1 ? '1 dzień temu' : `${diffDay} dni temu`;
  } else {
    return new Date(date).toLocaleDateString();
  }
}

module.exports = {
  getDashboardOverview,
  getUserProductivity,
  getProductionBottlenecks,
  getResourceUtilization,
  getCapacityPlanning,
  getDashboardStats
}; 