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

// function setEnterpriseMocks(response) {
//   jest.spyOn(browser.experiments.heuristics, "checkEnterprisePolicies").mockImplementation(()=>{
//     return response;
//   });
// }

// Enterprise Checks
describe("Enterprise policy check", ()=>{
  it("returns true when there is no enterprise policy set", async ()=>{
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

    let enterprisePolicyCheck = await rollout.enterprisePolicyCheck("no_policy_set", "foo", results);
    expect(enterprisePolicyCheck).toBeTruthy();
  });

  it("returns true when there is an enterprise policy with DoH enabled", async ()=>{
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

    let enterprisePolicyCheck = await rollout.enterprisePolicyCheck("enable_doh", "foo", results);
    expect(enterprisePolicyCheck).toBeTruthy();
  });

  it("returns true when there is an enterprise policy with DoH disabled", async ()=>{
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

    let enterprisePolicyCheck = await rollout.enterprisePolicyCheck("disable_doh", "foo", results);
    expect(enterprisePolicyCheck).toBeTruthy();
  });

  it("returns false when there is a policy set with no reference to DoH", async ()=>{
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

    let enterprisePolicyCheck = await rollout.enterprisePolicyCheck("policy_without_doh", "foo", results);
    expect(enterprisePolicyCheck).toBeFalsy();
  });
});
