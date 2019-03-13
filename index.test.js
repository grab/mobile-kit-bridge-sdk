import "@babel/polyfill";
import { wrapAndroidKit, wrapIOSKit } from ".";

class TestAndroidKit {
  async getSomething(arg1, arg2, callback) {
    callback(`Arg1: ${arg1}, arg2: ${arg2}`);
  }
}

function TestIOSKit() {
  return {
    postMessage: ({ arg1, arg2, callback }) => {
      callback(`Arg1: ${arg1}, arg2: ${arg2}`);
    }
  };
}

describe("Kit wrappers should wrap platform kits correctly", () => {
  it("Should wrap Android kit correctly", () => {
    // Setup
    const androidKit = new TestAndroidKit();

    // When
    const wrappedKit = wrapAndroidKit(androidKit);

    // Then
    wrappedKit.getSomething("1", "2", console.log);
  });

  xit("Should wrap iOS kit correctly", () => {
    // Setup
    const iosKit = TestIOSKit();

    // When
    const wrappedKit = wrapIOSKit(iosKit);

    // Then
    wrappedKit.getSomething("1", "2", console.log);
  });
});
