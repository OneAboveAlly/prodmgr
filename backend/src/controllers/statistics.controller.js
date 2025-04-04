// backend/src/controllers/statistics.controller.js
const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/auditLogger');
const prisma = new PrismaClient();

// Get user work statistics
const getUserWorkStatistics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { from, to } = req.query;
    
    // Check permission if trying to access another user's statistics
    if (userId !== req.user.id && !req.user.permissions['timeTracking.viewAll']) {
      return res.status(403).json({ message: 'Access forbidden - insufficient permissions' });
    }
    
    // Parse date range
    let dateRange = {};
    if (from || to) {
      dateRange = {};
      if (from) dateRange.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // End of the day
        dateRange.lte = toDate;
      }
    } else {
      // Default to last 30 days if no date range specified
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateRange = {
        gte: thirtyDaysAgo,
        lte: today
      };
    }
    
    // Get time from standard time tracking
    const timeTrackingSessions = await prisma.workSession.findMany({
      where: {
        userId,
        status: 'completed',
        startTime: dateRange
      }
    });
    
    // Get time from production work entries
    const productionEntries = await prisma.stepWorkEntry.findMany({
      where: {
        userId,
        createdAt: dateRange
      },
      include: {
        step: {
          select: {
            id: true,
            title: true,
            guide: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    });
    
    // Calculate total time from time tracking (in minutes)
    const timeTrackingMinutes = timeTrackingSessions.reduce((total, session) => {
      return total + (session.totalDuration ? Math.floor(session.totalDuration / 60) : 0);
    }, 0);
    
    // Calculate total time from production entries (already in minutes)
    const productionMinutes = productionEntries.reduce((total, entry) => {
      return total + entry.timeWorked;
    }, 0);
    
    // Total work time
    const totalWorkMinutes = timeTrackingMinutes + productionMinutes;
    
    // Calculate daily norm (8 hours = 480 minutes)
    const dailyNormMinutes = 480;
    
    // Calculate number of workdays in the date range
    let workdaysCount = 0;
    if (dateRange.gte && dateRange.lte) {
      const startDate = new Date(dateRange.gte);
      const endDate = new Date(dateRange.lte);
      
      // Count only weekdays (Monday-Friday)
      for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
        const dayOfWeek = day.getDay();
        if (dayOfWeek > 0 && dayOfWeek < 6) { // 0 is Sunday, 6 is Saturday
          workdaysCount++;
        }
      }
    }
    
    // Calculate expected work time based on workdays
    const expectedWorkMinutes = workdaysCount * dailyNormMinutes;
    
    // Calculate efficiency
    const efficiency = expectedWorkMinutes > 0 ? (totalWorkMinutes / expectedWorkMinutes) * 100 : 0;
    
    // Group production entries by guide and step
    const productionBreakdown = {};
    productionEntries.forEach(entry => {
      const guideId = entry.step.guide.id;
      const stepId = entry.step.id;
      
      if (!productionBreakdown[guideId]) {
        productionBreakdown[guideId] = {
          guideId,
          title: entry.step.guide.title,
          totalMinutes: 0,
          steps: {}
        };
      }
      
      if (!productionBreakdown[guideId].steps[stepId]) {
        productionBreakdown[guideId].steps[stepId] = {
          stepId,
          title: entry.step.title,
          totalMinutes: 0
        };
      }
      
      productionBreakdown[guideId].totalMinutes += entry.timeWorked;
      productionBreakdown[guideId].steps[stepId].totalMinutes += entry.timeWorked;
    });
    
    // Convert to arrays for response
    const productionByGuide = Object.values(productionBreakdown).map(guide => {
      return {
        ...guide,
        steps: Object.values(guide.steps)
      };
    });
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        userRoles: {
          include: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    // Create daily work time trend
    const dailyTrend = {};
    
    // Add time tracking sessions to trend
    timeTrackingSessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      if (!dailyTrend[date]) {
        dailyTrend[date] = {
          date,
          timeTracking: 0,
          production: 0,
          total: 0
        };
      }
      
      const sessionMinutes = session.totalDuration ? Math.floor(session.totalDuration / 60) : 0;
      dailyTrend[date].timeTracking += sessionMinutes;
      dailyTrend[date].total += sessionMinutes;
    });
    
    // Add production entries to trend
    productionEntries.forEach(entry => {
      const date = new Date(entry.createdAt).toISOString().split('T')[0];
      if (!dailyTrend[date]) {
        dailyTrend[date] = {
          date,
          timeTracking: 0,
          production: 0,
          total: 0
        };
      }
      
      dailyTrend[date].production += entry.timeWorked;
      dailyTrend[date].total += entry.timeWorked;
    });
    
    // Convert to array and sort by date
    const dailyTrendArray = Object.values(dailyTrend).sort((a, b) => a.date.localeCompare(b.date));
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'read',
      module: 'statistics',
      targetId: userId,
      meta: {
        dateRange: {
          from: dateRange.gte,
          to: dateRange.lte
        },
        totalWorkMinutes,
        efficiency: Math.round(efficiency)
      }
    });
    
    res.json({
      user: {
        id: userId,
        name: `${user.firstName} ${user.lastName}`,
        roles: user.userRoles.map(ur => ur.role.name)
      },
      summary: {
        timeTrackingMinutes,
        productionMinutes,
        totalWorkMinutes,
        dailyNormMinutes,
        workdaysCount,
        expectedWorkMinutes,
        efficiency: Math.round(efficiency * 100) / 100, // Round to 2 decimal places
        timeTrackingPercentage: totalWorkMinutes > 0 ? (timeTrackingMinutes / totalWorkMinutes) * 100 : 0,
        productionPercentage: totalWorkMinutes > 0 ? (productionMinutes / totalWorkMinutes) * 100 : 0
      },
      production: {
        totalMinutes: productionMinutes,
        entryCount: productionEntries.length,
        byGuide: productionByGuide
      },
      timeTracking: {
        totalMinutes: timeTrackingMinutes,
        sessionCount: timeTrackingSessions.length
      },
      trend: dailyTrendArray,
      dateRange: {
        from: dateRange.gte,
        to: dateRange.lte
      }
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ message: 'Error retrieving user work statistics' });
  }
};

