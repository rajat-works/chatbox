import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Buffer } from 'buffer';
import './styles/globals.css';

// Polyfills for browser-only builds (required by simple-peer/randombytes)
if (typeof window !== 'undefined') {
  const w = window as typeof window & { global?: typeof window; process?: { env: Record<string, string> } };
  if (!w.global) w.global = window;
  if (!w.process) w.process = { env: {} } as any;
  if (!(w as any).Buffer) (w as any).Buffer = Buffer;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
    <App />
//   </React.StrictMode>,
);
