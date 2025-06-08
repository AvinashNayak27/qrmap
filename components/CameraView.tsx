"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import jsQR from "jsqr";
import { createClient } from "@supabase/supabase-js";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { sdk } from "@farcaster/frame-sdk";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseApiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(projectUrl, supabaseApiKey);

type CameraType = "user" | "environment";

/** 
 * Fetches user profile data and returns the best display name for the address.
 * Priority: Farcaster username (@username) > ENS name > Basename > ETH address
 * @param address Ethereum address
 * @returns {Promise<{ name: string; id: string; type: string }>} Object with display name and type
 */
const getUser = async (
  address: string
): Promise<{ name: string; id: string; type: string }> => {
  try {
    const res = await fetch(
      `https://social.thirdweb.com/v1/profiles/${address}`,
      {
        headers: {
          accept: "*/*",
          "accept-language": "en-GB,en;q=0.7",
          "x-client-id": "adb6ce72c60ab8635170f259566269c8",
        },
        method: "GET",
      }
    );
    const data = await res.json();

    if (!data || !Array.isArray(data.data)) {
      // fallback to address
      return { name: address, id: address, type: "address" };
    }

    // 1. Farcaster username
    const fc = data.data.find((d: any) => d.type === "farcaster" && d.name);
    if (fc && fc.name && fc.metadata.fid) {
      return {
        name: `@${fc.name}`,
        id: `${fc.metadata.fid}`,
        type: "farcaster",
      };
    }

    // 2. ENS name
    const ens = data.data.find((d: any) => d.type === "ens" && d.name);
    if (ens && ens.name) {
      return { name: ens.name, id: ens.metadata.address, type: "ens" };
    }

    // 3. Basename
    const basename = data.data.find(
      (d: any) => d.type === "basename" && d.name
    );
    if (basename && basename.name) {
      return {
        name: basename.name,
        id: basename.metadata.address,
        type: "basename",
      };
    }

    // 4. Fallback to address
    return {
      name: address.slice(0, 6) + "..." + address.slice(-4),
      id: address,
      type: "address",
    };
  } catch (e) {
    return {
      name: address.slice(0, 6) + "..." + address.slice(-4),
      id: address,
      type: "address",
    };
  }
};

