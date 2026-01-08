(() => {
  "use strict";

  const DEBUG = false;
  const log = (...args) => DEBUG && console.log("[PokiSDK]", ...args);

  const getQueryParam = (key) => {
    const match = RegExp("[?&]" + key + "=([^&]*)").exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, " "));
  };

  const isKids = getQueryParam("tag") === "kids";
  log("Kids mode:", isKids);

  class SDKQueue {
    constructor() {
      this.queue = [];
    }

    enqueue(fn, options, resolve, reject) {
      if (isKids && reject) {
        reject();
        return;
      }

      this.queue.push({ fn, options, resolve, reject });
    }

    dequeue() {
      while (this.queue.length) {
        const { fn, options, resolve, reject } = this.queue.shift();

        if (typeof window.PokiSDK[fn] === "function") {
          const result = window.PokiSDK[fn](options);

          if (resolve || reject) {
            result.then(resolve).catch(reject);
          }
        } else {
          console.error("PokiSDK method missing:", fn);
        }
      }
    }

    promiseInit(options = {}) {
      return new Promise((resolve, reject) =>
        this.enqueue("init", options, resolve, reject)
      );
    }

    noArgs(fn) {
      return () => this.enqueue(fn);
    }

    oneArg(fn) {
      return (arg) => this.enqueue(fn, arg);
    }
  }

  const sdkQueue = new SDKQueue();

  window.PokiSDK = {
    init: sdkQueue.promiseInit.bind(sdkQueue),
    initWithVideoHB: sdkQueue.promiseInit.bind(sdkQueue),
    rewardedBreak: () => Promise.resolve(false),
    commercialBreak: () => Promise.resolve(),
    getLeaderboard: () => Promise.resolve(),
    getSharableURL: () => Promise.reject(),

    getURLParam: (key) =>
      getQueryParam("gd" + key) || getQueryParam(key) || "",
  };

  [
    "disableProgrammatic",
    "gameLoadingStart",
    "gameLoadingFinished",
    "gameInteractive",
    "roundStart",
    "roundEnd",
    "muteAd",
  ].forEach((fn) => {
    window.PokiSDK[fn] = sdkQueue.noArgs(fn);
  });

  [
    "setDebug",
    "gameplayStart",
    "gameplayStop",
    "gameLoadingProgress",
    "happyTime",
    "setPlayerAge",
    "togglePlayerAdvertisingConsent",
    "logError",
    "sendHighscore",
  ].forEach((fn) => {
    window.PokiSDK[fn] = sdkQueue.oneArg(fn);
  });

  const sdkVersion =
    window.pokiSDKVersion || getQueryParam("ab") || "v2.263.0";

  const sdkFile = `./poki-sdk-${isKids ? "kids" : "core"}-${sdkVersion}.js`;

  const sdkScript = document.createElement("script");
  sdkScript.src = sdkFile;
  sdkScript.crossOrigin = "anonymous";

  sdkScript.onload = () => {
    log("Poki SDK loaded");
    sdkQueue.dequeue();
  };

  sdkScript.onerror = () => {
    console.error("Failed to load Poki SDK:", sdkFile);
  };

  document.head.appendChild(sdkScript);
})();
