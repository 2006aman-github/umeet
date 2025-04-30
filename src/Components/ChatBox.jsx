import React, { useCallback, useContext, useState } from "react";
import { ChatContext, ChatContextProvider } from "../Context/ChatContext";
import Message from "./Message";
import { LocalContext } from "../Context/LocalContext";
import { IoClose } from "react-icons/io5";

function ChatBox({ socketInstance, room, onClose }) {
  const { chatData } = useContext(ChatContext);
  const {
    localData: { localName },
  } = useContext(LocalContext);
  const [text, setText] = useState("");
  const {
    localData: { localSocketId },
  } = useContext(LocalContext);

  const handleSend = useCallback(() => {
    const now = new Date();
    const formatted = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    socketInstance?.emit("chat:send", {
      message: text,
      name: localName,
      room,
      time: formatted,
    });
    setText("");
  }, [socketInstance, localName, text, room]);
  return (
    <div
      className="absolute h-3/4 w-96 z-50 bottom-20 
    right-10 bg-gray-800 text-white flex flex-col rounded-md overflow-hidden"
    >
      <span className="flex shadow-lg justify-between items-center  rounded-md p-4 ">
        <span>In-Call Messages</span>
        <span
          onClick={onClose}
          className="hover:bg-gray-900 rounded-full p-2 cursor-pointer"
        >
          <IoClose className=" text-2xl" />
        </span>
      </span>
      <section className="flex-1 overflow-y-auto p-4 ">
        <div className="flex flex-col ">
          {chatData?.messages.map((message, index) => {
            const isSender = message.socketid === localSocketId;

            return (
              <Message
                key={index}
                isSender={isSender}
                message={message.message}
                name={message.name}
                time={message.time}
              />
            );
          })}
        </div>
      </section>
      <div className="flex items-center p-2 border-t ">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border text-gray-900 rounded-md focus:outline-none
           focus:ring focus:ring-blue-400"
        />
        <button
          onClick={handleSend}
          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatBox;
