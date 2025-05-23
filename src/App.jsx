import { useCallback, useContext, useEffect, useState } from "react";
import "./App.css";
import VideoChat from "./VideoChat";
import { connect, io } from "socket.io-client";
import peerService from "./service/peerService";
import { generateRoomId } from "./service/roomDetails";
import { RemoteContext } from "./Context/RemoteContext";
import { remoteReducerActions } from "./Context/RemoteReducers";
import { LocalContext } from "./Context/LocalContext";
import { localReducerActions } from "./Context/LocalReducers";
import {
  FaMicrophoneAlt,
  FaMicrophoneAltSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { MdCallEnd, MdPeopleAlt } from "react-icons/md";
import { gracefulCloseOfPeerConnection } from "./utils/closePeerConnection";
import Clock from "./Components/CurrentTime";
import Snackbar from "./Components/Snackbar";
import { IoChatboxEllipses } from "react-icons/io5";
import ChatBox from "./Components/ChatBox";
import { ChatContext } from "./Context/ChatContext";
import { chatReducerActions } from "./Context/ChatReducers";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

function App() {
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [showChatBox, setshowChatBox] = useState(false);
  const [connObj, setConnObjs] = useState([]);
  const [show, setShow] = useState(null);
  // connObjo = {
  //   peerObj,
  //   socketid: null,
  // }

  // remotedata context access
  const {
    remoteData: { remoteSocketIds, remoteStreams },
    remoteDataDispatch,
  } = useContext(RemoteContext);
  const {
    chatData: { unseenMessages },
    chatDataDispatch,
  } = useContext(ChatContext);

  // console.log(remoteSocketIds);

  // localdata context access
  const {
    localData: {
      localSocketId,
      localStream,
      localVideoEnabled,
      localAudioEnabled,
      localName,
    },
    localDataDispatch,
  } = useContext(LocalContext);
  const {
    addSocketsOfNewlyJoinedRoom,
    addRemoteSocketId,
    deleteRemoteSocketId,
    addRemoteStream,
    deleteRemoteStream,
    setAllToDefault,
    setRemoteVideoEnabled,
    setRemoteAudioEnabled,
  } = remoteReducerActions;

  const {
    setlocalName,
    setlocalAudioEnabled,
    setlocalVideoEnabled,
    setlocalStream,
    setlocalSocketId,
  } = localReducerActions;
  // console.log(remoteStreams);

  // >>> only called by existing members of the room
  const handleUserJoined = useCallback(
    (data) => {
      // console.log("new user joined :", data.name, " with id ", data.id);
      // console.log(`socket ${data.id} joined room`);
      remoteDataDispatch({
        type: addRemoteSocketId,
        payload: {
          id: data.id,
        },
      });

      socket.emit("caller:join:complete", {
        to: data.id,
        name: localName, //this is my localName (local)
      });

      // also make a peer for yourself
      const connection = {
        peerObj: new peerService(),
        socketid: data.id,
        name: data.name,
      };
      setConnObjs((connObj) => [...connObj, connection]);
      // remoteDataDispatch({
      //   type: setRemoteName,
      //   payload: { value: data.name },
      // });
    },
    [socket, localName, remoteDataDispatch, addRemoteSocketId]
    // add localname as dependency took 40 mins  to debug
  );

  // >>> every user calls this function when they join the room
  const handleMyJoining = useCallback(
    async ({ room, name, otherSockets }) => {
      // console.log("i joined yoo", otherSockets);

      // set local socket id
      localDataDispatch({
        type: setlocalSocketId,
        payload: {
          id: socket?.id,
        },
      });
      // if im the only one in the room just start my video stream
      if (otherSockets.length === 0) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });

        localDataDispatch({
          type: setlocalStream,
          payload: {
            value: stream,
          },
        });
        localDataDispatch({
          type: setlocalVideoEnabled,
          payload: {
            value: true,
          },
        });
      }

      setRoom(room);
      // if (otherSockets.length !== 0) {
      //   remoteDataDispatch({
      //     type: addSocketsOfNewlyJoinedRoom,
      //     payload: { ids: otherSockets },
      //   });
      // }
      localDataDispatch({
        type: setlocalName,
        payload: {
          value: name,
        },
      });
    },
    [
      setlocalName,
      localDataDispatch,
      setlocalStream,
      setlocalVideoEnabled,
      socket,
      setlocalSocketId,
    ]
  );

  const roomNotFound = useCallback(({ message }) => window.alert(message), []);

  const handleCallUser = useCallback(
    async (id, name) => {
      let connection = connObj.find((conn) => conn.socketid === id);
      // check if rtcpeerconnection is close
      if (connection?.peerObj?.peer?.signalingState === "closed") {
        // console.log("reinitiating connection");
        await connection.peerObj.restartConnection();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      localDataDispatch({
        type: setlocalStream,
        payload: {
          value: stream,
        },
      });
      localDataDispatch({
        type: setlocalVideoEnabled,
        payload: {
          value: true,
          id: stream.id,
        },
      });

      if (!connection) {
        connection = {
          peerObj: new peerService(),
          socketid: id,
          name: name,
        };
        setConnObjs((connObj) => [...connObj, connection]);
      }
      const offer = await connection.peerObj.getOffer();
      // console.log(`Making Call!!!! ====> mystream`, stream);

      socket.emit("user:call", {
        to: id,
        offer,
      });
    },
    [socket, setlocalStream, setlocalVideoEnabled, localDataDispatch, connObj]
  );

  const handleAddCallerDetails = useCallback(
    ({ id, name }) => {
      remoteDataDispatch({
        type: addRemoteSocketId,
        payload: {
          id: id,
        },
      });
      // console.log("oops receiving id", id);

      handleCallUser(id, name);
      // remoteDataDispatch({
      //   type: setRemoteName,
      //   payload: { value: name },
      // });
    },
    [addRemoteSocketId, remoteDataDispatch, handleCallUser]
  );

  // run  by client 2
  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      // check if rtcpeerconnection is close

      const connection = connObj.find(
        (connection) => connection.socketid === from
      );
      if (connection?.peerObj?.peer?.signalingState === "closed") {
        // console.log("reinitiating connection");
        await connection.peerObj.restartConnection();
      }

      // console.log(`Incoming Call ====> mystream`, stream);
      const ans = await connection?.peerObj?.getAnswer(offer);
      // console.log("getting offer", connObj);
      socket.emit("call:accepted", {
        to: from,
        ans,
      });
    },
    [socket, connObj]
  );

  const sendStreams = useCallback(
    (stream, to) => {
      for (const track of stream.getTracks()) {
        // console.log("sending your streams", track);
        const connection = connObj.find(
          (connection) => connection.socketid === to
        );

        const existing = connection?.peerObj?.peer
          .getSenders()
          .some((sender) => sender.track === track);
        if (!existing) {
          connection?.peerObj?.peer.addTrack(track, stream);
        }
      }
    },
    [connObj]
  );

  const handleCallAccepted = useCallback(
    async ({ ans, from }) => {
      const connection = connObj.find(
        (connection) => connection.socketid === from
      );

      await connection?.peerObj?.setIncomingDescription(ans);
      console.log("call accepted");
      // send to where it came from
      sendStreams(localStream, from);
    },
    [sendStreams, localStream, connObj]
  );

  // "peer:nego:needed"
  const handleNegoNeedIncoming = useCallback(
    async ({ from, offer }) => {
      const connection = connObj.find(
        (connection) => connection.socketid === from
      );
      console.log("nego incoming");
      const ans = await connection?.peerObj?.getAnswer(offer);
      socket.emit("peer:nego:done", {
        to: from,
        ans,
      });
    },
    [socket, connObj]
  );

  // here important change is to be made
  const handleNegotiaitionNeeded = useCallback(
    async (id) => {
      const connection = connObj.find(
        (connection) => connection.socketid === id
      );

      const offer = await connection?.peerObj?.getOffer();
      console.log("i need nego");
      socket.emit("peer:nego:needed", {
        offer,
        to: id,
      });
    },
    [socket, connObj]
  );

  // handling peer:nego:final
  const handleNegoNeedFinal = useCallback(
    async ({ ans, from }) => {
      const connection = connObj.find(
        (connection) => connection.socketid === from
      );
      console.log("nego final done");
      await connection?.peerObj?.setIncomingDescription(ans);

      socket.emit("ask:for:stream", {
        to: from,
      });
    },
    [socket, connObj]
  );
  const handleIncomingStreamRequest = useCallback(
    ({ from }) => {
      sendStreams(localStream, from);
      console.log("sending stream to", from);
    },
    [localStream, sendStreams]
  );

  // remote video event handlers

  const handleRemoteVideoStopped = useCallback(
    ({ from: id }) => {
      // console.log("remote video stopped", remoteStreams);
      const index = remoteStreams.findIndex((stream) => stream.socketid === id);
      if (index !== -1) {
        remoteDataDispatch({
          type: setRemoteVideoEnabled,
          payload: {
            value: false,
            id: remoteStreams[index].socketid,
          },
        });
      }
      // console.log("remote stream", remoteStreams);
    },
    [remoteDataDispatch, remoteStreams, setRemoteVideoEnabled]
  );

  const handleRemoteVideoRestarted = useCallback(
    ({ from: id }) => {
      const index = remoteStreams.findIndex((stream) => stream.socketid === id);
      // console.log("remote video started", remoteStreams);

      if (index !== -1) {
        remoteDataDispatch({
          type: setRemoteVideoEnabled,
          payload: {
            value: true,
            id: remoteStreams[index].socketid,
          },
        });
      }
    },
    [remoteDataDispatch, remoteStreams, setRemoteVideoEnabled]
  );

  // remote audio event handlers

  const handleRemoteAudioStopped = useCallback(
    ({ from: id }) => {
      // console.log("remote audio stopped");
      const index = remoteStreams.findIndex((stream) => stream.socketid === id);
      if (index !== -1) {
        remoteDataDispatch({
          type: setRemoteAudioEnabled,
          payload: {
            value: false,
            id: remoteStreams[index].socketid,
          },
        });
      }
    },
    [remoteDataDispatch, remoteStreams, setRemoteAudioEnabled]
  );
  const handleRemoteAudioRestarted = useCallback(
    ({ from: id }) => {
      // console.log("remote audio restarted");

      const index = remoteStreams.findIndex((stream) => stream.socketid === id);
      if (index !== -1) {
        remoteDataDispatch({
          type: setRemoteAudioEnabled,
          payload: {
            value: true,
            id: remoteStreams[index].socketid,
          },
        });
      }
    },
    [remoteDataDispatch, remoteStreams, setRemoteAudioEnabled]
  );

  // handle error message from socket server
  const handleErrorMessage = ({ message }) => {
    window.alert(message);
  };

  useEffect(() => {
    // console.log("connObj list is", connObj);
    connObj.map((connection) => {
      connection?.peerObj?.peer?.addEventListener("negotiationneeded", () =>
        handleNegotiaitionNeeded(connection.socketid)
      );
    });
    window.addEventListener("beforeunload", () => {
      if (room) {
        socket.emit("room:leave", { roomId: room }); // optional custom cleanup
      }
    });
    return () => {
      connObj.map((connection) => {
        connection?.peerObj?.peer?.removeEventListener(
          "negotiationneeded",
          () => handleNegotiaitionNeeded(connection.socketid)
        );
      });
      window.removeEventListener("beforeunload", () => {
        if (room) {
          socket.emit("room:leave", { roomId: room }); // optional custom cleanup
        }
      });
    };
  }, [handleNegotiaitionNeeded, socket, connObj, room]);

  // changes at signalling server
  // handling heartbreak
  const handleUserLeft = useCallback(
    async ({ id }) => {
      // get the stream using this socket id from param
      remoteDataDispatch({
        type: deleteRemoteSocketId,
        payload: {
          id: id,
        },
      });
      setShow(
        `${
          connObj.find((conn) => conn.socketid === id)?.name || "someone"
        } left`
      );

      remoteDataDispatch({
        type: deleteRemoteStream,
        payload: {
          id: id,
        },
      });
      // console.log(localStream, "my stream");
      // localDataDispatch({
      //   type: setAllToDefault,

      // })

      // socket.emit("room:leave", { roomId: room });
      const connection = connObj.find((conn) => conn.socketid === id);

      gracefulCloseOfPeerConnection(connection.peerObj.peer);
      // console.log("your mate left!!!!", id);
    },
    [deleteRemoteSocketId, remoteDataDispatch, deleteRemoteStream, connObj]
  );

  useEffect(() => {
    connObj.map((connection) => {
      connection?.peerObj?.peer.addEventListener("track", async (event) => {
        const remoteStreams = event.streams;
        // point to be checked the =>> remoteStreams[0]

        remoteDataDispatch({
          type: addRemoteStream,
          payload: {
            value: {
              obj: remoteStreams[0],
              socketid: connection.socketid,
              videoEnabled: true,
              audioEnabled: false,
            },
          },
        });
      });
    });
  }, [remoteStreams, addRemoteStream, remoteDataDispatch, connObj]);

  // handling manual disconnection by a user
  const handleEndCall = useCallback(async () => {
    remoteDataDispatch({
      type: setAllToDefault,
    });

    // console.log("hey");
    socket.emit("room:leave", {
      roomId: room,
    });
    connObj.map(({ peerObj }) => {
      gracefulCloseOfPeerConnection(peerObj.peer);
    });
  }, [remoteDataDispatch, socket, room, setAllToDefault, connObj]);

  // room:left event handler
  const handleILeft = useCallback(() => {
    setRoom(null);
  }, []);

  // chat functions
  const handleNewChatMessage = useCallback(
    async (data) => {
      chatDataDispatch({
        type: chatReducerActions.setNewMessage,
        payload: {
          name: data.name,
          socketid: data.from,
          message: data.message,
          isSeen: showChatBox,
          time: data.time,
        },
      });
    },
    [chatDataDispatch, showChatBox]
  );

  const handleChatBoxToggle = () => {
    if (!showChatBox) {
      chatDataDispatch({
        type: chatReducerActions.setAllMessagesSeen,
      });
    }
    setshowChatBox((value) => !value);
  };

  useEffect(() => {
    let newSocket = socket;

    if (!socket) {
      newSocket = io(SERVER_URL);
      setSocket(newSocket);
    }
    newSocket.on("disconnect");
    newSocket.on("error:message", handleErrorMessage);

    newSocket.on("user:joined", handleUserJoined);
    newSocket.on("room:notfound", roomNotFound);
    newSocket.on("room:join", handleMyJoining);
    newSocket.on("room:left", handleILeft);
    newSocket.on("incoming:call", handleIncomingCall);
    newSocket.on("call:accepted", handleCallAccepted);
    newSocket.on("peer:nego:needed", handleNegoNeedIncoming);
    newSocket.on("peer:nego:final", handleNegoNeedFinal);
    newSocket.on("caller:join:complete", handleAddCallerDetails);
    newSocket.on("user:left", handleUserLeft);
    newSocket.on("send:stream", handleIncomingStreamRequest);
    // video related events
    newSocket.on("remote:video:stopped", handleRemoteVideoStopped);
    newSocket.on("remote:video:restarted", handleRemoteVideoRestarted);
    // audio related events
    newSocket.on("remote:audio:restarted", handleRemoteAudioRestarted);
    newSocket.on("remote:audio:stopped", handleRemoteAudioStopped);

    // chat box
    newSocket.on("chat:new", handleNewChatMessage);

    return () => {
      newSocket.off("disconnect");
      newSocket.off("error:message", handleErrorMessage);

      newSocket.off("user:joined", handleUserJoined);
      newSocket.off("room:join", handleMyJoining);
      newSocket.off("room:notfound", roomNotFound);
      newSocket.off("room:left", handleILeft);
      newSocket.off("incoming:call", handleIncomingCall);
      newSocket.off("call:accepted", handleCallAccepted);
      newSocket.off("peer:nego:needed", handleNegoNeedIncoming);
      newSocket.off("peer:nego:final", handleNegoNeedFinal);
      newSocket.off("caller:join:complete", handleAddCallerDetails);
      newSocket.off("user:left", handleUserLeft);
      newSocket.off("send:stream", handleIncomingStreamRequest);
      // video related events
      newSocket.off("remote:video:stopped", handleRemoteVideoStopped);
      newSocket.off("remote:video:restarted", handleRemoteVideoRestarted);
      // audio related events
      newSocket.off("remote:audio:restarted", handleRemoteAudioRestarted);
      newSocket.off("remote:audio:stopped", handleRemoteAudioStopped);
      // chat box
      newSocket.off("chat:new", handleNewChatMessage);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleCallUser,
    handleNegoNeedFinal,
    handleNegoNeedIncoming,
    handleAddCallerDetails,
    handleUserLeft,
    handleILeft,
    handleMyJoining,
    roomNotFound,
    handleRemoteVideoStopped,
    handleRemoteVideoRestarted,
    handleRemoteAudioStopped,
    handleRemoteAudioRestarted,
    handleIncomingStreamRequest,
    handleNegotiaitionNeeded,
    localDataDispatch,
    setlocalSocketId,
    handleNewChatMessage,
  ]);

  const handleCreateRoom = useCallback(() => {
    const name = window.prompt("What shall we call you ?");
    localDataDispatch({
      type: setlocalName,
      payload: {
        value: name,
      },
    });

    const roomId = generateRoomId(10);
    socket.emit("room:create", {
      name,
      room: roomId,
    });
  }, [socket, setlocalName, localDataDispatch]);

  const handleJoinRoom = useCallback(() => {
    const name = window.prompt("What shall we call you ?");
    const roomId = window.prompt("Enter the room ID to join.");
    socket.emit("room:join", {
      name,
      room: roomId,
    });
  }, [socket]);

  // handling video start stop
  const stopVideoStream = useCallback(
    (stream) => {
      socket.emit("my:video:stopped", {
        room: room,
      });
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => (track.enabled = false));

      localDataDispatch({
        type: setlocalVideoEnabled,
        payload: {
          value: false,
        },
      });
    },
    [socket, room, setlocalVideoEnabled, localDataDispatch]
  );

  const startVideoStream = useCallback(
    (stream) => {
      socket.emit("my:video:restarted", {
        room: room,
      });
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => (track.enabled = true));
      localDataDispatch({
        type: setlocalVideoEnabled,
        payload: {
          value: true,
        },
      });
    },
    [socket, room, setlocalVideoEnabled, localDataDispatch]
  );

  // handling audio start and stop
  const startAudioStream = useCallback(
    (stream) => {
      socket.emit("my:audio:restarted", {
        room: room,
      });
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => (track.enabled = true));

      localDataDispatch({
        type: setlocalAudioEnabled,
        payload: {
          value: true,
        },
      });
    },
    [socket, room, setlocalAudioEnabled, localDataDispatch]
  );

  const stopAudioStream = useCallback(
    (stream) => {
      socket.emit("my:audio:stopped", {
        room: room,
      });
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => (track.enabled = false));

      localDataDispatch({
        type: setlocalAudioEnabled,
        payload: {
          value: false,
        },
      });
    },
    [socket, room, setlocalAudioEnabled, localDataDispatch]
  );

  return (
    <div className=" flex w-screen overflow-x-hidden h-screen  flex-col items-center  bg-gray-950 text-white">
      <h1 className="m-5 text-3xl lg:text-5xl">Welcome to UMeet</h1>
      <p className="text-sm lg:text-lg">
        ©️Developed and Maintained by Aman James
      </p>
      <div className="m-auto w-3/4 flex flex-col">
        <div className="py-5 text-lg mb-5">
          {room ? (
            <>
              <p className="text-green-500">Joined Room {room}</p>
            </>
          ) : (
            <p className="text-red-500 ">Not connected to any room</p>
          )}
        </div>
        <VideoChat connObj={connObj} />
        <br />
        <div className="flex gap-3 items-center justify-center mb-16">
          {remoteSocketIds.length === 0 && !room && (
            <>
              <button onClick={() => handleJoinRoom()}>Join Room</button>
              <button onClick={() => handleCreateRoom()}>Create Room</button>
            </>
          )}
        </div>

        <section
          className={`fixed  bottom-5 left-1/2 transform -translate-x-1/2 rounded-md
             text-white px-6 py-2 grid grid-cols-2 md:grid-cols-3  items-center shadow-lg
             justify-center z-20 bg-gray-700 w-3/4 ${
               localStream ? "" : "hidden"
             }`}
        >
          <div className="text-slate-950  hidden md:flex ">
            <Clock /> | {room}
          </div>
          <div className="md:m-auto ">
            <div className="flex gap-x-3">
              <button
                className={`${
                  localVideoEnabled ? "bg-gray-900" : "bg-red-400 text-black"
                } border-none outline-none text-white`}
                onClick={() =>
                  localVideoEnabled
                    ? stopVideoStream(localStream)
                    : startVideoStream(localStream)
                }
              >
                {localVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
              </button>
              <button
                className={`${
                  localAudioEnabled ? "bg-gray-900" : "bg-red-400 text-black"
                } border-none outline-none text-white`}
                onClick={() =>
                  localAudioEnabled
                    ? stopAudioStream(localStream)
                    : startAudioStream(localStream)
                }
              >
                {localAudioEnabled ? (
                  <FaMicrophoneAlt />
                ) : (
                  <FaMicrophoneAltSlash />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-x-5  items-center justify-end">
            <span className="relative flex items-center justify-center">
              <MdPeopleAlt className="text-3xl text-black" />

              <span
                className="absolute  bg-gray-900 -top-2 -right-2 text-red-500 text-sm p-3 font-bold w-4 h-4
               flex items-center justify-center rounded-full"
              >
                {remoteSocketIds?.length + 1 || ""}
              </span>
            </span>

            <span
              onClick={handleChatBoxToggle}
              className="relative cursor-pointer flex items-center justify-center"
            >
              <IoChatboxEllipses
                className={`text-3xl ${
                  !showChatBox ? "text-gray-900" : "text-white"
                }`}
              />
              <span
                className={`absolute  ${
                  !showChatBox
                    ? "text-red-500 bg-white"
                    : "bg-gray-900 text-white"
                } ${
                  unseenMessages === 0 && "hidden"
                } -top-2 -right-2 text-sm p-3 font-bold w-4 h-4
               flex items-center justify-center rounded-full`}
              >
                {unseenMessages !== 0 ? unseenMessages : ""}
              </span>
            </span>
            <button
              className={"bg-red-600 text-white"}
              onClick={() => handleEndCall()}
            >
              <MdCallEnd />
            </button>
          </div>
        </section>
        <br />
      </div>

      {/* misselaneous elements  */}
      {/* snackbar  */}
      <Snackbar visible={show} onClose={() => setShow(null)} message={show} />
      {/* chat box  */}
      {showChatBox && (
        <ChatBox
          socketInstance={socket}
          room={room}
          onClose={handleChatBoxToggle}
        />
      )}
    </div>
  );
}

export default App;
