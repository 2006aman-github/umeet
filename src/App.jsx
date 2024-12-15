import { useCallback, useEffect, useRef, useState } from "react";

import "./App.css";
import Meet from "./Pages/Meet";
import VideoChat from "./VideoChat";
import { io } from "socket.io-client";
import peerService from "./service/peerService";

let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const SERVER_URL = "http://192.168.29.194:8181";

function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [socket, setSocket] = useState(null);
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [email, setEmail] = useState("amanjames122@gmail.com");
  const [room, setRoom] = useState("asdlsa21");
  const [iamthecaller, setIamthecaller] = useState(false);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);

  const handleUserJoined = useCallback(
    ({ id }) => {
      // console.log(`socket ${id} joined room`);
      setRemoteSocketId(id);
      socket.emit("caller:join:complete", { to: id });
    },
    [socket]
  );

  const handleAddCallerSocketId = useCallback(({ id }) => {
    // console.log("works!!!!");
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    setIamthecaller(true);
    console.log("clicked start call");
    // await localStream?.getTracks().forEach((track) => track.stop());
    // check if rtcpeerconnection is close
    if (peerService.peer.connectionState === "closed") {
      // console.log("reinitiating connection");
      await peerService.peer.restartIce();
    }
    console.log(peerService.peer.connectionState, "rtcpeerconnection state");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
    const offer = await peerService.getOffer();
    // console.log(`Making Call!!!! ====> mystream`, stream);
    setLocalVideoEnabled(true);

    socket.emit("user:call", { to: remoteSocketId, offer });
    setLocalStream(stream);
  }, [remoteSocketId, socket, localStream]);

  // run  by client 2
  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      // check if rtcpeerconnection is close
      if (peerService.peer.connectionState === "closed") {
        // console.log("reinitiating connection");

        await peerService.peer.restartIce();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
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

  const handleNegotiaitionNeeded = useCallback(async () => {
    const offer = await peerService.getOffer();
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

  // useEffect(() => {
  //   // console.log("remote socket id is", remoteSocketId);
  // }, [remoteSocketId]);

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

  const handleUserLeft = useCallback(async () => {
    setRemoteStream(null);
    setRemoteSocketId(null);

    console.log("your mate left!!!!");
  }, []);

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
    newSocket.on("user:joined", handleUserJoined);
    newSocket.on("room:join");
    newSocket.on("incoming:call", handleIncomingCall);
    newSocket.on("call:accepted", handleCallAccepted);
    newSocket.on("peer:nego:needed", handleNegoNeedIncoming);
    newSocket.on("peer:nego:final", handleNegoNeedFinal);
    newSocket.on("caller:join:complete", handleAddCallerSocketId);
    newSocket.on("user:left", handleUserLeft);
    newSocket.on("send:stream", handleIncomingStreamRequest);

    return () => {
      newSocket.off("user:joined", handleUserJoined);
      newSocket.off("room:join");
      newSocket.off("incoming:call", handleIncomingCall);
      newSocket.off("call:accepted", handleCallAccepted);
      newSocket.off("peer:nego:needed", handleNegoNeedIncoming);
      newSocket.off("peer:nego:final", handleNegoNeedFinal);
      newSocket.off("caller:join:complete", handleAddCallerSocketId);
      newSocket.off("user:left", handleUserLeft);
      newSocket.off("send:stream", handleIncomingStreamRequest);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleCallUser,
    handleNegoNeedFinal,
  ]);

  const handleJoinRoom = useCallback(() => {
    socket.emit("room:join", { email, room });
  }, [email, room, socket]);

  // handling video start stop
  const stopVideoStream = useCallback((stream) => {
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => (track.enabled = false));
    setLocalVideoEnabled(false);
  }, []);

  function startVideoStream(stream) {
    console.log("called");
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => (track.enabled = true));
    setLocalVideoEnabled(true);
  }

  return (
    <div className="w-screen ">
      <h1 className="mb-10">Welcome to UMeet</h1>
      <div className="m-auto w-9/12 flex flex-col">
        <VideoChat
          remoteVideoEnabled={remoteVideoEnabled}
          localVideoEnabled={localVideoEnabled}
          localStream={localStream}
          remoteStream={remoteStream}
        />
        <br />
        <h2>{remoteSocketId || "No one in the room"}</h2>
        <div>
          {!remoteSocketId && (
            <button onClick={() => handleJoinRoom()}>Join Room</button>
          )}
        </div>
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
        <div>
          <button
            onClick={() =>
              localVideoEnabled
                ? stopVideoStream(localStream)
                : startVideoStream(localStream)
            }
          >
            {localVideoEnabled ? "stop video" : "start video"}
          </button>
        </div>

        <div>
          {remoteSocketId && remoteStream && (
            <>
              <button onClick={() => console.log("ending call")}>
                End Call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
