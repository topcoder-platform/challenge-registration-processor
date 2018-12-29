/**
 * The test cases for Challenge Registration Processor.
 */
global.Promise = require('bluebird')
const _ = require('lodash')
const axios = require('axios')
const Kafka = require('no-kafka')
const config = require('config')
const should = require('should')
const logger = require('../../src/common/logger')
const { getKafkaOptions } = require('../../src/common/utils')
const { sleep } = require('../common/helper')
const {
  challengeId,
  stringFields,
  testMethods
} = require('../common/testData')

const kafkaOptions = getKafkaOptions()
const WAIT_TIME = config.WAIT_TIME

describe('Challenge Registration Processor e2e Tests', () => {
  let appConsumer
  const infoLogs = []
  const errorLogs = []
  const debugLogs = []
  const debug = logger.debug
  const info = logger.info
  const error = logger.error
  /**
   * Assert error logs
   * @param message the error message to validate
   */
  const assertErrorLogs = (message) => {
    errorLogs.should.not.be.empty()
    errorLogs.some(x => String(x).includes(message)).should.be.true()
  }

  const producer = new Kafka.Producer(kafkaOptions)
  /**
   * Send message
   * @param testMessage the test message
   */
  const sendMessage = async (testMessage) => {
    await producer.send({
      topic: testMessage.topic,
      message: {
        value: JSON.stringify(testMessage)
      }
    })
  }

  /**
   * Consume not committed messages before e2e test
   */
  const consumeMessages = async () => {
    // remove all not processed messages
    const consumer = new Kafka.GroupConsumer(kafkaOptions)
    await consumer.init([{
      subscriptions: [config.RESOURCE_TOPIC, config.REGISTRATION_TOPIC],
      handler: (messageSet, topic, partition) => Promise.each(messageSet, (m) => consumer.commitOffset({ topic, partition, offset: m.offset }))
    }])
    // make sure process all not committed messages before test
    await sleep(2 * WAIT_TIME)
    await consumer.end()
  }

  /**
   * Wait job finished with successful log or error log is found
   */
  const waitJob = async () => {
    while (true) {
      if (errorLogs.length > 0) {
        break
      }
      if (infoLogs.some(x => x.startsWith('Successfully updated challenge details'))) {
        break
      }
      // use small time to wait job and will use global timeout so will not wait too long
      await sleep(WAIT_TIME)
    }
  }

  before(async () => {
    // inject logger with log collector
    logger.info = (message) => {
      infoLogs.push(message)
      if (!config.DISABLE_LOGGING) {
        info(message)
      }
    }
    logger.debug = (message) => {
      debugLogs.push(message)
      if (!config.DISABLE_LOGGING) {
        debug(message)
      }
    }
    logger.error = (message) => {
      errorLogs.push(message)
      if (!config.DISABLE_LOGGING) {
        error(message)
      }
    }
    await consumeMessages()
    // start kafka producer
    await producer.init()
    // start the application (kafka listener)
    appConsumer = require('../../src/app').consumer
    // wait until consumer init successfully
    while (true) {
      if (debugLogs.includes('Consumer initialized successfully')) {
        break
      }
      await sleep(WAIT_TIME)
    }
  })

  beforeEach(async () => {
    // clear logs
    infoLogs.length = 0
    errorLogs.length = 0
    debugLogs.length = 0
  })

  after(async () => {
    // restore logger
    logger.error = error
    logger.info = info
    logger.debug = debug
    try {
      await producer.end()
    } catch (err) {
      // ignore
    }
    try {
      await appConsumer.end()
    } catch (err) {
      // ignore
    }
  })

  it('Should setup healthcheck with check on kafka connection', async () => {
    const healthcheckEndpoint = `http://localhost:${process.env.PORT || 3000}/health`
    let result = await axios.get(healthcheckEndpoint)
    should.equal(result.status, 200)
    should.deepEqual(result.data, { checksRun: 1 })
    debugLogs.should.match(/connected=true/)
  })

  it('Should handle invalid json message', async () => {
    const { testMessage } = testMethods['addResource']
    await producer.send({
      topic: testMessage.topic,
      message: {
        value: '[ { - a b c'
      }
    })
    await waitJob()
    should.equal(errorLogs[0], 'Invalid message JSON.')
  })

  it('Should handle wrong topic message', async () => {
    const { testMessage } = testMethods['addResource']
    let message = _.cloneDeep(testMessage)
    message.topic = 'invalid'
    await producer.send({
      topic: testMessage.topic,
      message: {
        value: JSON.stringify(message)
      }
    })
    await waitJob()
    should.equal(errorLogs[0], `The message topic ${message.topic} doesn't match the Kafka topic ${testMessage.topic}.`)
  })

  for (const testMethod of Object.keys(testMethods)) {
    const { testMessage, requiredFields, integerFields, booleanFields } = testMethods[testMethod]
    it(`test ${testMethod} by valid challenge id(response 200 status)`, async () => {
      await sendMessage(testMessage)
      await waitJob()
      infoLogs.should.containEql(`Successfully updated challenge details of id ${challengeId} in Elasticsearch.`)
      errorLogs.should.be.empty()
    })

    // could not send message if no topic
    for (const requiredField of requiredFields.filter(r => r !== 'topic')) {
      it(`test ${testMethod} message - invalid parameters, required field ${requiredField} is missing`, async () => {
        let message = _.cloneDeep(testMessage)
        message = _.omit(message, requiredField)
        await sendMessage(message)
        await waitJob()
        errorLogs.should.not.be.empty()
        if (requiredField === 'payload.type') {
          should.equal(errorLogs.length, 1)
          should.equal(errorLogs[0], 'The message misses payload.type')
        } else {
          assertErrorLogs(`"${_.last(requiredField.split('.'))}" is required`)
        }
      })
    }

    it(`test ${testMethod} message - invalid parameters, invalid payload type`, async () => {
      let message = _.cloneDeep(testMessage)
      message.payload.type = 'invalid'
      await sendMessage(message)
      await waitJob()
      assertErrorLogs('Invalid payload type')
    })

    it(`test ${testMethod} message - invalid parameters, invalid timestamp`, async () => {
      let message = _.cloneDeep(testMessage)
      message.timestamp = 'invalid'
      await sendMessage(message)
      await waitJob()
      assertErrorLogs(`"timestamp" must be a number of milliseconds or valid date string`)
    })

    for (const stringField of stringFields.filter(x => x !== 'payload.type' && x !== 'topic')) {
      it(`test ${testMethod} message - invalid parameters, invalid string type field ${stringField}`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, stringField, 123)
        await sendMessage(message)
        await waitJob()
        assertErrorLogs(`"${_.last(stringField.split('.'))}" must be a string`)
      })
    }

    for (const integerField of integerFields) {
      it(`test ${testMethod} message - invalid parameters, invalid integer type field ${integerField}(wrong number)`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, 'string')
        await sendMessage(message)
        await waitJob()
        assertErrorLogs(`"${_.last(integerField.split('.'))}" must be a number`)
      })

      it(`test ${testMethod} message - invalid parameters, invalid integer type field ${integerField}(wrong integer)`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, 1.1)
        await sendMessage(message)
        await waitJob()
        assertErrorLogs(`"${_.last(integerField.split('.'))}" must be an integer`)
      })

      it(`test ${testMethod} message - invalid parameters, invalid integer type field ${integerField}(negative)`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, -1)
        await sendMessage(message)
        await waitJob()
        errorLogs.should.not.be.empty()
        const fieldName = _.last(integerField.split('.'))
        assertErrorLogs(`"${fieldName}" must be larger than or equal to ${fieldName === 'phaseId' ? 0 : 1}`)
      })
    }

    if (booleanFields) {
      for (const booleanField of booleanFields) {
        it(`test ${testMethod} message - invalid parameters, invalid  boolean type field ${booleanField}`, async () => {
          let message = _.cloneDeep(testMessage)
          _.set(message, booleanField, 'invalidboolean')
          await sendMessage(message)
          await waitJob()
          assertErrorLogs(`"${_.last(booleanField.split('.'))}" must be a boolean`)
        })
      }
    }
  }
})
