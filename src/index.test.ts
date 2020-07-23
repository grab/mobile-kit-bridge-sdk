/**
 * Copyright (c) Grab Taxi Holdings PTE LTD (GRAB)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { fail } from "assert";
import bluebird from "bluebird";
import expectJs from "expect.js";
import { describe, it } from "mocha";
import { CallbackResult, StreamEvent } from "./index";
import { createDataStream, createSubscription } from "./subscription";
import {
  getCallbackName,
  getFirstAvailableCallbackName,
  NativeParameter,
  wrapModuleName
} from "./utils";
import { getModuleEnvironment, wrapModule } from "./wrap-global";

const testTimeout = 5000;

describe("Module wrappers should wrap platform modules correctly", () => {
  function formatResult(param1: unknown, param2: unknown) {
    return `${param1}-${param2}`;
  }

  function formatError(param: unknown) {
    return `Error: ${param}`;
  }

  function createTestADRModule(global: any) {
    return {
      name: "TestADRModule",
      doSomethingWithoutParameter(params: string) {
        const { callback }: NativeParameter<{}> = JSON.parse(params);

        global[callback]({
          result: undefined,
          error: undefined,
          status_code: 200
        });
      },
      doSomethingWithFalsyParameter(params: string) {
        const { callback, parameters }: NativeParameter<unknown> = JSON.parse(
          params
        );

        global[callback]({
          result: parameters,
          error: undefined,
          status_code: 200
        });
      },
      doSomethingAndGetNullResult(params: string) {
        const { callback }: NativeParameter<unknown> = JSON.parse(params);

        global[callback]({
          result: null,
          error: null,
          status_code: 200
        });
      },
      getSomething(params: string) {
        const {
          parameters: { param1, param2 },
          callback
        }: NativeParameter<{
          param1: string;
          param2: string;
        }> = JSON.parse(params);

        global[callback]({
          result: formatResult(param1, param2),
          error: undefined,
          status_code: 200
        });
      },
      observeGetSomething(params: string) {
        const {
          parameters: { interval },
          callback
        }: NativeParameter<{ interval: number }> = JSON.parse(params);

        let count = 0;

        const intervalID = setInterval(() => {
          if (global[callback]) {
            global[callback]({
              result: count,
              error: undefined,
              status_code: 200
            });

            count += 1;
          } else {
            clearInterval(intervalID);
          }
        }, interval);
      },
      observeGetSomethingWithTerminate(params: string) {
        const {
          parameters: { timeout },
          callback
        }: NativeParameter<{ timeout: number }> = JSON.parse(params);

        setTimeout(() => {
          global[callback]({
            result: { event: StreamEvent.STREAM_TERMINATED },
            status_code: 200
          });
        }, timeout);
      },
      throwError(params: string) {
        const {
          parameters: { param },
          callback
        }: NativeParameter<{ param: string }> = JSON.parse(params);

        global[callback]({
          result: undefined,
          error: { message: formatError(param) },
          status_code: 404
        });
      }
    };
  }

  function createTestIOSModule(global: any) {
    return {
      name: "TestIOSModule",
      postMessage: ({ method, parameters, callback }: NativeParameter) => {
        switch (method) {
          case "doSomethingWithoutParameter":
            global[callback]({
              result: undefined,
              error: undefined,
              status_code: 200
            });

            break;

          case "doSomethingWithFalsyParameter":
            global[callback]({
              result: parameters,
              error: undefined,
              status_code: 200
            });

            break;

          case "doSomethingAndGetNullResult":
            global[callback]({
              result: null,
              error: null,
              status_code: 200
            });

            break;

          case "getSomething":
            global[callback]({
              result: formatResult(parameters.param1, parameters.param2),
              error: undefined,
              status_code: 200
            });

            break;

          case "observeGetSomething":
            let count = 0;

            const intervalID = setInterval(() => {
              if (global[callback]) {
                global[callback]({
                  result: count,
                  error: undefined,
                  status_code: 200
                });

                count += 1;
              } else {
                clearInterval(intervalID);
              }
            }, parameters.interval as number);

            break;

          case "observeGetSomethingWithTerminate":
            setTimeout(() => {
              global[callback]({
                result: { event: StreamEvent.STREAM_TERMINATED },
                status_code: 200
              });
            }, parameters.timeout as number);

            break;

          case "throwError":
            global[callback]({
              result: undefined,
              error: { message: formatError(parameters.param) },
              status_code: 404
            });

            break;
        }
      }
    };
  }

  function getKeysWithValidCallbacks(global: any) {
    return Object.keys(global).filter(
      key => !!global[key] && key.toLowerCase().includes("callback")
    );
  }

  async function test_invokeMethodWithoutParameter_shouldWork(
    global: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);

    // When
    const result1 = await global[wrappedName].invoke(
      "doSomethingWithoutParameter"
    );

    const result2 = await global[wrappedName].invoke(
      "doSomethingWithoutParameter"
    );

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expectJs(result1).to.eql({
      result: undefined,
      error: undefined,
      status_code: 200
    });

    expectJs(result2).to.eql({
      result: undefined,
      error: undefined,
      status_code: 200
    });

    expectJs(getKeysWithValidCallbacks(global)).to.have.length(0);
  }

  async function test_invokeMethodWithFalsyParam_shouldWork(
    global: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);

    // When
    const result1 = await global[wrappedName].invoke(
      "doSomethingWithFalsyParameter",
      0
    );

    const result2 = await global[wrappedName].invoke(
      "doSomethingWithFalsyParameter",
      ""
    );

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expectJs(result1).to.eql({ result: 0, error: undefined, status_code: 200 });

    expectJs(result2).to.eql({
      result: "",
      error: undefined,
      status_code: 200
    });

    expectJs(getKeysWithValidCallbacks(global)).to.have.length(0);
  }

  async function test_invokeMethodAndGetNull_shouldGetUndefined(
    global: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);

    // When
    const result = await global[wrappedName].invoke(
      "doSomethingAndGetNullResult"
    );

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expectJs(result).to.eql({
      result: undefined,
      error: undefined,
      status_code: 200
    });

    expectJs(getKeysWithValidCallbacks(global)).to.have.length(0);
  }

  async function test_moduleMethod_withNormalReturn(
    global: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const param1 = "1";
    const param2 = "2";

    // When
    const result = await global[wrappedName].invoke("getSomething", {
      param1,
      param2
    });

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expectJs(result).to.eql({
      result: formatResult(param1, param2),
      error: undefined,
      status_code: 200
    });

    expectJs(getKeysWithValidCallbacks(global)).to.have.length(0);
  }

  async function test_moduleMethod_withError(global: any, moduleName: string) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const param = "1";

    // When
    const result = await global[wrappedName].invoke("throwError", {
      param
    });

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expectJs(result).to.eql({
      result: undefined,
      error: { message: formatError(param) },
      status_code: 404
    });

    expectJs(getKeysWithValidCallbacks(global)).to.have.length(0);
  }

  async function test_moduleMethod_withMultipleInvocations(
    global: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const rounds = 1;

    const expected = [...Array(rounds).keys()].map(v => ({
      result: formatResult(v, v + 1),
      error: undefined,
      status_code: 200
    }));

    // When
    const results = await bluebird.map([...Array(rounds).keys()], v =>
      global[wrappedName].invoke("getSomething", {
        param1: `${v}`,
        param2: `${v + 1}`
      })
    );

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expectJs(results).to.eql(expected);
    expectJs(getKeysWithValidCallbacks(global)).to.have.length(0);
  }

  function test_moduleMethod_withStream(
    global: any,
    moduleName: string,
    done: Function
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const interval = 200;
    const timeout = 2100;
    const streamTimeout = 1100;
    const streamedVals: CallbackResult<unknown>[] = [];

    // When
    const subscription = global[wrappedName]
      .invoke("observeGetSomething", { interval })
      .subscribe({
        next: (value: CallbackResult<unknown>) => streamedVals.push(value)
      });

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    setTimeout(subscription.unsubscribe, streamTimeout);

    setTimeout(() => {
      const length = (streamTimeout - (streamTimeout % interval)) / interval;
      expectJs(streamedVals).to.have.length(length);
      expectJs([...new Set(streamedVals)]).to.have.length(length);
      expectJs(getKeysWithValidCallbacks(global)).to.have.length(0);
      done();
    }, timeout);
  }

  function test_moduleMethod_withTerminatingStream(
    global: any,
    moduleName: string,
    done: Function
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const streamTimeout = 500;
    const timeout = 1000;
    const streamedValues: CallbackResult<unknown>[] = [];
    let completed = false;

    // When
    const subscription = global[wrappedName]
      .invoke("observeGetSomethingWithTerminate", { timeout: streamTimeout })
      .subscribe({
        next: (value: CallbackResult<unknown>) => streamedValues.push(value),
        complete: () => (completed = true)
      });

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    setTimeout(() => {
      expectJs(streamedValues).to.have.length(0);
      expectJs(completed).to.be.ok();
      expectJs(subscription.isUnsubscribed()).to.be.ok();
      expectJs(getKeysWithValidCallbacks(global)).to.have.length(0);
      done();
    }, timeout);
  }

  async function test_moduleMethodStream_shouldBeIdempotent(
    global: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const iterations = 1000;

    const stream = global[wrappedName].invoke("observeGetSomething", {
      param: 1
    });

    // When
    const subscriptions = [...Array(iterations)].map(() =>
      stream.subscribe({ next: () => {} })
    );

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expectJs(getKeysWithValidCallbacks(global)).to.have.length(iterations);
    subscriptions.forEach(subscription => subscription.unsubscribe());
    expectJs(getKeysWithValidCallbacks(global)).to.have.length(0);
  }

  // ################################ ANDROID ################################

  it("Should work for Android method without parameters", async function() {
    this.timeout(testTimeout);
    const global: any = {};
    const adr = createTestADRModule(global);
    global[adr.name] = adr;
    wrapModule(global, adr.name);
    await test_invokeMethodWithoutParameter_shouldWork(global, adr.name);
  });

  it("Should work for Android method with falsy parameters", async function() {
    this.timeout(testTimeout);
    const global: any = {};
    const adr = createTestADRModule(global);
    global[adr.name] = adr;
    wrapModule(global, adr.name);
    await test_invokeMethodWithFalsyParam_shouldWork(global, adr.name);
  });

  it("Should work for Android method with null results", async function() {
    this.timeout(testTimeout);
    const global: any = {};
    const adr = createTestADRModule(global);
    global[adr.name] = adr;
    wrapModule(global, adr.name);
    await test_invokeMethodAndGetNull_shouldGetUndefined(global, adr.name);
  });

  it("Should wrap Android method with normal return correctly", async function() {
    this.timeout(testTimeout);
    const global: any = {};
    const adr = createTestADRModule(global);
    global[adr.name] = adr;
    wrapModule(global, adr.name);
    await test_moduleMethod_withNormalReturn(global, adr.name);
  });

  it("Should wrap Android method with error return correctly", async function() {
    this.timeout(testTimeout);
    const global: any = {};
    const adr = createTestADRModule(global);
    global[adr.name] = adr;
    wrapModule(global, adr.name);
    await test_moduleMethod_withError(global, adr.name);
  });

  it("Should correctly call Android method multiple times", async function() {
    this.timeout(testTimeout);
    const global: any = {};
    const adr = createTestADRModule(global);
    global[adr.name] = adr;
    wrapModule(global, adr.name);
    await test_moduleMethod_withMultipleInvocations(global, adr.name);
  });

  it("Should correctly stream values from Android method call", function(done) {
    this.timeout(testTimeout);
    const global: any = {};
    const adr = createTestADRModule(global);
    global[adr.name] = adr;
    wrapModule(global, adr.name);
    test_moduleMethod_withStream(global, adr.name, done);
  });

  it("Should terminate stream for Android method call", function(done) {
    this.timeout(testTimeout);
    const global: any = {};
    const adr = createTestADRModule(global);
    global[adr.name] = adr;
    wrapModule(global, adr.name);
    test_moduleMethod_withTerminatingStream(global, adr.name, done);
  });

  it("Should be idempotent for Android streams", async function() {
    this.timeout(testTimeout);
    const global: any = {};
    const adr = createTestADRModule(global);
    global[adr.name] = adr;
    wrapModule(global, adr.name);
    await test_moduleMethodStream_shouldBeIdempotent(global, adr.name);
  });

  // ################################## IOS ##################################

  it("Should work for iOS method without parameters", async function() {
    this.timeout(testTimeout);
    const global: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(global);
    global.webkit.messageHandlers[ios.name] = ios;
    wrapModule(global, ios.name);
    await test_invokeMethodWithoutParameter_shouldWork(global, ios.name);
  });

  it("Should work for iOS method with falsy parameters", async function() {
    this.timeout(testTimeout);
    const global: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(global);
    global.webkit.messageHandlers[ios.name] = ios;
    wrapModule(global, ios.name);
    await test_invokeMethodWithFalsyParam_shouldWork(global, ios.name);
  });

  it("Should work for iOS method with null results", async function() {
    this.timeout(testTimeout);
    const global: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(global);
    global.webkit.messageHandlers[ios.name] = ios;
    wrapModule(global, ios.name);
    await test_invokeMethodAndGetNull_shouldGetUndefined(global, ios.name);
  });

  it("Should wrap iOS method with normal return correctly", async function() {
    this.timeout(testTimeout);
    const global: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(global);
    global.webkit.messageHandlers[ios.name] = ios;
    wrapModule(global, ios.name);
    await test_moduleMethod_withNormalReturn(global, ios.name);
  });

  it("Should wrap iOS method with error return correctly", async function() {
    this.timeout(testTimeout);
    const global: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(global);
    global.webkit.messageHandlers[ios.name] = ios;
    wrapModule(global, ios.name);
    await test_moduleMethod_withError(global, ios.name);
  });

  it("Should correctly call iOS method multiple times", async function() {
    this.timeout(testTimeout);
    const global: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(global);
    global.webkit.messageHandlers[ios.name] = ios;
    wrapModule(global, ios.name);
    await test_moduleMethod_withMultipleInvocations(global, ios.name);
  });

  it("Should correctly stream values from iOS method call", function(done) {
    this.timeout(testTimeout);
    const global: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(global);
    global.webkit.messageHandlers[ios.name] = ios;
    wrapModule(global, ios.name);
    test_moduleMethod_withStream(global, ios.name, done);
  });

  it("Should terminate stream for iOS method call", function(done) {
    this.timeout(testTimeout);
    const global: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(global);
    global.webkit.messageHandlers[ios.name] = ios;
    wrapModule(global, ios.name);
    test_moduleMethod_withTerminatingStream(global, ios.name, done);
  });

  it("Should be idempotent for iOS streams", async function() {
    this.timeout(testTimeout);
    const global: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(global);
    global.webkit.messageHandlers[ios.name] = ios;
    wrapModule(global, ios.name);
    await test_moduleMethodStream_shouldBeIdempotent(global, ios.name);
  });
});

describe("Edge cases for wrapper", () => {
  it("Should throw error for Promise if no module found", async function() {
    // Setup
    this.timeout(testTimeout);
    const global: any = {};
    const moduleName = "NonExistentModule";
    const wrappedName = wrapModuleName(moduleName);
    wrapModule(global, moduleName);

    // When && Then
    try {
      await global[wrappedName].invoke("nonExistentMethod");
      fail("Never should have come here");
    } catch (e) {
      expectJs(e).to.be.ok();
    }
  });

  it("Should throw error for stream if no module found", async function() {
    // Setup
    this.timeout(testTimeout);
    const global: any = {};
    const moduleName = "NonExistentModule";
    const wrappedName = wrapModuleName(moduleName);
    wrapModule(global, moduleName);

    // When && Then
    try {
      global[wrappedName]
        .invoke("nonExistentMethod")
        .subscribe({ next: console.log, complete: console.log });

      fail("Never should have come here");
    } catch (e) {
      expectJs(e).to.be.ok();
    }
  });
});

describe("Utility functions should work correctly", () => {
  it("Data stream should support Promise-style chaining", async function() {
    // Setup
    this.timeout(testTimeout);
    let currentTick = 0;

    const dataStream = createDataStream(handlers => {
      const intervalID = setInterval(() => {
        currentTick += 1;

        handlers &&
          handlers.next &&
          handlers.next({ result: currentTick, error: null, status_code: 200 });
      }, 100);

      return createSubscription(() => {
        clearInterval(intervalID);
        handlers && handlers.complete && handlers.complete();
      });
    });

    // When
    const { result, error, status_code } = await dataStream.then(data => data);
    const invalidData = await dataStream.then();

    // Then
    await new Promise(resolve => {
      setTimeout(() => {
        expectJs(result).to.eql(1);
        expectJs(error).not.to.be.ok();
        expectJs(status_code).to.eql(200);
        expectJs(currentTick).to.eql(2);
        expectJs(invalidData).not.to.be.ok();
        resolve(undefined);
      }, 500);
    });
  });

  it("Data stream should support Promise-style error handling", async function() {
    // Setup
    const error = new Error("expected")

    const dataStream = createDataStream(() => {
      throw error;
    });

    // When: 1
    try {
      await dataStream.then(data => data);
      fail('Never should have come here')
    } catch (e) {
      // Then
      expectJs(e).to.eql(error);
    }

    // When: 2
    const handledResult = await dataStream.then(undefined, () => 1);
    expectJs(handledResult).to.eql(1);
  });

  it("Should get module environment correctly", async () => {
    // Setup
    const moduleName = "Module";

    // When && Then: Android
    expectJs(getModuleEnvironment({ [moduleName]: {} }, moduleName)).to.eql(
      "android"
    );

    // When && Then: iOS
    expectJs(
      getModuleEnvironment(
        { webkit: { messageHandlers: { [moduleName]: {} } } },
        moduleName
      )
    ).to.eql("ios");

    // When && Then: None
    expectJs(getModuleEnvironment({}, moduleName)).not.to.be.ok();
  });

  it("Should get first available callback name correctly", async () => {
    // Setup
    const moduleName = "Module";
    const funcName = "Func";
    const cutoffID = 4;

    const global = [...Array(10).keys()]
      .map(requestID => (requestID < cutoffID ? requestID : requestID + 10))
      .reduce(
        (acc, requestID) => ({
          ...acc,
          [getCallbackName({ moduleName, funcName, requestID })]: () => {}
        }),
        {}
      );

    // When
    const nextCallbackName = getFirstAvailableCallbackName(global, {
      moduleName,
      funcName
    });

    // Then
    expectJs(nextCallbackName).to.eql(
      getCallbackName({ moduleName, funcName, requestID: cutoffID })
    );
  });
});
