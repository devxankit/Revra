const ChannelPartner = require('../models/ChannelPartner');
const CPLead = require('../models/CPLead');
const Client = require('../models/Client');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get channel partner leads breakdown with metrics
// @route   GET /api/admin/channel-partners/leads/breakdown
// @access  Private (Admin only)
exports.getChannelPartnerLeadsBreakdown = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get all channel partners
  const totalPartners = await ChannelPartner.countDocuments();
  const channelPartners = await ChannelPartner.find()
    .select('name email phoneNumber partnerId isActive')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Get breakdown for each channel partner
  const breakdown = await Promise.all(
    channelPartners.map(async (partner) => {
      // Get all leads for this partner
      const allLeads = await CPLead.find({ assignedTo: partner._id })
        .populate('category', 'name')
        .populate('convertedToClient', 'name phone email')
        .lean();

      // Count leads by status (mapping CPLead status to display status)
      const statusCounts = {
        hot: 0,
        connected: 0,
        converted: 0,
        lost: 0
      };

      allLeads.forEach(lead => {
        // Map CPLead statuses to display statuses
        if (lead.status === 'converted') {
          statusCounts.converted++;
        } else if (lead.priority === 'urgent' || lead.priority === 'high') {
          statusCounts.hot++;
        } else if (lead.status === 'connected' || lead.status === 'followup' || lead.status === 'new' || lead.status === 'not_picked') {
          statusCounts.connected++;
        } else if (lead.status === 'lost' || lead.status === 'not_converted') {
          statusCounts.lost++;
        }
      });

      // Get converted leads (for revenue calculation)
      const convertedLeads = allLeads.filter(lead => lead.status === 'converted' && lead.convertedToClient);

      // Calculate revenue metrics from clients
      let totalRevenue = 0;
      let collectedAmount = 0;
      let pendingAmount = 0;

      if (convertedLeads.length > 0) {
        const clientIds = convertedLeads
          .map(lead => lead.convertedToClient?._id || lead.convertedToClient)
          .filter(id => id);

        if (clientIds.length > 0) {
          const clients = await Client.find({ _id: { $in: clientIds } })
            .select('totalValue paidAmount pendingAmount')
            .lean();

          clients.forEach(client => {
            totalRevenue += client.totalValue || 0;
            collectedAmount += client.paidAmount || 0;
            pendingAmount += client.pendingAmount || 0;
          });
        }
      }

      // Get leads shared with sales team (with details)
      const leadsSharedWithSalesList = await CPLead.find({
        assignedTo: partner._id,
        sharedWithSales: { $exists: true, $ne: [] }
      })
        .populate('category', 'name')
        .populate('sharedWithSales.salesId', 'name email phoneNumber')
        .lean();

      // Get leads received from sales team (with details)
      const leadsReceivedFromSalesList = await CPLead.find({
        assignedTo: partner._id,
        sharedFromSales: { $exists: true, $ne: [] }
      })
        .populate('category', 'name')
        .populate('sharedFromSales.sharedBy', 'name email phoneNumber')
        .populate('sharedFromSales.leadId', 'name phone email company')
        .lean();

      // Get detailed lead lists by status
      const leadsByStatus = {
        hot: allLeads.filter(lead => lead.priority === 'urgent' || lead.priority === 'high'),
        connected: allLeads.filter(lead => 
          (lead.status === 'connected' || lead.status === 'followup' || lead.status === 'new' || lead.status === 'not_picked') &&
          lead.priority !== 'urgent' && lead.priority !== 'high'
        ),
        converted: allLeads.filter(lead => lead.status === 'converted'),
        lost: allLeads.filter(lead => lead.status === 'lost' || lead.status === 'not_converted')
      };

      return {
        channelPartner: {
          id: partner._id,
          name: partner.name,
          email: partner.email,
          phoneNumber: partner.phoneNumber,
          partnerId: partner.partnerId,
          isActive: partner.isActive
        },
        leadCounts: {
          total: allLeads.length,
          hot: leadsByStatus.hot.length,
          connected: leadsByStatus.connected.length,
          converted: leadsByStatus.converted.length,
          lost: leadsByStatus.lost.length
        },
        revenue: {
          totalRevenue,
          collectedAmount,
          pendingAmount
        },
        leadSharing: {
          sharedWithSales: leadsSharedWithSalesList.length,
          receivedFromSales: leadsReceivedFromSalesList.length,
          sharedWithSalesList: leadsSharedWithSalesList.map(lead => ({
            id: lead._id,
            name: lead.name || 'N/A',
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            projectType: lead.category?.name || 'N/A',
            value: lead.value || 0,
            status: lead.status,
            priority: lead.priority,
            createdAt: lead.createdAt,
            sharedWith: lead.sharedWithSales?.map(share => ({
              salesId: share.salesId?._id || share.salesId,
              salesName: share.salesId?.name || 'N/A',
              salesEmail: share.salesId?.email,
              salesPhone: share.salesId?.phoneNumber,
              sharedAt: share.sharedAt
            })) || []
          })),
          receivedFromSalesList: leadsReceivedFromSalesList.map(lead => ({
            id: lead._id,
            name: lead.name || 'N/A',
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            projectType: lead.category?.name || 'N/A',
            value: lead.value || 0,
            status: lead.status,
            priority: lead.priority,
            createdAt: lead.createdAt,
            receivedFrom: lead.sharedFromSales?.map(share => ({
              leadId: share.leadId?._id || share.leadId,
              originalLeadName: share.leadId?.name || 'N/A',
              originalLeadPhone: share.leadId?.phone,
              sharedBy: share.sharedBy?._id || share.sharedBy,
              sharedByName: share.sharedBy?.name || 'N/A',
              sharedByEmail: share.sharedBy?.email,
              sharedByPhone: share.sharedBy?.phoneNumber,
              sharedAt: share.sharedAt
            })) || []
          }))
        },
        leadsByStatus: {
          hot: leadsByStatus.hot.map(lead => ({
            id: lead._id,
            name: lead.name || 'N/A',
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            projectType: lead.category?.name || 'N/A',
            value: lead.value || 0,
            status: lead.status,
            priority: lead.priority,
            createdAt: lead.createdAt,
            convertedAt: lead.convertedAt,
            client: lead.convertedToClient ? {
              id: lead.convertedToClient._id || lead.convertedToClient,
              name: lead.convertedToClient.name,
              phone: lead.convertedToClient.phone,
              email: lead.convertedToClient.email
            } : null
          })),
          connected: leadsByStatus.connected.map(lead => ({
            id: lead._id,
            name: lead.name || 'N/A',
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            projectType: lead.category?.name || 'N/A',
            value: lead.value || 0,
            status: lead.status,
            priority: lead.priority,
            createdAt: lead.createdAt,
            lastContactDate: lead.lastContactDate,
            nextFollowUpDate: lead.nextFollowUpDate
          })),
          converted: leadsByStatus.converted.map(lead => ({
            id: lead._id,
            name: lead.name || 'N/A',
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            projectType: lead.category?.name || 'N/A',
            value: lead.value || 0,
            status: lead.status,
            convertedAt: lead.convertedAt,
            client: lead.convertedToClient ? {
              id: lead.convertedToClient._id || lead.convertedToClient,
              name: lead.convertedToClient.name,
              phone: lead.convertedToClient.phone,
              email: lead.convertedToClient.email
            } : null
          })),
          lost: leadsByStatus.lost.map(lead => ({
            id: lead._id,
            name: lead.name || 'N/A',
            phone: lead.phone,
            email: lead.email,
            company: lead.company,
            projectType: lead.category?.name || 'N/A',
            value: lead.value || 0,
            status: lead.status,
            lostReason: lead.lostReason,
            createdAt: lead.createdAt
          }))
        }
      };
    })
  );

  res.status(200).json({
    success: true,
    count: breakdown.length,
    total: totalPartners,
    page: pageNum,
    pages: Math.ceil(totalPartners / limitNum),
    data: breakdown
  });
});

// @desc    Get leads for a specific channel partner and status
// @route   GET /api/admin/channel-partners/:cpId/leads
// @access  Private (Admin only)
exports.getChannelPartnerLeads = asyncHandler(async (req, res, next) => {
  const { cpId } = req.params;
  const { status, page = 1, limit = 50 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  let query = { assignedTo: cpId };

  // Filter by status
  if (status) {
    if (status === 'hot') {
      query.priority = { $in: ['urgent', 'high'] };
    } else if (status === 'connected') {
      query.status = { $in: ['connected', 'followup'] };
    } else if (status === 'converted') {
      query.status = 'converted';
    } else if (status === 'lost') {
      query.status = { $in: ['lost', 'not_converted'] };
    } else {
      query.status = status;
    }
  }

  const total = await CPLead.countDocuments(query);

  const leads = await CPLead.find(query)
    .populate('category', 'name color icon')
    .populate('convertedToClient', 'name phone email totalValue paidAmount pendingAmount')
    .populate('assignedTo', 'name email phoneNumber partnerId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  res.status(200).json({
    success: true,
    count: leads.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: leads
  });
});
