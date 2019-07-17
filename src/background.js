"use strict";

/* global browser */
const STUDY_URL = browser.extension.getURL("study.html");
const SETTING_NAME = "trr";
const baseStudySetup = {
  activeExperimentName: browser.runtime.id,
  studyType: "shield",
  // telemetry
  telemetry: {
    // default false. Actually send pings.
    send: true,
    // Marks pings with testing=true.  Set flag to `true` before final release
    removeTestingFlag: false,
  },
  endings: {
    // standard endings
    "user-disable": {
      baseUrls: [],
      category: "ended-negative",
    },
    ineligible: {
      baseUrls: [],
      category: "ended-neutral",
    },
    expired: {
      baseUrls: [],
      category: "ended-positive",
    },

    // custom endings
    UIDisabled: {
      baseUrls: [],
      category: "ended-negative",
    },
  },
  weightedVariations: [
    {
      name: "trr-active",
      weight: 1
    },
  ],
  // maximum time that the study should run, from the first run
  expire: {
    days: 7,
  },
  allowEnroll: true,
};

const stateManager = {
  _settingName: null,

  set settingName(settingName) {
    if (this._settingName == null) {
      this._settingName = settingName;
    } else {
      throw new Error("already set setting");
    }
  },

  get settingName() {
    if (this._settingName == null) {
      throw new Error("set setting not set");
    } else {
      return this._settingName;
    }
  },

  async getState() {
    return await browser.experiments.settings.get(this.settingName) || null;
  },

  async setState(stateKey) {
    browser.study.sendTelemetry({stateKey});
    browser.experiments.settings.set(this.settingName, stateKey);
  },

  /* settingName impacts the active states file we will be getting:
     trr-active, trr-study
   */
  async setSetting(settingName) {
    stateManager.settingName = settingName;
    return browser.experiments.settings.add(this.settingName);
  },

  endStudy(stateKey) {
    browser.study.sendTelemetry({stateKey, disabling: "yes"});
    browser.study.endStudy(stateKey || "generic");
  },

  // Clear out settings
  async clear(stateKey = null) {
    browser.experiments.settings.clear(stateKey);
  }
};

async function hasFacebookCookie() {
  let checkURL = "https://facebook.com";
  let stores = await browser.cookies.getAllCookieStores();
  for (let store of stores) {
    if (await browser.cookies.get({name: "xs", url: checkURL, storeId: store.id}) ||
        await browser.cookies.get({name: "c_user", url: checkURL, storeId: store.id})) {
      return true;
    }
  }
  return false;
}

const rollout = {
  async init() {
    browser.browserAction.onClicked.addListener(() => {
      this.showTab();
    });
    browser.study.onEndStudy.addListener((ending) => {
      //TODO make sure we handle all endings here
      stateManager.clear(ending);
    });
    browser.study.onReady.addListener(() => {
      this.onReady()
    });
    await browser.study.setup(baseStudySetup);
    browser.runtime.onMessage.addListener((...args) => this.handleMessage(...args));
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
    const studyInfo = await browser.study.getStudyInfo();
    if (!studyInfo.isFirstRun) {
      this.setupAlarm();
      return;
    }
    // If the user hasn't met the criteria clean up
    if (await browser.experiments.settings.hasModifiedPrerequisites()) {
      stateManager.endStudy("ineligible");
    }
    const variation = studyInfo.variation.name;
    if (variation == "control") {
      // Return early as we don't have a control.json file
      return;
    }
    await stateManager.setSetting(variation);
    const stateName = await stateManager.getState();
    switch (stateName) {
    case "enabled":
    case "disabled":
    case "UIDisabled":
    case "UIOk":
    case "uninstalled":
    case null:
      await stateManager.setState("loaded");
      await this.show();
      break;
      // If the user has a thrown error show the banner again (shouldn't happen)
    case "loaded":
      await this.show();
      break;
    }
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
    stateManager.endStudy("UIDisabled");
  },

  async alarm(alarmInfo) {
    // Let's verify that we have the expected settings as we want for
    // this performance study.
    let prereq = await browser.experiments.settings.prerequisites();
    let interval = prereq["network.trr.experimentalPerfInterval"];
    let repeatCount = prereq["network.trr.experimentalPerfRepeatCount"];
    // Sanity check that our interval pref is never smaller than 1 minute
    let minInterval = 60 * 1000;
    if (prereq["network.trr.mode"] !== 2 &&
        prereq["network.trr.uri"] != "https://mozilla.cloudflare-dns.com/dns-query" &&
        interval > minInterval &&
        repeatCount > 0) {
      stateManager.endStudy("ineligible");
    }

    let { lastChecked = 0, sentCount = 0 } = await browser.storage.local.get(["lastChecked", "sentCount"]); 
    let time = Date.now();
    if (lastChecked + interval < time) {
      await browser.storage.local.set({ lastChecked: time, sentCount: ++sentCount });
      // Perform perf checks
      let hasFb = await hasFacebookCookie();
      let results = await browser.experiments.perf.measure(repeatCount, hasFb);
      // Send the report to shield
      browser.study.sendTelemetry({ event: "perf-report", results: JSON.stringify(results), sentCount: String(sentCount) });
    }
  },

  setupAlarm() {
    let periodInMinutes = 1;
    browser.alarms.onAlarm.addListener((alarmInfo) => {
      this.alarm(alarmInfo);
    });
    browser.alarms.create("check-should-trigger", {
      periodInMinutes,
    });
  },

  async show() {
    this.setupAlarm();

    // This doesn't handle the 'x' clicking on the notification mostly because it's not clear what the user intended here.
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
      message: browser.i18n.getMessage("notificationMessage"),
      buttons: [
        {title: browser.i18n.getMessage("disableButtonText")},
        {title: browser.i18n.getMessage("acceptButtonText")}
      ],
      moreInfo: {
        url: STUDY_URL,
        title: browser.i18n.getMessage("learnMoreLinkText")
      }
    });
    // Set enabled state last in-case the code above fails.
    await stateManager.setState("enabled");
  }
};

rollout.init();

