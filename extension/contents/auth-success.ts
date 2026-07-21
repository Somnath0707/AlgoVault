import type { PlasmoCSConfig } from "plasmo"
import { setJwtToken } from "../lib/storage"

export const config: PlasmoCSConfig = {
  matches: ["http://localhost:8080/api/auth/success*"],
  run_at: "document_end"
}

try {
  const bodyText = document.body.innerText.trim()
  const data = JSON.parse(bodyText)
  if (data.token) {
    setJwtToken(data.token).then(() => {
      document.body.innerHTML = `
        <div style="
          font-family: system-ui, sans-serif;
          text-align: center;
          margin-top: 100px;
          background: #09090b;
          color: #f4f4f5;
          padding: 40px;
          border-radius: 12px;
          border: 1px solid #27272a;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        ">
          <h2 style="color: #10b981; margin-bottom: 8px;">Login Successful!</h2>
          <p style="color: #a1a1aa; font-size: 14px;">AlgoVault Chrome Extension has been authenticated.</p>
          <p style="color: #71717a; font-size: 12px; margin-top: 20px;">You can now close this tab.</p>
        </div>
      `
    })
  }
} catch (e) {
  // Not on a JSON response page, or parsing failed - ignore
}
