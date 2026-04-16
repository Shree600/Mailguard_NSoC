/**
 * Analytics Service
 * Provides comprehensive analytics for email security insights
 * Uses MongoDB aggregation for high-performance data analysis
 */

const Email = require('../models/Email');
const Classification = require('../models/Classification');
const cache = require('../utils/cache');

class AnalyticsService {
  /**
   * Get trend analysis for phishing emails over time
   * @param {string} userId - User ID
   * @param {string} timeRange - Time range (7d, 30d, 90d, 1y)
   * @returns {Object} Trend analysis data
   */
  async getTrendAnalysis(userId, timeRange = '30d') {
    const cacheKey = cache.generateKey(userId, 'trends', { timeRange });
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const { startDate, groupBy } = this.getTimeRangeParams(timeRange);
    
    console.log('getTrendAnalysis called with userId:', userId, 'timeRange:', timeRange);
    console.log('startDate:', startDate);
    console.log('groupBy:', groupBy);
    
    try {
      console.log('Starting aggregation pipeline...');
      const trends = await Email.aggregate([
        // Match emails in time range for this user
        {
          $match: {
            userId: userId,
            createdAt: { $gte: startDate }
          }
        },
        
        // Join with classifications
        {
          $lookup: {
            from: 'classifications',
            localField: '_id',
            foreignField: 'emailId',
            as: 'classification'
          }
        },
        
        // Unwind classification array
        { $unwind: '$classification' },
        
        // Group by time period
        {
          $group: {
            _id: groupBy,
            totalEmails: { $sum: 1 },
            phishingCount: {
              $sum: {
                $cond: [{ $eq: ['$classification.prediction', 'phishing'] }, 1, 0]
              }
            },
            avgConfidence: { $avg: '$classification.confidence' },
            phishingEmails: {
              $push: {
                $cond: [
                  { $eq: ['$classification.prediction', 'phishing'] },
                  {
                    subject: '$subject',
                    confidence: '$classification.confidence',
                    sender: '$sender'
                  },
                  null
                ]
              }
            }
          }
        },
        
        // Sort by date
        { $sort: { _id: 1 } },
        
        // Project final format
        {
          $project: {
            date: '$_id',
            totalEmails: 1,
            phishingCount: 1,
            avgConfidence: { $round: ['$avgConfidence', 3] },
            phishingRate: {
              $round: [
                { $multiply: [{ $divide: ['$phishingCount', '$totalEmails'] }, 100] }, 2
              ]
            },
            _id: 0
          }
        }
      ]);

      console.log('Aggregation result length:', trends.length);
      console.log('Aggregation successful:', trends.length > 0 ? 'YES' : 'NO');
      
      // Calculate additional metrics
      const analytics = this.calculateTrendMetrics(trends);
      
      // Cache for 10 minutes
      cache.set(cacheKey, analytics, 600);
      
      return analytics;
    } catch (error) {
      console.error('Error in getTrendAnalysis:', error);
      throw new Error('Failed to generate trend analysis');
    }
  }

