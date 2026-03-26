const RUM_CDN_URL = 'https://static.guance.com/browser-sdk/v3/dataflux-rum.js';

declare global {
  interface Window {
    DATAFLUX_RUM?: {
      init?: (config: Record<string, unknown>) => void;
      onReady?: (callback: () => void) => void;
      startSessionReplayRecording?: () => void;
      q?: Array<() => void>;
    };
    __GUANCE_RUM_INITIALIZED__?: boolean;
    __GUANCE_RUM_SCRIPT_LOADING__?: boolean;
    ENV: {
      NEXT_PUBLIC_PLATFORM?: string;
      NEXT_PUBLIC_OTEL_SERVICE_NAME?: string;
      NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
      IS_SYNTHETIC_REQUEST?: string;
      NEXT_PUBLIC_GUANCE_RUM_ENABLED?: string;
      NEXT_PUBLIC_GUANCE_RUM_APPLICATION_ID?: string;
      NEXT_PUBLIC_GUANCE_RUM_SITE?: string;
      NEXT_PUBLIC_GUANCE_RUM_CLIENT_TOKEN?: string;
      NEXT_PUBLIC_GUANCE_RUM_ENV?: string;
      NEXT_PUBLIC_GUANCE_RUM_VERSION?: string;
      NEXT_PUBLIC_GUANCE_RUM_SERVICE?: string;
      NEXT_PUBLIC_GUANCE_RUM_SESSION_SAMPLE_RATE?: string;
      NEXT_PUBLIC_GUANCE_RUM_SESSION_REPLAY_SAMPLE_RATE?: string;
      NEXT_PUBLIC_GUANCE_RUM_COMPRESS_INTAKE_REQUESTS?: string;
      NEXT_PUBLIC_GUANCE_RUM_TRACK_INTERACTIONS?: string;
      NEXT_PUBLIC_GUANCE_RUM_TRACE_TYPE?: string;
    };
  }
}

const toBoolean = (value?: string, fallback = false) => {
  if (value == null || value === '') {
    return fallback;
  }

  return value.toLowerCase() === 'true';
};

const toNumber = (value?: string, fallback = 100) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const initRum = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const env = window.ENV || {};

  if (!toBoolean(env.NEXT_PUBLIC_GUANCE_RUM_ENABLED, true)) {
    return;
  }

  if (window.__GUANCE_RUM_INITIALIZED__) {
    return;
  }

  const onReady = () => {
    if (window.__GUANCE_RUM_INITIALIZED__) {
      return;
    }

    const sdk = window.DATAFLUX_RUM;
    if (!sdk?.init) {
      return;
    }

    sdk.init({
      applicationId: env.NEXT_PUBLIC_GUANCE_RUM_APPLICATION_ID || 'OpenTelemetry_Demo',
      site: env.NEXT_PUBLIC_GUANCE_RUM_SITE || 'https://rum-openway.guance.com',
      clientToken: env.NEXT_PUBLIC_GUANCE_RUM_CLIENT_TOKEN || '6e7e54705d5f4493a983f6a8d86bbd75',
      env: env.NEXT_PUBLIC_GUANCE_RUM_ENV || 'prod',
      version: env.NEXT_PUBLIC_GUANCE_RUM_VERSION || '1.0.0',
      service: env.NEXT_PUBLIC_GUANCE_RUM_SERVICE || 'OpenTelemetry_Demo',
      sessionSampleRate: toNumber(env.NEXT_PUBLIC_GUANCE_RUM_SESSION_SAMPLE_RATE, 100),
      sessionReplaySampleRate: toNumber(env.NEXT_PUBLIC_GUANCE_RUM_SESSION_REPLAY_SAMPLE_RATE, 100),
      compressIntakeRequests: toBoolean(env.NEXT_PUBLIC_GUANCE_RUM_COMPRESS_INTAKE_REQUESTS, true),
      trackInteractions: toBoolean(env.NEXT_PUBLIC_GUANCE_RUM_TRACK_INTERACTIONS, true),
      traceType: env.NEXT_PUBLIC_GUANCE_RUM_TRACE_TYPE || 'w3c_traceparent',
      allowedTracingOrigins: [window.location.origin],
    });

    sdk.startSessionReplayRecording?.();
    window.__GUANCE_RUM_INITIALIZED__ = true;
  };

  if (window.DATAFLUX_RUM?.onReady) {
    window.DATAFLUX_RUM.onReady(onReady);
  }

  if (window.DATAFLUX_RUM?.init) {
    onReady();
    return;
  }

  if (window.__GUANCE_RUM_SCRIPT_LOADING__) {
    return;
  }

  window.__GUANCE_RUM_SCRIPT_LOADING__ = true;

  window.DATAFLUX_RUM = window.DATAFLUX_RUM || {
    q: [],
    onReady(callback: () => void) {
      window.DATAFLUX_RUM?.q?.push(callback);
    },
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = RUM_CDN_URL;
  script.onload = () => {
    window.__GUANCE_RUM_SCRIPT_LOADING__ = false;
    onReady();
  };
  script.onerror = () => {
    window.__GUANCE_RUM_SCRIPT_LOADING__ = false;
  };

  document.head.appendChild(script);
};

export default initRum;
