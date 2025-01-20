import { useEffect, useRef, useState } from "react";
import { Room } from "./Room";
import { useToastMessage } from "./useToastMessage";

export const Landing = () => {
  const [name, setName] = useState("");
  const [localAudioTrack, setLocalAudioTrack] =
    useState<MediaStreamTrack | null>(null);
  const [localVideoTrack, setlocalVideoTrack] =
    useState<MediaStreamTrack | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { addToastMessage } = useToastMessage();

  const [joined, setJoined] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const getCam = async () => {
    try {
      const stream = await window.navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      addToastMessage(
        "Permission received for Camera and Microphone",
        "success"
      );

      setPermissionGranted(true);
      // MediaStream
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      setLocalAudioTrack(audioTrack);
      setlocalVideoTrack(videoTrack);
      if (!videoRef.current) {
        addToastMessage(
          "Video element not found, please refresh the page",
          "error"
        );

        return;
      }
      videoRef.current.srcObject = new MediaStream([videoTrack]);
      videoRef.current.play();
      // MediaStream
    } catch (error: any) {
      if (error.name === "NotAllowedError") {
        addToastMessage(
          "Camera and Microphone permissions are denied. Please allow access in your browser settings.",
          "error"
        );
      } else if (error.name === "NotFoundError") {
        addToastMessage(
          "No camera or microphone detected. Please connect devices and try again.",
          "error"
        );
      } else {
        addToastMessage(
          "An error occurred while accessing media devices.",
          "error"
        );
      }
      setPermissionGranted(false);
    }
  };

  const handleJoin = () => {
    if (name.trim() === "") {
      addToastMessage("Name cannot be empty.", "error");
      return;
    }
    setJoined(true);
    addToastMessage("Joined the waiting room.", "success");
  };

  useEffect(() => {
    if (videoRef && videoRef.current) {
      getCam();
    }
  }, [videoRef]);

  useEffect(() => {
    return () => {
      if (localAudioTrack) localAudioTrack.stop();
      if (localVideoTrack) localVideoTrack.stop();
    };
  }, [localAudioTrack, localVideoTrack]);

  if (!joined) {
    return (
      <div>
        <video
          autoPlay
          ref={videoRef}
          style={{
            height: "480px",
            width: "640px",
            borderRadius: "8px",
            border: "2px solid #ccc",
          }}
          aria-label="User camera feed"
        ></video>

        {permissionGranted ? (
          <div>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            ></input>
            <button onClick={handleJoin}>Join</button>
          </div>
        ) : (
          <div>
            <p>Waiting for Camera and Microphone access</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Room
      name={name}
      localAudioTrack={localAudioTrack}
      localVideoTrack={localVideoTrack}
    />
  );
};
