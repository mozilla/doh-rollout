"use strict";

/* exported notifications */
/* global Components, ExtensionAPI, ExtensionCommon, Services */
let Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");

const {EventManager} = ExtensionCommon;

// Implements an experimental extension to the notifications api

Cu.import("resource://gre/modules/EventEmitter.jsm");
Cu.import("resource://gre/modules/BrowserUtils.jsm");
/* global BrowserUtils, EventEmitter */

class NotificationPrompt {
  constructor(extension, notificationsMap, id, options) {
    this.notificationsMap = notificationsMap;
    this.id = id;
    this.options = options;

    const browserWin = Services.wm.getMostRecentWindow("navigator:browser");
    let buttonsOutput = [];
    if (options.buttons) {
      const addButton = (button) => {
        let buttonIndex = buttonsOutput.length;
        buttonsOutput.push({
          label: button.title,
          callback: () => {
            this.handleEvent("buttonClicked", {
              notificationId: id,
              buttonIndex
            });
          }
        });
      };
      for (let button of options.buttons) {
        addButton(button);
      }
    }
    // Current nightly version 65 vs pre 65 notification
    this.box = browserWin.gNotificationBox || browserWin.document.getElementById("global-notificationbox");
    let outputMessage = options.message;
    if (options.moreInfo) {
      let mainMessage = "%S %S";
      let text = options.moreInfo.title || "Learn more";
      let link = browserWin.document.createXULElement("label", {is: "text-link"}); // 67
      link.className = "text-link"; // Pre 67
      link.setAttribute("useoriginprincipal", true);
      link.setAttribute("href", options.moreInfo.url);
      link.textContent = text;
      outputMessage = BrowserUtils.getLocalizedFragment(browserWin.document, mainMessage, outputMessage, link);
    }
    this.box.appendNotification(outputMessage, id, null, this.box.PRIORITY_INFO_HIGH,
      buttonsOutput);
  }

  clear() {
    let notificationNode = this.box.getNotificationWithValue(this.id);
    // Sometimes the node has gone before we get here
    if (notificationNode) {
      notificationNode.close();
    }
    this.notificationsMap.delete(this.id);
  }

  handleEvent(event, data) {
    this.notificationsMap.emit(event, data);
  }
}

var notifications = class notifications extends ExtensionAPI {
  constructor(extension) {
    super(extension);

    this.nextId = 0;
    this.notificationsMap = new Map();
    EventEmitter.decorate(this.notificationsMap);
  }

  onShutdown() {
    for (let notification of this.notificationsMap.values()) {
      notification.clear();
    }
  }

  getAPI(context) {
    let {extension} = context;
    let notificationsMap = this.notificationsMap;

    return {
      experiments: {
        notifications: {
          clear: function(notificationId) {
            if (notificationsMap.has(notificationId)) {
              notificationsMap.get(notificationId).clear();
            }
          },
          create: (notificationId, options) => {
            if (!notificationId) {
              notificationId = String(this.nextId++);
            }
  
            if (notificationsMap.has(notificationId)) {
              notificationsMap.get(notificationId).clear();
            }
  
            let notification;
            if (options.type === "prompt") {
              notification = new NotificationPrompt(extension, notificationsMap, notificationId, options);
            } else {
              // Normal notices here unsupported in experiment
            }
            notificationsMap.set(notificationId, notification);
  
            return notificationId;
          },
  
          onButtonClicked: new EventManager(
            context,
            "notifications.onButtonClicked",
            fire => {
              let listener = (event, data) => {
                fire.async(data);
              };
  
              notificationsMap.on("buttonClicked", listener);
              return () => {
                notificationsMap.off("buttonClicked", listener);
              };
            },
          ).api(),
        },
      },
    };
  }
};
