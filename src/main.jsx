import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App.jsx'
import './index.css'
//import { registerSW } from 'virtual:pwa-register'

// อัปเดต PWA อัตโนมัติเมื่อมี build ใหม่
//registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