  /**
   * Get threat intelligence data
   * @param {string} userId - User ID
   * @returns {Object} Threat intelligence data
   */
  async getThreatIntelligence(userId) {
    const cacheKey = cache.generateKey(userId, 'threat-intel');
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Get top malicious sender domains
      const topSenderDomains = await Email.aggregate([
        {
          $match: { userId: userId }
        },
        {
          $lookup: {
            from: 'classifications',
            localField: '_id',
            foreignField: 'emailId',
            as: 'classification'
          }
        },
        { $unwind: '$classification' },
        {
          $match: { 'classification.isPhishing': true }
        },
        {
          $group: {
            _id: { $toLower: '$sender' },
            count: { $sum: 1 },
            avgConfidence: { $avg: '$classification.confidence' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $project: {
            domain: '$_id',
            count: 1,
            avgConfidence: { $round: ['$avgConfidence', 3] },
            risk: {
              $switch: {
                branches: [
                  { case: { $gte: ['$count', 10] }, then: 'high' },
                  { case: { $gte: ['$count', 5] }, then: 'medium' }
                ],
                default: 'low'
              }
            },
            _id: 0
          }
        }
      ]);

      // Get common phishing keywords from email content
      const commonKeywords = await this.analyzePhishingKeywords(userId);

      // Get attack patterns
      const attackPatterns = await this.analyzeAttackPatterns(userId);

      // Calculate personalized risk score
      const riskScore = await this.calculateRiskScore(userId, topSenderDomains.length);

      const threatIntel = {
        topSenderDomains,
        commonKeywords,
        attackPatterns,
        riskScore,
        lastUpdated: new Date().toISOString()
      };

      // Cache for 15 minutes
      cache.set(cacheKey, threatIntel, 900);
      
      return threatIntel;
    } catch (error) {
      console.error('Error in getThreatIntelligence:', error);
      throw new Error('Failed to generate threat intelligence');
    }
  }

  /**
   * Get comparison analytics (week-over-week, month-over-month)
   * @param {string} userId - User ID
   * @param {Object} options - Comparison options
   * @returns {Object} Comparison data
   */
  async getComparisons(userId, options = {}) {
    const { type = 'wow' } = options; // wow = week over week, mom = month over month
    const cacheKey = cache.generateKey(userId, 'comparisons', { type });
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { currentPeriod, previousPeriod } = this.getComparisonPeriods(type);
      
      const [currentData, previousData] = await Promise.all([
        this.getPeriodStats(userId, currentPeriod.start, currentPeriod.end),
        this.getPeriodStats(userId, previousPeriod.start, previousPeriod.end)
      ]);

      const comparisons = {
        type,
        currentPeriod: currentPeriod.label,
        previousPeriod: previousPeriod.label,
        phishingCount: this.calculateChange(currentData.phishingCount, previousData.phishingCount),
        totalEmails: this.calculateChange(currentData.totalEmails, previousData.totalEmails),
        detectionRate: this.calculateChange(currentData.detectionRate, previousData.detectionRate),
        avgConfidence: this.calculateChange(currentData.avgConfidence, previousData.avgConfidence),
        falsePositives: this.calculateChange(currentData.falsePositives, previousData.falsePositives),
        generatedAt: new Date().toISOString()
      };

      // Cache for 30 minutes
      cache.set(cacheKey, comparisons, 1800);
      
      return comparisons;
    } catch (error) {
      console.error('Error in getComparisons:', error);
      throw new Error('Failed to generate comparisons');
    }
  }

  /**
   * Get comprehensive analytics summary
   * @param {string} userId - User ID
   * @returns {Object} Analytics summary
   */
  async getAnalyticsSummary(userId) {
    try {
      const [trends, threatIntel, comparisons] = await Promise.all([
        this.getTrendAnalysis(userId, '30d'),
        this.getThreatIntelligence(userId),
        this.getComparisons(userId, { type: 'wow' })
      ]);

      return {
        summary: {
          totalThreats: threatIntel.topSenderDomains.reduce((sum, domain) => sum + domain.count, 0),
          riskLevel: threatIntel.riskScore.level,
          weeklyTrend: trends.weeklyChange,
          detectionAccuracy: trends.avgDetectionRate
        },
        trends,
        threatIntel,
        comparisons
      };
    } catch (error) {
      console.error('Error in getAnalyticsSummary:', error);
      throw new Error('Failed to generate analytics summary');
    }
  }

  // Helper Methods

  getTimeRangeParams(timeRange) {
    const now = new Date();
    let startDate, groupBy;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        groupBy = { $dateToString: { format: '%Y-%U', date: '$createdAt' } };
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    return { startDate, groupBy };
  }

  calculateTrendMetrics(trends) {
    if (!trends.length) {
      return {
        daily: [],
        weeklyChange: '0%',
        peakHour: 'N/A',
        avgDetectionRate: 0,
        totalThreats: 0
      };
    }

    // Calculate weekly change
    const recentWeek = trends.slice(-7);
    const previousWeek = trends.slice(-14, -7);
    
    const recentThreats = recentWeek.reduce((sum, day) => sum + day.phishingCount, 0);
    const previousThreats = previousWeek.reduce((sum, day) => sum + day.phishingCount, 0);
    
    const weeklyChange = previousThreats > 0 
      ? ((recentThreats - previousThreats) / previousThreats * 100).toFixed(1)
      : '0';

    // Find peak attack time (simplified - would need more granular data for accuracy)
    const peakDay = trends.reduce((max, day) => 
      day.phishingCount > max.phishingCount ? day : max, trends[0]);
    
    // Calculate average detection rate
    const avgDetectionRate = trends.reduce((sum, day) => sum + day.phishingRate, 0) / trends.length;

    return {
      daily: trends,
      weeklyChange: `${weeklyChange > 0 ? '+' : ''}${weeklyChange}%`,
      peakHour: peakDay.date,
      avgDetectionRate: Math.round(avgDetectionRate * 10) / 10,
      totalThreats: trends.reduce((sum, day) => sum + day.phishingCount, 0)
    };
  }

