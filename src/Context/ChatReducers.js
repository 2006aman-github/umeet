export const chatReducerActions = {
  setNewMessage: "NEW_MESSAGE",
  setAllMessagesSeen: "SET_ALL_MESSAGES_SEEN",
};

const ChatReducers = (state, action) => {
  switch (action.type) {
    case chatReducerActions.setNewMessage: {
      let unseen = 0;
      state.messages.map((mess) => mess.isSeen === false && unseen++);
      !action.payload.isSeen && unseen++;
      return {
        ...state,
        messages: [...state.messages, action.payload],
        unseenMessages: unseen,
      };
    }
    case chatReducerActions.setAllMessagesSeen: {
      let modifiedmessages = state.messages.map((mess) => {
        return { ...mess, isSeen: false };
      });
      return {
        ...state,
        unseenMessages: 0,
        messages: modifiedmessages,
      };
    }

    default:
      return state;
  }
};

export default ChatReducers;
