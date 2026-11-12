import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
export default function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let stopped = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser has no camera access. Choose an existing photo instead.",
      );
      return;
    }
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1000 } },
        audio: false,
      })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      })
      .catch(() =>
        setError(
          "Camera access is unavailable. Allow camera access in your browser or choose an existing photo.",
        ),
      );
    return () => {
      stopped = true;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const capture = () => {
    const v = video.current;
    if (!v?.videoWidth) return;
    const c = document.createElement("canvas");
    const scale = Math.min(1, 1000 / v.videoWidth);
    c.width = v.videoWidth * scale;
    c.height = v.videoHeight * scale;
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(
      (blob) => {
        if (blob) {
          onCapture(
            new File([blob], "student-photo.jpg", { type: "image/jpeg" }),
          );
          onClose();
        }
      },
      "image/jpeg",
      0.8,
    );
  };
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Take learner photo"
    >
      <div className="w-full max-w-xl rounded-xl bg-white p-5">
        <div className="mb-3 flex justify-between">
          <h3 className="font-semibold">Take learner photo</h3>
          <button type="button" aria-label="Close camera" onClick={onClose}>
            <X />
          </button>
        </div>
        {error ? (
          <p role="alert" className="p-5 text-red-800">
            {error}
          </p>
        ) : (
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg bg-slate-900"
          />
        )}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="primary-button"
            disabled={!!error}
            onClick={capture}
          >
            <Camera size={16} />
            Capture photo
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
