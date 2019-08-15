"use strict";
/* global browser, checkContentFilters, checkGlobalCanary */


const STUDY_URL = browser.extension.getURL("study.html");


const stateManager = {
  _settingName: null,

  set settingName(settingName) {
    if (this._settingName === null) {
      this._settingName = settingName;
    } else {
      throw new Error("already set setting");
    }
  },

  get settingName() {
    if (this._settingName === null) {
      throw new Error("set setting not set");
    } else {
      return this._settingName;
    }
  },

  async getState() {
    return await browser.experiments.settings.get(this.settingName) || null;
  },

  async setState(stateKey) {
    browser.experiments.settings.set(this.settingName, stateKey);
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

  async disableDoh() {
    await stateManager.setState("disabled");  
  },

  async enableDoh() {
    await stateManager.setState("enabled"); 
  },

  async runStartupHeuristics() {
    let contentFilterChecks = await checkContentFilters(); 
    let canaryCheck = {"globalCanary": await checkGlobalCanary()};
    let policiesCheck = {"enterprisePolicies": await browser.experiments.heuristics.checkEnterprisePolicies()};
    let results = Object.assign(contentFilterChecks, canaryCheck, policiesCheck);

    let disablingDoh = Object.values(results).some(item => item === true);
    if (disablingDoh) {
      console.log("Disabling DoH");
      await this.disableDoh();
    } else {
      console.log("Enabling DoH");
      await this.enableDoh();
    }
    await this.sendHeuristicsPing(results, disablingDoh);
  },

  async runSplitHorizonHeuristic() {

  },

  async init() {
    browser.browserAction.onClicked.addListener(() => {
      this.showTab();
    });
    browser.runtime.onMessage.addListener((...args) => 
      this.handleMessage(...args));
    await this.onReady();
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

  async onReady() {
    // Check for parental controls, enterprise policies, and the global canary 
    // domain when the browser starts
    await stateManager.setSetting("trr-active");
    await this.runStartupHeuristics(); 

    // TODO: Show notification if:
    //  1) Heuristics don't disable DoH
    //  2) User hasn't enabled DoH explicitly
    //  3) User hasn't seen notification before
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
