import { useEffect, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";

function RemoteVideoCard({ remoteStream }) {
  const remoteVideoRef = useRef(null);
  const { obj: streamObj, audioEnabled, videoEnabled, name } = remoteStream;

  useEffect(() => {
    if (remoteVideoRef.current && videoEnabled) {
      // console.log(videoEnabled, "videoEnabled");
      remoteVideoRef.current.srcObject = streamObj;
    }
  }, [streamObj, videoEnabled, remoteStream]);
  return (
    <section className="p-10 w-full bg-gray-600 flex flex-col  gap-y-5">
      <h2 className="text-lg uppercase">{name}</h2>
      {videoEnabled ? (
        <video
          muted={!audioEnabled}
          className="w-full h-52 rounded-md"
          autoPlay
          ref={remoteVideoRef}
        ></video>
      ) : (
        <div className="w-full h-52 flex items-center justify-center bg-gray-500 rounded-md">
          <FaRegCircleUser className="w-20 h-20 text-gray-800" />
        </div>
      )}
      {audioEnabled ? (
        <span className="bg-blue-500 rounded-full p-3 w-fit">
          <FaMicrophone />
        </span>
      ) : (
        <span className="bg-red-400 rounded-full p-3 w-fit">
          <FaMicrophoneSlash />
        </span>
      )}
    </section>
  );
}

export default RemoteVideoCard;
