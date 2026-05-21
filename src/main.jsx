// Runtime polyfill for sockjs-client which references Node's `global`.
// Must be first — before any import that might trigger sockjs-client.
window.global = window.global ?? window;

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import store from './app/store'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastProvider } from './components/ui/Toast'
import { initTheme } from './utils/theme'

// Apply persisted (or system) theme to <html data-theme> before React renders
// so the first paint is in the right palette — no light-mode flash.
initTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Provider store={store}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </Provider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
