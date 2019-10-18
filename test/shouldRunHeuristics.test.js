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

// shouldRunHeuristics Checks
describe("shouldRunHeuristics", ()=>{
  it("returns false if disableHeuristics is true ", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
      "network.trr.mode": 5,
    });

    setBrowserStorageLocal();

    const { rollout, stateManager } = await init();
    let shouldRunHeuristics = await stateManager.shouldRunHeuristics();
    expect(shouldRunHeuristics).toBeFalsy();
  });

  it("returns true if disableHeuristics is false ", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });

    setBrowserStorageLocal();

    const { rollout, stateManager } = await init();
    let shouldRunHeuristics = await stateManager.shouldRunHeuristics();
    expect(shouldRunHeuristics).toBeTruthy();
  });
});
