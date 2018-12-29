/**
 * Test cases for Processor Service
 */
const _ = require('lodash')
const config = require('config')
const should = require('should')
const processorService = require('../../src/services/ProcessorService')
const logger = require('../../src/common/logger')
const {
  challengeId,
  stringFields,
  testMethods,
  invalidChallenges
} = require('../common/testData')

describe('Challenge Registration Processor Unit Tests', () => {
  const infoLogs = []
  const errorLogs = []
  const info = logger.info
  const error = logger.error
  /**
   * Assert validation error
   * @param err the error to validate
   * @param message the error message
   */
  const assertValidationError = (err, message) => {
    err.isJoi.should.be.true()
    should.equal(err.name, 'ValidationError')
    err.details.map(x => x.message).should.containEql(message)
    errorLogs.should.not.be.empty()
    errorLogs.should.containEql(err.stack)
  }

  /**
   * Set challenge id
   * @param message the message
   * @param challengeId the challenge id
   */
  const setChallengeId = (message, challengeId) => {
    if (_.get(message, 'payload.data.challengeId')) {
      message.payload.data.challengeId = challengeId
    } else if (_.get(message, 'payload.detail.challengeId')) {
      message.payload.detail.challengeId = challengeId
    }
  }

  before(() => {
    // inject logger with log collector
    logger.info = (message) => {
      infoLogs.push(message)
      if (!config.DISABLE_LOGGING) {
        info(message)
      }
    }
    logger.error = (message) => {
      errorLogs.push(message)
      if (!config.DISABLE_LOGGING) {
        error(message)
      }
    }
  })

  beforeEach(() => {
    // clear logs
    infoLogs.length = 0
    errorLogs.length = 0
  })

  after(() => {
    // restore logger
    logger.error = error
    logger.info = info
  })

  for (const testMethod of Object.keys(testMethods)) {
    const { testMessage, requiredFields, integerFields, booleanFields } = testMethods[testMethod]
    it(`test ${testMethod} by valid challenge id(response 200 status)`, async () => {
      await processorService[testMethod](testMessage)
      infoLogs.should.containEql(`Successfully updated challenge details of id ${challengeId} in Elasticsearch.`)
      errorLogs.should.be.empty()
    })
    for (const invalidChallenge of invalidChallenges) {
      const { invalidChallengeId, invalidStatus } = invalidChallenge
      it(`test ${testMethod} by invalid challenge id with ${invalidStatus}`, async () => {
        let message = _.cloneDeep(testMessage)
        setChallengeId(message, invalidChallengeId)
        try {
          await processorService[testMethod](message)
          throw new Error('should throw error here')
        } catch (err) {
          should.equal(err.message, `Failed to update challenge details of id ${invalidChallengeId} in Elasticsearch.`)
          errorLogs.should.not.be.empty()
          errorLogs.should.containEql(err.stack)
        }
      })
    }

    for (const requiredField of requiredFields) {
      it(`test ${testMethod} message - invalid parameters, required field ${requiredField} is missing`, async () => {
        let message = _.cloneDeep(testMessage)
        message = _.omit(message, requiredField)
        try {
          await processorService[testMethod](message)
          throw new Error('should throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(requiredField.split('.'))}" is required`)
        }
      })
    }
    it(`test ${testMethod} message - invalid parameters, invalid payload type`, async () => {
      let message = _.cloneDeep(testMessage)
      const validType = _.get(message, 'payload.type')
      message.payload.type = 'invalid'
      try {
        await processorService[testMethod](message)
        throw new Error('should throw error here')
      } catch (err) {
        assertValidationError(err, `"type" must be one of [${validType}]`)
      }
    })
    it(`test ${testMethod} message - invalid parameters, invalid timestamp`, async () => {
      let message = _.cloneDeep(testMessage)
      message.timestamp = 'invalid'
      try {
        await processorService[testMethod](message)
        throw new Error('should throw error here')
      } catch (err) {
        assertValidationError(err, `"timestamp" must be a number of milliseconds or valid date string`)
      }
    })
    for (const stringField of stringFields) {
      it(`test ${testMethod} message - invalid parameters, invalid string type field ${stringField}`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, stringField, 123)
        try {
          await processorService[testMethod](message)
          throw new Error('should throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(stringField.split('.'))}" must be a string`)
        }
      })
    }
    for (const integerField of integerFields) {
      it(`test ${testMethod} message - invalid parameters, invalid integer type field ${integerField}(wrong number)`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, 'string')
        try {
          await processorService[testMethod](message)
          throw new Error('should throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(integerField.split('.'))}" must be a number`)
        }
      })
      it(`test ${testMethod} message - invalid parameters, invalid integer type field ${integerField}(wrong integer)`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, 1.1)
        try {
          await processorService[testMethod](message)
          throw new Error('should throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(integerField.split('.'))}" must be an integer`)
        }
      })
      it(`test ${testMethod} message - invalid parameters, invalid integer type field ${integerField}(negative)`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, -1)
        try {
          await processorService[testMethod](message)
          throw new Error('should throw error here')
        } catch (err) {
          const fieldName = _.last(integerField.split('.'))
          assertValidationError(err, `"${fieldName}" must be larger than or equal to ${fieldName === 'phaseId' ? 0 : 1}`)
        }
      })
    }
    if (booleanFields) {
      for (const booleanField of booleanFields) {
        it(`test ${testMethod} message - invalid parameters, invalid  boolean type field ${booleanField}`, async () => {
          let message = _.cloneDeep(testMessage)
          _.set(message, booleanField, 'invalidboolean')
          try {
            await processorService[testMethod](message)
            throw new Error('should throw error here')
          } catch (err) {
            assertValidationError(err, `"${_.last(booleanField.split('.'))}" must be a boolean`)
          }
        })
      }
    }
  }
})
