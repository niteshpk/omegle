import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import { useToasts } from "react-toast-notifications";

const URL = import.meta.env.VITE_API_URL;

export const Room = ({
  name,
  localAudioTrack,
  localVideoTrack,
}: {
  name: string;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
}) => {
  const [lobby, setLobby] = useState(true);
  const [socket, setSocket] = useState<null | Socket>(null);
  const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
  const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(
    null
  );
  const [remoteVideoTrack, setRemoteVideoTrack] =
    useState<MediaStreamTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] =
    useState<MediaStreamTrack | null>(null);
  const [remoteMediaStream, setRemoteMediaStream] =
    useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const { addToast } = useToasts();

  useEffect(() => {
    const socket = io(URL);

    socket.on("send-offer", async ({ roomId }) => {
      addToast("sending offer", {
        appearance: "info",
      });

      setLobby(false);
      const pc = new RTCPeerConnection();

      setSendingPc(pc);
      if (localVideoTrack) {
        addToast("Local Video received successfully", {
          appearance: "success",
        });
        console.log(localVideoTrack);
        pc.addTrack(localVideoTrack);
      }
      if (localAudioTrack) {
        addToast("Local Audio received successfully", {
          appearance: "success",
        });
        console.log(localAudioTrack);
        pc.addTrack(localAudioTrack);
      }

      pc.onicecandidate = async (e) => {
        addToast("receiving ice candidate locally", {
          appearance: "info",
        });

        if (e.candidate) {
          socket.emit("add-ice-candidate", {
            candidate: e.candidate,
            type: "sender",
            roomId,
          });
        }
      };

      pc.onnegotiationneeded = async () => {
        addToast("on negotiation neeeded, sending offer", {
          appearance: "info",
        });

        try {
          const sdp = await pc.createOffer();
          await pc.setLocalDescription(sdp);
          socket.emit("offer", { sdp, roomId });
        } catch (err) {
          addToast("Negotiation error: " + err, {
            appearance: "error",
          });
        }
      };
    });

    socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
      console.log("received offer");
      addToast("received offer", {
        appearance: "info",
      });

      setLobby(false);
      const pc = new RTCPeerConnection();
      pc.setRemoteDescription(remoteSdp);
      const sdp = await pc.createAnswer();
      //@ts-ignore
      pc.setLocalDescription(sdp);
      const stream = new MediaStream();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }

      setRemoteMediaStream(stream);
      // trickle ice
      setReceivingPc(pc);
      //@ts-ignore
      window.pcr = pc;

      pc.ontrack = (e) => {
        if (!e.streams || e.streams.length === 0) {
          addToast("No streams received in ontrack event.", {
            appearance: "error",
          });
          return;
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          remoteVideoRef.current.play();
        }

        const track = e.track;
        const kind = track.kind;

        if (kind === "video") {
          setRemoteVideoTrack(track);
        } else if (kind === "audio") {
          setRemoteAudioTrack(track);
        }

        if (remoteMediaStream) {
          remoteMediaStream.addTrack(track);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteMediaStream;
          }
        }
      };

      pc.onicecandidate = async (e) => {
        if (!e.candidate) {
          return;
        }
        addToast("In ice candidate on receiving side.", {
          appearance: "info",
        });
        if (e.candidate) {
          socket.emit("add-ice-candidate", {
            candidate: e.candidate,
            type: "receiver",
            roomId,
          });
        }
      };

      socket.emit("answer", {
        roomId,
        sdp: sdp,
      });
      addToast("Waiting to get the remote video and audio.", {
        appearance: "warning",
      });
      setTimeout(() => {
        const track1 = pc.getTransceivers()[0].receiver.track;
        const track2 = pc.getTransceivers()[1].receiver.track;

        if (track1.kind === "video") {
          setRemoteAudioTrack(track2);
          setRemoteVideoTrack(track1);
        } else {
          setRemoteAudioTrack(track1);
          setRemoteVideoTrack(track2);
        }
        //@ts-ignore
        remoteVideoRef.current.srcObject.addTrack(track1);
        //@ts-ignore
        remoteVideoRef.current.srcObject.addTrack(track2);
        //@ts-ignore
        remoteVideoRef.current.play();
        // if (type == 'audio') {
        //     // setRemoteAudioTrack(track);
        //     // @ts-ignore
        //     remoteVideoRef.current.srcObject.addTrack(track)
        // } else {
        //     // setRemoteVideoTrack(track);
        //     // @ts-ignore
        //     remoteVideoRef.current.srcObject.addTrack(track)
        // }
        // //@ts-ignore
      }, 5000);
    });

    socket.on("answer", ({ roomId, sdp: remoteSdp }) => {
      setLobby(false);
      setSendingPc((pc) => {
        pc?.setRemoteDescription(remoteSdp);
        return pc;
      });
    });

    socket.on("lobby", () => {
      setLobby(true);
    });

    socket.on("add-ice-candidate", ({ candidate, type }) => {
      addToast("add ice candidate from remote.", {
        appearance: "info",
      });
      console.log({ candidate, type });
      if (type == "sender") {
        setReceivingPc((pc) => {
          if (!pc) {
            addToast("receicng pc nout found", {
              appearance: "error",
            });
          } else {
            console.error(pc.ontrack);
            addToast("some error " + pc.ontrack, {
              appearance: "error",
            });
          }
          pc?.addIceCandidate(candidate);
          return pc;
        });
      } else {
        setSendingPc((pc) => {
          if (!pc) {
            addToast("sending pc nout found", {
              appearance: "error",
            });
          } else {
            // console.error(pc.ontrack)
          }
          pc?.addIceCandidate(candidate);
          return pc;
        });
      }
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
      setSendingPc((pc) => {
        pc?.close();
        return null;
      });
      setReceivingPc((pc) => {
        pc?.close();
        return null;
      });
    };
  }, [name]);

  useEffect(() => {
    if (localVideoRef.current) {
      if (localVideoTrack) {
        localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
        localVideoRef.current.play();
      }
    }
  }, [localVideoRef]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Welcome, {name}!
      </h1>
      <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl">
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Your Video
          </h2>
          <video
            autoPlay
            width={400}
            height={400}
            ref={localVideoRef}
            className="rounded-md shadow-lg border border-gray-300"
          />
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Remote Video
          </h2>
          <video
            autoPlay
            width={400}
            height={400}
            ref={remoteVideoRef}
            className="rounded-md shadow-lg border border-gray-300"
          />
        </div>
      </div>
      {lobby && (
        <div className="mt-6 text-center">
          <p className="text-gray-600 bg-yellow-100 px-4 py-2 rounded-md shadow-sm">
            Waiting to connect you to someone...
          </p>
        </div>
      )}
    </div>
  );
};