// Get production efficiency report
const getProductionEfficiencyReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Parse date range
    let dateRange = {};
    if (from || to) {
      dateRange = {};
      if (from) dateRange.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // End of the day
        dateRange.lte = toDate;
      }
    } else {
      // Default to last 30 days if no date range specified
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateRange = {
        gte: thirtyDaysAgo,
        lte: today
      };
    }
    
    // Get completed guides in the date range
    const completedGuides = await prisma.productionGuide.findMany({
      where: {
        status: 'COMPLETED',
        updatedAt: dateRange
      },
      include: {
        steps: {
          include: {
            workEntries: {
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
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    // Calculate efficiency metrics for each guide
    const guideMetrics = completedGuides.map(guide => {
      // Total estimated time for all steps
      const totalEstimatedMinutes = guide.steps.reduce((total, step) => {
        return total + (step.estimatedTime || 0);
      }, 0);
      
      // Total actual time worked
      const totalActualMinutes = guide.steps.reduce((total, step) => {
        return total + (step.actualTime || 0);
      }, 0);
      
      // Time efficiency (estimated vs actual)
      const timeEfficiency = totalEstimatedMinutes > 0 
        ? (totalEstimatedMinutes / totalActualMinutes) * 100 
        : 0;
      
      // Calculate time by user
      const userTimeMap = {};
      guide.steps.forEach(step => {
        step.workEntries.forEach(entry => {
          const userId = entry.user.id;
          if (!userTimeMap[userId]) {
            userTimeMap[userId] = {
              userId,
              firstName: entry.user.firstName,
              lastName: entry.user.lastName,
              totalMinutes: 0
            };
          }
          
          userTimeMap[userId].totalMinutes += entry.timeWorked;
        });
      });
      
      return {
        id: guide.id,
        title: guide.title,
        barcode: guide.barcode,
        createdBy: guide.createdBy,
        createdAt: guide.createdAt,
        completedAt: guide.updatedAt, // Assuming updatedAt is when it was completed
        metrics: {
          stepCount: guide.steps.length,
          estimatedMinutes: totalEstimatedMinutes,
          actualMinutes: totalActualMinutes,
          timeEfficiency: Math.round(timeEfficiency * 100) / 100,
          timeDifference: totalEstimatedMinutes - totalActualMinutes,
          overUnderEstimate: totalEstimatedMinutes > totalActualMinutes ? 'under' : 'over'
        },
        userContributions: Object.values(userTimeMap).sort((a, b) => b.totalMinutes - a.totalMinutes)
      };
    });
    
    // Sort by efficiency
    const sortedGuides = guideMetrics.sort((a, b) => b.metrics.timeEfficiency - a.metrics.timeEfficiency);
    
    // Calculate overall metrics
    const totalEstimatedMinutes = sortedGuides.reduce((total, guide) => {
      return total + guide.metrics.estimatedMinutes;
    }, 0);
    
    const totalActualMinutes = sortedGuides.reduce((total, guide) => {
      return total + guide.metrics.actualMinutes;
    }, 0);
    
    const overallTimeEfficiency = totalEstimatedMinutes > 0 
      ? (totalEstimatedMinutes / totalActualMinutes) * 100 
      : 0;
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'read',
      module: 'statistics',
      targetId: null,
      meta: {
        report: 'productionEfficiency',
        dateRange: {
          from: dateRange.gte,
          to: dateRange.lte
        },
        guideCount: sortedGuides.length,
        overallTimeEfficiency: Math.round(overallTimeEfficiency)
      }
    });
    
    res.json({
      summary: {
        guideCount: sortedGuides.length,
        totalEstimatedMinutes,
        totalActualMinutes,
        overallTimeEfficiency: Math.round(overallTimeEfficiency * 100) / 100,
        averageEfficiency: sortedGuides.length > 0 
          ? sortedGuides.reduce((sum, guide) => sum + guide.metrics.timeEfficiency, 0) / sortedGuides.length 
          : 0
      },
      guides: sortedGuides,
      dateRange: {
        from: dateRange.gte,
        to: dateRange.lte
      }
    });
  } catch (error) {
    console.error('Error generating production efficiency report:', error);
    res.status(500).json({ message: 'Error retrieving production efficiency report' });
  }
};

// Get user ranking report
const getUserRankingReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Parse date range
    let dateRange = {};
    if (from || to) {
      dateRange = {};
      if (from) dateRange.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // End of the day
        dateRange.lte = toDate;
      }
    } else {
      // Default to last 30 days if no date range specified
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateRange = {
        gte: thirtyDaysAgo,
        lte: today
      };
    }
    
    // Get active users with time tracking and production data
    const users = await prisma.user.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        userRoles: {
          include: {
            role: {
              select: {
                name: true
              }
            }
          }
        },
        workSessions: {
          where: {
            status: 'completed',
            startTime: dateRange
          }
        },
        stepWorkEntries: {
          where: {
            createdAt: dateRange
          }
        }
      }
    });
    
    // Calculate metrics for each user
    const userRankings = users.map(user => {
      // Calculate time tracking minutes
      const timeTrackingMinutes = user.workSessions.reduce((total, session) => {
        return total + (session.totalDuration ? Math.floor(session.totalDuration / 60) : 0);
      }, 0);
      
      // Calculate production minutes
      const productionMinutes = user.stepWorkEntries.reduce((total, entry) => {
        return total + entry.timeWorked;
      }, 0);
      
      // Total work minutes
      const totalWorkMinutes = timeTrackingMinutes + productionMinutes;
      
      // Calculate daily norm (8 hours = 480 minutes)
      const dailyNormMinutes = 480;
      
      // Calculate number of workdays in the date range
      let workdaysCount = 0;
      if (dateRange.gte && dateRange.lte) {
        const startDate = new Date(dateRange.gte);
        const endDate = new Date(dateRange.lte);
        
        // Count only weekdays (Monday-Friday)
        for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
          const dayOfWeek = day.getDay();
          if (dayOfWeek > 0 && dayOfWeek < 6) { // 0 is Sunday, 6 is Saturday
            workdaysCount++;
          }
        }
      }
      
      // Calculate expected work time based on workdays
      const expectedWorkMinutes = workdaysCount * dailyNormMinutes;
      
      // Calculate efficiency
      const efficiency = expectedWorkMinutes > 0 ? (totalWorkMinutes / expectedWorkMinutes) * 100 : 0;
      
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.userRoles.map(ur => ur.role.name),
        metrics: {
          timeTrackingMinutes,
          productionMinutes,
          totalWorkMinutes,
          expectedWorkMinutes,
          efficiency: Math.round(efficiency * 100) / 100,
          productionPercentage: totalWorkMinutes > 0 ? (productionMinutes / totalWorkMinutes) * 100 : 0
        }
      };
    });
    
    // Filter out users with no work time
    const activeUsers = userRankings.filter(user => user.metrics.totalWorkMinutes > 0);
    
    // Sort by efficiency
    const sortedByEfficiency = [...activeUsers].sort((a, b) => b.metrics.efficiency - a.metrics.efficiency);
    
    // Sort by total work time
    const sortedByWorkTime = [...activeUsers].sort((a, b) => b.metrics.totalWorkMinutes - a.metrics.totalWorkMinutes);
    
    // Sort by production percentage
    const sortedByProduction = [...activeUsers].sort((a, b) => b.metrics.productionPercentage - a.metrics.productionPercentage);
    
    // Calculate overall metrics
    const totalWorkMinutes = activeUsers.reduce((total, user) => total + user.metrics.totalWorkMinutes, 0);
    const totalExpectedMinutes = activeUsers.reduce((total, user) => total + user.metrics.expectedWorkMinutes, 0);
    const overallEfficiency = totalExpectedMinutes > 0 ? (totalWorkMinutes / totalExpectedMinutes) * 100 : 0;
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'read',
      module: 'statistics',
      targetId: null,
      meta: {
        report: 'userRanking',
        dateRange: {
          from: dateRange.gte,
          to: dateRange.lte
        },
        userCount: activeUsers.length,
        overallEfficiency: Math.round(overallEfficiency)
      }
    });
    
    res.json({
      summary: {
        userCount: activeUsers.length,
        totalWorkMinutes,
        totalExpectedMinutes,
        overallEfficiency: Math.round(overallEfficiency * 100) / 100,
        averageEfficiency: activeUsers.length > 0 
          ? activeUsers.reduce((sum, user) => sum + user.metrics.efficiency, 0) / activeUsers.length 
          : 0
      },
      rankings: {
        byEfficiency: sortedByEfficiency,
        byWorkTime: sortedByWorkTime,
        byProduction: sortedByProduction
      },
      dateRange: {
        from: dateRange.gte,
        to: dateRange.lte
      }
    });
  } catch (error) {
    console.error('Error generating user ranking report:', error);
    res.status(500).json({ message: 'Error retrieving user ranking report' });
  }
};

