global.browser = {
  experiments: {
    preferences: {
      getUserPref: jest.fn(),
      onPrefChanged: {
        addListener: jest.fn()
      }
    },
    heuristics: {
      checkEnterprisePolicies: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn()
    }
  }
};

global.stateManager = {
  getCurrentState: jest.fn()
};
