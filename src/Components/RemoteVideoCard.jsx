import { useEffect, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";

function RemoteVideoCard({ remoteStream, name }) {
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const { obj: streamObj, audioEnabled, videoEnabled, socketid } = remoteStream;

  useEffect(() => {
    if (remoteVideoRef.current && videoEnabled) {
      // console.log(videoEnabled, "videoEnabled");
      remoteVideoRef.current.srcObject = streamObj;
    } else if (remoteAudioRef.current && audioEnabled) {
      remoteAudioRef.current.srcObject = streamObj;
    }
  }, [streamObj, videoEnabled, remoteStream, audioEnabled]);
  return (
    <section className="relative flex flex-col w-full p-5 bg-slate-800 gap-y-5 rounded-md">
      <h2 className="text-lg uppercase">{name}</h2>
      {videoEnabled ? (
        <video
          muted={!audioEnabled}
          className="w-full h-80 rounded-md"
          autoPlay
          ref={remoteVideoRef}
        ></video>
      ) : (
        <div className="w-full h-52 flex items-center justify-center bg-gray-500 rounded-md">
          <div className="w-20 h-20 rounded-full bg-gray-700 text-white flex items-center justify-center font-bold text-lg">
            {name?.charAt(0)?.toUpperCase() || (
              <FaRegCircleUser className="w-20 h-20 text-gray-500" />
            )}
          </div>
          {audioEnabled && (
            <audio ref={remoteAudioRef} autoPlay muted={false} />
          )}
        </div>
      )}
      <div
        className="absolute w-10 h-10 rounded-full  bg-gray-950 flex 
      items-center justify-center"
      >
        {audioEnabled ? (
          <span className="rounded-full w-fit">
            <FaMicrophone />
          </span>
        ) : (
          <span className=" rounded-full  w-fit">
            <FaMicrophoneSlash />
          </span>
        )}
      </div>
    </section>
  );
}

export default RemoteVideoCard;
