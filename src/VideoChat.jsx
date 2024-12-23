import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaRegCircleUser } from "react-icons/fa6";

function VideoChat({
  localStream,
  remoteStream,
  localVideoEnabled,
  remoteVideoEnabled,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
    if (remoteStream && remoteVideoRef.current && remoteVideoEnabled) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream, localVideoEnabled, remoteVideoEnabled]);

  return (
    <div className="flex justify-center bg-red-600 ">
      <section className="flex flex-col w-full p-10 bg-gray-500 gap-y-5">
        <h2 className="text-lg uppercase">local stream</h2>
        {localVideoEnabled ? (
          <video
            className="w-full h-52 rounded-md"
            autoPlay
            ref={localVideoRef}
          ></video>
        ) : (
          <div className="w-full h-52 flex items-center justify-center bg-gray-800 rounded-md">
            <FaRegCircleUser className="w-20 h-20 text-gray-500" />
          </div>
        )}
      </section>
      <section className="p-10 w-full flex flex-col bg-gray-800 gap-y-5">
        <h2 className="text-lg uppercase">remote stream</h2>
        {remoteVideoEnabled ? (
          <video
            className="w-full h-52 rounded-md"
            autoPlay
            ref={remoteVideoRef}
          ></video>
        ) : (
          <div className="w-full h-52 flex items-center justify-center bg-gray-500 rounded-md">
            <FaRegCircleUser className="w-20 h-20 text-gray-800" />
          </div>
        )}
      </section>
    </div>
  );
}

export default VideoChat;
