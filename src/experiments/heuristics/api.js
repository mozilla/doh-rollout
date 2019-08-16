"use strict";
/* exported heuristics */
/* global Components, ExtensionAPI, Services  */
let Cu3 = Components.utils;
Cu3.import("resource://gre/modules/Services.jsm");


const heuristicsManager = {
  setupTelemetry() {
    Services.telemetry.registerEvents("doh", {
      // Results of heuristics
      "evaluate": {
        methods: ["evaluate"],
        objects: ["heuristics"],
        extra_keys: ["evaluateReason", "canary", "policy",
                     "comcastProtect", "comcastParent",
                     "google", "youtube"]
      }
    });
  },

  sendHeuristicsPing(decision, results) {
    Services.telemetry.recordEvent("doh", "evaluate", "heuristics",
                                   decision, results);
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

          async checkEnterprisePolicies() {
            let result = await heuristicsManager.checkEnterprisePolicies();
            return result;
          },
        },
      },
    };
  }
};
