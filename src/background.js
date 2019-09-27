"use strict";
/* global browser, runHeuristics */

function log() {
  if (false) {
    console.log(...arguments);
  }
}

const TRR_MODE_PREF = "network.trr.mode";

const stateManager = {
  async setState(state) {
    browser.experiments.preferences.state.set({ value: state });
    await browser.experiments.heuristics.sendStatePing(state);
    await stateManager.rememberTRRMode();
  },

  async rememberTRRMode() {
    let curMode = await browser.experiments.preferences.getUserPref(TRR_MODE_PREF, 0);
    log("Saving current trr mode:", curMode);
    await rollout.setSetting("doh-rollout.previous.trr.mode", curMode);
  },

  async rememberDoorhangerShown() {
    log("Remembering that doorhanger has been shown");
    await rollout.setSetting("doh-rollout.doorhanger-shown", true);
  },

  async rememberDoorhangerPingSent() {
    log("Remembering that doorhanger ping has been sent");
    await rollout.setSetting("doh-rollout.doorhanger-ping-sent", true);
  },

  async rememberDoorhangerDecision(decision) {
    log("Remember doorhanger decision:", decision);
    await rollout.setSetting("doh-rollout.doorhanger-decision", decision);
  },

  async rememberDisableHeuristics() {
    log("Remembering to never run heuristics again");
    await rollout.setSetting("doh-rollout.disable-heuristics", true);
  },

  async shouldRunHeuristics() {
    // Check if heursitics has been disabled from rememberDisableHeuristics()
    let disableHeuristics = await rollout.getSetting("doh-rollout.disable-heuristics", false);
    if (disableHeuristics) {
      // Do not modify DoH for this user.
      log("disableHeuristics has been enabled.");
      return false;
    }

    let prevMode = await rollout.getSetting("doh-rollout.previous.trr.mode", 0);
    let curMode = await browser.experiments.preferences.getUserPref(
      TRR_MODE_PREF, 0);

    log("Comparing previous trr mode to current mode:",
      prevMode, curMode);

    // Don't run heuristics if:
    //  1) Previous doesn't mode equals current mode, i.e. user overrode our changes
    //  2) TRR mode equals 5, i.e. user clicked "No" on doorhanger
    //  3) TRR mode equals 3, i.e. user enabled "strictly on" for DoH
    //  4) They've been disabled in the past for the reasons listed above
    //
    // In other words, if the user has made their own decision for DoH,
    // then we want to respect that and never run the heuristics again

    // On Mismatch - run never run again (make init check a function)

    if (prevMode !== curMode) {
      log("Mismatched, curMode: ", curMode);
      if (curMode === 0) {
        // If user has manually set trr.mode to 0, and it was previously something else.
        await stateManager.rememberDisableHeuristics();
      } else {
        // Check if trr.mode is not in default value.
        await rollout.trrModePrefHasUserValueCheck();
      }
      return false;
    }

    return true;

  },

  async shouldShowDoorhanger() {
    let doorhangerShown = await rollout.getSetting("doh-rollout.doorhanger-shown", false);
    let doorhangerPingSent = await rollout.getSetting("doh-rollout.doorhanger-ping-sent", false);
    log("Should show doorhanger:", !doorhangerShown);
    return !doorhangerShown;
  }
};


let notificationTime = new Date().getTime() / 1000;

