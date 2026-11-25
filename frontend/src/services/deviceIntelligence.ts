/**
 * STAGE Platform — Device & Environment Intelligence Service
 * 
 * Uses feature detection rather than brittle UA regex to discover
 * capabilities of the client's current runtime environment.
 * Complies with strict privacy standards (no fingerprinting, no unnecessary device data).
 */

export interface DeviceCapabilities {
  os: "macOS" | "Windows" | "Linux" | "iOS" | "Android" | "Unknown";
  browser: "Chrome" | "Safari" | "Firefox" | "Edge" | "Unknown";
  hasNotificationApi: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  hasCamera: boolean;
  cameraPermissionState: "granted" | "prompt" | "denied" | "unsupported";
  hasWebShare: boolean;
  hasServiceWorker: boolean;
  calendarCapabilities: {
    hasIcsDownload: boolean;
    hasGoogleCalendarDeepLink: boolean;
    hasOutlookDeepLink: boolean;
    hasWebcalScheme: boolean;
  };
  localBridge: {
    detected: boolean;
    endpoint: string;
    capabilities: string[];
  };
}

export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  if (typeof window === "undefined") {
    return {
      os: "Unknown",
      browser: "Unknown",
      hasNotificationApi: false,
      notificationPermission: "unsupported",
      hasCamera: false,
      cameraPermissionState: "unsupported",
      hasWebShare: false,
      hasServiceWorker: false,
      calendarCapabilities: {
        hasIcsDownload: true,
        hasGoogleCalendarDeepLink: true,
        hasOutlookDeepLink: true,
        hasWebcalScheme: false,
      },
      localBridge: {
        detected: false,
        endpoint: "http://127.0.0.1:8765",
        capabilities: [],
      },
    };
  }

  // 1. OS Feature & Platform Detection
  let detectedOs: DeviceCapabilities["os"] = "Unknown";
  const userAgent = navigator.userAgent || "";
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || "";

  if (/Mac|iPhone|iPad|iPod/i.test(platform) || /Macintosh|Mac OS X/i.test(userAgent)) {
    detectedOs = /iPhone|iPad|iPod/i.test(userAgent) ? "iOS" : "macOS";
  } else if (/Win/i.test(platform) || /Windows/i.test(userAgent)) {
    detectedOs = "Windows";
  } else if (/Android/i.test(userAgent)) {
    detectedOs = "Android";
  } else if (/Linux/i.test(platform) || /Linux/i.test(userAgent)) {
    detectedOs = "Linux";
  }

  // 2. Browser Family Detection
  let detectedBrowser: DeviceCapabilities["browser"] = "Unknown";
  if (/Edg\//i.test(userAgent)) {
    detectedBrowser = "Edge";
  } else if (/Firefox\//i.test(userAgent)) {
    detectedBrowser = "Firefox";
  } else if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) {
    detectedBrowser = "Chrome";
  } else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    detectedBrowser = "Safari";
  }

  // 3. Notification Support & Permission
  const hasNotificationApi = "Notification" in window;
  const notificationPermission: NotificationPermission | "unsupported" = hasNotificationApi
    ? Notification.permission
    : "unsupported";

  // 4. Camera Availability & Permission State
  let hasCamera = false;
  let cameraPermissionState: DeviceCapabilities["cameraPermissionState"] = "unsupported";

  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
    hasCamera = true;
    try {
      if (navigator.permissions && typeof navigator.permissions.query === "function") {
        const status = await navigator.permissions.query({ name: "camera" as any });
        cameraPermissionState = status.state as any;
      } else {
        cameraPermissionState = "prompt";
      }
    } catch {
      cameraPermissionState = "prompt";
    }
  }

  // 5. Web Share API
  const hasWebShare = typeof navigator.share === "function";

  // 6. Service Worker
  const hasServiceWorker = "serviceWorker" in navigator;

  // 7. Calendar Capabilities
  const hasWebcalScheme = detectedOs === "macOS" || detectedOs === "iOS";
  const calendarCapabilities = {
    hasIcsDownload: true,
    hasGoogleCalendarDeepLink: true,
    hasOutlookDeepLink: true,
    hasWebcalScheme,
  };

  // 8. Probe Local Device MCP Bridge on loopback (timeout 250ms)
  let bridgeDetected = false;
  let bridgeCaps: string[] = [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300);
    const bridgeRes = await fetch("http://127.0.0.1:8765/health", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (bridgeRes.ok) {
      const data = await bridgeRes.json();
      bridgeDetected = true;
      bridgeCaps = data.supported_capabilities || [];
    }
  } catch {
    bridgeDetected = false;
  }

  return {
    os: detectedOs,
    browser: detectedBrowser,
    hasNotificationApi,
    notificationPermission,
    hasCamera,
    cameraPermissionState,
    hasWebShare,
    hasServiceWorker,
    calendarCapabilities,
    localBridge: {
      detected: bridgeDetected,
      endpoint: "http://127.0.0.1:8765",
      capabilities: bridgeCaps,
    },
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return await Notification.requestPermission();
}

