import { createContext, useReducer } from "react";

import ChatReducers from "./ChatReducers";

export const ChatContext = createContext();

export const ChatContextProvider = ({ children }) => {
  const [chatData, chatDataDispatch] = useReducer(ChatReducers, {
    open: false,
    messages: [],
    unseenMessages: 0,
  });
  return (
    <ChatContext.Provider value={{ chatData, chatDataDispatch }}>
      {children}
    </ChatContext.Provider>
  );
};
