import React, { useState } from 'react';

function ChatMessage({ message }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`chat-message chat-message--${message.role}`}>
      <div className="chat-message__avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      
      <div className="chat-message__content">
        <div className="chat-message__bubble">
          <p className="chat-message__text">{message.content}</p>
        </div>
        
        <div className="chat-message__meta">
          <span className="chat-message__time">{timestamp}</span>
          
          {message.sources && message.sources.length > 0 && (
            <button
              className="chat-message__sources-toggle"
              onClick={() => setShowSources(!showSources)}
            >
              {showSources ? 'Hide sources' : `Show ${message.sources.length} sources`}
            </button>
          )}
        </div>
        
        {showSources && message.sources && (
          <div className="chat-message__sources">
            <h4>Sources:</h4>
            {message.sources.map((source, index) => (
              <div key={index} className="source-card">
                <div className="source-card__header">
                  <span className="source-card__number">#{index + 1}</span>
                  {source.metadata?.title && (
                    <span className="source-card__title">{source.metadata.title}</span>
                  )}
                  <span className="source-card__score">
                    Relevance: {(parseFloat(source.score) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="source-card__text">{source.text}</p>
                {source.metadata?.source && (
                  <span className="source-card__source">
                    Source: {source.metadata.source}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
