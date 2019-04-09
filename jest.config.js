/**
 * Copyright (c) Grab Taxi Holdings PTE LTD (GRAB)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  roots: ['<rootDir>', '<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  collectCoverage: true,
  modulePaths: ['src'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};
