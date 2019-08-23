"use strict";
/* global Services, ChromeUtils, BrowserWindowTracker, 
   ExtensionCommon, ExtensionAPI */

ChromeUtils.import("resource://gre/modules/Console.jsm");
ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
ChromeUtils.import("resource://gre/modules/ExtensionUtils.jsm");

var {EventManager, EventEmitter} = ExtensionCommon;
var {Management: {global: {tabTracker}}} = ChromeUtils.import("resource://gre/modules/Extension.jsm", {});

ChromeUtils.defineModuleGetter(
  this,
  "BrowserWindowTracker",
  "resource:///modules/BrowserWindowTracker.jsm",
);


/** Return most recent NON-PRIVATE browser window, so that we can
 * manipulate chrome elements on it.
 */
function getMostRecentBrowserWindow() {
  return BrowserWindowTracker.getTopWindow({
    private: false,
    allowPopups: false,
  });
}


class DoorhangerEventEmitter extends EventEmitter {
  async emitShow(variationName) {
    const self = this;
    const recentWindow = getMostRecentBrowserWindow();
    const browser = recentWindow.gBrowser.selectedBrowser;
    const tabId = tabTracker.getBrowserTabId(browser);

    const primaryAction =  {
      disableHighlight: false,
      label: "OK, Got It",
      accessKey: "f",
      callback: () => {
        self.emit("doorhanger-accept", tabId);
      },
    };
    const secondaryActions =  [
      {
        label: "Disable Protection",
        accessKey: "d",
        callback: () => {
          self.emit("doorhanger-decline", tabId);
        },
      },
    ];

    const options = {
      timeout: Date.now() + 900000,
      hideClose: true,
      persistent: true,
      autofocus: true,
      name: "More secure, encrypted DNS lookups",
      popupIconURL: "chrome://browser/skin/connection-secure.svg",
      learnMoreURL: "https://duckduckgo.com",
    };
    recentWindow.PopupNotifications.show(browser, "doh-first-time", "<> Firefox now sends your DNS lookups over an encrypted connection provided by a trusted partner. This helps protect against phishing, malware, and surveillance.", null, primaryAction, secondaryActions, options);
  }
}


var doorhanger = class doorhanger extends ExtensionAPI {
  getAPI(context) {
    const doorhangerEventEmitter= new DoorhangerEventEmitter();
    return {
      experiments: {
        doorhanger: {
          async show() {
            await doorhangerEventEmitter.emitShow();
          },
          onDoorhangerAccept: new EventManager({
            context,
            name: "doorhanger.onDoorhangerAccept",
            register: fire => {
              let listener = (value, tabId) => {
                fire.async(tabId);
              };
              doorhangerEventEmitter.on(
                "doorhanger-accept",
                listener,
              );
              return () => {
                doorhangerEventEmitter.off(
                  "doorhanger-accept",
                  listener,
                );
              };
            },
          }).api(),
          onDoorhangerDecline: new EventManager({
            context,
            name: "doorhanger.onDoorhangerDecline",
            register: fire => {
              let listener = (value, tabId) => {
                fire.async(tabId);
              };
              doorhangerEventEmitter.on(
                "doorhanger-decline",
                listener,
              );
              return () => {
                doorhangerEventEmitter.off(
                  "doorhanger-decline",
                  listener,
                );
              };
            }
          }).api(),
        },
      }
    };
  }
};
