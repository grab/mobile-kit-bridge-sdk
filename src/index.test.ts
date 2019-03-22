import bluebird from 'bluebird';
import { IOSMethodParameter, wrapAndroidModule, wrapIOSModule } from './index';
import { createMethodParameter } from './utils';

let globalObject: any = {};

function formatResult(param1: unknown, param2: unknown) {
  return `${param1}-${param2}`;
}

function formatError(param: unknown) {
  return `Error: ${param}`;
}

function createTestADRModule() {
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
    getSomethingStream(requestID: string, param: string, callbackName: string) {
      setInterval(() => {
        console.log(param, callbackName);

        globalObject[callbackName]({
          requestID,
          result: param,
          error: null,
          status_code: 200
        });
      },          1000);
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

function createTestIOSModule() {
  return {
    postMessage: ({
      method,
      parameters: { requestID, ...rest },
      callbackName
    }: IOSMethodParameter<'getSomething' | 'throwError'>) => {
      switch (method) {
        case 'getSomething':
          globalObject[callbackName]({
            requestID,
            result: formatResult(rest.param1, rest.param2),
            error: null,
            status_code: 200
          });

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

  async function test_moduleMethod_withMultipleInvocations(wrappedModule: any) {
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

    expect(
      Object.keys(globalObject).filter(key => key.indexOf('getSomething') > -1)
    ).toHaveLength(1);
  }

  function test_moduleMethod_withStream(wrappedModule: any, done: Function) {
    // Setup
    const param = 'Hey';

    // When
    wrappedModule.invoke(
      'getSomethingStream',
      createMethodParameter('param', param)
    );

    // Then
    setTimeout(() => {
      done();
    },         2000);
  }

  beforeEach(() => {
    globalObject = {};
  });

  it('Should wrap Android method with normal return correctly', async () => {
    const adr = createTestADRModule();
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    await test_moduleMethod_withNormalReturn(wrapped);
  });

  it('Should wrap Android method with error return correctly', async () => {
    const adr = createTestADRModule();
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    await test_moduleMethod_withError(wrapped);
  });

  it('Should correctly call Android method multiple times', async () => {
    const adr = createTestADRModule();
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    await test_moduleMethod_withMultipleInvocations(wrapped);
  });

  it.only('Should correctly stream values from Android method call', done => {
    const adr = createTestADRModule();
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    test_moduleMethod_withStream(wrapped, done);
  });

  it('Should wrap iOS method with normal return correctly', async () => {
    const ios = createTestIOSModule();
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    await test_moduleMethod_withNormalReturn(wrapped);
  });

  it('Should wrap iOS method with error return correctly', async () => {
    const ios = createTestIOSModule();
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    await test_moduleMethod_withError(wrapped);
  });

  it('Should correctly call Android method multiple times', async () => {
    const ios = createTestIOSModule();
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    await test_moduleMethod_withMultipleInvocations(wrapped);
  });
});
