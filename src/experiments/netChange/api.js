"use strict";
/* exported netChange */
/* global Cc, Ci, Components, EventManager, ExtensionAPI, Services */
let Cu4 = Components.utils;
Cu4.import("resource://gre/modules/Services.jsm");
Cu4.import("resource://gre/modules/ExtensionCommon.jsm");


const { clearTimeout, setTimeout } = Cu4.import(
    "resource://gre/modules/Timer.jsm"
);

var {EventManager, EventEmitter} = ExtensionCommon;
let gNetworkLinkService= Cc["@mozilla.org/network/network-link-service;1"]
                         .getService(Ci.nsINetworkLinkService);


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


var netChange = class netChange extends ExtensionAPI { 
  getAPI(context) {
    return {
      experiments: {
        netChange: {
          onConnectionChanged: new EventManager({
            context,
            name: "netChange.onConnectionChanged",
            register: fire => {
              let observer = async (subject, topic, data) => {
                if (gNetworkLinkService.linkStatusKnown &&
                    gNetworkLinkService.isLinkUp &&
                    data === "changed") {
                  // The "changed" event sometimes fires when the connection 
                  // isn't quite up yet. We should wait before running the 
                  // heuristics to ensure the network is up.
                  await sleep(5000);
  
                  // After sleeping, check the connection again
                  if (gNetworkLinkService.linkStatusKnown &&
                      gNetworkLinkService.isLinkUp &&
                      data === "changed") {
                    fire.async(data);
                  }
                }
              };
              Services.obs.addObserver(observer, "network:link-status-changed");
              return () => {
                Services.obs.removeObserver(observer, "network:link-status-changed");
              };
            }
          }).api()
        }
      }
    };
  }
};