// Get dashboard overview for CEO/management
const getDashboardOverview = async (req, res) => {
  try {
    // Get today's date and start of current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get counts of items in different states
    const [
      activeGuides,
      completedGuidesThisMonth,
      activeUsers,
      pendingInventoryRequests,
      productionGuideCount,
      stepsCompletedToday,
      lowStockItems
    ] = await Promise.all([
      // Active guides
      prisma.productionGuide.count({
        where: { status: 'IN_PROGRESS' }
      }),
      
      // Completed guides this month
      prisma.productionGuide.count({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: startOfMonth,
            lte: today
          }
        }
      }),
      
      // Active users (with work session today)
      prisma.user.count({
        where: {
          isActive: true,
          OR: [
            {
              workSessions: {
                some: {
                  startTime: {
                    gte: new Date(today.setHours(0, 0, 0, 0))
                  }
                }
              }
            },
            {
              stepWorkEntries: {
                some: {
                  createdAt: {
                    gte: new Date(today.setHours(0, 0, 0, 0))
                  }
                }
              }
            }
          ]
        }
      }),
      
      // Pending inventory requests
      prisma.stepInventory.count({
        where: { status: 'NEEDED' }
      }),
      
      // Total production guides
      prisma.productionGuide.count(),
      
      // Steps completed today
      prisma.productionStep.count({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: new Date(today.setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Low stock items
      prisma.inventoryItem.count({
        where: {
          minQuantity: { not: null },
          quantity: {
            lte: prisma.inventoryItem.fields.minQuantity
          }
        }
      })
    ]);
    
    // Get recent activity (audit logs)
    const recentActivity = await prisma.auditLog.findMany({
      take: 10,
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
    
    // Get critical priority guides
    const criticalGuides = await prisma.productionGuide.findMany({
      where: {
        priority: 'CRITICAL',
        status: { not: 'COMPLETED' }
      },
      take: 5,
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
            status: true
          }
        }
      }
    });
    
    // Calculate guide completion percentage
    const guidesWithProgress = criticalGuides.map(guide => {
      const totalSteps = guide.steps.length;
      const completedSteps = guide.steps.filter(step => step.status === 'COMPLETED').length;
      const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      
      return {
        id: guide.id,
        title: guide.title,
        barcode: guide.barcode,
        priority: guide.priority,
        createdBy: guide.createdBy,
        createdAt: guide.createdAt,
        progressPercentage: Math.round(progressPercentage),
        completedSteps,
        totalSteps
      };
    });
    
    // Get top contributors this month
    const topContributors = await prisma.user.findMany({
      where: {
        isActive: true,
        stepWorkEntries: {
          some: {
            createdAt: {
              gte: startOfMonth,
              lte: today
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
              gte: startOfMonth,
              lte: today
            }
          },
          select: {
            timeWorked: true
          }
        }
      },
      take: 5
    });
    
    // Calculate total work time for each contributor
    const contributors = topContributors.map(user => {
      const totalMinutes = user.stepWorkEntries.reduce((total, entry) => {
        return total + entry.timeWorked;
      }, 0);
      
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        totalMinutes
      };
    });
    
    // Sort by total minutes
    const sortedContributors = contributors.sort((a, b) => b.totalMinutes - a.totalMinutes);
    
    // Audit logging
    await logAudit({
      userId: req.user.id,
      action: 'read',
      module: 'dashboard',
      targetId: null,
      meta: {
        view: 'overview'
      }
    });
    
    res.json({
      stats: {
        activeGuides,
        completedGuidesThisMonth,
        activeUsers,
        pendingInventoryRequests,
        productionGuideCount,
        stepsCompletedToday,
        lowStockItems
      },
      criticalGuides: guidesWithProgress,
      topContributors: sortedContributors,
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
        action: log.action,
        module: log.module,
        targetId: log.targetId,
        createdAt: log.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ message: 'Error retrieving dashboard overview' });
  }
};

// Export functions
module.exports = {
  getUserWorkStatistics,
  getProductionEfficiencyReport,
  getUserRankingReport,
  getDashboardOverview
};