import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { AudioPlayerProvider } from './contexts/AudioPlayerContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AudioPlayerProvider>
        <App />
      </AudioPlayerProvider>
    </AuthProvider>
  </React.StrictMode>,
)
