process.on("unhandledRejection", error => {
  // throw error;
});

// if (global.browser) {
//   throw new Error("Attempting to mock the browser but it already exists.");
// }

global.browser.experiments = {
  preferences: {
    getUserPref: jest.fn(),
    onPrefChanged: {
      addListener: jest.fn()
    },
    prefHasUserValue: jest.fn(),
    state: {
      set: jest.fn()
    }
  },
  heuristics: {
    setupTelemetry: jest.fn(),
    checkParentalControls: jest.fn(),
    checkEnterprisePolicies: jest.fn(),
    checkThirdPartyRoots: jest.fn(),
    sendHeuristicsPing: jest.fn(),
    sendStatePing: jest.fn(),
  },
  netChange: {
    onConnectionChanged: {
      addListener: jest.fn()
    }
  }
};

global.browser.storage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
  }
};

global.browser.captivePortal = {
  onStateChanged: {
    removeListener: jest.fn(),
    addListener: jest.fn()
  },
  getState: jest.fn()
};
