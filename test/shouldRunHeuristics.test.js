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

beforeEach( async () => {
  return browser.storage.local.clear();
});

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
    });

    setBrowserStorageLocal();

    const { rollout, stateManager } = await init();

    await browser.storage.local.set("doh-rollout.disable-heuristics", true);

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

  it("returns false if previous trr.mode doesn't match current trr.mode ", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
      "network.trr.mode": 2,
    });

    setBrowserStorageLocal();

    const { rollout, stateManager } = await init();

    await browser.storage.local.set("doh-rollout.previous.trr.mode", 0);

    let shouldRunHeuristics = await stateManager.shouldRunHeuristics();
    expect(shouldRunHeuristics).toBeFalsy();
  });

  it("calls rememberDisableHeuristics if previous trr.mode doesn't match current trr.mode and current trr.mode is 0 ", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
      "network.trr.mode": 0,
    });

    setBrowserStorageLocal();

    const { rollout, stateManager } = await init();

    await browser.storage.local.set("doh-rollout.previous.trr.mode", 2);

    stateManager.rememberDisableHeuristics = jest.fn();

    let shouldRunHeuristics = await stateManager.shouldRunHeuristics();

    expect(stateManager.rememberDisableHeuristics).toHaveBeenCalled();
  });


  it("calls rememberDisableHeuristics if previous trr.mode doesn't match current trr.mode and current trr.mode is 5 ", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
      "network.trr.mode": 5,
    });

    setBrowserStorageLocal();

    const { rollout, stateManager } = await init();

    await browser.storage.local.set("doh-rollout.previous.trr.mode", 2);

    stateManager.rememberDisableHeuristics = jest.fn();

    let shouldRunHeuristics = await stateManager.shouldRunHeuristics();

    expect(stateManager.rememberDisableHeuristics).toHaveBeenCalled();
  });

  it("does not call rememberDisableHeuristics if previous trr.mode doesn't match current trr.mode and current trr.mode is 3 ", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
      "network.trr.mode": 3,
    });

    setBrowserStorageLocal();

    const { rollout, stateManager } = await init();

    await browser.storage.local.set("doh-rollout.previous.trr.mode", 2);

    stateManager.rememberDisableHeuristics = jest.fn();

    let shouldRunHeuristics = await stateManager.shouldRunHeuristics();

    expect(stateManager.rememberDisableHeuristics).not.toHaveBeenCalled();
  });


});
