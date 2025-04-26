import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaMicrophoneAlt,
  FaMicrophoneAltSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import "./App.css";
import Meet from "./Pages/Meet";
import VideoChat from "./VideoChat";
import { io } from "socket.io-client";
import peerService from "./service/peerService";
import { MdCallEnd } from "react-icons/md";
import { generateRoomId } from "./service/roomDetails";

let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [socket, setSocket] = useState(null);
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [room, setRoom] = useState(null);
  const [iamthecaller, setIamthecaller] = useState(false);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(false);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(false);
  const [name, setName] = useState(null);
  const [remoteName, setRemoteName] = useState(null);

  const handleUserJoined = useCallback(
    (data) => {
      // console.log(`socket ${id} joined room`);
      setRemoteSocketId(data.id);
      socket.emit("caller:join:complete", {
        to: data.id,
        name, //this is my name (local)
      });
      setRemoteName(data.name);
    },
    [socket, name]
  );
  const handleMyJoining = useCallback(({ room, name }) => {
    console.log("i joined yoo");
    setRoom(room);
    setName(name);
  }, []);

  const handleILeft = useCallback(() => {
    setRoom(null);
  }, []);

  const roomNotFound = ({ message }) => window.alert(message);

  const handleAddCallerDetails = useCallback(({ id, name }) => {
    console.log("bro joined  ", name);
    setRemoteSocketId(id);
    setRemoteName(name);
  }, []);

  const handleCallUser = useCallback(async () => {
    setIamthecaller(true);
    console.log("signalling state => ", peerService.peer.signalingState);
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
    const offer = await peerService.getOffer();
    // console.log(`Making Call!!!! ====> mystream`, stream);
    setLocalVideoEnabled(true);

    socket.emit("user:call", { to: remoteSocketId, offer });
    setLocalStream(stream);
  }, [remoteSocketId, socket]);

  // run  by client 2
  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      // check if rtcpeerconnection is close
      console.log("signalling state", peerService.peer.signalingState);

      if (peerService.peer.signalingState === "closed") {
        // console.log("reinitiating connection");
        await peerService.restartConnection();
        // console.log("restarted connection", peerService.peer.connectionState);
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(stream);
      setLocalVideoEnabled(true);
      // console.log(`Incoming Call ====> mystream`, stream);
      const ans = await peerService.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback((stream) => {
    for (const track of stream.getTracks()) {
      // console.log("sending your streams", track);
      peerService.peer.addTrack(track, stream);
    }
  }, []);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peerService.setLocalDescription(ans);
      console.log("call accepted");
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

  const handleNegotiaitionNeeded = useCallback(async () => {
    const offer = await peerService.getOffer();
    console.log("im getting called");
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [socket, remoteSocketId]);

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

  const handleRemoteVideoStopped = () => {
    setRemoteVideoEnabled(false);
  };

  const handleRemoteVideoRestarted = () => {
    setRemoteVideoEnabled(true);
  };

  // remote audio event handlers

  const handleRemoteAudioStopped = () => {
    setRemoteAudioEnabled(false);
  };
  const handleRemoteAudioRestarted = () => {
    setRemoteAudioEnabled(true);
  };

  const gracefulCloseOfPeerConnection = async () => {
    let peer = peerService.peer;

    // Close each track
    peer.getTracks().forEach((track) => {
      track.stop();
    });

    // Remove all event listeners
    peer.ontrack = null;
    peer.onremovetrack = null;
    peer.onicecandidate = null;
    peer.oniceconnectionstatechange = null;
    peer.onsignalingstatechange = null;

    // Close the connection
    peer.close();

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

  // handling heartbreak
  const handleUserLeft = useCallback(async () => {
    setRemoteStream(null);
    setRemoteSocketId(null);
    setRemoteVideoEnabled(false);
    socket.emit("room:leave", { roomId: room });
    gracefulCloseOfPeerConnection();
    console.log("your mate left!!!!");
  }, [socket, room]);

  useEffect(() => {
    peerService.peer.addEventListener("track", async (event) => {
      const remoteStream = event.streams;
      setRemoteStream(remoteStream[0]);
      setRemoteVideoEnabled(true);
    });
  }, []);

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
  ]);

  const handleCreateRoom = useCallback(() => {
    const name = window.prompt("What shall we call you ?");
    setName(name);
    const roomId = generateRoomId(10);
    socket.emit("room:create", { name, room: roomId });
  }, [socket]);

  const handleJoinRoom = useCallback(() => {
    const name = window.prompt("What shall we call you ?");
    const roomId = window.prompt("Enter the room ID to join.");
    socket.emit("room:join", { name, room: roomId });
  }, [socket]);

  // handling video start stop
  const stopVideoStream = useCallback(
    (stream) => {
      socket.emit("my:video:stopped", { to: remoteSocketId });
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => (track.enabled = false));
      setLocalVideoEnabled(false);
    },
    [socket, remoteSocketId]
  );

  const startVideoStream = useCallback(
    (stream) => {
      socket.emit("my:video:restarted", { to: remoteSocketId });
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => (track.enabled = true));
      setLocalVideoEnabled(true);
    },
    [socket, remoteSocketId]
  );

  // handling audio start and stop
  const startAudioStream = useCallback(
    (stream) => {
      socket.emit("my:audio:restarted", { to: remoteSocketId });
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => (track.enabled = true));
      setLocalAudioEnabled(true);
    },
    [socket, remoteSocketId]
  );

  const stopAudioStream = useCallback(
    (stream) => {
      socket.emit("my:audio:stopped", { to: remoteSocketId });
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => (track.enabled = false));
      setLocalAudioEnabled(false);
    },
    [socket, remoteSocketId]
  );

  // handling manual disconnection by a user
  const handleEndCall = async () => {
    setRemoteStream(null);
    setRemoteSocketId(null);
    setRemoteVideoEnabled(false);
    setRemoteName(null);

    // console.log("hey");
    socket.emit("room:leave", { roomId: room });
    gracefulCloseOfPeerConnection();
  };

  return (
    <div className="w-screen ">
      <h1 className="mb-10">Welcome to UMeet</h1>
      <div className="m-auto w-9/12 flex flex-col">
        <VideoChat
          remoteVideoEnabled={remoteVideoEnabled}
          localVideoEnabled={localVideoEnabled}
          localAudioEnabled={localAudioEnabled}
          remoteAudioEnabled={remoteAudioEnabled}
          localStream={localStream}
          remoteStream={remoteStream}
          name={name}
          remoteName={remoteName}
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
        <h2>
          {remoteSocketId ? (
            <>
              Connected with:{" "}
              <span className="bg-green-600 p-1 rounded-md ">
                {remoteName || remoteSocketId}
              </span>
            </>
          ) : (
            ""
          )}
        </h2>
        <br />
        <div className="flex gap-3 items-center justify-center">
          {!remoteSocketId && !room ? (
            <>
              <button onClick={() => handleJoinRoom()}>Join Room</button>
              <button onClick={() => handleCreateRoom()}>Create Room</button>
            </>
          ) : (
            <>
              {!remoteStream ? (
                <button onClick={() => handleEndCall()}>Leave Room</button>
              ) : null}
            </>
          )}
        </div>
        <br />
        <div>
          {remoteSocketId && !remoteStream && (
            <button
              disabled={remoteStream && !iamthecaller}
              onClick={handleCallUser}
            >
              Start Call
            </button>
          )}
        </div>
        <section className="m-2 p-5 bg-gray-700 rounded-md flex items-center justify-between">
          <div>
            {remoteSocketId && localStream && (
              <div className="flex gap-x-3">
                <button
                  className={`${
                    localVideoEnabled ? "bg-blue-500" : "bg-red-500"
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
                    localAudioEnabled ? "bg-blue-500" : "bg-red-500"
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
            {remoteSocketId && remoteStream && (
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
