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

// rememberDoorhangerShown Checks
describe("rememberDoorhangerShown", ()=>{
  it.skip("should set `doh-rollout.doorhanger-shown` to true", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    await browser.storage.local.get("doh-rollout.doorhanger-shown", false);
    const { rollout, stateManager } = await init();
    await stateManager.rememberDoorhangerShown();
    expect( await rollout.getSetting("doh-rollout.doorhanger-shown", true) ).toBeTruthy();
  });
});

// rememberDoorhangerPingSent Checks
describe("rememberDoorhangerPingSent", ()=>{
  it.skip("should set `doh-rollout.doorhanger-ping-sent` to true", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    await browser.storage.local.get("doh-rollout.doorhanger-ping-sent", false);
    const { rollout, stateManager } = await init();
    await stateManager.rememberDoorhangerPingSent();
    expect( await rollout.getSetting("doh-rollout.doorhanger-ping-sent", true) ).toBeTruthy();
  });
});

// rememberDoorhangerDecision Checks
describe("rememberDoorhangerDecision", ()=>{
  it.skip("should set `doh-rollout.doorhanger-decision` to true", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    await browser.storage.local.get("doh-rollout.doorhanger-decision", false);
    const { rollout, stateManager } = await init();
    await stateManager.rememberDoorhangerDecision();
    expect( await rollout.getSetting("doh-rollout.doorhanger-decision", true) ).toBeTruthy();
  });
});

// rememberDisableHeuristics Checks
describe("rememberDisableHeuristics", ()=>{
  it.skip("should set `doh-rollout.disable-heuristics` to true", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    await browser.storage.local.get("doh-rollout.disable-heuristics", false);
    const { rollout, stateManager } = await init();
    await stateManager.rememberDisableHeuristics();
    expect( await rollout.getSetting("doh-rollout.disable-heuristics", true) ).toBeTruthy();
  });
});
