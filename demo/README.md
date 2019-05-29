# Bridge SDK demo

## Setting up

- Go to **bridge-server** and run `yarn` to install dependencies, then `yarn start` to start the server.
- The server will be started with port `8000`. If there is a port conflict, run `lsof -i tcp:8000` and kill the existing process with `kill $PID`.
- Open **Android Studio** and run the Android app in an emulator.
- Open **XCode** and run the iOS app in a simulator.

## What to test

- Clicking on **Click to observe** should start observing values for the defined key.
- Typing on the value input should stream values to the `observe-value` **div**.
- Clicking on **Click to unsub** should unsubscribe from the value stream.
