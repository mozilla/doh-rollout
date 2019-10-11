import { init, getDoHStatus } from "../src/background";

function setPrefMocks(prefValuesOverrides = {}) {
  const defaultPrefValues = {
    "doh-rollout.enabled": true,
    TRR_MODE_PREF: 2,
  };
  const prefValues = Object.assign({}, defaultPrefValues, prefValuesOverrides);

  jest.spyOn(browser.experiments.preferences, "getUserPref").mockImplementation((prefName)=>{
    const value = prefValues[prefName];
    if (value === undefined) {
      throw new Error(`The getUserPrefMock got a value it did not know: ${prefName}`);
    }
    return value;
  });
}

describe("doh setup start", ()=>{
  it("runs without errors when DoH is disabled", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": false,
    });
    await init();
  });

  it("runs without errors when DoH is enabled and is first run", async ()=>{
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
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
    if (value === undefined) {
      throw new Error(`The checkEnterprisePolicies got a response it did not know: ${response}`);
    }
    return value;
  });
}

// function setLocalStorage(enterprisePolicyOverrides = {}) {
//   const defaultEnterprisePolicy = {
//     response: "no_policy_set",
//   };
//   const enterprisePolicy = Object.assign({}, defaultEnterprisePolicy, enterprisePolicyOverrides);
//   jest.spyOn(browser.experiments.heuristics, "checkEnterprisePolicies").mockImplementation((response)=>{
//     const value = enterprisePolicy[response];
//     if (value === undefined) {
//       throw new Error(`The checkEnterprisePolicies got a response it did not know: ${response}`);
//     }
//     return value;
//   });ato
// }

describe("Rollout", ()=>{
  it("enables DoH when enterprise policy is set to enable_doh", async ()=>{
    setPrefMocks();
    setEnterpriseMocks();
    const { rollout } = await init();
    expect(await getDoHStatus(rollout) ).toBeTruthy();
  });

  it("disables DoH when enterprise policy is blank", async ()=>{
    setPrefMocks();
    setEnterpriseMocks({
      response: "disable_doh"
    });
    const { rollout } = await init();
    expect(await getDoHStatus(rollout) ).toBeFalsy();
  });

});
