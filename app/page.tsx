"use client"
import dynamic from "next/dynamic";

const App = dynamic(
  () => {
    return import("../components/CameraLayout");
  },
  { ssr: false }
);

export default App;
