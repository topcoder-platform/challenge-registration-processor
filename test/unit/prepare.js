/*
 * Setting up Mock for tests
 */

const config = require('config')
const nock = require('nock')
const prepare = require('mocha-prepare')
const {
  challengeId,
  noStatusChallengeId,
  status100ChallengeId,
  status404ChallengeId,
  buildUpdateESChallengeResponse
} = require('../common/testData')

prepare((done) => {
  // called before loading of test cases
  nock(config.UPDATE_ES_CHALLENGE_DETAILS_URL)
    .persist()
    .put(() => true, { param: { challengeIds: [challengeId] } })
    .reply(200, buildUpdateESChallengeResponse(200))
    .put(() => true, { param: { challengeIds: [noStatusChallengeId] } })
    .reply(500, {})
    .put(() => true, { param: { challengeIds: [status100ChallengeId] } })
    .reply(100, buildUpdateESChallengeResponse(100))
    .put(() => true, { param: { challengeIds: [status404ChallengeId] } })
    .reply(404)
  done()
}, (done) => {
  // called after all test completes (regardless of errors)
  nock.cleanAll()
  done()
})
