import React from 'react';

function TypingIndicator() {
  return (
    <div className="chat-message chat-message--assistant">
      <div className="chat-message__avatar">🤖</div>
      <div className="chat-message__content">
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
