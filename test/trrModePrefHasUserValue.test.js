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

function setTrrModePrefHasUserValue(response) {
  jest.spyOn(browser.experiments.preferences, "prefHasUserValue").mockImplementation(()=>{
    return response;
  });
}

// trrModePrefHasUserValue Checks

describe("TRR Mode Check", ()=>{
  it("returns false if user has set a custom value for `network.trr.mode` pref ", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });

    setBrowserStorageLocal();

    const { rollout } = await init();

    let results = {
      browserParent: "enable_doh",
      canary: "enable_doh",
      evaluateReason: "first_run",
      google: "enable_doh",
      modifiedRoots: "enable_doh",
      policy: "no_policy_set",
      thirdPartyRoots: "enable_doh",
      youtube: "enable_doh",
      zscalerCanary: "enable_doh"
    };

    // Simualte that the user has a non-default value of `network.trr.mode` pref
    setTrrModePrefHasUserValue(true);

    let trrModePrefHasUserValue = await rollout.trrModePrefHasUserValue("foo", results);
    expect(trrModePrefHasUserValue).toBeFalsy();
  });

  it("returns true if user has does not have a custom value for `network.trr.mode` pref ", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });

    setBrowserStorageLocal();

    const { rollout } = await init();

    let results = {
      browserParent: "enable_doh",
      canary: "enable_doh",
      evaluateReason: "first_run",
      google: "enable_doh",
      modifiedRoots: "enable_doh",
      policy: "no_policy_set",
      thirdPartyRoots: "enable_doh",
      youtube: "enable_doh",
      zscalerCanary: "enable_doh"
    };

    // Simualte that the user has a non-default value of `network.trr.mode` pref
    setTrrModePrefHasUserValue(false);

    let trrModePrefHasUserValue = await rollout.trrModePrefHasUserValue("foo", results);
    expect(trrModePrefHasUserValue).toBeTruthy();
  });
});
