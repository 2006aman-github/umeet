import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
const SERVER_URL = "http://192.168.29.194:8181";

function Meet() {
  const [Socket, setSocket] = useState(null);
  const [message, setMessage] = useState(null);
  useEffect(() => {
    // Initialize the Socket.IO client
    // fetch(SERVER_URL + "/test")
    //   .then((res) => res.json())
    //   .then((data) => setMessage(data.message));
    // const newSocket = io(SERVER_URL);
    // setSocket(newSocket);
  }, []);
  return (
    <div>
      <div className="bg-red-500">{message || "no message"}</div>
    </div>
  );
}

export default Meet;
