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

    // Then
    expect(result).toEqual({
      result: formatResult(param1, param2),
      error: null,
      status_code: 200
    });
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

    // Then
    expect(result).toEqual({
      result: null,
      error: { message: formatError(param) },
      status_code: 404
    });
  }

  async function test_moduleMethod_withMultipleInvocations(
    globalObject: any,
    moduleName: string
  ) {
    // Setup
    const wrappedName = wrapModuleName(moduleName);
    const rounds = 100;

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
      .invoke('observeGetSomething', { interval, isStream: true })
      .subscribe({ next: (value: CallbackResult) => streamedVals.push(value) });

    // Then.
    setTimeout(subscription.unsubscribe, streamTimeout);

    setTimeout(() => {
      const length = (streamTimeout - (streamTimeout % interval)) / interval;
      expect(streamedVals).toHaveLength(length);
      expect([...new Set(streamedVals)]).toHaveLength(length);
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
      .invoke('observeGetSomethingWithTerminate', {
        isStream: true,
        timeout: streamTimeout
      })
      .subscribe({
        next: (value: CallbackResult) => streamedValues.push(value),
        complete: () => (completed = true)
      });

    // Then
    setTimeout(() => {
      expect(streamedValues).toHaveLength(0);
      expect(completed).toBeTruthy();
      expect(subscription.isUnsubscribed()).toBeTruthy();
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
      isStream: true,
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

  it('Should correctly call Android method multiple times', async () => {
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
