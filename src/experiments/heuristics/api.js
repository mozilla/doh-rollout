"use strict";
/* exported heuristics */
/* global Components, ExtensionAPI, Services  */
let Cu3 = Components.utils;
Cu3.import("resource://gre/modules/Services.jsm");


const heuristicsManager = {
  async setupTelemetry() {
    await Services.telemetry.registerEvents("doh", {
      // Results of heuristics
      "evaluate": {
        methods: ["evaluate"],
        objects: ["heuristics"],
        extra_keys: ["canary", "enterprise",
                     "malware", "parental",
                     "google", "youtube"]
      }
    });
    await Services.telemetry.setEventRecordingEnabled("doh", true);
  },

  sendHeuristicsPing(decision, results) {
    Services.telemetry.recordEvent("doh", "evaluate", "heuristics",
                                   decision, results);
    console.log("Ping sent");
  },

  async checkEnterprisePolicies() {
    if (Services.policies.status === Services.policies.ACTIVE) {
      let policies = Services.policies.getActivePolicies();
      if (!("DNSOverHTTPS" in policies)) {
        // If DoH isn't in the policy, disable it
        console.log("DoH not in policy");
        return "disable_doh";
      } else {
        let dohPolicy = policies.DNSOverHTTPS;
        if (dohPolicy.Enabled === true) {
          // If DoH is enabled in the policy, enable it
          console.log("DoH enabled in policy");
          return "enable_doh";
        } else {
          // If DoH is disabled in the policy, disable it
          console.log("DoH disable_doh in policy");
          return "disable_doh";
        }
      }
    }

    // Enable DoH by default
    console.log("Policy doesn't exist");
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
