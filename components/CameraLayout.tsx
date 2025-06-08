"use client";

import React, { useState, useEffect, useRef } from "react";
import CameraView from "@/components/CameraView";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import Map, { MapRef } from "@/components/Map";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon, optimism, arbitrum, base } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { sdk } from "@farcaster/frame-sdk";

const config = getDefaultConfig({
  appName: "QR Map",
  projectId: "YOUR_PROJECT_ID",
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: false, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

function CameraPopupButton({ isMobile, onClose }: { isMobile: boolean; onClose: () => void }) {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  return (
    <>
      <button
        className={cn(
          "z-50 border border-white text-white font-semibold rounded-lg shadow transition-all",
          isMobile ? "px-2 py-1 text-sm" : "px-4 py-2"
        )}
        onClick={() => setOpen(true)}
      >
        Add photo
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div
            className={cn(
              "relative bg-black rounded-lg shadow-lg flex flex-col items-center justify-center",
              isMobile
                ? "w-[95vw] h-[85vh] max-w-full max-h-full"
                : "w-[700px] h-[500px] max-w-full max-h-full"
            )}
          >
            <button
              className="absolute top-3 right-3 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition z-10"
              onClick={handleClose}
              aria-label="Close camera"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-full h-full flex items-center justify-center">
              <CameraView isMobile={isMobile} onSuccess={handleClose} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const CameraLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    // Check if the screen is mobile sized
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile);

    // Clean up
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const init = async () => {
      await sdk.actions.ready();
    };
    init();
  }, []);

  const handleCameraClose = async () => {
    if (mapRef.current) {
      await mapRef.current.refreshData();
    }
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="h-screen w-screen relative">
            {/* Heading Banner */}
            {isMobile ? (
              <div className="flex flex-col items-center justify-center bg-black py-3 px-6 shadow-lg">
                <div className="w-full z-20 flex flex-row items-center justify-between">
                  <div className="text-white text-center font-bold text-xl pointer-events-auto flex items-center">
                    $QR Map
                  </div>
                  <div className="relative z-10 flex items-center">
                    <CameraPopupButton isMobile={isMobile} onClose={handleCameraClose} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full z-20 flex justify-between items-center bg-black py-2 px-6 shadow-lg">
                <div className="text-white text-center font-semibold text-lg pointer-events-auto">
                  $QR Map: spread the $QR IRL and add a photo to the map!
                </div>
                <div className="relative z-10">
                  <CameraPopupButton isMobile={isMobile} onClose={handleCameraClose} />
                </div>
              </div>
            )}

            <div
              className="w-full h-[calc(100vh-56px)]"
              style={{ marginTop: "0px" }}
            >
              <Map ref={mapRef} />
            </div>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default CameraLayout;
