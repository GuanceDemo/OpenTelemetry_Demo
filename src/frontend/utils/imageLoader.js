// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0
/*
  * We connect to image-provider through the envoy proxy, straight from the browser, for this we need to know the current hostname and port.
  * During building and serverside rendering, these are undefined so we use some conditionals and default values.
  */
export default function imageLoader({ src, width, quality }) {
  const normalizedSrc = src.startsWith('/') ? src.slice(1) : src;

  if (typeof window === "undefined" || !window.location) {
    return `/${normalizedSrc}?w=${width}&q=${quality || 75}`;
  }

  const protocol = window.location.protocol.slice(0, -1);
  const hostname = window.location.hostname;
  const port = window.location.port
    ? parseInt(window.location.port, 10)
    : (window.location.protocol === "https:" ? 443 : 80);

  // We pass down the optimisation request to the image-provider service here, without this, nextJs would try to use internal optimiser which is not working with the external image-provider.
  return `${protocol}://${hostname}:${port}/${normalizedSrc}?w=${width}&q=${quality || 75}`;
}
