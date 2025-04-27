export const localReducerActions = {
  setlocalSocketId: "SET_local_SOCKET_ID",
  setlocalStream: "SET_local_STREAM",
  setlocalVideoEnabled: "SET_local_VIDEO",
  setlocalAudioEnabled: "SET_local_AUDIO",
  setlocalName: "SET_local_NAME",
  setAllToDefault: "SET_ALL_TO_DEFAULT",
};

export const initialState = {
  localSocketId: null,
  localStream: null,
  localVideoEnabled: false,
  localAudioEnabled: false,
  localName: null,
};

export const localDataReducers = (state, action) => {
  console.log(state);
  switch (action.type) {
    case localReducerActions.setlocalSocketId:
      return { ...state, localSocketId: action.payload.value };
    case localReducerActions.setlocalStream:
      return { ...state, localStream: action.payload.value };
    case localReducerActions.setlocalVideoEnabled:
      return { ...state, localVideoEnabled: action.payload.value };
    case localReducerActions.setlocalAudioEnabled:
      return { ...state, localAudioEnabled: action.payload.value };
    case localReducerActions.setlocalName:
      return { ...state, localName: action.payload.value };
    case localReducerActions.setAllToDefault:
      return initialState;
  }
};
