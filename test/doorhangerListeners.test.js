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

// rememberDoorhangerDecision Checks
describe("doorhangerAcceptListener", ()=>{
  it("should call rememberDoorhangerDecision function when called", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    await browser.storage.local.get("doh-rollout.doorhanger-decision");
    const { rollout, stateManager } = await init();

    stateManager.setState = jest.fn();
    stateManager.rememberDoorhangerDecision = jest.fn();
    stateManager.rememberDoorhangerPingSent = jest.fn();
    stateManager.rememberDoorhangerShown = jest.fn();

    await rollout.doorhangerAcceptListener();

    expect(stateManager.setState).toHaveBeenCalledWith("UIOk");
    expect(stateManager.rememberDoorhangerDecision).toHaveBeenCalledWith("UIOk");
    expect(stateManager.rememberDoorhangerPingSent).toHaveBeenCalled();
    expect(stateManager.rememberDoorhangerShown).toHaveBeenCalled();
  });
});

// rememberDoorhangerDecision Checks
describe("doorhangerDeclineListener", ()=>{
  it("should call rememberDoorhangerDecision function when called", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    await browser.storage.local.get("doh-rollout.doorhanger-decision");
    const { rollout, stateManager } = await init();

    stateManager.setState = jest.fn();
    stateManager.rememberDoorhangerDecision = jest.fn();
    stateManager.rememberDoorhangerPingSent = jest.fn();
    stateManager.rememberDoorhangerShown = jest.fn();

    await rollout.doorhangerDeclineListener();

    expect(stateManager.setState).toHaveBeenCalledWith("UIDisabled");
    expect(stateManager.rememberDoorhangerDecision).toHaveBeenCalledWith("UIDisabled");
    expect(stateManager.rememberDoorhangerPingSent).toHaveBeenCalled();
    expect(stateManager.rememberDoorhangerShown).toHaveBeenCalled();

  });
});
