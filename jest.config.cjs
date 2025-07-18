module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  transformIgnorePatterns: ['/node_modules/']
}; 