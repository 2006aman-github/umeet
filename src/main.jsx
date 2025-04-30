import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { RemoteContextProvider } from "./Context/RemoteContext.jsx";
import { LocalContextProvider } from "./Context/LocalContext.jsx";
import { ChatContextProvider } from "./Context/ChatContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RemoteContextProvider>
      <LocalContextProvider>
        <ChatContextProvider>
          <App />
        </ChatContextProvider>
      </LocalContextProvider>
    </RemoteContextProvider>
  </StrictMode>
);
