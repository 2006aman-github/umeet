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

function VideoChat({ connObj }) {
  const {
    remoteData: { remoteStreams, remoteSocketIds },
    remoteDataDispatch,
  } = useContext(RemoteContext);
  const {
    localData: { localStream, localVideoEnabled, localAudioEnabled, localName },
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
    <div
      className="grid grid-cols-1 lg:grid-cols-2 justify-center gap-2  
    overflow-auto max-h-1/2 p-2 bg-black rounded-md"
    >
      <section className="flex flex-col w-full p-5 bg-slate-900 gap-y-5 rounded-md">
        <h2 className="text-lg uppercase">{localName || "Local Stream"}</h2>
        {localVideoEnabled ? (
          <video
            muted
            className="w-full h-80 transform scale-x-[-1]"
            autoPlay
            ref={localVideoRef}
          ></video>
        ) : (
          <div className="w-full h-52 flex items-center justify-center bg-gray-800 rounded-md">
            <div className="w-20 h-20 rounded-full bg-gray-700 text-white flex items-center justify-center font-bold text-lg">
              {localName?.charAt(0)?.toUpperCase() || (
                <FaRegCircleUser className="w-20 h-20 text-gray-500" />
              )}
            </div>
          </div>
        )}
        <span>{name}</span>
      </section>
      {remoteStreams.map((stream, index) => {
        // get name from connObj using stream.socketid
        const name = connObj?.find(
          (conn) => conn.socketid === stream.socketid
        ).name;
        return (
          <RemoteVideoCard remoteStream={stream} name={name} key={index} />
        );
      })}
    </div>
  );
}

export default VideoChat;
