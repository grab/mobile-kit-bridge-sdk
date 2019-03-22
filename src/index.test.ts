import bluebird from 'bluebird';
import { IOSMethodParameter, wrapAndroidModule, wrapIOSModule } from './index';
import { createMethodParameter } from './utils';

function formatResult(param1: unknown, param2: unknown) {
  return `${param1}-${param2}`;
}

function formatError(param: unknown) {
  return `Error: ${param}`;
}

function createTestADRModule(globalObject: any) {
  return {
    getSomething(
      requestID: string,
      param1: string,
      param2: string,
      callbackName: string
    ) {
      globalObject[callbackName]({
        requestID,
        result: formatResult(param1, param2),
        error: null,
        status_code: 200
      });
    },
    getSomethingStream(
      requestID: string,
      interval: number,
      callbackName: string
    ) {
      let count = 0;

      const intervalID = setInterval(() => {
        if (globalObject[callbackName]) {
          globalObject[callbackName]({
            requestID,
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
    throwError(requestID: string, param: string) {
      globalObject.TestADRModule_throwErrorCallback({
        requestID,
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
      parameters: { requestID, ...rest },
      callbackName
    }: IOSMethodParameter<
      'getSomething' | 'getSomethingStream' | 'throwError'
    >) => {
      switch (method) {
        case 'getSomething':
          globalObject[callbackName]({
            requestID,
            result: formatResult(rest.param1, rest.param2),
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
                  requestID,
                  result: count,
                  error: null,
                  status_code: 200
                });

                count += 1;
              } else {
                clearInterval(intervalID);
              }
            },
            rest.interval as number
          );

          break;

        case 'throwError':
          globalObject[callbackName]({
            requestID,
            result: null,
            error: { message: formatError(rest.param) },
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
    console.log('>>>>>>>>>>>>>>>>>>>>', globalObject);

    expect(
      Object.keys(globalObject).filter(key => key.indexOf('getSomething') > -1)
    ).toHaveLength(1);
  }

  function test_moduleMethod_withStream(wrappedModule: any, done: Function) {
    // Setup
    const interval = 200;
    const timeout = 2100;
    const streamedValues: string[] = [];

    // When
    wrappedModule
      .invoke('getSomethingStream', createMethodParameter('interval', interval))
      .subscribe((value: string) => streamedValues.push(value));

    // Then
    setTimeout(() => {
      const length = (timeout - (timeout % interval)) / interval;
      expect(streamedValues).toHaveLength(length);
      expect([...new Set(streamedValues)]).toHaveLength(length);
      done();
    },         2100);
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
});