const rollout = {
  async doorhangerAcceptListener(tabId) {
    log("Doorhanger accepted on tab", tabId);
    await stateManager.setState("UIOk");
    await stateManager.rememberDoorhangerDecision("UIOk");
    await stateManager.rememberDoorhangerPingSent();
  },

  async doorhangerDeclineListener(tabId) {
    log("Doorhanger declined on tab", tabId);
    await stateManager.setState("UIDisabled");
    await stateManager.rememberDoorhangerDecision("UIDisabled");
    await stateManager.rememberDoorhangerPingSent();
    await stateManager.rememberDisableHeuristics();
  },

  async netChangeListener(reason) {
    // Possible race condition between multiple notifications?
    let curTime = new Date().getTime() / 1000;
    let timePassed = curTime - notificationTime;
    log("Time passed since last network change:", timePassed);
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
    log("Heuristics decision on " + evaluateReason + ": " + decision);

    // Send Telemetry on results of heuristics
    results.evaluateReason = evaluateReason;
    browser.experiments.heuristics.sendHeuristicsPing(decision, results);
    return decision;
  },

  async getSetting(name, defaultValue) {
    let data = await browser.storage.local.get(name);
    let value = data[name];
    if (value === undefined) {
      return defaultValue;
    }
    return data[name];
  },

  async setSetting(name, value) {
    await browser.storage.local.set({[name]: value});
  },

  async trrModePrefHasUserValueCheck() {
    log("trrModePrefHasUserValueCheck");
    // This confirms if a user has modified DoH (via the TRR_MODE_PREF) outside of the addon
    // This runs only on the FIRST time that add-on is enabled, and if the stored pref
    // mismatches the current pref (Meaning something outside of the add-on has changed it
    if (
      await browser.experiments.preferences.prefHasUserValue(
        TRR_MODE_PREF)
    ) {
      // TODO: Add telemtery ping for user who already has pref on DoH
      await stateManager.rememberDisableHeuristics();
      return;
    }
  },

  async init() {
    log("calling init");
    let doneFirstRun = await this.getSetting("doneFirstRun");

    if (!doneFirstRun) {
      log("first run!");
      this.setSetting("doneFirstRun", true);
      await this.trrModePrefHasUserValueCheck();

    } else {
      log("not first run!");
    }

    // Register the events for sending pings
    browser.experiments.heuristics.setupTelemetry();

    // Only run the heuristics if user hasn't explicitly enabled/disabled DoH
    let shouldRunHeuristics = await stateManager.shouldRunHeuristics();
    if (shouldRunHeuristics) {
      await rollout.main();
    }

    // Listen for network change events to run heuristics again
    browser.experiments.netChange.onConnectionChanged.addListener(async (reason) => {
      log("onConnectionChanged");
      // Only run the heuristics if user hasn't explicitly enabled/disabled DoH
      let shouldRunHeuristics = await stateManager.shouldRunHeuristics();
      if (shouldRunHeuristics) {
        const netChangeDecision = await rollout.heuristics("netChange");
        if (netChangeDecision === "disable_doh") {
          await stateManager.setState("disabled");
        } else {
          await stateManager.setState("enabled");
        }
      }
    });
  },

  async main() {
    // Listen to the captive portal when it unlocks
    browser.captivePortal.onStateChanged.addListener(rollout.onReady);

    // If the captive portal is already unlocked or doesn't exist,
    // run the measurement
    let captiveState = await browser.captivePortal.getState();
    log("Captive state:", captiveState);
    if ((captiveState === "unlocked_portal") ||
        (captiveState === "not_captive")) {
      await rollout.onReady({state: captiveState});
    }

  },

  async onReady(details) {
    // Now that we're here, stop listening to the captive portal
    browser.captivePortal.onStateChanged.removeListener(rollout.onReady);

    // Only proceed if we're not behind a captive portal
    if ((details.state !== "unlocked_portal") &&
        (details.state !== "not_captive")) {
      return;
    }

    // Run startup heuristics to determine if DoH should be disabled
    let decision = await rollout.heuristics("startup");
    let shouldShowDoorhanger = await stateManager.shouldShowDoorhanger();
    if (decision === "disable_doh") {
      await stateManager.setState("disabled");

    // If the heuristics say to enable DoH, determine if the doorhanger
    // should be shown
    } else if (shouldShowDoorhanger) {
      browser.experiments.doorhanger.onDoorhangerAccept.addListener(
        rollout.doorhangerAcceptListener
      );
      browser.experiments.doorhanger.onDoorhangerDecline.addListener(
        rollout.doorhangerDeclineListener
      );
      await browser.experiments.doorhanger.show({
        name: browser.i18n.getMessage("doorhangerName"),
        text: "<> " + browser.i18n.getMessage("doorhangerBody"),
        okLabel: browser.i18n.getMessage("doorhangerButtonOk"),
        okAccessKey: browser.i18n.getMessage("doorhangerButtonOkAccessKey"),
        cancelLabel: browser.i18n.getMessage("doorhangerButtonCancel"),
        cancelAccessKey: browser.i18n.getMessage("doorhangerButtonCancelAccessKey"),
      });

      await stateManager.rememberDoorhangerShown();

    // If the doorhanger doesn't need to be shown and the heuristics
    // say to enable DoH, enable it
    } else {
      await stateManager.setState("enabled");
    }
  },
};

const setup = {
  enabled: false,
  async start() {
    log("Start");
    let runAddon = await browser.experiments.preferences.getUserPref("doh-rollout.enabled", false);
    if (!runAddon && !this.enabled) {
      log("First run");
    } else if (!runAddon) {
      log("Disabling");
      this.enabled = false;
      browser.storage.local.clear();
      await stateManager.setState("disabled");
    } else {
      this.enabled = true;
      rollout.init();
    }

    browser.experiments.preferences.onPrefChanged.addListener(() => this.start());
  }
};

setup.start();
