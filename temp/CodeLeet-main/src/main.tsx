import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import cssText from './styles.css?inline'; 
import { attachInterceptor } from './interceptors';
import MemeOverlay from './components/MemeOverlay';

attachInterceptor();

const MOUNT_ID = 'leetcode-detective-root';

const container = document.createElement('div');
container.id = MOUNT_ID;
document.body.append(container);

const shadow = container.attachShadow({ mode: 'open' });

const styleTag = document.createElement('style');
styleTag.textContent = cssText;
shadow.append(styleTag);

const appRoot = document.createElement('div');
shadow.append(appRoot);

ReactDOM.createRoot(appRoot).render(
  <React.StrictMode>
    <App />
    <MemeOverlay/>
  </React.StrictMode>,
);