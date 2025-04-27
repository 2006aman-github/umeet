import { createContext, useReducer } from "react";
import { initialState, localDataReducers } from "./LocalReducers";

export const LocalContext = createContext();

export const LocalContextProvider = ({ children }) => {
  const [localData, localDataDispatch] = useReducer(
    localDataReducers,
    initialState
  );
  return (
    <LocalContext.Provider value={{ localData, localDataDispatch }}>
      {children}
    </LocalContext.Provider>
  );
};
