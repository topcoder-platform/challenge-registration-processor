/**
 * Configuration file to be used while running tests
 */

module.exports = {
  DISABLE_LOGGING: false, // If true, logging will be disabled
  LOG_LEVEL: 'debug',
  KAFKA_URL: process.env.TEST_KAFKA_URL || 'localhost:9092',
  UPDATE_ES_CHALLENGE_DETAILS_URL: process.env.TEST_UPDATE_ES_CHALLENGE_DETAILS_URL || 'https://api.topcoder-dev.com/v4/esfeeder/challenges',
  WAIT_TIME: 1000 // small wait time used in test
}