const CameraView = ({
  isMobile = false,
  onSuccess,
}: {
  isMobile?: boolean;
  onSuccess?: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null
  );
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrScanPending, setQrScanPending] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Preview and upload state
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedUploader, setUploadedUploader] = useState<string | null>(null);
  const [uploadedUploaderType, setUploadedUploaderType] = useState<
    string | null
  >(null);
  const [uploadedCity, setUploadedCity] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showUploader, setShowUploader] = useState(true);
  const [uploadedUploaderId, setUploadedUploaderId] = useState<string | null>(
    null
  );
  const { address: walletAddress } = useAccount();
  const [ctx, setCtx] = useState<any | undefined>(undefined);

  useEffect(() => {
    const init = async () => {
      await sdk.actions.ready({ disableNativeGestures: true });
      const ctx = await sdk.context;
      setCtx(ctx);
    };
    init();
  }, []);

  useEffect(() => {
    if (walletAddress && !ctx) {
      getUser(walletAddress).then((user) => {
        setUploadedUploader(user.name);
        setUploadedUploaderType(user.type);
        setUploadedUploaderId(user.id);
      });
    }
    if (ctx) {
      setUploadedUploader(`@${ctx.user.username}` || "");
      setUploadedUploaderType("farcaster");
      setUploadedUploaderId(ctx.user.fid.toString());
    }
  }, [walletAddress, showUploader, showPreview, showUploader]);

  useEffect(() => {
    setCameraType("environment");
  }, [isMobile]);

  useEffect(() => {
    const startCameraAndLocation = async () => {
      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        const constraints = {
          video: {
            facingMode: cameraType,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setCameraPermission(true);
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLatitude(position.coords.latitude);
              setLongitude(position.coords.longitude);
            },
            (error) => {
              // ignore
            }
          );
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setCameraPermission(false);
      }
    };

    startCameraAndLocation();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraType]);

  const checkForQRCode = (imageData: string) => {
    setQrScanPending(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        setQrScanPending(false);
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);
      const imageDataObj = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );
      const code = jsQR(
        imageDataObj.data,
        imageDataObj.width,
        imageDataObj.height
      );
      if (code) {
        const qrurl = "https://hovqr.to/7022b1ee";
        if (code.data === qrurl) {
          setQrCodeData(qrurl);
          console.log("QR Code found:", code.data);
        } else {
          setQrCodeData(null);
          console.log("QR code found, but data does not match qrurl");
        }
      } else {
        setQrCodeData(null);
        console.log("No QR code found in the image");
      }
      setQrScanPending(false);
    };
    img.src = imageData;
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setQrCodeData(null);
    setQrScanPending(false);
    setShowPreview(false);
    setUploadedCity(null);
    setConfirming(false);
    setShowUploader(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (context) {
      if (cameraType === "user" || !isMobile) {
        context.scale(-1, 1);
        context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        context.scale(-1, 1);
      } else {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const imageData = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageData);
      checkForQRCode(imageData);
    }
  };

  const switchCamera = () => {
    setCameraType((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const resetCamera = async () => {
    setCapturedImage(null);
    setQrCodeData(null);
    setQrScanPending(false);
    setShowPreview(false);
    setUploadedUploader(null);
    setUploadedUploaderType(null);
    setUploadedCity(null);
    setUploading(false);
    setConfirming(false);
    setShowUploader(true);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    try {
      const constraints = {
        video: {
          facingMode: cameraType,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error("Error restarting camera:", error);
    }
  };

  if (cameraPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black rounded-lg text-white p-4">
        <Camera className="w-12 h-12 mb-4 text-gray-400" />
        <h3 className="text-xl font-medium mb-2">Camera Access Denied</h3>
        <p className="text-gray-400 text-center">
          Please allow camera access in your browser settings to use this
          feature.
        </p>
      </div>
    );
  }

  // Helper: reverse geocode using Nominatim OpenStreetMap API
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "qrmap-app/1.0 (your@email.com)",
        },
      });
      if (!res.ok) return { city: null, state: null };
      const data = await res.json();
      const city =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.hamlet ||
        data.address.county ||
        null;
      const state = data.address.state || data.address.region || null;
      return { city, state };
    } catch (e) {
      return { city: null, state: null };
    }
  };

  // Step 1: Show preview (do not upload image yet)
  const handlePreview = async () => {
    // Just show the preview, do not upload
    setShowPreview(true);
    // Optionally, you can reverse geocode here for preview
    let city = null;
    if (latitude && longitude) {
      const geo = await reverseGeocode(latitude, longitude);
      city = geo.city;
    }
    setUploadedCity(city);
  };

  // Step 2: Upload image and add to map
  const confirmAddToMap = async () => {
    if (!capturedImage) return;
    setConfirming(true);

    // Convert data URL to Blob
    const dataUrlToBlob = (dataUrl: string): Blob => {
      const arr = dataUrl.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1] || "";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    };

    const fileBlob = dataUrlToBlob(capturedImage);
    const fileName = `photo_${Date.now()}.jpg`;
    let image_url = null;
    let city = null;
    let state = null;

    // Upload image to Supabase
    const { data, error } = await supabase.storage
      .from("images")
      .upload(fileName, fileBlob, {
        contentType: "image/jpeg",
      });
    if (error) {
      alert("Error uploading image: " + error.message);
      setConfirming(false);
      return;
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(fileName);
      image_url = publicUrl;
    }

    // Reverse geocode for city/state
    if (latitude && longitude) {
      const geo = await reverseGeocode(latitude, longitude);
      city = geo.city;
      state = geo.state;
    }

    setUploadedCity(city);

    // Insert into table
    const uploader_id = showUploader ? uploadedUploader : null;
    const uploader_type = showUploader ? uploadedUploaderType : null;
    const lat = latitude;
    const lng = longitude;
    const { data: insertData, error: insertError } = await supabase
      .from("qrmap")
      .insert([
        {
          image_url: image_url,
          latitude: lat,
          longitude: lng,
          uploader_id,
          uploader_type,
          city,
          fid: uploadedUploaderType === "farcaster" ? uploadedUploaderId : null,
        },
      ]);
    if (insertError) {
      alert("Error adding to map: " + insertError.message);
      setConfirming(false);
    } else {
      alert("Successfully added to map!");
      onSuccess?.();
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col bg-black rounded-lg overflow-hidden",
        "h-full w-full"
      )}
    >
      <div
        className="absolute top-0 left-0 w-full h-full z-10"
        style={{ display: "none" }}
      >
        <ConnectButton />
      </div>
      {!capturedImage ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              (cameraType === "user" || !isMobile) && "scale-x-[-1]"
            )}
          />
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <button
              className="bg-white p-6 rounded-full hover:bg-gray-200 transition-all transform scale-100"
              aria-label="Take photo"
              style={{ zIndex: 2 }}
              onClick={capturePhoto}
            >
              <div className="w-8 h-8 rounded-full border-4 border-black"></div>
            </button>
            {isMobile && (
              <button
                onClick={switchCamera}
                className="absolute top-1/2 left-full ml-4 -translate-y-1/2 bg-white/20 backdrop-blur-md p-4 rounded-full text-white hover:bg-white/30 transition"
                aria-label="Switch camera"
                style={{ zIndex: 2 }}
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            )}
          </div>
        </>
      ) : showPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 rounded-xl shadow-lg p-6 flex flex-col items-center w-[90vw] max-w-xs relative">
            <div className="flex flex-col items-center w-full gap-2">
              <div className="text-white text-base font-semibold mb-1">
                Preview
              </div>
              <img
                src={capturedImage}
                alt="Preview"
                className="object-contain rounded-lg border border-zinc-700"
                style={{
                  maxHeight: "180px",
                  maxWidth: "100%",
                  marginBottom: "10px",
                }}
              />

              <div className="flex flex-col items-center w-full gap-1">
                <div className="flex flex-row items-center gap-2 text-white text-xs justify-center w-full">
                  <span className="font-medium">Location:</span>
                  <span>{uploadedCity || "N/A"}</span>
                </div>
                {showUploader && (
                  <div className="flex flex-row items-center gap-2 text-white text-xs justify-center w-full">
                    <span className="font-medium">Uploader:</span>
                    {!uploadedUploader ? (
                      <ConnectButton.Custom>
                        {({
                          account,
                          chain,
                          openAccountModal,
                          openChainModal,
                          openConnectModal,
                          authenticationStatus,
                          mounted,
                        }) => {
                          const ready =
                            mounted && authenticationStatus !== "loading";
                          const connected =
                            ready &&
                            account &&
                            chain &&
                            (!authenticationStatus ||
                              authenticationStatus === "authenticated");
                          return (
                            <div
                              {...(!ready && {
                                "aria-hidden": true,
                                style: {
                                  opacity: 0,
                                  pointerEvents: "none",
                                  userSelect: "none",
                                },
                              })}
                              className="flex flex-row items-center gap-2"
                            >
                              {!connected ? (
                                <button
                                  onClick={openConnectModal}
                                  type="button"
                                  className="text-white border border-white rounded-lg px-2 py-1"
                                >
                                  Connect Wallet
                                </button>
                              ) : chain.unsupported ? (
                                <button onClick={openChainModal} type="button">
                                  Wrong network
                                </button>
                              ) : (
                                <div className="flex flex-row items-center gap-2">
                                  <button
                                    onClick={openChainModal}
                                    className="flex flex-row items-center"
                                    type="button"
                                  >
                                    {chain.hasIcon && (
                                      <div
                                        style={{
                                          background: chain.iconBackground,
                                          width: 12,
                                          height: 12,
                                          borderRadius: 999,
                                          overflow: "hidden",
                                          marginRight: 4,
                                        }}
                                      >
                                        {chain.iconUrl && (
                                          <img
                                            alt={chain.name ?? "Chain icon"}
                                            src={chain.iconUrl}
                                            style={{ width: 12, height: 12 }}
                                          />
                                        )}
                                      </div>
                                    )}
                                    {chain.name}
                                  </button>
                                  <button
                                    onClick={openAccountModal}
                                    type="button"
                                  >
                                    {account.displayName}
                                    {account.displayBalance
                                      ? ` (${account.displayBalance})`
                                      : ""}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      </ConnectButton.Custom>
                    ) : (
                      <span>{uploadedUploader}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="includeUploader"
                  className="text-white text-xs select-none"
                >
                  Don't display uploader
                </label>
                <input
                  type="checkbox"
                  id="doNotIncludeUploader"
                  checked={!showUploader}
                  onChange={() => setShowUploader((v) => !v)}
                  className="accent-blue-500"
                  style={{ width: 14, height: 14 }}
                />
              </div>

              <div className="flex flex-row gap-2 mt-3 w-full justify-center">
                <button
                  onClick={resetCamera}
                  className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-white text-sm font-medium shadow transition-all"
                  aria-label="Retake photo"
                  disabled={confirming}
                >
                  Retake
                </button>
                <button
                  onClick={confirmAddToMap}
                  className="bg-blue-500/90 hover:bg-blue-600/90 px-4 py-1.5 rounded-lg text-white text-sm font-medium shadow transition-all"
                  aria-label="Add to map"
                  disabled={confirming}
                >
                  {confirming ? "Adding..." : "Add to map"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col">
          {/* Full-size Image Preview */}
          <div
            className="flex items-center justify-center w-full mt-10"
            style={{ height: "80%" }}
          >
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain rounded-none"
              style={{ maxHeight: "100%", maxWidth: "100%" }}
            />
          </div>

          {/* QR Code Info and Actions */}
          <div className="w-full flex flex-col items-center justify-center py-4 gap-4">
            {qrScanPending ? (
              <div className="text-white text-sm">Detecting QR code...</div>
            ) : qrCodeData ? (
              <div className="flex flex-row items-center justify-center gap-4 w-full">
                <button
                  onClick={resetCamera}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-2 rounded-lg text-white font-medium shadow transition-all"
                  aria-label="Retake photo"
                  disabled={uploading}
                >
                  Retake
                </button>
                <button
                  className="bg-blue-500/90 hover:bg-blue-600/90 backdrop-blur-md px-6 py-2 rounded-lg text-white font-medium shadow transition-all"
                  onClick={handlePreview}
                  aria-label="Preview"
                  disabled={uploading}
                >
                  Preview
                </button>
              </div>
            ) : (
              <div className="flex flex-row items-center justify-center gap-4 w-full">
                <p className="font-medium text-sm text-white">
                  No QR Code Found
                </p>
                <button
                  onClick={resetCamera}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-2 rounded-lg text-white font-medium shadow transition-all"
                  aria-label="Retake photo"
                  disabled={uploading}
                >
                  Retake
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraView;
