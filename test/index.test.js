import { setup } from "../src/background";

describe("doh", ()=>{
  it("works", async ()=>{
    await setup.start();
    expect(true).toBe(true);
  });
});
