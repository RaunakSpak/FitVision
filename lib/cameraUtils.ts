const CAMERA_CONSTRAINTS: MediaStreamConstraints[] = [
  {
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  },
  {
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  },
  { video: { facingMode: "user" }, audio: false },
  { video: true, audio: false },
];

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

export async function acquireCameraStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("Camera not supported in this browser.", "NotSupportedError");
  }

  let lastError: unknown = new Error("Could not access camera");

  for (const constraints of CAMERA_CONSTRAINTS) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        throw err;
      }
    }
  }

  throw lastError;
}

export async function attachStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream
): Promise<void> {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Starting videoinput failed"));
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      resolve();
      return;
    }

    video.addEventListener("loadedmetadata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });

  try {
    await video.play();
  } catch (err) {
    throw err instanceof Error ? err : new Error("Starting videoinput failed");
  }
}

export interface CameraErrorInfo {
  title: string;
  message: string;
  hint?: string;
}

function isCameraBusyMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("videoinput") ||
    lower.includes("video source") ||
    lower.includes("notreadable") ||
    lower.includes("could not start") ||
    lower.includes("failed to start")
  );
}

export function formatCameraError(err: unknown): CameraErrorInfo {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return {
        title: "Camera permission denied",
        message: "FitVision needs camera access for live pose tracking.",
        hint: "Click the camera icon in your browser address bar and allow access, then try again.",
      };
    }

    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return {
        title: "No camera found",
        message: "We couldn't detect a webcam on this device.",
        hint: "Connect a camera or use a device with a built-in webcam.",
      };
    }

    if (err.name === "NotReadableError" || isCameraBusyMessage(err.message)) {
      return {
        title: "Camera is busy",
        message: "Your webcam couldn't start — another app or tab may be using it.",
        hint: "Close Zoom, Teams, the Windows Camera app, or other browser tabs, then click Try again.",
      };
    }

    if (err.name === "OverconstrainedError") {
      return {
        title: "Camera settings incompatible",
        message: "Your camera doesn't support the requested video mode.",
        hint: "Try again — FitVision will fall back to a simpler camera mode automatically.",
      };
    }

    if (isCameraBusyMessage(err.message)) {
      return {
        title: "Camera is busy",
        message: err.message,
        hint: "Close other apps using the camera, then try again.",
      };
    }

    return {
      title: "Camera error",
      message: err.message || "Failed to start camera.",
      hint: "Check Windows Settings → Privacy → Camera and ensure desktop apps can use the camera.",
    };
  }

  if (err instanceof Error) {
    if (isCameraBusyMessage(err.message)) {
      return {
        title: "Camera is busy",
        message: "Your webcam couldn't start — another app or tab may be using it.",
        hint: "Close Zoom, Teams, the Windows Camera app, or other browser tabs, then click Try again.",
      };
    }

    return {
      title: "Camera error",
      message: err.message,
      hint: "Check camera permissions in Windows and your browser, then try again.",
    };
  }

  return {
    title: "Camera error",
    message: "Failed to start camera.",
    hint: "Refresh the page and try again.",
  };
}
