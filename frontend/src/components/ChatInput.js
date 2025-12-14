import React, { useState, useRef, useEffect } from 'react';

function ChatInput({ onSend, disabled }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <div className="chat-input__wrapper">
        <textarea
          ref={inputRef}
          className="chat-input__field"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Please wait..." : "Ask about news..."}
          disabled={disabled}
          rows={1}
        />
        
        <button
          type="submit"
          className="chat-input__submit"
          disabled={disabled || !message.trim()}
          title="Send message"
        >
          {disabled ? (
            <span className="chat-input__loading">⏳</span>
          ) : (
            <span className="chat-input__send-icon">➤</span>
          )}
        </button>
      </div>
      
      <p className="chat-input__hint">
        Press Enter to send • Shift+Enter for new line
      </p>
    </form>
  );
}

export default ChatInput;
