import { createContext, useReducer } from "react";
import { remoteInitialState, remoteDataReducers } from "./RemoteReducers";

export const RemoteContext = createContext();

export const RemoteContextProvider = ({ children }) => {
  const [remoteData, remoteDataDispatch] = useReducer(
    remoteDataReducers,
    remoteInitialState
  );
  // console.log("RemoteContextProvider", remoteData);
  return (
    <RemoteContext.Provider value={{ remoteData, remoteDataDispatch }}>
      {children}
    </RemoteContext.Provider>
  );
};
