import React from "react";

function Message({ message, name, isSender, time }) {
  return (
    <div className={`grid grid-cols-2 overflow-y-auto  my-2 flex-1  `}>
      <div
        className={`flex  flex-col col-span-1 ${
          isSender ? "col-start-2  justify-end items-end" : "col-start-1 "
        }`}
      >
        {!isSender && (
          <div className="text-sm tracking-wider font-thin text-white mb-1 ml-1 text-left">
            {name}
          </div>
        )}
        <div
          className={`max-w-xs text-left px-2 py-2 rounded-lg w-fit shadow text-md ${
            isSender
              ? "bg-blue-600 text-white rounded-br-none"
              : "bg-gray-950 text-white rounded-bl-none"
          }`}
        >
          {message}
        </div>
        <span className="text-left text-xs tracking-widest">{time}</span>
      </div>
    </div>
  );
}

export default Message;
