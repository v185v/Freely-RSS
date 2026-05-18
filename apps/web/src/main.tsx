import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { WebApp } from "./web-app"
import "./styles.css"

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <WebApp />
  </StrictMode>,
)
