"use strict";
/* global browser, checkContentFilters, checkGlobalCanary, checkTLDExists */


const STUDY_URL = browser.extension.getURL("study.html");


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
  async sendHeuristicsPing(results, disablingDoh) {
    // Test ping
    const bucket = "doh-rollout";
    const options = {addClientId: true, addEnvironment: true};
    const payload = {
      type: bucket,
      data: results,
      disabling: disablingDoh,
      testing: true
    };
    browser.telemetry.submitPing(bucket, payload, options);
  },

  async runStartupHeuristics() {
    let contentFilterChecks = await checkContentFilters(); 
    let canaryCheck = {"globalCanary": await checkGlobalCanary()};
    let policiesCheck = {"enterprisePolicies": await browser.experiments.heuristics.checkEnterprisePolicies()};
    let results = Object.assign(contentFilterChecks, canaryCheck, policiesCheck);

    let disablingDoh = Object.values(results).some(item => item === true);
    if (disablingDoh) {
      console.log("Heuristics failed; disabling DoH");
      await stateManager.setState("disabled");
    } else {
      console.log("Heuristics passed; enabling DoH");
      await stateManager.setState("enabled");
    }
    await this.sendHeuristicsPing(results, disablingDoh);
  },

  async runSplitDNSCheck(responseDetails) {
    let tldExists = await checkTLDExists(responseDetails);
    if (!(tldExists)) {
      console.log("Split DNS detected; disabling DoH");
      await stateManager.setState("disabled");
    }
  },

  async init() {
    browser.browserAction.onClicked.addListener(() => {
      this.showTab();
    });
    browser.runtime.onMessage.addListener((...args) => 
      this.handleMessage(...args));
    await this.main();
  },

  async showTab() {
    const tabs = await this.findStudyTabs();
    if (tabs.length) {
      browser.tabs.update(tabs[0].id, {
        active: true
      });
    } else {
      browser.tabs.create({
        url: STUDY_URL
      });
    }
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
    await stateManager.setSetting("trr-active");

    // If the captive portal is already unlocked or doesn't exist,
    // run the measurement
    let captiveState = await browser.captivePortal.getState();
    if (captiveState === "unlocked_portal" || captiveState === "not_captive") {
      await this.onReady({state: captiveState});
    }

    // Listen to the captive portal when it unlocks
    browser.captivePortal.onStateChanged.addListener(this.onReady);
  },

  async handleMessage(message) {
    switch (message.method) {
    case "UIDisable":
      await this.handleUIDisable();
      break;
    case "UIOK":
      await this.handleUIOK();
      break;
    }
  },

  async handleUIOK() {
    await stateManager.setState("UIOk");
    browser.experiments.notifications.clear("rollout-prompt");
  },

  findStudyTabs() {
    return browser.tabs.query({
      url: STUDY_URL
    });
  },

  async handleUIDisable() {
    const tabs = await this.findStudyTabs();
    browser.tabs.remove(tabs.map((tab) => tab.id));
    browser.experiments.notifications.clear("rollout-prompt");
  },

  async show() {
    // This doesn't handle the 'x' clicking on the notification 
    // mostly because it's not clear what the user intended here.
    browser.experiments.notifications.onButtonClicked.addListener((options) => {
      switch (Number(options.buttonIndex)) {
      case 1:
        this.handleUIOK();
        break;
      case 0:
        this.handleUIDisable();
        break;
      }
    });
    browser.experiments.notifications.create("rollout-prompt", {
      type: "prompt",
      title: "",
      message: "notificationMessage",
      buttons: [
        {title: "disableButtonText"},
        {title: "acceptButtonText"}
      ],
      moreInfo: {
        url: STUDY_URL,
        title: "learnMoreLinkText"
      }
    });
    // Set enabled state last in-case the code above fails.
    await stateManager.setState("enabled");
  }
};


rollout.init();
