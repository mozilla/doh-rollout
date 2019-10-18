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

// Pref Gatekeeper Check
describe("DoH Setup", ()=>{

  it("runs without errors when DoH is disabled", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": false,
    });
    setBrowserStorageLocal();
    const { setup } = await init();
    expect(setup.enabled).toBeFalsy();
  });

  it("runs without errors when DoH is enabled", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    const { setup } = await init();
    expect(setup.enabled).toBeTruthy();
  });

  it.skip("runs without errors when DoH is enabled and not first run", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    const { setup } = await init();

    expect(setup.enabled).toBeTruthy();
  });
});
