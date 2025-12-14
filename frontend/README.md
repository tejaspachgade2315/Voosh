# RAG News Chatbot - Frontend

A modern React frontend for the RAG-powered news chatbot with real-time streaming responses.

## 🚀 Features

- **Real-time Chat**: Socket.IO for instant messaging
- **Streaming Responses**: Watch AI responses generate in real-time
- **Session Management**: Automatic session creation and persistence
- **Source Attribution**: View sources used for each response
- **Responsive Design**: Works on desktop and mobile
- **Modern UI**: Clean SCSS styling with smooth animations

## 🛠 Tech Stack

| Technology | Purpose | Justification |
|------------|---------|---------------|
| **React 18** | UI Framework | Component-based, excellent ecosystem |
| **Socket.IO Client** | Real-time Communication | Seamless integration with backend |
| **SCSS** | Styling | Variables, nesting, better organization |
| **Create React App** | Build Tool | Zero-config setup, optimized builds |

## 📁 Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── ChatContainer.js   # Main chat wrapper
│   │   ├── ChatInput.js       # Message input
│   │   ├── ChatMessage.js     # Message display
│   │   ├── Header.js          # App header
│   │   └── TypingIndicator.js # Loading animation
│   ├── services/
│   │   ├── api.js             # REST API calls
│   │   └── socket.js          # Socket.IO service
│   ├── styles/
│   │   └── main.scss          # All styles
│   ├── App.js                 # Main app component
│   └── index.js               # Entry point
├── package.json
└── README.md
```

## 🔧 Installation

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API URL (optional)**
   ```bash
   # Create .env file
   echo "REACT_APP_API_URL=http://localhost:3001" > .env
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🔑 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:3001` | Backend API URL |

## 🎨 UI Components

### Header
- App branding and logo
- Connection status indicator
- Session ID display
- Clear history button
- New session button

### ChatContainer
- Message list with auto-scroll
- Empty state with suggestions
- Error banner
- Loading states

### ChatMessage
- User/assistant message styling
- Timestamp display
- Expandable sources section
- Relevance scores

### ChatInput
- Auto-growing textarea
- Send button with states
- Keyboard shortcuts (Enter to send)
- Disabled state during loading

## 📡 Socket.IO Integration

### Connection Flow

```
1. App mounts
       ↓
2. Create session via REST API
       ↓
3. Connect to Socket.IO
       ↓
4. Join session room
       ↓
5. Receive chat history
       ↓
6. Ready for messaging
```

### Event Handling

```javascript
// Sending a message
socketService.sendMessage("What's the latest news?");

// Receiving streaming response
socketService.onResponseChunk((data) => {
  // Update UI with each token
  setStreamingMessage(prev => prev + data.content);
});

// Response complete
socketService.onResponseComplete((data) => {
  // Add full message with sources
  setMessages([...messages, {
    role: 'assistant',
    content: data.answer,
    sources: data.sources
  }]);
});
```

## 🎯 Features Walkthrough

### 1. Starting a Session
- Fresh session on page load
- Unique session ID generated
- History loaded if reconnecting

### 2. Sending Messages
- Type in the input box
- Press Enter or click send
- Message appears immediately
- Loading indicator shows

### 3. Streaming Responses
- Response appears token-by-token
- Blinking cursor during streaming
- Smooth animation

### 4. Viewing Sources
- Click "Show X sources" on any response
- See relevance scores
- View source snippets
- Article metadata displayed

### 5. Session Management
- Clear History: Removes all messages
- New Session: Creates fresh session

## 🚀 Deployment

### Deploy to Vercel

1. Connect GitHub repository
2. Configure:
   - **Framework**: Create React App
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Environment Variables**: Add `REACT_APP_API_URL`

### Deploy to Netlify

1. Connect repository
2. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `build`
3. Add environment variables

### Deploy to Render

1. Create Static Site
2. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `build`
   - Add environment variables

### Docker Deployment

```dockerfile
# Build stage
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📱 Responsive Design

### Breakpoints

| Size | Width | Changes |
|------|-------|---------|
| Desktop | > 992px | Full layout |
| Tablet | 768-992px | Adjusted spacing |
| Mobile | < 768px | Stacked header |
| Small Mobile | < 576px | Compact UI |

### Mobile Optimizations

- Touch-friendly buttons
- Reduced padding
- Hidden secondary text
- Full-width messages

## 🎨 Theming

### Color Palette

```scss
// Primary colors
$primary-color: #667eea;
$primary-dark: #5a67d8;

// Status colors
$secondary-color: #48bb78; // Success
$error-color: #f56565;     // Error
$warning-color: #ed8936;   // Warning

// Text colors
$text-primary: #1a202c;
$text-secondary: #4a5568;
$text-muted: #718096;

// Background colors
$bg-primary: #f7fafc;
$bg-secondary: #ffffff;
$bg-chat: #edf2f7;
```

### Customization

Edit `src/styles/main.scss` to customize:
- Colors and themes
- Spacing and sizing
- Animations
- Typography

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## 📊 Performance

### Optimizations

1. **Lazy Loading**: Components loaded as needed
2. **Memoization**: useCallback for event handlers
3. **Virtual Scrolling**: Future enhancement for long histories
4. **Debouncing**: Future enhancement for typing indicator

### Bundle Size

```bash
# Analyze bundle
npm run build
npx source-map-explorer 'build/static/js/*.js'
```

## 🐛 Troubleshooting

### Common Issues

**Socket connection fails**
- Check backend is running
- Verify REACT_APP_API_URL is correct
- Check CORS configuration

**Styles not loading**
- Clear browser cache
- Check SCSS compilation
- Verify import in index.js

**Messages not sending**
- Check session is active
- Verify socket connection
- Check browser console for errors

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
