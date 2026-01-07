"use client";

import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = "19ac7df4d65d340fcc45ce79c7eeb829";

let inited = false;

export function initMixpanel() {
  if (inited) return;
  if (typeof window === "undefined") return;

  mixpanel.init(MIXPANEL_TOKEN, {
    autocapture: true,
    record_sessions_percent: 100,
    // debug ajuda MUITO no começo
    debug: process.env.NODE_ENV !== "production",
  });

  // deixa acessível como window.mixpanel (pra testar no console)
  (window as any).mixpanel = mixpanel;

  inited = true;
}

export default mixpanel;
