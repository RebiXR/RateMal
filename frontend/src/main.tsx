//import { StrictMode } from 'react'
//import ReactDOM from "react-dom/client";
import React from "react";
import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App.tsx'
import AppProvider from "./context/AppContext";

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
)
