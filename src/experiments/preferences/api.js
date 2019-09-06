"use strict";

/* exported preferences */
/* global Components, ExtensionAPI, ExtensionCommon, Services */
let Cu2 = Components.utils;
Cu2.import("resource://gre/modules/Services.jsm");
Cu2.import("resource://gre/modules/ExtensionSettingsStore.jsm");
Cu2.import("resource://gre/modules/AddonManager.jsm");
Cu2.import("resource://gre/modules/NetUtil.jsm");
/* global ExtensionSettingsStore, AddonManager, NetUtil */

// TODO file scope issue on experiments that join extension contexts causing redeclaration issues.

const prefManager = {
  setPrefs(prefs) {
    prefs.forEach((pref) => {
      this.setPref(pref.name, pref.value, pref.type);
    });
  },
  setPref(name, value, type) {
    if (value === null) {
      return Services.prefs.clearUserPref(name);
    }
    /* As prefs are hidden we can't use Services.prefs.getPrefType */
    switch (type) {
    case "string":
      return Services.prefs.setCharPref(name, value);
    case "int":
      return Services.prefs.setIntPref(name, value);
    case "bool":
      return Services.prefs.setBoolPref(name, value);
    default:
      throw new Error("Unknown type");
    }
  },

  getUserPref(name, value) {
    if (!Services.prefs.prefHasUserValue(name)) {
      return value;
    }
    let type = Services.prefs.getPrefType(name);
    switch (type) {
    case Services.prefs.PREF_STRING:
      return Services.prefs.getCharPref(name, value);
    case Services.prefs.PREF_INT:
      return Services.prefs.getIntPref(name, value);
    case Services.prefs.PREF_BOOL:
      return Services.prefs.getBoolPref(name, value);
    default:
      throw new Error("Unknown type");
    }
  }
};

var preferences = class preferences extends ExtensionAPI {
  getAPI(context) {
    const EventManager = ExtensionCommon.EventManager;
    const {extension} = context;
    return {
      experiments: {
        preferences: {
          async setPref(name, value, type) {
            return prefManager.setPref(name, value, type);
          },
          async getUserPref(name, value) {
            return prefManager.getUserPref(name, value);
          },

          onPrefChanged: new EventManager({
            context,
            name: "preferences.onPrefChanged",
            register: fire => {
              let observer = _ => {
                fire.async();
              };
              Services.prefs.addObserver("doh-rollout.enabled", observer);
              return () => {
                Services.prefs.removeObserver("doh-rollout.enabled", observer);
              };
            }
          }).api(),
        },
      },
    };
  }
};
