"use client";
import React, { useRef, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const VideoCall: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const startLocalStream = async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Attach local stream to video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Add local stream to peer connection
        peerConnectionRef.current = new RTCPeerConnection();
        localStream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnectionRef.current.ontrack = (event) => {
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        };

        // Handle ICE candidates
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
          }
        };

        // Listen for signaling data
        socket.on("offer", async (offer) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(offer);
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socket.emit("answer", answer);
          }
        });

        socket.on("answer", async (answer) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(answer);
          }
        });

        socket.on("ice-candidate", async (candidate) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(candidate);
          }
        });

        // Create and send an offer
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit("offer", offer);
      } catch (error) {
        console.error("Error accessing local stream:", error);
      }
    };

    startLocalStream();

    return () => {
      peerConnectionRef.current?.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 space-y-4">
      <h1 className="text-2xl font-bold">Video Call</h1>
      <div className="flex space-x-4">
        {/* Local Video */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-64 h-48 bg-black rounded-lg border"
        ></video>
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-64 h-48 bg-black rounded-lg border"
        ></video>
      </div>
    </div>
  );
};

export default VideoCall;
