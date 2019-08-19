"use strict";
/* exported netChange */
/* global Cc, Ci, Components, EventManager, ExtensionAPI, Services */
let Cu4 = Components.utils;
Cu4.import("resource://gre/modules/Services.jsm");
Cu4.import("resource://gre/modules/ExtensionCommon.jsm");


var {EventManager, EventEmitter} = ExtensionCommon;
let gNetworkLinkService= Cc["@mozilla.org/network/network-link-service;1"]
                         .getService(Ci.nsINetworkLinkService);


var netChange = class netChange extends ExtensionAPI { 
  getAPI(context) {
    return {
      experiments: {
        netChange: {
          onConnectionChanged: new EventManager({
            context,
            name: "netChange.onConnectionChanged",
            register: fire => {
              let observer = _ => {
                let connectivity = true; // let's be optimistic!
                if (gNetworkLinkService.linkStatusKnown) {
                  console.log("Link changed; network is up");
                  connectivity = gNetworkLinkService.isLinkUp;
                }
                fire.async(connectivity);
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
