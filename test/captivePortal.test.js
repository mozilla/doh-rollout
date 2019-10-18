import { init } from "../src/background";

function setPrefMocks(prefValuesOverrides = {}) {
  const defaultPrefValues = {
    "doh-rollout.enabled": true
  };
  const prefValues = Object.assign({}, defaultPrefValues, prefValuesOverrides);

  jest.spyOn(browser.experiments.preferences, "getUserPref").mockImplementation((prefName, defaultValue)=>{
    const value = prefValues[prefName];
    if (value === undefined) {
      return defaultValue;
    }
    return value;
  });
}

function setBrowserStorageLocal() {
  const storage = {};

  jest.spyOn(browser.storage.local, "get").mockImplementation(async (name) => {
    const value = storage[name];
    if (value === undefined) {
      return {};
    }
    return {[name]: value};
  });

  jest.spyOn(browser.storage.local, "set").mockImplementation((name, value) => {
    storage[name] = value;
  });
}

function captivePortalMocks(captivePortalOverrides = {}) {
  const defaultCaptivePortal = {
    "state": "not_captive"
  };
  const captivePortalState = Object.assign({}, defaultCaptivePortal, captivePortalOverrides);

  jest.spyOn(browser.captivePortal, "getState").mockImplementation((state, defaultValue)=>{
    const value = captivePortalState[state];
    if (value === undefined) {
      return defaultValue;
    }
    return value;
  });
}

// captivePortal
describe("onReady", ()=>{
  it("returns true when captive portal state is not captive", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    const { rollout } = await init();


    let captivePortalState = {
      state: "not_captive"
    };

    let onReady = await rollout.onReady(captivePortalState);
    expect(onReady).toBeTruthy();
  });

  it("returns true when captive portal state is unlocked", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    const { rollout } = await init();


    let captivePortalState = {
      state: "unlocked_portal"
    };

    let onReady = await rollout.onReady(captivePortalState);
    expect(onReady).toBeTruthy();
  });

  it("returns false when captive portal state is locked", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    const { rollout } = await init();


    let captivePortalState = {
      state: "locked_portal"
    };

    let onReady = await rollout.onReady(captivePortalState);
    expect(onReady).toBeFalsy();
  });

  it("returns false when captive portal state is unknown", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    const { rollout } = await init();


    let captivePortalState = {
      state: "locked_portal"
    };

    let onReady = await rollout.onReady(captivePortalState);
    expect(onReady).toBeFalsy();
  });
});


describe("main", ()=>{
  it.skip("returns true when captive portal state is not captive", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    const { rollout } = await init();

    captivePortalMocks();

    let main = await rollout.main();
    expect(main).toBeTruthy();
  });


});
