import "@babel/polyfill";
import { wrapAndroidKit, wrapIOSKit } from ".";

var globalObject = {};

function formatResult(arg1, arg2) {
  return `Arg1: ${arg1}, Arg2: ${arg2}`;
}

class TestAndroidKit {
  async getSomething(arg1, arg2) {
    globalObject.TestAndroidKit_getSomethingCallback(formatResult(arg1, arg2));
  }
}

function TestIOSKit() {
  return {
    postMessage: ({ arg1, arg2, callback }) => {
      callback(`Arg1: ${arg1}, arg2: ${arg2}`);
    }
  };
}

describe("Kit wrappers should wrap platform kits correctly", () => {
  beforeEach(() => {
    globalObject = {};
  });

  it("Should wrap Android kit correctly", async () => {
    // Setup
    const kit = new TestAndroidKit();
    const arg1 = "1";
    const arg2 = "2";

    // When
    const wrappedKit = wrapAndroidKit(globalObject, "TestAndroidKit", kit);
    const result = await wrappedKit.invoke("getSomething", arg1, arg2);

    // Then
    expect(result).toEqual(formatResult(arg1, arg2));
  });

  xit("Should wrap iOS kit correctly", () => {
    // Setup
    const iosKit = TestIOSKit();

    // When
    const wrappedKit = wrapIOSKit(iosKit);

    // Then
    wrappedKit.getSomething("1", "2", console.log);
  });
});
