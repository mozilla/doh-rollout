"use strict";
/* exported heuristics */
/* global Components, ExtensionAPI, Services  */
let Cu2 = Components.utils;
Cu2.import("resource://gre/modules/Services.jsm");


const heuristicsManager = {
  async checkEnterprisePolicies() {
    if (Services.policies.status === Services.policies.ACTIVE) {
      let policies = Services.policies.getActivePolicies();
      if (!("DNSOverHTTPS" in policies)) {
        // If DoH isn't in the policy, don't enable it
        return true;
      }
    }
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
