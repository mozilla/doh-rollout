"use strict";

/* exported preferences */
/* global Components, ExtensionAPI, ExtensionCommon, Services */
let Cu2 = Components.utils;
Cu2.import("resource://gre/modules/Services.jsm");
Cu2.import("resource://gre/modules/ExtensionSettingsStore.jsm");
Cu2.import("resource://gre/modules/AddonManager.jsm");
Cu2.import("resource://gre/modules/NetUtil.jsm");
Cu2.import("resource://gre/modules/ExtensionPreferencesManager.jsm");
/* global ExtensionSettingsStore, AddonManager, NetUtil, ExtensionPreferencesManager */
// TODO file scope issue on experiments that join extension contexts causing redeclaration issues.

const TRR_URI_PREF = "network.trr.uri";
const TRR_DISABLE_ECS_PREF = "network.trr.disable-ECS";
const TRR_MODE_PREF = "network.trr.mode";

ExtensionPreferencesManager.addSetting("dohRollout.state", {
  prefNames: [
    TRR_URI_PREF,
    TRR_DISABLE_ECS_PREF,
    TRR_MODE_PREF,
  ],

  setCallback(value) {
    let prefs = {};
    prefs[TRR_URI_PREF] = "https://mozilla.cloudflare-dns.com/dns-query";
    prefs[TRR_DISABLE_ECS_PREF] = true;
    prefs[TRR_MODE_PREF] = 0;

    switch (value) {
    case "uninstalled":
      break;
    case "disabled":
      break;
    case "manuallyDisabled":
      break;
    case "UIOk":
    case "enabled":
      prefs[TRR_MODE_PREF] = 2;
      break;
    case "UIDisabled":
      prefs[TRR_MODE_PREF] = 5;
      break;
    }
    return prefs;
  },
});

const prefManager = {
  prefHasUserValue(name) {
    return Services.prefs.prefHasUserValue(name);
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
          async getUserPref(name, value) {
            return prefManager.getUserPref(name, value);
          },

          async prefHasUserValue(name) {
            return prefManager.prefHasUserValue(name);
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
            },
          }).api(),

          state: Object.assign(
            ExtensionPreferencesManager.getSettingsAPI(
              context.extension.id,
              "dohRollout.state",
              () => {
                throw new Error("Not supported");
              },
              undefined,
              false,
              () => {}
            ),
            {
              set: details => {
                return ExtensionPreferencesManager.setSetting(
                  context.extension.id,
                  "dohRollout.state",
                  details.value
                );
              },
            }
          ),
        },
      },
    };
  }
};
