import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Marker,
} from "react-leaflet";
import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import "leaflet/dist/leaflet.css";
import { Icon, Map as LeafletMap } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { supabase } from "./CameraView";
import { sdk } from "@farcaster/frame-sdk";

// Type for a data item from Supabase
type MapDataItem = {
  id: number;
  created_at: string;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  uploader_id: string | null;
  uploader_type: string | null;
  city: string | null;
  fid: string | null;
};

export type MapRef = {
  refreshData: () => Promise<void>;
};

const Map = forwardRef<MapRef>((_, ref) => {
  const [data, setData] = useState<MapDataItem[]>([]);
  const mapRef = useRef<LeafletMap | null>(null);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('qrmap')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Read failed:', error);
    } else {
      setData(data || []);
    }
  };

  useImperativeHandle(ref, () => ({
    refreshData: fetchData
  }));

  useEffect(() => {
    const init = async () => {
      await sdk.actions.ready({ disableNativeGestures: true });
    };
    init();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const customIcon = new Icon({
    iconUrl: "/pin.png",
    iconSize: [38, 38],
  });

  return (
    <MapContainer
      center={[24.071521, 9.615584725366856]}
      zoom={2}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", zIndex: 1 }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        minZoom={2}
        maxZoom={18}
      />
      <MarkerClusterGroup>
        {data
          .filter(item => item.latitude && item.longitude)
          .map((item) => (
            <Marker
              key={item.id}
              position={[item.latitude!, item.longitude!]}
              icon={customIcon}
            >
              <Popup>
                <div style={{ maxWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Show city at the top */}
                  {item.city && (
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
                      {item.city}
                    </div>
                  )}
                  {/* Image in the middle */}
                  {item.image_url && (
                    <img 
                      src={item.image_url}
                      alt="Location"
                      loading="lazy"
                      style={{ maxWidth: '100%', height: 'auto', marginBottom: '8px' }}
                    />
                  )}
                  {/* Uploader at the bottom */}
                  {item.uploader_id && (
                    <div style={{ marginTop: '8px', fontSize: '0.95em', textAlign: 'center' }}>
                      {item.uploader_id.startsWith("@") ? (
                        <button
                          onClick={async () => {
                            if (item.fid) {
                              try {
                                await sdk.actions.viewProfile({
                                  fid: parseInt(item.fid)
                                });
                              } catch (error) {
                                alert('Failed to view profile');
                              }
                            }
                          }}
                          style={{ color: '#3366cc' }}
                        >
                          by {item.uploader_id}
                        </button>
                      ) : (
                        <span style={{ color: '#3366cc' }}>
                          by {item.uploader_id}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
});

Map.displayName = 'Map';

export default Map;
