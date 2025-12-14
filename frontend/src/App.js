import React, { useState, useEffect, useCallback } from 'react';
import ChatContainer from './components/ChatContainer';
import Header from './components/Header';
import { createSession, getSessionHistory, clearSessionHistory } from './services/api';
import { socketService } from './services/socket';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState('');

  // Initialize session
  const initSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create new session via API
      const session = await createSession();
      setSessionId(session.id);
      
      // Connect socket and join session
      socketService.connect();
      socketService.joinSession(session.id);
      
      setMessages([]);
      console.log('Session initialized:', session.id);
    } catch (err) {
      console.error('Failed to initialize session:', err);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup socket listeners
  useEffect(() => {
    socketService.onConnect(() => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    socketService.onDisconnect(() => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    socketService.onSessionJoined((data) => {
      console.log('Session joined:', data);
      if (data.history && data.history.length > 0) {
        setMessages(data.history);
      }
    });

    socketService.onResponseStart(() => {
      setStreamingMessage('');
      setIsLoading(true);
    });

    socketService.onResponseChunk((data) => {
      setStreamingMessage(prev => prev + data.content);
    });

    socketService.onResponseComplete((data) => {
      setIsLoading(false);
      setStreamingMessage('');
      
      // Add assistant message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: data.timestamp,
        sources: data.sources,
      }]);
    });

    socketService.onError((data) => {
      setError(data.message);
      setIsLoading(false);
      setStreamingMessage('');
    });

    socketService.onSessionExpired(() => {
      setError('Session expired. Creating new session...');
      initSession();
    });

    socketService.onHistoryCleared(() => {
      setMessages([]);
    });

    // Initialize session on mount
    initSession();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [initSession]);

  // Send message
  const sendMessage = useCallback(async (message) => {
    if (!message.trim() || !sessionId) return;

    // Add user message immediately
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setError(null);

    // Send via socket
    socketService.sendMessage(message.trim());
  }, [sessionId]);

  // Clear chat history
  const clearHistory = useCallback(async () => {
    if (!sessionId) return;

    try {
      await clearSessionHistory(sessionId);
      setMessages([]);
      socketService.clearHistory();
    } catch (err) {
      console.error('Failed to clear history:', err);
      setError('Failed to clear chat history');
    }
  }, [sessionId]);

  // Reset session (create new)
  const resetSession = useCallback(async () => {
    socketService.disconnect();
    await initSession();
  }, [initSession]);

  return (
    <div className="app">
      <Header
        sessionId={sessionId}
        isConnected={isConnected}
        onResetSession={resetSession}
        onClearHistory={clearHistory}
      />
      
      <main className="main-content">
        <ChatContainer
          messages={messages}
          streamingMessage={streamingMessage}
          isLoading={isLoading}
          error={error}
          onSendMessage={sendMessage}
          onDismissError={() => setError(null)}
        />
      </main>
    </div>
  );
}

export default App;
