"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useT } from "@/i18n/client";

/** Chrome's own decoder. No library, but not every browser has it. */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function detectorCtor(): BarcodeDetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return typeof ctor === "function" ? ctor : null;
}

/** True when this browser can read a code through the camera at all. */
export function cameraScanSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    detectorCtor() !== null &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

type State =
  | { status: "starting" }
  | { status: "scanning" }
  | { status: "failed"; reason: "unsupported" | "denied" | "other" };

/**
 * The phone in the shopkeeper's pocket as a scanner. Uses the browser's own
 * barcode decoder — nothing to download, and it reads the 1D codes on medicine
 * boxes as well as QR. The camera needs HTTPS, which the deployed site has.
 */
export function CameraScanner({
  onRead,
  onClose,
}: {
  /** A decoded code. Fires once, then the camera stops. */
  onRead: (code: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>({ status: "starting" });

  // One camera, one reader, torn down on the way out however we leave.
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  });

  useEffect(() => {
    const Detector = detectorCtor();
    if (Detector === null || typeof navigator.mediaDevices?.getUserMedia !== "function") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser capability, which render must not do
      setState({ status: "failed", reason: "unsupported" });
      return;
    }

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    // EAN and UPC are what medicine boxes carry; QR is for labels a shop
    // prints itself. Naming them keeps the decoder off the rest.
    const detector = new Detector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
    });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (stopped) return;
        const video = videoRef.current;
        if (video === null) return;
        video.srcObject = stream;
        await video.play();
        setState({ status: "scanning" });
        read();
      } catch (error) {
        if (stopped) return;
        const denied = error instanceof DOMException && error.name === "NotAllowedError";
        setState({ status: "failed", reason: denied ? "denied" : "other" });
      }
    }

    function read() {
      frame = requestAnimationFrame(() => {
        const video = videoRef.current;
        if (stopped || video === null || video.readyState < 2) {
          if (!stopped) read();
          return;
        }
        detector
          .detect(video)
          .then((found) => {
            if (stopped) return;
            const code = found[0]?.rawValue?.trim();
            if (code) {
              stopped = true;
              onReadRef.current(code);
              return;
            }
            read();
          })
          .catch(() => {
            if (!stopped) read();
          });
      });
    }

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("scan.camera")}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 pt-10"
    >
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader
          title={t("scan.camera")}
          description={t("scan.cameraHint")}
          action={
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          }
        />
        <CardBody className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-foreground/90">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-[4/3] w-full object-cover"
            />
            {/* A window to hold the code in, rather than the whole frame. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-white/80"
            />
            {state.status !== "scanning" && (
              <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
                {state.status === "starting"
                  ? t("scan.cameraStarting")
                  : t(
                      state.reason === "unsupported"
                        ? "scan.cameraUnsupported"
                        : state.reason === "denied"
                          ? "scan.cameraDenied"
                          : "scan.cameraFailed",
                    )}
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("scan.cameraKeys")}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
