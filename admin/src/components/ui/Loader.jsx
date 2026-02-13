import Lottie from "lottie-react";
import animationData from "../../assets/loading.json";

export default function Loader({ fullScreen = true }) {
  return (
    <div
      className={`
        ${fullScreen ? "fixed inset-0" : ""}
        flex items-center justify-center
        bg-white/80
        z-[999]
      `}
    >
      <div className="w-28 h-28">
        <Lottie
          animationData={animationData}
          loop
          autoplay
        />
      </div>
    </div>
  );
}
