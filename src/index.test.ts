import bluebird from 'bluebird';
import {
  createModuleMethodParameter,
  IOSModule,
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

class TestADRModule {
  getSomething(requestID: string, param1: string, param2: string) {
    globalObject.TestADRModule_getSomethingCallback({
      requestID,
      result: formatResult(param1, param2),
      error: null,
      status_code: 200
    });
  }

  throwError(requestID: string, param: string) {
    globalObject.TestADRModule_throwErrorCallback({
      requestID,
      result: null,
      error: { message: formatError(param) },
      status_code: 404
    });
  }
}

function TestIOSModule(): IOSModule {
  return {
    postMessage: ({
      method,
      parameters: { requestID, ...rest },
      callbackName
    }) => {
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
  async function testModuleMethodWithNormalReturn(createModuleFunc: () => any) {
    // Setup
    const param1 = '1';
    const param2 = '2';

    // When
    const wrappedModule = createModuleFunc();

    const result = await wrappedModule.invoke(
      'getSomething',
      createModuleMethodParameter('param1', param1),
      createModuleMethodParameter('param2', param2)
    );

    // Then
    expect(result).toEqual({
      result: formatResult(param1, param2),
      error: null,
      status_code: 200
    });
  }

  async function testModuleMethodWithError(createModuleFunc: () => any) {
    // Setup
    const param = '1';

    // When
    const wrappedModule = createModuleFunc();

    const result = await wrappedModule.invoke(
      'throwError',
      createModuleMethodParameter('param', param)
    );

    // Then
    expect(result).toEqual({
      result: null,
      error: { message: formatError(param) },
      status_code: 404
    });
  }

  async function testModuleMethodWithMultipleInvocations(
    createModuleFunc: () => any
  ) {
    // Setup
    const rounds = 100;

    const expected = [...Array(rounds).keys()].map(v => ({
      result: formatResult(v, v + 1),
      error: null,
      status_code: 200
    }));

    // When
    const wrappedModule = createModuleFunc();

    const results = await bluebird.map([...Array(rounds).keys()], v =>
      wrappedModule.invoke(
        'getSomething',
        createModuleMethodParameter('param1', `${v}`),
        createModuleMethodParameter('param2', `${v + 1}`)
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
    await testModuleMethodWithNormalReturn(() =>
      wrapAndroidModule(globalObject, 'TestADRModule', new TestADRModule())
    );
  });

  it('Should wrap Android method with error return correctly', async () => {
    await testModuleMethodWithError(() =>
      wrapAndroidModule(globalObject, 'TestADRModule', new TestADRModule())
    );
  });

  it('Should correctly call Android method multiple times', async () => {
    await testModuleMethodWithMultipleInvocations(() =>
      wrapAndroidModule(globalObject, 'TestADRModule', new TestADRModule())
    );
  });

  it('Should wrap iOS method with normal return correctly', async () => {
    await testModuleMethodWithNormalReturn(() =>
      wrapIOSModule(globalObject, 'TestIOSModule', TestIOSModule())
    );
  });

  it('Should wrap iOS method with error return correctly', async () => {
    await testModuleMethodWithError(() =>
      wrapIOSModule(globalObject, 'TestIOSModule', TestIOSModule())
    );
  });

  it('Should correctly call Android method multiple times', async () => {
    await testModuleMethodWithMultipleInvocations(() =>
      wrapIOSModule(globalObject, 'TestIOSModule', TestIOSModule())
    );
  });
});
