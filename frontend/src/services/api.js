const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Create a new session
 */
export async function createSession() {
  const response = await fetch(`${API_URL}/api/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to create session');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Get session details
 */
export async function getSession(sessionId) {
  const response = await fetch(`${API_URL}/api/session/${sessionId}`);
  
  if (!response.ok) {
    throw new Error('Failed to get session');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Get session chat history
 */
export async function getSessionHistory(sessionId, limit = 100) {
  const response = await fetch(`${API_URL}/api/session/${sessionId}/history?limit=${limit}`);
  
  if (!response.ok) {
    throw new Error('Failed to get session history');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Clear session history
 */
export async function clearSessionHistory(sessionId) {
  const response = await fetch(`${API_URL}/api/session/${sessionId}/history`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to clear session history');
  }
  
  return true;
}

/**
 * Send a chat message (non-streaming)
 */
export async function sendChatMessage(sessionId, message) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, message }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to send message');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Send a chat message with streaming response
 */
export async function sendChatMessageStream(sessionId, message, onChunk, onComplete) {
  const response = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, message }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to send message');
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        if (data.type === 'chunk') {
          onChunk(data.content);
        } else if (data.type === 'done') {
          onComplete(data);
        } else if (data.type === 'error') {
          throw new Error(data.message);
        }
      }
    }
  }
}

/**
 * Get system status
 */
export async function getSystemStatus() {
  const response = await fetch(`${API_URL}/api/chat/status`);
  
  if (!response.ok) {
    throw new Error('Failed to get system status');
  }
  
  const data = await response.json();
  return data.data;
}

export { API_URL };
