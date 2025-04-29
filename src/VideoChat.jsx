import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import RemoteVideoCard from "./Components/RemoteVideoCard";
import { RemoteContext } from "./Context/RemoteContext";
import { use } from "react";
import { LocalContext } from "./Context/LocalContext";

function VideoChat() {
  const {
    remoteData: { remoteStreams, remoteSocketIds },
    remoteDataDispatch,
  } = useContext(RemoteContext);
  const {
    localData: { localStream, localVideoEnabled, localAudioEnabled, name },
    localDataDispatch,
  } = useContext(LocalContext);
  const localVideoRef = useRef(null);
  // console.log(remoteSocketIds, "remote ids!!!");
  // useEffect(() => {
  //   if (remoteStream?.getVideoTracks()[0]?.enabled) {
  //     setRemoteVideoEnabled(true);
  //   } else {
  //     setRemoteVideoEnabled(false);
  //   }

  //   if (localStream?.getVideoTracks()[0]?.enabled) {
  //     setToggle(true);
  //   } else {
  //     setToggle(false);
  //   }
  // }, [remoteStream, localStream]);

  useEffect(() => {
    // console.log("remote stream====>>>>", remoteStream);
    if (localStream && localVideoRef.current && localVideoEnabled) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoEnabled]);
  return (
    <div className="grid grid-cols-2 justify-center  overflow-scroll max-h-full">
      <section className="flex flex-col w-full p-10 bg-black gap-y-5">
        <h2 className="text-lg uppercase">local stream</h2>
        {localVideoEnabled ? (
          <video
            muted
            className="w-full h-52 rounded-md"
            autoPlay
            ref={localVideoRef}
          ></video>
        ) : (
          <div className="w-full h-52 flex items-center justify-center bg-gray-800 rounded-md">
            <FaRegCircleUser className="w-20 h-20 text-gray-500" />
          </div>
        )}
        <span>{name}</span>
      </section>
      {remoteStreams.map((stream, index) => {
        return <RemoteVideoCard remoteStream={stream} key={index} />;
      })}
    </div>
  );
}

export default VideoChat;
