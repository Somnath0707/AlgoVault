import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  if (req.body?.action === "open_side_panel") {
    const senderTabId = req.sender?.tab?.id;
    if (senderTabId) {
      // Open the side panel for the current tab
      chrome.sidePanel.open({ tabId: senderTabId });
      res.send({ status: "success" });
    } else {
      res.send({ error: "No tab ID" });
    }
  }
}

export default handler
