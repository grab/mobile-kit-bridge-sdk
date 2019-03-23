import bluebird from 'bluebird';
import { IOSMethodParameter, wrapAndroidModule, wrapIOSModule } from './index';
import { StreamEvent } from './simplify-callback';
import { CallbackResult, createMethodParameter } from './utils';

function formatResult(param1: unknown, param2: unknown) {
  return `${param1}-${param2}`;
}

function formatError(param: unknown) {
  return `Error: ${param}`;
}

function createTestADRModule(globalObject: any) {
  return {
    getSomething(param1: string, param2: string, callbackName: string) {
      globalObject[callbackName]({
        result: formatResult(param1, param2),
        error: null,
        status_code: 200
      });
    },
    getSomethingStream(interval: number, callbackName: string) {
      let count = 0;

      const intervalID = setInterval(() => {
        if (globalObject[callbackName]) {
          globalObject[callbackName]({
            result: count,
            error: null,
            status_code: 200
          });

          count += 1;
        } else {
          clearInterval(intervalID);
        }
      },                             interval);
    },
    getSomethingWithTerminatingStream(timeout: number, callbackName: string) {
      setTimeout(() => {
        globalObject[callbackName]({ event: StreamEvent.STREAM_TERMINATED });
      },         timeout);
    },
    throwError(param: string, callbackName: string) {
      globalObject[callbackName]({
        result: null,
        error: { message: formatError(param) },
        status_code: 404
      });
    }
  };
}

function createTestIOSModule(globalObject: any) {
  return {
    postMessage: ({
      method,
      parameters,
      callbackName
    }: IOSMethodParameter<
      | 'getSomething'
      | 'getSomethingStream'
      | 'getSomethingWithTerminatingStream'
      | 'throwError'
    >) => {
      switch (method) {
        case 'getSomething':
          globalObject[callbackName]({
            result: formatResult(parameters.param1, parameters.param2),
            error: null,
            status_code: 200
          });

          break;

        case 'getSomethingStream':
          let count = 0;

          const intervalID = setInterval(
            () => {
              if (globalObject[callbackName]) {
                globalObject[callbackName]({
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

        case 'getSomethingWithTerminatingStream':
          setTimeout(
            () => {
              globalObject[callbackName]({
                event: StreamEvent.STREAM_TERMINATED
              });
            },
            parameters.timeout as number
          );

          break;

        case 'throwError':
          globalObject[callbackName]({
            result: null,
            error: { message: formatError(parameters.param) },
            status_code: 404
          });

          break;
      }
    }
  };
}

describe('Module wrappers should wrap platform modules correctly', () => {
  async function test_moduleMethod_withNormalReturn(wrappedModule: any) {
    // Setup
    const param1 = '1';
    const param2 = '2';

    // When
    const result = await wrappedModule.invoke(
      'getSomething',
      createMethodParameter('param1', param1),
      createMethodParameter('param2', param2)
    );

    // Then
    expect(result).toEqual({
      result: formatResult(param1, param2),
      error: null,
      status_code: 200
    });
  }

  async function test_moduleMethod_withError(wrappedModule: any) {
    // Setup
    const param = '1';

    // When
    const result = await wrappedModule.invoke(
      'throwError',
      createMethodParameter('param', param)
    );

    // Then
    expect(result).toEqual({
      result: null,
      error: { message: formatError(param) },
      status_code: 404
    });
  }

  async function test_moduleMethod_withMultipleInvocations(
    globalObject: any,
    wrappedModule: any
  ) {
    // Setup
    const rounds = 100;

    const expected = [...Array(rounds).keys()].map(v => ({
      result: formatResult(v, v + 1),
      error: null,
      status_code: 200
    }));

    // When
    const results = await bluebird.map([...Array(rounds).keys()], v =>
      wrappedModule.invoke(
        'getSomething',
        createMethodParameter('param1', `${v}`),
        createMethodParameter('param2', `${v + 1}`)
      )
    );

    // Then
    expect(results).toEqual(expected);
    expect(Object.keys(globalObject)).toHaveLength(0);
  }

  function test_moduleMethod_withStream(wrappedModule: any, done: Function) {
    // Setup
    const interval = 200;
    const timeout = 2100;
    const streamTimeout = 1100;
    const streamedValues: CallbackResult[] = [];

    // When
    const subscription = wrappedModule
      .invoke('getSomethingStream', createMethodParameter('interval', interval))
      .subscribe((value: CallbackResult) => streamedValues.push(value));

    // Then
    setTimeout(subscription.unsubscribe, streamTimeout);

    setTimeout(() => {
      const length = (streamTimeout - (streamTimeout % interval)) / interval;
      expect(streamedValues).toHaveLength(length);
      expect([...new Set(streamedValues)]).toHaveLength(length);
      done();
    },         timeout);
  }

  function test_moduleMethod_withTerminatingStream(
    wrappedModule: any,
    done: Function
  ) {
    // Setup
    const streamTimeout = 500;
    const timeout = 1000;
    const streamedValues: CallbackResult[] = [];
    let completed = false;

    // When
    const subscription = wrappedModule
      .invoke(
        'getSomethingWithTerminatingStream',
        createMethodParameter('timeout', streamTimeout)
      )
      .subscribe(
        (value: CallbackResult) => streamedValues.push(value),
        () => (completed = true)
      );

    // Then
    setTimeout(() => {
      expect(streamedValues).toHaveLength(0);
      expect(completed).toBeTruthy();
      expect(subscription.isUnsubscribed()).toBeTruthy();
      done();
    },         timeout);
  }

  it('Should wrap Android method with normal return correctly', async () => {
    const globalObject = {};
    const adr = createTestADRModule(globalObject);
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    await test_moduleMethod_withNormalReturn(wrapped);
  });

  it('Should wrap Android method with error return correctly', async () => {
    const globalObject = {};
    const adr = createTestADRModule(globalObject);
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    await test_moduleMethod_withError(wrapped);
  });

  it('Should correctly call Android method multiple times', async () => {
    const globalObject = {};
    const adr = createTestADRModule(globalObject);
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    await test_moduleMethod_withMultipleInvocations(globalObject, wrapped);
  });

  it('Should correctly stream values from Android method call', done => {
    const globalObject = {};
    const adr = createTestADRModule(globalObject);
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    test_moduleMethod_withStream(wrapped, done);
  });

  it('Should terminate stream for Android method call', done => {
    const globalObject = {};
    const adr = createTestADRModule(globalObject);
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    test_moduleMethod_withTerminatingStream(wrapped, done);
  });

  it('Should wrap iOS method with normal return correctly', async () => {
    const globalObject = {};
    const ios = createTestIOSModule(globalObject);
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    await test_moduleMethod_withNormalReturn(wrapped);
  });

  it('Should wrap iOS method with error return correctly', async () => {
    const globalObject = {};
    const ios = createTestIOSModule(globalObject);
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    await test_moduleMethod_withError(wrapped);
  });

  it('Should correctly call Android method multiple times', async () => {
    const globalObject = {};
    const ios = createTestIOSModule(globalObject);
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    await test_moduleMethod_withMultipleInvocations(globalObject, wrapped);
  });

  it('Should correctly stream values from iOS method call', done => {
    const globalObject = {};
    const ios = createTestIOSModule(globalObject);
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    test_moduleMethod_withStream(wrapped, done);
  });

  it('Should terminate stream for iOS method call', done => {
    const globalObject = {};
    const ios = createTestIOSModule(globalObject);
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    test_moduleMethod_withTerminatingStream(wrapped, done);
  });
});
