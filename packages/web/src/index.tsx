import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './config';

// Bootstrap components
import 'bootstrap/dist/css/bootstrap.min.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <MsalProvider instance={new PublicClientApplication(msalConfig)}>
      <App />
    </MsalProvider>
  </React.StrictMode>
);

