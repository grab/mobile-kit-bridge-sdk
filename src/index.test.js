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
    globalObject.TestADRModule_getSomethingCallback({
      requestID,
      result: formatResult(arg1, arg2),
      error: null,
      status_code: 200
    });
  }

  throwError(requestID, arg) {
    globalObject.TestADRModule_throwErrorCallback({
      requestID,
      result: null,
      error: { message: formatError(arg) },
      status_code: 404
    });
  }
}

function TestIOSModule() {
  return {
    postMessage: ({ method, requestID, ...rest }) => {
      switch (method) {
        case "getSomething":
          globalObject.TestIOSModule_getSomethingCallback({
            requestID,
            result: formatResult(rest.arg1, rest.arg2),
            error: null,
            status_code: 200
          });

          break;

        case "throwError":
          globalObject.TestIOSModule_throwErrorCallback({
            requestID,
            result: null,
            error: { message: formatError(rest.arg) },
            status_code: 404
          });

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
    expect(result).toEqual({
      result: formatResult(arg1, arg2),
      error: null,
      status_code: 200
    });
  }

  async function testModuleMethodWithError(createModuleFunc) {
    // Setup
    const arg = "1";

    // When
    const wrappedModule = createModuleFunc();

    const result = await wrappedModule.invoke(
      "throwError",
      createModuleMethodParameter("arg", arg)
    );

    // Then
    expect(result).toEqual({
      result: null,
      error: { message: formatError(arg) },
      status_code: 404
    });
  }

  async function testModuleMethodWithMultipleInvocations(createModuleFunc) {
    // Setup
    const rounds = 100;

    const expected = [...Array(rounds).keys()].map(v => ({
      result: formatResult(v, v + 1),
      error: null,
      status_code: 200
    }));

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
