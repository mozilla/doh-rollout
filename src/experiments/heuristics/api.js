"use strict";
/* exported heuristics */
/* global Cc, Ci, Components, ExtensionAPI, Services  */
let Cu3 = Components.utils;
Cu3.import("resource://gre/modules/Services.jsm");


let pcs = Cc["@mozilla.org/parental-controls-service;1"]
          .getService(Ci.nsIParentalControlsService);

const TELEMETRY_CATEGORY = "doh";

const TELEMETRY_EVENTS = {
  "evaluate": {
    methods: [ "evaluate" ],
    objects: [ "heuristics" ],
    extra_keys: ["google", "youtube", "comcastProtect", "comcastParent", "canary", "modifiedRoots", "browserParent", "policy", "evaluateReason"],
    record_on_release: true,
  },
  "state": {
    methods: ["state"],
    objects: ["loaded", "enabled", "disabled", "uninstalled",
      "UIOk", "UIDisabled", "UITimeout"],
    extra_keys: [],
    record_on_release: true,
  }
};

const heuristicsManager = {
  setupTelemetry() {
    // Set up the Telemetry for the heuristics and addon state
    Services.telemetry.registerEvents(TELEMETRY_CATEGORY, TELEMETRY_EVENTS).catch(e => {
      // eslint-disable-next-line no-console: ""
      console.error("Failed to register telemetry events!", e);
    });
  },

  sendHeuristicsPing(decision, results) {
    console.log("Sending a heuristics ping", decision, results);
    Services.telemetry.recordEvent("doh", "evaluate", "heuristics",
                                   decision, results);
  },

  sendStatePing(state) {
    console.log("Sending an addon state ping", state);
    Services.telemetry.recordEvent("doh", "state", state, "null");
  },

  async checkEnterprisePolicies() {
    if (Services.policies.status === Services.policies.ACTIVE) {
      let policies = Services.policies.getActivePolicies();
      if (!("DNSOverHTTPS" in policies)) {
        // If DoH isn't in the policy, disable it
        return "disable_doh";
      } else {
        let dohPolicy = policies.DNSOverHTTPS;
        if (dohPolicy.Enabled === true) {
          // If DoH is enabled in the policy, enable it
          return "enable_doh";
        } else {
          // If DoH is disabled in the policy, disable it
          return "disable_doh";
        }
      }
    }

    // Enable DoH by default
    return "enable_doh";
  },

  async checkParentalControls() {
    let enabled = pcs.parentalControlsEnabled;
    if (enabled) {
      return "disable_doh";
    }
    return "enable_doh";
  }
};


var heuristics = class heuristics extends ExtensionAPI {
  getAPI(context) {
    return {
      experiments: {
        heuristics: {
          setupTelemetry() {
            heuristicsManager.setupTelemetry();
          },

          sendHeuristicsPing(decision, results) {
            heuristicsManager.sendHeuristicsPing(decision, results); 
          },

          sendStatePing(state) {
            heuristicsManager.sendStatePing(state);
          },

          async checkEnterprisePolicies() {
            let result = await heuristicsManager.checkEnterprisePolicies();
            return result;
          },

          async checkParentalControls() {
            let result = await heuristicsManager.checkParentalControls();
            return result;
          }
        },
      },
    };
  }
};
