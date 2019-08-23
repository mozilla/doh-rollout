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

  async setState(state) {
    await browser.experiments.settings.set(this.settingName, state);
    await browser.experiments.heuristics.sendStatePing(state);
    await stateManager.rememberTRRMode();
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

  async rememberDisableHeuristics() {
    console.log("Remembering to never run heuristics again");
    await browser.experiments.settings.setPref("doh-rollout.disable-heuristics",
      true, "bool");
  },

  async shouldRunHeuristics() {
    let prevMode = await browser.experiments.settings.getUserPref(
      "doh-rollout.previous.trr.mode", 0);
    let curMode = await browser.experiments.settings.getUserPref(
      "network.trr.mode", 0);
    let disableHeuristics = await browser.experiments.settings.getUserPref(
      "doh-rollout.disable-heuristics", false);
    console.log("Comparing previous trr mode to current mode:", 
      prevMode, curMode);

    // Don't run heuristics if:
    //  1) Previous doesn't mode equals current mode, i.e. user overrode our changes
    //  2) TRR mode equals 5, i.e. user clicked "No" on doorhanger
    //  3) TRR mode equuls 3, i.e. user enabled "strictly on" for DoH
    //  4) They've been disabled in the past for the reasons listed above
    //
    // In other words, if the user has made their own decision for DoH,
    // then we want to respect that and never run the heuristics again
    //
    // TODO: Replace rememberTRRMode() with setState(), 
    // passing a state that indicates user's choice, 
    // e.g. "user_disabled" or "user_enabled".
    //
    // I'm not sure how to set a state that doens't reset the prefs 
    // to default values, though.
    if (disableHeuristics) {
      await stateManager.rememberTRRMode();
      return false;
    } else if ((prevMode !== curMode) ||
               (curMode === 5) ||
               (curMode === 3)) {
      await stateManager.rememberDisableHeuristics();
      await stateManager.rememberTRRMode();
      return false;
    }
    return true;
  },

  async shouldShowDoorhanger() {
    let doorhangerShown = await browser.experiments.settings.getUserPref(
      "doh-rollout.doorhanger-shown", false);
    let doorhangerPingSent = await browser.experiments.settings.getUserPref(
      "doh-rollout.doorhanger-ping-sent", false);

    // If we've shown the doorhanger but haven't sent the ping,
    // we assume that the doorhanger timed out
    if (doorhangerShown && !(doorhangerPingSent)) {
      await stateManager.setState("UITimeout");
      await stateManager.rememberDoorhangerDecision("UITimeout");
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
    await stateManager.rememberDoorhangerDecision("UIOk");
    await stateManager.rememberDoorhangerPingSent();
  },

  async doorhangerDeclineListener(tabId) {
    console.log("Doorhanger declined on tab", tabId);
    await stateManager.setState("UIDisabled");
    await stateManager.rememberDoorhangerDecision("UIDisabled");
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
    } else {
      await stateManager.setState("enabled");
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
    // Check the pref set by Normandy for running the addon
    let runAddon = await browser.experiments.settings.getUserPref(
      "doh-rollout.enabled", false);
    if (!runAddon) {
      console.log("Normandy pref is false; not running the addon");
      return;
    }

    // Register the events for sending pings
    browser.experiments.heuristics.setupTelemetry();
    
    // Enable the pref manager
    await stateManager.setSetting("trr-active");

    // Only run the heuristics if user hasn't explicitly enabled/disabled DoH
    let shouldRunHeuristics = await stateManager.shouldRunHeuristics();
    if (shouldRunHeuristics) {
      await this.main();
    }
  },

  async main() {
    // Listen to the captive portal when it unlocks
    browser.captivePortal.onStateChanged.addListener(this.onReady);

    // If the captive portal is already unlocked or doesn't exist,
    // run the measurement
    let captiveState = await browser.captivePortal.getState();
    if ((captiveState === "unlocked_portal") || 
        (captiveState === "not_captive")) {
      await this.onReady({state: captiveState});
    }

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
    }

    // Listen for network change events to run heuristics again
    browser.experiments.netChange.onConnectionChanged.addListener(
      async (reason) => {
        // Only run the heuristics if user hasn't explicitly enabled/disabled DoH
        let shouldRunHeuristics = await stateManager.shouldRunHeuristics();
        if (shouldRunHeuristics) {
          await rollout.netChangeListener(reason);
        }
      }
    );
  },
};


rollout.init();
