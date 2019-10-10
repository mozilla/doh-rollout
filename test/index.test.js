import { init } from "../src/background";

function setPrefMocks(prefValuesOverrides = {}) {
  const defaultPrefValues = {
    "doh-rollout.enabled": false,
  };
  const prefValues = Object.assign({}, defaultPrefValues, prefValuesOverrides);

  jest.spyOn(browser.experiments.preferences, "getUserPref").mockImplementation((prefName, defaultValue)=>{
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

  xit("runs without errors when DoH is enabled and is not first run", async ()=>{
    jest.spyOn(this, "this").mockImplementation();
    setPrefMocks({
      "doh-rollout.enabled": true,
    });
    await init();
  });
});
