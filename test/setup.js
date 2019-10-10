global.browser = {
  experiments: {
    preferences: {
      getUserPref: jest.fn(),
      onPrefChanged: {
        addListener: jest.fn()
      }
    }
  }
};
