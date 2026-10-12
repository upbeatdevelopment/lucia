import { createElement } from 'https://esm.sh/react@19.0.0';
import { createRoot } from 'https://esm.sh/react-dom@19.0.0/client?external=react';
import App from './App.js';

createRoot(document.getElementById('root')).render(createElement(App));
