import bluebird from 'bluebird';
import { StreamEvent } from './simplify-callback';
import { CallbackResult } from './utils';
import { AndroidMethodParameter, wrapAndroidModule } from './wrap-android';
import { IOSMethodParameter, wrapIOSModule } from './wrap-ios';

function formatResult(param1: unknown, param2: unknown) {
  return `${param1}-${param2}`;
}

function formatError(param: unknown) {
  return `Error: ${param}`;
}

function createTestADRModule(globalObject: any) {
  return {
    getSomething({
      parameters: { param1, param2 },
      callback
    }: AndroidMethodParameter<Readonly<{ param1: string; param2: string }>>) {
      globalObject[callback]({
        result: formatResult(param1, param2),
        error: null,
        status_code: 200
      });
    },
    observeGetSomething({
      parameters: { interval },
      callback
    }: AndroidMethodParameter<Readonly<{ interval: number }>>) {
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
      },                             interval);
    },
    observeGetSomethingWithTerminate({
      parameters: { timeout },
      callback
    }: AndroidMethodParameter<Readonly<{ timeout: number }>>) {
      setTimeout(() => {
        globalObject[callback]({ event: StreamEvent.STREAM_TERMINATED });
      },         timeout);
    },
    throwError({
      parameters: { param },
      callback
    }: AndroidMethodParameter<Readonly<{ param: string }>>) {
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
    postMessage: ({
      method,
      parameters,
      callback
    }: IOSMethodParameter<
      | 'getSomething'
      | 'observeGetSomething'
      | 'observeGetSomethingWithTerminate'
      | 'throwError'
    >) => {
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
                event: StreamEvent.STREAM_TERMINATED
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

describe('Module wrappers should wrap platform modules correctly', () => {
  async function test_moduleMethod_withNormalReturn(wrappedModule: any) {
    // Setup
    const param1 = '1';
    const param2 = '2';

    // When
    const result = await wrappedModule.invoke('getSomething', {
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

  async function test_moduleMethod_withError(wrappedModule: any) {
    // Setup
    const param = '1';

    // When
    const result = await wrappedModule.invoke('throwError', { param });

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
      wrappedModule.invoke('getSomething', {
        param1: `${v}`,
        param2: `${v + 1}`
      })
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
    const streamedVals: CallbackResult[] = [];

    // When
    const subscription = wrappedModule
      .invoke('observeGetSomething', { interval })
      .subscribe({ next: (value: CallbackResult) => streamedVals.push(value) });

    // Then
    setTimeout(subscription.unsubscribe, streamTimeout);

    setTimeout(() => {
      const length = (streamTimeout - (streamTimeout % interval)) / interval;
      expect(streamedVals).toHaveLength(length);
      expect([...new Set(streamedVals)]).toHaveLength(length);
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
      .invoke('observeGetSomethingWithTerminate', { timeout: streamTimeout })
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
    },         timeout);
  }

  async function test_moduleMethodStream_shouldBeIdempotent(
    globalObject: any,
    wrappedModule: any
  ) {
    // Setup
    const iterations = 1000;

    const stream = wrappedModule.invoke('observeGetSomething', { param: 1 });

    // When
    const subscriptions = [...Array(iterations)].map(() =>
      stream.subscribe({ next: console.log })
    );

    // Then
    expect(Object.keys(globalObject)).toHaveLength(iterations);
    subscriptions.forEach(subscription => subscription.unsubscribe());
    expect(Object.keys(globalObject)).toHaveLength(0);
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

  it('Should be idempotent for Android streams', async () => {
    const globalObject = {};
    const adr = createTestADRModule(globalObject);
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    await test_moduleMethodStream_shouldBeIdempotent(globalObject, wrapped);
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

  it('Should be idempotent for iOS streams', async () => {
    const globalObject = {};
    const ios = createTestIOSModule(globalObject);
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    await test_moduleMethodStream_shouldBeIdempotent(globalObject, wrapped);
  });
});