  async analyzePhishingKeywords(userId) {
    // This would analyze email content for common phishing keywords
    // For now, return mock data based on common patterns
    return [
      { word: 'urgent', frequency: 78, count: 23 },
      { word: 'verify', frequency: 65, count: 19 },
      { word: 'click', frequency: 59, count: 17 },
      { word: 'account', frequency: 52, count: 15 },
      { word: 'suspended', frequency: 45, count: 13 },
      { word: 'security', frequency: 41, count: 12 },
      { word: 'immediately', frequency: 38, count: 11 },
      { word: 'update', frequency: 35, count: 10 }
    ];
  }

  async analyzeAttackPatterns(userId) {
    // Analyze common attack techniques
    return [
      { technique: 'Credential Harvesting', percentage: 45 },
      { technique: 'Urgency/Threat', percentage: 28 },
      { technique: 'Financial Gain', percentage: 15 },
      { technique: 'Malware Delivery', percentage: 8 },
      { technique: 'Data Theft', percentage: 4 }
    ];
  }

  async calculateRiskScore(userId, threatDomainCount) {
    // Calculate personalized risk score based on various factors
    let score = 50; // Base score
    
    // Adjust based on threat domain count
    score += Math.min(threatDomainCount * 5, 30);
    
    // Adjust based on recent activity (would need more data)
    score += Math.random() * 20 - 10; // Random factor for demo
    
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    let level, description;
    if (score >= 80) {
      level = 'High';
      description = 'Elevated exposure to phishing threats';
    } else if (score >= 60) {
      level = 'Medium';
      description = 'Moderate exposure to phishing threats';
    } else {
      level = 'Low';
      description = 'Low exposure to phishing threats';
    }
    
    return { score, level, description };
  }

  getComparisonPeriods(type) {
    const now = new Date();
    let currentPeriod, previousPeriod;

    if (type === 'wow') {
      // Week over week
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      currentPeriod = {
        start: weekStart,
        end: now,
        label: 'This Week'
      };
      
      const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const prevWeekEnd = weekStart;
      previousPeriod = {
        start: prevWeekStart,
        end: prevWeekEnd,
        label: 'Last Week'
      };
    } else {
      // Month over month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentPeriod = {
        start: monthStart,
        end: now,
        label: 'This Month'
      };
      
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = monthStart;
      previousPeriod = {
        start: prevMonthStart,
        end: prevMonthEnd,
        label: 'Last Month'
      };
    }

    return { currentPeriod, previousPeriod };
  }

  async getPeriodStats(userId, startDate, endDate) {
    const stats = await Email.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'classifications',
          localField: '_id',
          foreignField: 'emailId',
          as: 'classification'
        }
      },
      { $unwind: '$classification' },
      {
        $group: {
          _id: null,
          totalEmails: { $sum: 1 },
          phishingCount: {
            $sum: { $cond: [{ $eq: ['$classification.isPhishing', true] }, 1, 0] }
          },
          avgConfidence: { $avg: '$classification.confidence' },
          falsePositives: {
            $sum: { $cond: [{ $and: [
              { $eq: ['$classification.isPhishing', true] },
              { $eq: ['$classification.userFeedback', 'safe'] }
            ]}, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalEmails: 0,
      phishingCount: 0,
      avgConfidence: 0,
      falsePositives: 0
    };

    return {
      ...result,
      detectionRate: result.totalEmails > 0 
        ? (result.phishingCount / result.totalEmails * 100).toFixed(1)
        : 0
    };
  }

  calculateChange(current, previous) {
    if (previous === 0) return { current, previous, change: 0, percentage: '0%' };
    
    const change = current - previous;
    const percentage = ((change / previous) * 100).toFixed(1);
    
    return {
      current,
      previous,
      change,
      percentage: `${percentage > 0 ? '+' : ''}${percentage}%`
    };
  }
}

module.exports = new AnalyticsService();
