const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { sendPushNotification, isInitialized } = require('../services/firebaseAdmin');
const { sendNotificationToUser } = require('../utils/pushNotificationHelper');

const { getUserModel } = require('../utils/userHelper');

// @route   POST /api/fcm-tokens/save
// @desc    Save FCM token for authenticated user
// @access  Private
router.post('/save', protect, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const userId = req.user.id;
    const userType = req.userType;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    // Validate platform
    if (platform !== 'web' && platform !== 'mobile') {
      return res.status(400).json({
        success: false,
        message: 'Platform must be either "web" or "mobile"'
      });
    }

    // Get user model
    const UserModel = getUserModel(userType);
    if (!UserModel) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Determine field based on platform
    const tokenField = platform === 'web' ? 'fcmTokens' : 'fcmTokenMobile';

    // Atomic update using $addToSet to avoid duplicates
    const updateResult = await UserModel.updateOne(
      { _id: userId },
      { $addToSet: { [tokenField]: token } }
    );

    // Optional: limit the number of tokens to prevent bloated arrays
    // We do this as a separate step if needed, but for simplicity we'll just keep them for now
    // as suggested in the implementation plan.

    res.json({
      success: true,
      message: 'FCM token saved successfully',
      platform: platform,
      alreadyExists: updateResult.modifiedCount === 0
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save FCM token',
      error: error.message
    });
  }
});

// @route   DELETE /api/fcm-tokens/remove
// @desc    Remove FCM token for authenticated user
// @access  Private
router.delete('/remove', protect, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const userId = req.user.id;
    const userType = req.userType;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    // Validate platform
    if (platform !== 'web' && platform !== 'mobile') {
      return res.status(400).json({
        success: false,
        message: 'Platform must be either "web" or "mobile"'
      });
    }

    // Get user model
    const UserModel = getUserModel(userType);
    if (!UserModel) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Determine field based on platform
    const tokenField = platform === 'web' ? 'fcmTokens' : 'fcmTokenMobile';

    // Atomic removal using $pull
    await UserModel.updateOne(
      { _id: userId },
      { $pull: { [tokenField]: token } }
    );

    res.json({
      success: true,
      message: 'FCM token removed successfully',
      platform: platform
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove FCM token',
      error: error.message
    });
  }
});

// @route   POST /api/fcm-tokens/test
// @desc    Send test notification to authenticated user
// @access  Private
router.post('/test', protect, async (req, res) => {
  try {
    // Check if Firebase Admin is initialized
    if (!isInitialized()) {
      return res.status(503).json({
        success: false,
        message: 'Firebase Admin is not initialized. Please check Firebase configuration.',
        error: 'Firebase Admin not initialized'
      });
    }

    const userId = req.user.id;
    const userType = req.userType;

    // Get user model to verify tokens exist
    const UserModel = getUserModel(userType);
    if (!UserModel) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Send test notification using helper function
    const response = await sendNotificationToUser(
      userId,
      userType,
      {
        title: 'Welcome to Appzeto! 🎉',
        body: 'Push notifications are working! You will receive important updates here.',
        data: {
          type: 'test',
          link: '/',
          timestamp: new Date().toISOString()
        }
      },
      true // Include mobile tokens
    );

    if (response.error) {
      console.error(`❌ Error in sendNotificationToUser:`, response.error);
      return res.status(400).json({
        success: false,
        message: response.error
      });
    }

    if (response.failureCount > 0 && response.responses) {
      response.responses.forEach((resp) => {
        if (!resp.success) {
          console.error('Test notification failed:', resp.error?.code, resp.error?.message);
        }
      });
    }

    res.json({
      success: true,
      message: 'Test notification sent',
      result: {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens: response.invalidTokens?.length || 0
      }
    });
  } catch (error) {
    console.error('Test notification error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

// @route   GET /api/fcm-tokens/status
// @desc    Get FCM token status for authenticated user
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.userType;

    // Get user model
    const UserModel = getUserModel(userType);
    if (!UserModel) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      tokens: {
        web: user.fcmTokens || [],
        mobile: user.fcmTokenMobile || [],
        webCount: user.fcmTokens?.length || 0,
        mobileCount: user.fcmTokenMobile?.length || 0
      }
    });
  } catch (error) {
    console.error('Error getting FCM token status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get token status',
      error: error.message
    });
  }
});

module.exports = router;
