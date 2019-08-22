"use strict";
/* global browser, runHeuristics */


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

  async rememberTRRMode() {
    let curMode = await browser.experiments.settings.getUserPref("network.trr.mode", 0);
    console.log("Saving current trr mode:", curMode);
    await browser.experiments.settings.setPref("doh-rollout.previous.trr.mode", curMode, "int");
  },

  async rememberDoorhangerShown() {
    console.log("Remembering that doorhanger has been shown");
    await browser.experiments.settings.setPref("doh-rollout.doorhanger-shown", 
      true, "bool");
  },

  async rememberDoorhangerPingSent() {
    console.log("Remembering that doorhanger ping has been sent");
    await browser.experiments.settings.setPref("doh-rollout.doorhanger-ping-sent", 
      true, "bool");
  },

  async rememberDoorhangerDecision(decision) {
    console.log("Remember doorhanger decision:", decision);
    await browser.experiments.settings.setPref("doh-rollout.doorhanger-decision", 
      decision, "string");
  },

  async shouldRunHeuristics() {
    let prevMode = await browser.experiments.settings.getUserPref(
      "doh-rollout.previous.trr.mode", 0);
    let curMode = await browser.experiments.settings.getUserPref(
      "network.trr.mode", 0);
    console.log("Comparing previous trr mode to current mode:", 
      prevMode, curMode);

    // Don't run heuristics if:
    //  1) previous doesn't mode equals current mode, i.e. user overrode our changes
    //  2) TRR mode equals 5, i.e. user clicked "No" on doorhanger
    //  3) TRR mode equuls 3, i.e. user enabled "strictly on" for DoH
    //
    // In other words, if the user has made their own decision for DoH,
    // then we want to respect that
    if ((prevMode !== curMode) ||
        (curMode === 5) ||
        (curMode === 3)) {
      return false;
    }
    return true;
  },

  async shouldShowDoorhanger() {
    let doorhangerShown = await browser.experiments.settings.getUserPref(
      "doh-rollout.doorhanger-shown", false);
    let doorhangerDecision = await browser.experiments.settings.getUserPref(
      "doh-rollout.doorhanger-decision", "timeout");
    let doorhangerPingSent = await browser.experiments.settings.getUserPref(
      "doh-rollout.doorhanger-ping-sent", false);

    // If we've shown the doorhanger but haven't sent the ping, do it now
    if (doorhangerShown && !(doorhangerPingSent)) {
      await stateManager.setState("UITimeout");
      await stateManager.rememberTRRMode();
      await stateManager.rememberDoorhangerDecision("timeout");
      browser.experiments.heuristics.sendDoorhangerPing(doorhangerDecision);
      await stateManager.rememberDoorhangerPingSent();
    }

    console.log("Should show doorhanger:", !doorhangerShown);
    return !doorhangerShown;
  }
};


var notificationTime = new Date().getTime() / 1000;


const rollout = {
  async doorhangerAcceptListener(tabId) {
    console.log("Doorhanger accepted on tab", tabId);
    await stateManager.setState("UIOk");
    await stateManager.rememberTRRMode();
    await stateManager.rememberDoorhangerDecision("enable_button");
    browser.experiments.heuristics.sendDoorhangerPing("enable_button");
    await stateManager.rememberDoorhangerPingSent();
  },

  async doorhangerDeclineListener(tabId) {
    console.log("Doorhanger declined on tab", tabId);
    await stateManager.setState("UIDisabled");
    await stateManager.rememberTRRMode();
    await stateManager.rememberDoorhangerDecision("disable_button");
    browser.experiments.heuristics.sendDoorhangerPing("disable_button");
    await stateManager.rememberDoorhangerPingSent();
  },

  async netChangeListener(reason) {
    // Possible race condition between multiple notifications?
    let curTime = new Date().getTime() / 1000;
    let timePassed = curTime - notificationTime;
    console.log("Time passed since last network change:", timePassed);
    if (timePassed < 30) {
      return;
    }
    notificationTime = curTime;

    // Run heuristics to determine if DoH should be disabled
    let decision = await rollout.heuristics("netChange");
    if (decision === "disable_doh") {
      await stateManager.setState("disabled"); 
      await stateManager.rememberTRRMode();
    } else {
      await stateManager.setState("enabled");
      await stateManager.rememberTRRMode();
    }
  },

  async heuristics(evaluateReason) {
    // Run heuristics defined in heuristics.js and experiments/heuristics/api.js
    let results = await runHeuristics();

    // Check if DoH should be disabled
    let disablingDoh = Object.values(results).some(item => item === "disable_doh");
    let decision;
    if (disablingDoh) {
      decision = "disable_doh";
    } else {
      decision = "enable_doh";
    }
    console.log("Heuristics decision on " + evaluateReason + ": " + decision);

    // Send Telemetry on results of heuristics
    results.evaluateReason = evaluateReason;
    browser.experiments.heuristics.sendHeuristicsPing(decision, results);
    return decision;
  },

  async init() {
    // Only run the heuristics if user hasn't explicitly enabled/disabled DoH
    let shouldRunHeuristics = await stateManager.shouldRunHeuristics();
    if (shouldRunHeuristics) {
      await this.main();
    }
  },

  async main() {
    // Enable the pref manager
    await stateManager.setSetting("trr-active");

    // Register the events for sending pings
    browser.experiments.heuristics.setupTelemetry();

    // If the captive portal is already unlocked or doesn't exist,
    // run the measurement
    let captiveState = await browser.captivePortal.getState();
    if ((captiveState === "unlocked_portal") || 
        (captiveState === "not_captive")) {
      await this.onReady({state: captiveState});
    }

    // Listen to the captive portal when it unlocks
    browser.captivePortal.onStateChanged.addListener(this.onReady);
  },
   
  async onReady(details) {
    // Only proceed if we're not behind a captive portal
    if ((details.state !== "unlocked_portal") && 
        (details.state !== "not_captive")) {
      return;
    }

    // Run startup heuristics to determine if DoH should be disabled 
    let decision = await this.heuristics("startup");
    let shouldShowDoorhanger = await stateManager.shouldShowDoorhanger();
    if (decision === "disable_doh") {
      await stateManager.setState("disabled");
      await stateManager.rememberTRRMode();

    // If the heuristics say to enable DoH, determine if the doorhanger 
    // should be shown
    } else if (shouldShowDoorhanger) {
      browser.experiments.doorhanger.onDoorhangerAccept.addListener(
        this.doorhangerAcceptListener
      );
      browser.experiments.doorhanger.onDoorhangerDecline.addListener(
        this.doorhangerDeclineListener
      );
      await browser.experiments.doorhanger.show();
      await stateManager.rememberDoorhangerShown();

    // If the doorhanger doesn't need to be shown and the heuristics 
    // say to enable DoH, enable it
    } else {
      await stateManager.setState("enabled");
      await stateManager.rememberTRRMode();
    }

    // Listen for network change events to run heuristics again
    browser.experiments.netChange.onConnectionChanged.addListener(
      this.netChangeListener
    );
  },
};


rollout.init();
