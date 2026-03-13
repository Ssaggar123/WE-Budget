
import React from 'react'
import { useState, useEffect, useCallback, useRef } from "react"
import ReactDOM from 'react-dom/client'
import BudgetMaker from './BudgetMaker'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BudgetMaker />
  </React.StrictMode>
)