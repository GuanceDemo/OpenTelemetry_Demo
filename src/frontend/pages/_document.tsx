// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import Document, { DocumentContext, Html, Head, Main, NextScript } from 'next/document';
import { ServerStyleSheet } from 'styled-components';
import {context, propagation} from "@opentelemetry/api";

const {
  ENV_PLATFORM,
  WEB_OTEL_SERVICE_NAME,
  PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  OTEL_COLLECTOR_HOST,
  GUANCE_RUM_ENABLED = 'true',
  GUANCE_RUM_APPLICATION_ID = 'OpenTelemetry_Demo',
  GUANCE_RUM_SITE = 'https://rum-openway.guance.com',
  GUANCE_RUM_CLIENT_TOKEN = '6e7e54705d5f4493a983f6a8d86bbd75',
  GUANCE_RUM_ENV = 'prod',
  GUANCE_RUM_VERSION = '1.0.0',
  GUANCE_RUM_SERVICE = 'OpenTelemetry_Demo',
  GUANCE_RUM_SESSION_SAMPLE_RATE = '100',
  GUANCE_RUM_SESSION_REPLAY_SAMPLE_RATE = '100',
  GUANCE_RUM_COMPRESS_INTAKE_REQUESTS = 'true',
  GUANCE_RUM_TRACK_INTERACTIONS = 'true',
  GUANCE_RUM_TRACE_TYPE = 'w3c_traceparent',
} = process.env;

export default class MyDocument extends Document<{ envString: string }> {
  static async getInitialProps(ctx: DocumentContext) {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: App => props => sheet.collectStyles(<App {...props} />),
        });

      const initialProps = await Document.getInitialProps(ctx);
      const baggage = propagation.getBaggage(context.active());
      const isSyntheticRequest = baggage?.getEntry('synthetic_request')?.value === 'true';

      const otlpTracesEndpoint = isSyntheticRequest
          ? `http://${OTEL_COLLECTOR_HOST}:4318/v1/traces`
          : PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

      const envString = `
        window.ENV = {
          NEXT_PUBLIC_PLATFORM: '${ENV_PLATFORM}',
          NEXT_PUBLIC_OTEL_SERVICE_NAME: '${WEB_OTEL_SERVICE_NAME}',
          NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: '${otlpTracesEndpoint}',
          IS_SYNTHETIC_REQUEST: '${isSyntheticRequest}',
          NEXT_PUBLIC_GUANCE_RUM_ENABLED: '${GUANCE_RUM_ENABLED}',
          NEXT_PUBLIC_GUANCE_RUM_APPLICATION_ID: '${GUANCE_RUM_APPLICATION_ID}',
          NEXT_PUBLIC_GUANCE_RUM_SITE: '${GUANCE_RUM_SITE}',
          NEXT_PUBLIC_GUANCE_RUM_CLIENT_TOKEN: '${GUANCE_RUM_CLIENT_TOKEN}',
          NEXT_PUBLIC_GUANCE_RUM_ENV: '${GUANCE_RUM_ENV}',
          NEXT_PUBLIC_GUANCE_RUM_VERSION: '${GUANCE_RUM_VERSION}',
          NEXT_PUBLIC_GUANCE_RUM_SERVICE: '${GUANCE_RUM_SERVICE}',
          NEXT_PUBLIC_GUANCE_RUM_SESSION_SAMPLE_RATE: '${GUANCE_RUM_SESSION_SAMPLE_RATE}',
          NEXT_PUBLIC_GUANCE_RUM_SESSION_REPLAY_SAMPLE_RATE: '${GUANCE_RUM_SESSION_REPLAY_SAMPLE_RATE}',
          NEXT_PUBLIC_GUANCE_RUM_COMPRESS_INTAKE_REQUESTS: '${GUANCE_RUM_COMPRESS_INTAKE_REQUESTS}',
          NEXT_PUBLIC_GUANCE_RUM_TRACK_INTERACTIONS: '${GUANCE_RUM_TRACK_INTERACTIONS}',
          NEXT_PUBLIC_GUANCE_RUM_TRACE_TYPE: '${GUANCE_RUM_TRACE_TYPE}',
        };`;
      return {
        ...initialProps,
        styles: [initialProps.styles, sheet.getStyleElement()],
        envString,
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html>
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body>
          <Main />
          <script dangerouslySetInnerHTML={{ __html: this.props.envString }}></script>
          <NextScript />
        </body>
      </Html>
    );
  }
}
