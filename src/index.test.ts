import bluebird from 'bluebird';
import {
  createMethodParameter,
  IOSMethodParameter,
  wrapAndroidModule,
  wrapIOSModule
} from './index';

let globalObject: any = {};

function formatResult(param1: unknown, param2: unknown) {
  return `${param1}-${param2}`;
}

function formatError(param: unknown) {
  return `Error: ${param}`;
}

function createTestADRModule() {
  return {
    getSomething(requestID: string, param1: string, param2: string) {
      globalObject.TestADRModule_getSomethingCallback({
        requestID,
        result: formatResult(param1, param2),
        error: null,
        status_code: 200
      });
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
  async function testModuleMethodWithNormalReturn(wrappedModule: any) {
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

  async function testModuleMethodWithError(wrappedModule: any) {
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

  async function testModuleMethodWithMultipleInvocations(wrappedModule: any) {
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

  beforeEach(() => {
    globalObject = {};
  });

  it('Should wrap Android method with normal return correctly', async () => {
    const adr = createTestADRModule();
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    await testModuleMethodWithNormalReturn(wrapped);
  });

  it('Should wrap Android method with error return correctly', async () => {
    const adr = createTestADRModule();
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    await testModuleMethodWithError(wrapped);
  });

  it('Should correctly call Android method multiple times', async () => {
    const adr = createTestADRModule();
    const wrapped = wrapAndroidModule(globalObject, 'TestADRModule', adr);
    await testModuleMethodWithMultipleInvocations(wrapped);
  });

  it('Should wrap iOS method with normal return correctly', async () => {
    const ios = createTestIOSModule();
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    await testModuleMethodWithNormalReturn(wrapped);
  });

  it('Should wrap iOS method with error return correctly', async () => {
    const ios = createTestIOSModule();
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    await testModuleMethodWithError(wrapped);
  });

  it('Should correctly call Android method multiple times', async () => {
    const ios = createTestIOSModule();
    const wrapped = wrapIOSModule(globalObject, 'TestIOSModule', ios);
    await testModuleMethodWithMultipleInvocations(wrapped);
  });
});
