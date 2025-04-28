import { useCallback, useContext, useEffect, useState } from "react";
import "./App.css";
import VideoChat from "./VideoChat";
import { io } from "socket.io-client";
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
import { MdCallEnd } from "react-icons/md";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

function App() {
  const [socket, setSocket] = useState(null);

  const [room, setRoom] = useState(null);
  const [iamthecaller, setIamthecaller] = useState(false);
  const [incomingSocketId, setIncomingSocketId] = useState(null);

  // remotedata context access
  const {
    remoteData: { remoteSocketIds, remoteStreams },
    remoteDataDispatch,
  } = useContext(RemoteContext);
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
  } = localReducerActions;

  const handleUserJoined = useCallback(
    (data) => {
      // console.log("new user joined :", data.name, " with id ", data.id);
      // console.log(`socket ${data.id} joined room`);
      remoteDataDispatch({
        type: addRemoteSocketId,
        payload: { id: data.id },
      });
      setIncomingSocketId(data.id);
      socket.emit("caller:join:complete", {
        to: data.id,
        name: localName, //this is my localName (local)
      });
      // remoteDataDispatch({
      //   type: setRemoteName,
      //   payload: { value: data.name },
      // });
    },
    [socket, localName, remoteDataDispatch, addRemoteSocketId]
    // add localname as dependency took 40 mins  to debug
  );
  const handleMyJoining = useCallback(
    ({ room, name, otherSockets }) => {
      // othersockets are being sent but of no use
      // console.log("i joined yoo", otherSockets);
      setRoom(room);
      // if (otherSockets.length !== 0) {
      //   remoteDataDispatch({
      //     type: addSocketsOfNewlyJoinedRoom,
      //     payload: { ids: otherSockets },
      //   });
      // }
      localDataDispatch({ type: setlocalName, payload: { value: name } });
    },
    [setlocalName, localDataDispatch]
  );

  const handleILeft = useCallback(() => {
    setRoom(null);
  }, []);

  const roomNotFound = useCallback(({ message }) => window.alert(message), []);

  const handleAddCallerDetails = useCallback(
    ({ id, name }) => {
      remoteDataDispatch({
        type: addRemoteSocketId,
        payload: { id: id },
      });

      setIncomingSocketId(id);
      // remoteDataDispatch({
      //   type: setRemoteName,
      //   payload: { value: name },
      // });
    },
    [addRemoteSocketId, remoteDataDispatch]
  );

  const handleCallUser = useCallback(async () => {
    setIamthecaller(true);
    // console.log("signalling state => ", peerService.peer.signalingState);
    // await localStream?.getTracks().forEach((track) => track.stop());
    // check if rtcpeerconnection is close
    if (peerService.peer.signalingState === "closed") {
      // console.log("reinitiating connection");
      peerService.peer.signalingState;
      await peerService.restartConnection();
      // console.log("restarted connection", peerService.peer.connectionState);
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    // make a call to all people inside room

    const offer = await peerService.getOffer();
    // console.log(`Making Call!!!! ====> mystream`, stream);

    localDataDispatch({
      type: setlocalVideoEnabled,
      payload: { value: true, id: stream.id },
    });

    socket.emit("user:call", { to: incomingSocketId, offer });

    localDataDispatch({ type: setlocalStream, payload: { value: stream } });
  }, [
    incomingSocketId,
    socket,
    setlocalStream,
    setlocalVideoEnabled,
    localDataDispatch,
  ]);

  // run  by client 2
  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      // check if rtcpeerconnection is close
      // console.log("signalling state", peerService.peer.signalingState);

      if (peerService.peer.signalingState === "closed") {
        // console.log("reinitiating connection");
        await peerService.restartConnection();
        // console.log("restarted connection", peerService.peer.connectionState);
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      localDataDispatch({ type: setlocalStream, payload: { value: stream } });

      localDataDispatch({
        type: setlocalVideoEnabled,
        payload: { value: true },
      });

      // console.log(`Incoming Call ====> mystream`, stream);
      const ans = await peerService.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket, setlocalStream, setlocalVideoEnabled, localDataDispatch]
  );

  const sendStreams = useCallback((stream) => {
    for (const track of stream.getTracks()) {
      // console.log("sending your streams", track);
      peerService.peer.addTrack(track, stream);
    }
  }, []);

  const handleCallAccepted = useCallback(
    ({ ans }) => {
      peerService.setLocalDescription(ans);
      // console.log("call accepted");
      sendStreams(localStream);
    },
    [sendStreams, localStream]
  );

  // "peer:nego:needed"
  const handleNegoNeedIncoming = useCallback(
    async ({ from, offer }) => {
      const ans = await peerService.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  // here important change is to be made
  const handleNegotiaitionNeeded = useCallback(async () => {
    const offer = await peerService.getOffer();
    // console.log("im getting called");
    socket.emit("peer:nego:needed", { offer, to: incomingSocketId });
  }, [socket, incomingSocketId]);

  // handling peer:nego:final
  const handleNegoNeedFinal = useCallback(
    async ({ ans, from }) => {
      await peerService.setLocalDescription(ans);
      if (iamthecaller) {
        socket.emit("ask:for:stream", { to: from });
      }
    },
    [socket, iamthecaller]
  );
  const handleIncomingStreamRequest = useCallback(() => {
    sendStreams(localStream);
  }, [localStream, sendStreams]);

  // remote video event handlers

  const handleRemoteVideoStopped = useCallback(
    ({ from: id }) => {
      // console.log("remote video stopped", remoteStreams);
      const index = remoteStreams.findIndex((stream) => stream.socketid === id);
      if (index !== -1) {
        remoteDataDispatch({
          type: setRemoteVideoEnabled,
          payload: { value: false, id: remoteStreams[index].socketid },
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
          payload: { value: true, id: remoteStreams[index].socketid },
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
          payload: { value: false, id: remoteStreams[index].scoketid },
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
          payload: { value: true, id: remoteStreams[index].socketid },
        });
      }
    },
    [remoteDataDispatch, remoteStreams, setRemoteAudioEnabled]
  );

  const gracefulCloseOfPeerConnection = async () => {
    let peer = peerService.peer;
    if (!peer) return;
    // Close each track
    peer?.getTracks().forEach((track) => {
      track.stop();
    });

    // Remove all event listeners
    peer.ontrack = null;
    peer.onremovetrack = null;
    peer.onicecandidate = null;
    peer.oniceconnectionstatechange = null;
    peer.onsignalingstatechange = null;

    // Close the connection
    peer?.close();

    peer = null;
  };

  // handle error message from socket server
  const handleErrorMessage = ({ message }) => {
    window.alert(message);
  };

  useEffect(() => {
    peerService.peer.addEventListener(
      "negotiationneeded",
      handleNegotiaitionNeeded
    );
    return () => {
      peerService.peer.removeEventListener(
        "negotiationneeded",
        handleNegotiaitionNeeded
      );
    };
  }, [handleNegotiaitionNeeded, socket]);

  // changes at signalling server
  // handling heartbreak
  const handleUserLeft = useCallback(
    async ({ id }) => {
      // get the stream using this socket id from param
      remoteDataDispatch({
        type: deleteRemoteSocketId,
        payload: { id: id },
      });
      const index = remoteStreams.findIndex((stream) => stream.socketid === id);
      if (index !== -1) {
        remoteDataDispatch({
          type: deleteRemoteStream,
          payload: { value: remoteStreams[index].obj },
        });
      }

      // socket.emit("room:leave", { roomId: room });
      gracefulCloseOfPeerConnection();
      // console.log("your mate left!!!!", id);
    },
    [
      deleteRemoteSocketId,
      remoteDataDispatch,
      deleteRemoteStream,
      remoteStreams,
    ]
  );

  useEffect(() => {
    peerService.peer.addEventListener("track", async (event) => {
      const remoteStreams = event.streams;
      // point to be checked the =>> remoteStreams[0]
      // console.log("incoming socket id saved as", incomingSocketId);
      remoteDataDispatch({
        type: addRemoteStream,
        payload: {
          value: {
            obj: remoteStreams[0],
            socketid: incomingSocketId,
            videoEnabled: true,
            audioEnabled: false,
          },
        },
      });
    });
  }, [incomingSocketId, remoteStreams, addRemoteStream, remoteDataDispatch]);

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
  ]);

  const handleCreateRoom = useCallback(() => {
    const name = window.prompt("What shall we call you ?");
    localDataDispatch({ type: setlocalName, payload: { value: name } });

    const roomId = generateRoomId(10);
    socket.emit("room:create", { name, room: roomId });
  }, [socket, setlocalName, localDataDispatch]);

  const handleJoinRoom = useCallback(() => {
    const name = window.prompt("What shall we call you ?");
    const roomId = window.prompt("Enter the room ID to join.");
    socket.emit("room:join", { name, room: roomId });
  }, [socket]);

  // handling video start stop
  const stopVideoStream = useCallback(
    (stream) => {
      socket.emit("my:video:stopped", { room: room });
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => (track.enabled = false));

      localDataDispatch({
        type: setlocalVideoEnabled,
        payload: { value: false },
      });
    },
    [socket, room, setlocalVideoEnabled, localDataDispatch]
  );

  const startVideoStream = useCallback(
    (stream) => {
      socket.emit("my:video:restarted", { room: room });
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => (track.enabled = true));
      localDataDispatch({
        type: setlocalVideoEnabled,
        payload: { value: true },
      });
    },
    [socket, room, setlocalVideoEnabled, localDataDispatch]
  );

  // handling audio start and stop
  const startAudioStream = useCallback(
    (stream) => {
      socket.emit("my:audio:restarted", { room: room });
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => (track.enabled = true));

      localDataDispatch({
        type: setlocalAudioEnabled,
        payload: { value: true },
      });
    },
    [socket, room, setlocalAudioEnabled, localDataDispatch]
  );

  const stopAudioStream = useCallback(
    (stream) => {
      socket.emit("my:audio:stopped", { room: room });
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => (track.enabled = false));

      localDataDispatch({
        type: setlocalAudioEnabled,
        payload: { value: false },
      });
    },
    [socket, room, setlocalAudioEnabled, localDataDispatch]
  );

  // handling manual disconnection by a user
  const handleEndCall = useCallback(async () => {
    remoteDataDispatch({
      type: setAllToDefault,
    });

    // console.log("hey");
    socket.emit("room:leave", { roomId: room });
    gracefulCloseOfPeerConnection();
  }, [remoteDataDispatch, socket, room, setAllToDefault]);

  return (
    <div className="w-screen ">
      <h1 className="mb-10">Welcome to UMeet</h1>
      <div className="m-auto w-9/12 flex flex-col">
        <VideoChat
          localVideoEnabled={localVideoEnabled}
          localAudioEnabled={localAudioEnabled}
          localStream={localStream}
          name={localName}
        />
        <br />
        <div className="py-5 uppercase">
          {room ? (
            <>
              <p className="text-green-500">Joined room {room}</p>
            </>
          ) : (
            <p className="text-red-500 ">Not connected to any room</p>
          )}
        </div>

        <br />
        <div className="flex gap-3 items-center justify-center">
          {remoteSocketIds.length === 0 && !room ? (
            <>
              <button onClick={() => handleJoinRoom()}>Join Room</button>
              <button onClick={() => handleCreateRoom()}>Create Room</button>
            </>
          ) : (
            <>
              {/* point to be checked  */}
              <button onClick={() => handleEndCall()}>Leave Room</button>
            </>
          )}
        </div>
        <br />
        <div>
          {incomingSocketId && remoteStreams.length === 0 && (
            <button
              disabled={remoteStreams.length !== 0 && !iamthecaller}
              onClick={handleCallUser}
            >
              Start Call
            </button>
          )}
        </div>
        <section className="m-2 p-5 bg-gray-700 rounded-md flex items-center justify-between">
          <div>
            {incomingSocketId && localStream && (
              <div className="flex gap-x-3">
                <button
                  className={`${
                    localVideoEnabled ? "bg-gray-900" : "bg-red-400"
                  } border-none outline-none`}
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
                    localAudioEnabled ? "bg-gray-900" : "bg-red-400"
                  } border-none outline-none`}
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
            )}
          </div>
          <div>
            {incomingSocketId && remoteStreams && (
              <button className={"bg-red-500"} onClick={() => handleEndCall()}>
                <MdCallEnd />
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
