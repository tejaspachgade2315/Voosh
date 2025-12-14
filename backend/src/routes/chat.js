const express = require('express');
const ragService = require('../services/rag');
const sessionService = require('../services/session');

const router = express.Router();

/**
 * @route   POST /api/chat
 * @desc    Send a message and get a response (non-streaming)
 */
router.post('/', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }
    
    const result = await ragService.processQuery(sessionId, message.trim());
    
    res.json({
      success: true,
      data: {
        answer: result.answer,
        sources: result.sources,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    
    if (error.message === 'Invalid or expired session') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please create a new session.',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
    });
  }
});

/**
 * @route   POST /api/chat/stream
 * @desc    Send a message and get a streaming response
 */
router.post('/stream', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    const result = await ragService.processQueryStream(
      sessionId,
      message.trim(),
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }
    );
    
    // Send sources at the end
    res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      sources: result.sources,
      timestamp: new Date().toISOString() 
    })}\n\n`);
    
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    
    if (error.message === 'Invalid or expired session') {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Invalid or expired session' })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to process message' })}\n\n`);
    }
    
    res.end();
  }
});

/**
 * @route   GET /api/chat/status
 * @desc    Get RAG system status
 */
router.get('/status', async (req, res) => {
  try {
    const documentCount = ragService.getDocumentCount();
    
    res.json({
      success: true,
      data: {
        status: 'operational',
        documentsIndexed: documentCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
    });
  }
});

module.exports = router;
