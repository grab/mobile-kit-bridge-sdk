import "@babel/polyfill";
import {
  createModuleMethodParameter,
  wrapAndroidModule,
  wrapIOSModule,
  GrabModuleResult
} from ".";
import Bluebird from "bluebird";

var globalObject = {};

function formatResult(arg1, arg2) {
  return `Arg1: ${arg1}, Arg2: ${arg2}`;
}

function formatError(arg) {
  return `Error for arg ${arg}`;
}

class TestADRModule {
  getSomething(requestID, arg1, arg2) {
    globalObject.TestADRModule_getSomethingCallback(
      requestID,
      formatResult(arg1, arg2),
      GrabModuleResult.UNAVAILABLE
    );
  }

  throwError(requestID, arg) {
    globalObject.TestADRModule_throwErrorCallback(
      requestID,
      GrabModuleResult.UNAVAILABLE,
      { message: formatError(arg) }
    );
  }
}

function TestIOSModule() {
  return {
    postMessage: ({ method, requestID, ...rest }) => {
      switch (method) {
        case "getSomething":
          globalObject.TestIOSModule_getSomethingCallback(
            requestID,
            formatResult(rest.arg1, rest.arg2),
            GrabModuleResult.UNAVAILABLE
          );

          break;

        case "throwError":
          globalObject.TestIOSModule_throwErrorCallback(
            requestID,
            GrabModuleResult.UNAVAILABLE,
            { message: formatError(rest.arg) }
          );
          break;
      }
    }
  };
}

describe("Module wrappers should wrap platform modules correctly", () => {
  async function testModuleMethodWithNormalReturn(createModuleFunc) {
    // Setup
    const arg1 = "1";
    const arg2 = "2";

    // When
    const wrappedModule = createModuleFunc();

    const result = await wrappedModule.invoke(
      "getSomething",
      createModuleMethodParameter("arg1", arg1),
      createModuleMethodParameter("arg2", arg2)
    );

    // Then
    expect(result).toEqual(formatResult(arg1, arg2));
  }

  async function testModuleMethodWithError(createModuleFunc) {
    // Setup
    const arg = "1";

    // When
    const wrappedModule = createModuleFunc();

    try {
      // Then
      await wrappedModule.invoke(
        "throwError",
        createModuleMethodParameter("arg", arg)
      );

      throw new Error("Never should have come here");
    } catch (e) {
      expect(e).toEqual({ message: formatError(arg) });
    }
  }

  async function testModuleMethodWithMultipleInvocations(createModuleFunc) {
    // Setup
    const rounds = 100;
    const expected = [...Array(rounds).keys()].map(v => formatResult(v, v + 1));

    // When
    const wrappedModule = createModuleFunc();

    const results = await Bluebird.map([...Array(rounds).keys()], v =>
      wrappedModule.invoke(
        "getSomething",
        createModuleMethodParameter("arg1", `${v}`),
        createModuleMethodParameter("arg2", `${v + 1}`)
      )
    );

    // Then
    expect(results).toEqual(expected);

    expect(
      Object.keys(globalObject).filter(key => key.indexOf("getSomething") > -1)
    ).toHaveLength(1);
  }

  beforeEach(() => {
    globalObject = {};
  });

  it("Should wrap Android method with normal return correctly", async () => {
    await testModuleMethodWithNormalReturn(() =>
      wrapAndroidModule(globalObject, "TestADRModule", new TestADRModule())
    );
  });

  it("Should wrap Android method with error return correctly", async () => {
    await testModuleMethodWithError(() =>
      wrapAndroidModule(globalObject, "TestADRModule", new TestADRModule())
    );
  });

  it("Should correctly call Android method multiple times", async () => {
    await testModuleMethodWithMultipleInvocations(() =>
      wrapAndroidModule(globalObject, "TestADRModule", new TestADRModule())
    );
  });

  it("Should wrap iOS method with normal return correctly", async () => {
    await testModuleMethodWithNormalReturn(() =>
      wrapIOSModule(globalObject, "TestIOSModule", TestIOSModule())
    );
  });

  it("Should wrap iOS method with error return correctly", async () => {
    await testModuleMethodWithError((kitName, kit) =>
      wrapIOSModule(globalObject, "TestIOSModule", TestIOSModule())
    );
  });

  it("Should correctly call Android method multiple times", async () => {
    await testModuleMethodWithMultipleInvocations((kitName, kit) =>
      wrapIOSModule(globalObject, "TestIOSModule", TestIOSModule())
    );
  });
});
