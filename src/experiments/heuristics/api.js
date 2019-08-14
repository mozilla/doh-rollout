"use strict";
/* exported heuristics */
/* global Components, ExtensionAPI, Services  */
let Cu3 = Components.utils;
Cu3.import("resource://gre/modules/Services.jsm");


const heuristicsManager = {
  async checkEnterprisePolicies() {
    if (Services.policies.status === Services.policies.ACTIVE) {
      let policies = Services.policies.getActivePolicies();
      if (!("DNSOverHTTPS" in policies)) {
        // If DoH isn't in the policy, disable it
        console.log("DoH not in policy");
        return true;
      } else {
        let dohPolicy = policies.DNSOverHTTPS;
        if (dohPolicy.Enabled === true) {
          // If DoH is enabled in the policy, enable it
          console.log("DoH enabled in policy");
          return false;
        } else {
          // If DoH is disabled in the policy, disable it
          console.log("DoH disabled in policy");
          return true;
        }
      }
    }

    // Enable DoH by default
    console.log("Policy doesn't exist");
    return false;
  }
};


var heuristics = class heuristics extends ExtensionAPI {
  getAPI(context) {
    const {extension} = context;
    console.log(extension);
    return {
      experiments: {
        heuristics: {
          async checkEnterprisePolicies() {
            let result = await heuristicsManager.checkEnterprisePolicies();
            return result;
          },
        },
      },
    };
  }
};
