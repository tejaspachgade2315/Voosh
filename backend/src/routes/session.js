const express = require('express');
const sessionService = require('../services/session');

const router = express.Router();

/**
 * @route   POST /api/session
 * @desc    Create a new session
 */
router.post('/', async (req, res) => {
  try {
    const session = await sessionService.createSession();
    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
    });
  }
});

/**
 * @route   GET /api/session/:sessionId
 * @desc    Get session details
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }
    
    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session',
    });
  }
});

/**
 * @route   GET /api/session/:sessionId/history
 * @desc    Get chat history for a session
 */
router.get('/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 100 } = req.query;
    
    const isValid = await sessionService.validateSession(sessionId);
    if (!isValid) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired',
      });
    }
    
    const history = await sessionService.getHistory(sessionId, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        sessionId,
        messages: history,
        count: history.length,
      },
    });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat history',
    });
  }
});

/**
 * @route   DELETE /api/session/:sessionId/history
 * @desc    Clear chat history for a session
 */
router.delete('/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const isValid = await sessionService.validateSession(sessionId);
    if (!isValid) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired',
      });
    }
    
    await sessionService.clearHistory(sessionId);
    
    res.json({
      success: true,
      message: 'Chat history cleared',
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat history',
    });
  }
});

/**
 * @route   DELETE /api/session/:sessionId
 * @desc    Delete a session completely
 */
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await sessionService.deleteSession(sessionId);
    
    res.json({
      success: true,
      message: 'Session deleted',
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
    });
  }
});

module.exports = router;
