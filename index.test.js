import "@babel/polyfill";
import { wrapAndroidKit, wrapIOSKit, createKitMethodParameter } from ".";

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
    postMessage: ({ arg1, arg2 }) => {
      globalObject.TestIOSKit_getSomethingCallback(formatResult(arg1, arg2));
    }
  };
}

describe("Kit wrappers should wrap platform kits correctly", () => {
  async function testKitWrapping(createKitFunc) {
    // Setup
    const arg1 = "1";
    const arg2 = "2";

    // When
    const wrappedKit = createKitFunc();

    const result = await wrappedKit.invoke(
      "getSomething",
      createKitMethodParameter("arg1", arg1),
      createKitMethodParameter("arg2", arg2)
    );

    // Then
    expect(result).toEqual(formatResult(arg1, arg2));
  }

  beforeEach(() => {
    globalObject = {};
  });

  it("Should wrap Android kit correctly", async () => {
    await testKitWrapping((kitName, kit) =>
      wrapAndroidKit(globalObject, "TestAndroidKit", new TestAndroidKit())
    );
  });

  it("Should wrap iOS kit correctly", async () => {
    await testKitWrapping((kitName, kit) =>
      wrapIOSKit(globalObject, "TestIOSKit", TestIOSKit())
    );
  });
});
