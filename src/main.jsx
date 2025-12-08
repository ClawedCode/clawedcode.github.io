import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Walkthrough playout listener for OBS recordings
import './utils/walkthrough-listener'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
