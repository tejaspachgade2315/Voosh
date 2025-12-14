import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

function ChatContainer({
  messages,
  streamingMessage,
  isLoading,
  error,
  onSendMessage,
  onDismissError,
}) {
  const messagesEndRef = useRef(null);

  const handleSuggestionClick = (text) => {
    if (!isLoading && onSendMessage) {
      onSendMessage(text);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  return (
    <div className="chat-container">
      {error && (
        <div className="error-banner">
          <span className="error-banner__icon">⚠️</span>
          <span className="error-banner__message">{error}</span>
          <button className="error-banner__dismiss" onClick={onDismissError}>
            ✕
          </button>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && !isLoading && (
          <div className="chat-empty">
            <div className="chat-empty__icon">💬</div>
            <h2>Welcome to News Chatbot!</h2>
            <p>Ask me anything about recent news and current events.</p>
            <div className="chat-empty__suggestions">
              <h3>Try asking:</h3>
              <ul>
                <li onClick={() => handleSuggestionClick('What are the latest headlines?')}>
                  "What are the latest headlines?"
                </li>
                <li onClick={() => handleSuggestionClick('Tell me about recent technology news')}>
                  "Tell me about recent technology news"
                </li>
                <li onClick={() => handleSuggestionClick("What's happening in the world today?")}>
                  "What's happening in the world today?"
                </li>
                <li onClick={() => handleSuggestionClick('Summarize the top business stories')}>
                  "Summarize the top business stories"
                </li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {streamingMessage && (
          <div className="chat-message chat-message--assistant">
            <div className="chat-message__avatar">🤖</div>
            <div className="chat-message__content">
              <div className="chat-message__bubble">
                {streamingMessage}
                <span className="streaming-cursor">▋</span>
              </div>
            </div>
          </div>
        )}

        {isLoading && !streamingMessage && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={onSendMessage} disabled={isLoading} />
    </div>
  );
}

export default ChatContainer;
