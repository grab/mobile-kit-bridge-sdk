import "@babel/polyfill";
import { wrapAndroidKit, wrapIOSKit, createKitMethodParameter } from ".";

var globalObject = {};

function formatResult(arg1, arg2) {
  return `Arg1: ${arg1}, Arg2: ${arg2}`;
}

function formatError(arg) {
  return `Error for arg ${arg}`;
}

class TestAndroidKit {
  getSomething(arg1, arg2) {
    globalObject.TestAndroidKit_getSomethingCallback(formatResult(arg1, arg2));
  }

  throwError(arg) {
    globalObject.TestAndroidKit_throwErrorCallback({
      isError: true,
      message: formatError(arg)
    });
  }
}

function TestIOSKit() {
  return {
    postMessage: ({ method, ...rest }) => {
      switch (method) {
        case "getSomething":
          const { arg1, arg2 } = rest;
          const result = formatResult(arg1, arg2);
          globalObject.TestIOSKit_getSomethingCallback(result);
          break;

        case "throwError":
          globalObject.TestIOSKit_throwErrorCallback({
            isError: true,
            message: formatError(rest.arg)
          });

          break;
      }
    }
  };
}

describe("Kit wrappers should wrap platform kits correctly", () => {
  async function testKitMethodWithNormalReturn(createKitFunc) {
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

  async function testKitMethodWithError(createKitFunc) {
    // Setup
    const arg = "1";

    // When
    const wrappedKit = createKitFunc();

    try {
      // Then
      await wrappedKit.invoke(
        "throwError",
        createKitMethodParameter("arg", arg)
      );

      throw new Error("Never should have come here");
    } catch (e) {
      expect(e).toEqual({ isError: true, message: formatError(arg) });
    }
  }

  beforeEach(() => {
    globalObject = {};
  });

  it("Should wrap Android kit correctly", async () => {
    await testKitMethodWithNormalReturn((kitName, kit) =>
      wrapAndroidKit(globalObject, "TestAndroidKit", new TestAndroidKit())
    );

    await testKitMethodWithError((kitName, kit) =>
      wrapAndroidKit(globalObject, "TestAndroidKit", new TestAndroidKit())
    );
  });

  it("Should wrap iOS kit correctly", async () => {
    await testKitMethodWithNormalReturn((kitName, kit) =>
      wrapIOSKit(globalObject, "TestIOSKit", TestIOSKit())
    );

    await testKitMethodWithError((kitName, kit) =>
      wrapIOSKit(globalObject, "TestIOSKit", TestIOSKit())
    );
  });
});
