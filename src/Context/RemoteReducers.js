export const remoteReducerActions = {
  addRemoteSocketId: "ADD_REMOTE_SOCKET_ID",
  addSocketsOfNewlyJoinedRoom: "ADD_SOCKETS_OF_NEWLY_JOINED_ROOM",
  deleteRemoteSocketId: "DELETE_REMOTE_SOCKET_ID",
  addRemoteStream: "ADD_REMOTE_STREAM",
  deleteRemoteStream: "SET_REMOTE_STREAM",
  setAllToDefault: "SET_ALL_TO_DEFAULT",
  setRemoteVideoEnabled: "SET_REMOTE_VIDEO",
  setRemoteAudioEnabled: "SET_REMOTE_AUDIO",
};

export const remoteInitialState = {
  remoteSocketIds: [],
  remoteStreams: [],
  remoteName: null,
};

export const remoteDataReducers = (state, action) => {
  // console.log(action.type, "action type in reducer");
  switch (action.type) {
    // add and remove socket id
    case remoteReducerActions.addSocketsOfNewlyJoinedRoom: {
      console.log("add socket ids", action.payload.ids);
      return {
        ...state,
        remoteSocketIds: [...state.remoteSocketIds, ...action.payload.ids],
      };
    }
    case remoteReducerActions.addRemoteSocketId:
      // console.log("add remote socket id", action.payload.id);
      return {
        ...state,
        remoteSocketIds: [...state.remoteSocketIds, action.payload.id],
      };
    case remoteReducerActions.deleteRemoteSocketId: {
      let localState = state;
      let index = localState.remoteSocketIds.findIndex(
        (socketId) => socketId === action.payload.id
      );
      // console.log(
      //   "im called to delete remote socket id",
      //   localState.remoteSocketIds
      // );
      if (index !== -1) {
        localState.remoteSocketIds.splice(index, 1);
      } else {
        console.error("Socket ID not found in remote socket IDs.");
      }
      return { ...state, remoteSocketIds: localState.remoteSocketIds };
    }

    // add and remove streams
    case remoteReducerActions.addRemoteStream:
      {
        // check if socketid already exists
        let localState = state;
        if (!action.payload.value.socketid) {
          return state; // No changes made to state
        } else if (
          localState.remoteStreams.some(
            (stream) => stream.socketid === action.payload.value.socketid
          )
        ) {
          // console.log("Stream already exists in remote streams");
          return state; // No changes made to state
        }
      }
      return {
        ...state,
        remoteStreams: [...state.remoteStreams, action.payload.value],
      };
    case remoteReducerActions.deleteRemoteStream: {
      // expecting value containing stream obj
      let updatedState = {
        ...state,
        remoteStreams: state.remoteStreams.filter(
          (stream) => stream.socketid !== action.payload.id
        ),
      };
      // console.log("updated state", action.payload.id);
      return updatedState;
    }

    // video audio states
    case remoteReducerActions.setRemoteVideoEnabled: {
      let updatedStreams = state.remoteStreams;
      let index = updatedStreams.findIndex(
        (stream) => stream.socketid === action.payload.id
      );
      if (index !== -1) {
        updatedStreams.splice(index, 1, {
          ...updatedStreams[index],
          videoEnabled: action.payload.value,
        });
      } else {
        console.error("Stream not found in remote streams.");
      }

      // console.log("remote", localState);
      return { ...state, remoteStreams: updatedStreams };
    }
    case remoteReducerActions.setRemoteAudioEnabled: {
      let updatedStreams = state.remoteStreams;

      let index = updatedStreams.findIndex(
        (stream) => stream.socketid === action.payload.id
      );
      if (index !== -1) {
        updatedStreams.splice(index, 1, {
          ...updatedStreams[index],
          audioEnabled: action.payload.value,
        });
      } else {
        console.error("Stream not found in remote streams.");
      }
      return { ...state, remoteStreams: updatedStreams };
    }

    case remoteReducerActions.setAllToDefault:
      return remoteInitialState;
  }
};
