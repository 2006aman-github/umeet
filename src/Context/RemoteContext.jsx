import { createContext, useReducer } from "react";
import { initialState, remoteDataReducers } from "./RemoteReducers";

export const RemoteContext = createContext();

export const RemoteContextProvider = ({ children }) => {
  const [remoteData, remoteDataDispatch] = useReducer(
    remoteDataReducers,
    initialState
  );
  return (
    <RemoteContext.Provider value={{ remoteData, remoteDataDispatch }}>
      {children}
    </RemoteContext.Provider>
  );
};
