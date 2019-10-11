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

describe("doh setup start", ()=>{
  it("runs without errors when DoH is disabled", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": false,
    });
    setBrowserStorageLocal();
    await init();
  });

  it("runs without errors when DoH is enabled and is first run", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    setBrowserStorageLocal();
    await init();
  });
});

function setEnterpriseMocks(enterprisePolicyOverrides = {}) {
  const defaultEnterprisePolicy = {
    response: "no_policy_set",
  };
  const enterprisePolicy = Object.assign({}, defaultEnterprisePolicy, enterprisePolicyOverrides);
  jest.spyOn(browser.experiments.heuristics, "checkEnterprisePolicies").mockImplementation((response)=>{
    const value = enterprisePolicy[response];
    return value;
  });
}

describe("Rollout", ()=>{
  it("enables DoH when enterprise policy is set to enable_doh", async ()=>{
    setPrefMocks();
    setEnterpriseMocks();
    setBrowserStorageLocal();
    const { rollout } = await init();
    expect(await rollout.getDoHStatus() ).toBe(undefined);
  });

  it("disables DoH when enterprise policy is blank", async ()=>{
    setPrefMocks();
    setEnterpriseMocks({
      response: "disable_doh"
    });
    setBrowserStorageLocal();
    const { rollout } = await init();
    expect(await rollout.getDoHStatus() ).toBeFalsy();
  });

});
