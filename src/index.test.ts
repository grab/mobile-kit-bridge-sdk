import bluebird from 'bluebird';
import { CallbackResult, StreamEvent } from './index';
import { createDataStream, createSubscription } from './subscription';
import { NativeParameter, wrapModuleName } from './utils';
import { wrapModule } from './wrap-global';

describe('Module wrappers should wrap platform modules correctly', () => {
  function formatResult(param1: unknown, param2: unknown) {
    return `${param1}-${param2}`;
  }

  function formatError(param: unknown) {
    return `Error: ${param}`;
  }

  function createTestADRModule(globalObject: any) {
    return {
      name: 'TestADRModule',
      doSomethingWithoutParameter(params: string) {
        const { callback }: NativeParameter<{}> = JSON.parse(params);
        globalObject[callback]({ result: null, error: null, status_code: 200 });
      },
      doSomethingWithFalsyParameter(params: string) {
        const { callback, parameters }: NativeParameter<unknown> = JSON.parse(
          params
        );

        globalObject[callback]({
          result: parameters,
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

        globalObject[callback]({
          result: formatResult(param1, param2),
          error: null,
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
          if (globalObject[callback]) {
            globalObject[callback]({
              result: count,
              error: null,
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
          globalObject[callback]({
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

        globalObject[callback]({
          result: null,
          error: { message: formatError(param) },
          status_code: 404
        });
      }
    };
  }

  function createTestIOSModule(globalObject: any) {
    return {
      name: 'TestIOSModule',
      postMessage: ({ method, parameters, callback }: NativeParameter) => {
        switch (method) {
          case 'doSomethingWithoutParameter':
            globalObject[callback]({
              result: null,
              error: null,
              status_code: 200
            });

            break;

          case 'doSomethingWithFalsyParameter':
            globalObject[callback]({
              result: parameters,
              error: null,
              status_code: 200
            });

            break;

          case 'getSomething':
            globalObject[callback]({
              result: formatResult(parameters.param1, parameters.param2),
              error: null,
              status_code: 200
            });

            break;

          case 'observeGetSomething':
            let count = 0;

            const intervalID = setInterval(
              () => {
                if (globalObject[callback]) {
                  globalObject[callback]({
                    result: count,
                    error: null,
                    status_code: 200
                  });

                  count += 1;
                } else {
                  clearInterval(intervalID);
                }
              },
              parameters.interval as number
            );

            break;

          case 'observeGetSomethingWithTerminate':
            setTimeout(
              () => {
                globalObject[callback]({
                  result: { event: StreamEvent.STREAM_TERMINATED },
                  status_code: 200
                });
              },
              parameters.timeout as number
            );

            break;

          case 'throwError':
            globalObject[callback]({
              result: null,
              error: { message: formatError(parameters.param) },
              status_code: 404
            });

            break;
        }
      }
    };
  }

  async function test_invokeMethodWithoutParameter_shouldWork(
    globalObject: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);

    // When
    const result1 = await globalObject[wrappedName].invoke(
      'doSomethingWithoutParameter'
    );

    const result2 = await globalObject[wrappedName].invoke(
      'doSomethingWithoutParameter',
      null
    );

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expect(result1).toEqual({ result: null, error: null, status_code: 200 });
    expect(result2).toEqual({ result: null, error: null, status_code: 200 });
    expect(Object.keys(globalObject)).toHaveLength(2);
  }

  async function test_invokeMethodWithFalsyParam_shouldWork(
    globalObject: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);

    // When
    const result1 = await globalObject[wrappedName].invoke(
      'doSomethingWithFalsyParameter',
      0
    );

    const result2 = await globalObject[wrappedName].invoke(
      'doSomethingWithFalsyParameter',
      ''
    );

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expect(result1).toEqual({ result: 0, error: null, status_code: 200 });
    expect(result2).toEqual({ result: '', error: null, status_code: 200 });
    expect(Object.keys(globalObject)).toHaveLength(2);
  }

  async function test_moduleMethod_withNormalReturn(
    globalObject: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const param1 = '1';
    const param2 = '2';

    // When
    const result = await globalObject[wrappedName].invoke('getSomething', {
      param1,
      param2
    });

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expect(result).toEqual({
      result: formatResult(param1, param2),
      error: null,
      status_code: 200
    });

    expect(Object.keys(globalObject)).toHaveLength(2);
  }

  async function test_moduleMethod_withError(
    globalObject: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const param = '1';

    // When
    const result = await globalObject[wrappedName].invoke('throwError', {
      param
    });

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expect(result).toEqual({
      result: null,
      error: { message: formatError(param) },
      status_code: 404
    });

    expect(Object.keys(globalObject)).toHaveLength(2);
  }

  async function test_moduleMethod_withMultipleInvocations(
    globalObject: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const rounds = 1;

    const expected = [...Array(rounds).keys()].map(v => ({
      result: formatResult(v, v + 1),
      error: null,
      status_code: 200
    }));

    // When
    const results = await bluebird.map([...Array(rounds).keys()], v =>
      globalObject[wrappedName].invoke('getSomething', {
        param1: `${v}`,
        param2: `${v + 1}`
      })
    );

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expect(results).toEqual(expected);
    expect(Object.keys(globalObject)).toHaveLength(2);
  }

  function test_moduleMethod_withStream(
    globalObject: any,
    moduleName: string,
    done: Function
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const interval = 200;
    const timeout = 2100;
    const streamTimeout = 1100;
    const streamedVals: CallbackResult[] = [];

    // When
    const subscription = globalObject[wrappedName]
      .invoke('observeGetSomething', { interval })
      .subscribe({ next: (value: CallbackResult) => streamedVals.push(value) });

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    setTimeout(subscription.unsubscribe, streamTimeout);

    setTimeout(() => {
      const length = (streamTimeout - (streamTimeout % interval)) / interval;
      expect(streamedVals).toHaveLength(length);
      expect([...new Set(streamedVals)]).toHaveLength(length);
      expect(Object.keys(globalObject)).toHaveLength(2);
      done();
    }, timeout);
  }

  function test_moduleMethod_withTerminatingStream(
    globalObject: any,
    moduleName: string,
    done: Function
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const streamTimeout = 500;
    const timeout = 1000;
    const streamedValues: CallbackResult[] = [];
    let completed = false;

    // When
    const subscription = globalObject[wrappedName]
      .invoke('observeGetSomethingWithTerminate', { timeout: streamTimeout })
      .subscribe({
        next: (value: CallbackResult) => streamedValues.push(value),
        complete: () => (completed = true)
      });

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    setTimeout(() => {
      expect(streamedValues).toHaveLength(0);
      expect(completed).toBeTruthy();
      expect(subscription.isUnsubscribed()).toBeTruthy();
      expect(Object.keys(globalObject)).toHaveLength(2);
      done();
    }, timeout);
  }

  async function test_moduleMethodStream_shouldBeIdempotent(
    globalObject: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const iterations = 1000;

    const stream = globalObject[wrappedName].invoke('observeGetSomething', {
      param: 1
    });

    // When
    const subscriptions = [...Array(iterations)].map(() =>
      stream.subscribe({ next: () => {} })
    );

    // Then - make sure to check number of keys to include the original module
    // and the wrapped module as well.
    expect(Object.keys(globalObject)).toHaveLength(iterations + 2);
    subscriptions.forEach(subscription => subscription.unsubscribe());
    expect(Object.keys(globalObject)).toHaveLength(2);
  }

  // ################################ ANDROID ################################

  it('Should work for Android method without parameters', async () => {
    const globalObject: any = {};
    const adr = createTestADRModule(globalObject);
    globalObject[adr.name] = adr;
    wrapModule(globalObject, adr.name);
    await test_invokeMethodWithoutParameter_shouldWork(globalObject, adr.name);
  });

  it('Should work for Android method with falsy parameters', async () => {
    const globalObject: any = {};
    const adr = createTestADRModule(globalObject);
    globalObject[adr.name] = adr;
    wrapModule(globalObject, adr.name);
    await test_invokeMethodWithFalsyParam_shouldWork(globalObject, adr.name);
  });

  it('Should wrap Android method with normal return correctly', async () => {
    const globalObject: any = {};
    const adr = createTestADRModule(globalObject);
    globalObject[adr.name] = adr;
    wrapModule(globalObject, adr.name);
    await test_moduleMethod_withNormalReturn(globalObject, adr.name);
  });

  it('Should wrap Android method with error return correctly', async () => {
    const globalObject: any = {};
    const adr = createTestADRModule(globalObject);
    globalObject[adr.name] = adr;
    wrapModule(globalObject, adr.name);
    await test_moduleMethod_withError(globalObject, adr.name);
  });

  it('Should correctly call Android method multiple times', async () => {
    const globalObject: any = {};
    const adr = createTestADRModule(globalObject);
    globalObject[adr.name] = adr;
    wrapModule(globalObject, adr.name);
    await test_moduleMethod_withMultipleInvocations(globalObject, adr.name);
  });

  it('Should correctly stream values from Android method call', done => {
    const globalObject: any = {};
    const adr = createTestADRModule(globalObject);
    globalObject[adr.name] = adr;
    wrapModule(globalObject, adr.name);
    test_moduleMethod_withStream(globalObject, adr.name, done);
  });

  it('Should terminate stream for Android method call', done => {
    const globalObject: any = {};
    const adr = createTestADRModule(globalObject);
    globalObject[adr.name] = adr;
    wrapModule(globalObject, adr.name);
    test_moduleMethod_withTerminatingStream(globalObject, adr.name, done);
  });

  it('Should be idempotent for Android streams', async () => {
    const globalObject: any = {};
    const adr = createTestADRModule(globalObject);
    globalObject[adr.name] = adr;
    wrapModule(globalObject, adr.name);
    await test_moduleMethodStream_shouldBeIdempotent(globalObject, adr.name);
  });

  // ################################## IOS ##################################

  it('Should work for iOS method without parameters', async () => {
    const globalObject: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(globalObject);
    globalObject.webkit.messageHandlers[ios.name] = ios;
    wrapModule(globalObject, ios.name);
    await test_invokeMethodWithoutParameter_shouldWork(globalObject, ios.name);
  });

  it('Should work for iOS method with falsy parameters', async () => {
    const globalObject: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(globalObject);
    globalObject.webkit.messageHandlers[ios.name] = ios;
    wrapModule(globalObject, ios.name);
    await test_invokeMethodWithFalsyParam_shouldWork(globalObject, ios.name);
  });

  it('Should wrap iOS method with normal return correctly', async () => {
    const globalObject: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(globalObject);
    globalObject.webkit.messageHandlers[ios.name] = ios;
    wrapModule(globalObject, ios.name);
    await test_moduleMethod_withNormalReturn(globalObject, ios.name);
  });

  it('Should wrap iOS method with error return correctly', async () => {
    const globalObject: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(globalObject);
    globalObject.webkit.messageHandlers[ios.name] = ios;
    wrapModule(globalObject, ios.name);
    await test_moduleMethod_withError(globalObject, ios.name);
  });

  it('Should correctly call iOS method multiple times', async () => {
    const globalObject: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(globalObject);
    globalObject.webkit.messageHandlers[ios.name] = ios;
    wrapModule(globalObject, ios.name);
    await test_moduleMethod_withMultipleInvocations(globalObject, ios.name);
  });

  it('Should correctly stream values from iOS method call', done => {
    const globalObject: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(globalObject);
    globalObject.webkit.messageHandlers[ios.name] = ios;
    wrapModule(globalObject, ios.name);
    test_moduleMethod_withStream(globalObject, ios.name, done);
  });

  it('Should terminate stream for iOS method call', done => {
    const globalObject: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(globalObject);
    globalObject.webkit.messageHandlers[ios.name] = ios;
    wrapModule(globalObject, ios.name);
    test_moduleMethod_withTerminatingStream(globalObject, ios.name, done);
  });

  it('Should be idempotent for iOS streams', async () => {
    const globalObject: any = { webkit: { messageHandlers: {} } };
    const ios = createTestIOSModule(globalObject);
    globalObject.webkit.messageHandlers[ios.name] = ios;
    wrapModule(globalObject, ios.name);
    await test_moduleMethodStream_shouldBeIdempotent(globalObject, ios.name);
  });
});

describe('Edge cases for wrapper', () => {
  it('Should throw error for Promise if no module found', async () => {
    // Setup
    const globalObject: any = {};
    const moduleName = 'NonExistentModule';
    const wrappedName = wrapModuleName(moduleName);
    wrapModule(globalObject, moduleName);

    // When && Then
    try {
      await globalObject[wrappedName].invoke('nonExistentMethod');
      fail('Never should have come here');
    } catch (e) {
      expect(e).toBeTruthy();
    }
  });

  it('Should throw error for stream if no module found', async () => {
    // Setup
    const globalObject: any = {};
    const moduleName = 'NonExistentModule';
    const wrappedName = wrapModuleName(moduleName);
    wrapModule(globalObject, moduleName);

    // When && Then
    try {
      globalObject[wrappedName]
        .invoke('nonExistentMethod')
        .subscribe({ next: console.log, complete: console.log });

      fail('Never should have come here');
    } catch (e) {
      expect(e).toBeTruthy();
    }
  });
});

describe('Utility functions should work correctly', () => {
  it('Data stream should support Promise-style chaining', async done => {
    // Setup
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
    const { result, error, status_code } = await dataStream;

    // Then
    setTimeout(() => {
      expect(result).toEqual(1);
      expect(error).toBeFalsy();
      expect(status_code).toEqual(200);
      expect(currentTick).toEqual(1);
      done();
    }, 500);
  });
});
