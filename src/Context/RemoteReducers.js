export const remoteReducerActions = {
  setRemoteSocketId: "SET_REMOTE_SOCKET_ID",
  setRemoteStream: "SET_REMOTE_STREAM",
  setRemoteVideoEnabled: "SET_REMOTE_VIDEO",
  setRemoteAudioEnabled: "SET_REMOTE_AUDIO",
  setRemoteName: "SET_REMOTE_NAME",
  setAllToDefault: "SET_ALL_TO_DEFAULT",
};

export const initialState = {
  remoteSocketId: null,
  remoteStream: null,
  remoteVideoEnabled: false,
  remoteAudioEnabled: false,
  remoteName: null,
};

export const remoteDataReducers = (state, action) => {
  switch (action.type) {
    case remoteReducerActions.setRemoteSocketId:
      return { ...state, remoteSocketId: action.payload.value };
    case remoteReducerActions.setRemoteStream:
      return { ...state, remoteStream: action.payload.value };
    case remoteReducerActions.setRemoteVideoEnabled:
      return { ...state, remoteVideoEnabled: action.payload.value };
    case remoteReducerActions.setRemoteAudioEnabled:
      return { ...state, remoteAudioEnabled: action.payload.value };
    case remoteReducerActions.setRemoteName:
      return { ...state, remoteName: action.payload.value };
    case remoteReducerActions.setAllToDefault:
      return initialState;
  }
};
