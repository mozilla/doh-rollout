"use strict";
/* global browser, checkContentFilters, checkGlobalCanary, checkTLDExists */


const stateManager = {
  _settingName: null,
  _captiveState: "unknown",


  get captiveState() {
    return this._captiveState;
  },

  set captiveState(captiveState) {
    this._captiveState = captiveState;
  },

  get settingName() {
    if (this._settingName === null) {
      throw new Error("set setting not set");
    } else {
      return this._settingName;
    }
  },

  set settingName(settingName) {
    if (this._settingName === null) {
      this._settingName = settingName;
    } else {
      throw new Error("already set setting");
    }
  },

  async getState() {
    return await browser.experiments.settings.get(this.settingName) || null;
  },

  async setState(stateKey) {
    await browser.experiments.settings.set(this.settingName, stateKey);
  },

  /* settingName impacts the active states file we will be getting:
     trr-active, trr-study
   */
  async setSetting(settingName) {
    stateManager.settingName = settingName;
    return browser.experiments.settings.add(this.settingName);
  },

  // Clear out settings
  async clear(stateKey = null) {
    browser.experiments.settings.clear(stateKey);
  },
};


const rollout = {
  async runStartupHeuristics() {
    // Combine heuristic results
    let contentFilterChecks = await checkContentFilters(); 
    let canaryCheck = {canary: await checkGlobalCanary()};
    let policiesCheck = {policy: await browser.experiments.heuristics.checkEnterprisePolicies()};
    let results = Object.assign(contentFilterChecks, canaryCheck, policiesCheck);

    // Check if DoH should be disabled
    let disablingDoh = Object.values(results).some(item => item === "disable_doh");
    let decision;
    if (disablingDoh) {
      decision = "disable_doh";
      console.log("Heuristics failed; disabling DoH");
      await stateManager.setState("disabled");
    } else {
      decision = "enable_doh";
      console.log("Heuristics passed; enabling DoH");
      await stateManager.setState("enabled");
    }
    browser.experiments.heuristics.sendHeuristicsPing(decision, results);
  },

  async runSplitDNSCheck(responseDetails) {
    let tldExists = await checkTLDExists(responseDetails);
    if (!(tldExists)) {
      console.log("Split DNS detected; disabling DoH");
      await stateManager.setState("disabled");
    }
  },

  async init() {
    await this.main();
  },

  async onReady(details) {
    let currentlyOffline = (stateManager.captiveState !== "unlocked_portal" &&
                            stateManager.captiveState !== "not_captive");
    let goingOnline = (details.state === "unlocked_portal" || 
                       details.state === "not_captive");

    if (currentlyOffline && goingOnline) {
      // Run startup heuristics to enable/disable DoH
      await this.runStartupHeuristics();

      // Check for split horizon by listening for each 
      // request and seeing if the URL doesn't have a public suffix
      let filter = {urls: ["<all_urls>"], types: ["main_frame"]};
      browser.webRequest.onBeforeRedirect.addListener(this.runSplitDNSCheck, filter);
      browser.webRequest.onCompleted.addListener(this.runSplitDNSCheck, filter);

      // TODO: Show notification if:
      //  1) Heuristics don't disable DoH
      //  2) User hasn't enabled DoH explicitly
      //  3) User hasn't seen notification before
    }
    stateManager.captiveState = details.state;
  },

  async main() {
    // Enable the pref manager
    await stateManager.setSetting("trr-active");

    // Register the events for sending pings
    browser.experiments.heuristics.setupTelemetry();

    // If the captive portal is already unlocked or doesn't exist,
    // run the measurement
    let captiveState = await browser.captivePortal.getState();
    if (captiveState === "unlocked_portal" || captiveState === "not_captive") {
      await this.onReady({state: captiveState});
    }

    // Listen to the captive portal when it unlocks
    browser.captivePortal.onStateChanged.addListener(this.onReady);
  }
};


rollout.init();
