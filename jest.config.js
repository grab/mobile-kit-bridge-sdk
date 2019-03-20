module.exports = {
  roots: ["<rootDir>", "<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  collectCoverage: true,
  modulePaths: ["src"],
  moduleFileExtensions: ["ts", "js", "json", "node"]
};
