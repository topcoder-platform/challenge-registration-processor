/**
 * The application entry point
 */

global.Promise = require('bluebird')
const _ = require('lodash')
const config = require('config')
const healthcheck = require('topcoder-healthcheck-dropin')
const Kafka = require('no-kafka')
const logger = require('./common/logger')
const { getKafkaOptions } = require('./common/utils')
const processorService = require('./services/ProcessorService')

// create consumer
const consumer = new Kafka.GroupConsumer(getKafkaOptions())

// data handler
const dataHandler = async (messageSet, topic, partition) => {
  await Promise.each(messageSet, async (m) => {
    const message = m.message.value.toString('utf8')
    logger.info(`Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${m.offset}; Message: ${message}.`)
    let messageJSON
    try {
      messageJSON = JSON.parse(message)
    } catch (e) {
      logger.error('Invalid message JSON.')
      logger.logFullError(e)
      // commit the message and ignore it
      consumer.commitOffset({ topic, partition, offset: m.offset })
      return
    }
    if (messageJSON.topic !== topic) {
      logger.error(`The message topic ${messageJSON.topic} doesn't match the Kafka topic ${topic}.`)
      // commit the message and ignore it
      consumer.commitOffset({ topic, partition, offset: m.offset })
      return
    }
    const type = _.get(messageJSON, 'payload.type')
    if (!type) {
      logger.error('The message misses payload.type')
      // commit the message and ignore it
      consumer.commitOffset({ topic, partition, offset: m.offset })
      return
    }
    try { // attempt to process the message
      switch (type) {
        case 'ADD_RESOURCE':
          await processorService.addResource(messageJSON)
          break
        case 'REMOVE_RESOURCE':
          await processorService.removeResource(messageJSON)
          break
        case 'USER_REGISTRATION':
          await processorService.registerUser(messageJSON)
          break
        case 'USER_UNREGISTRATION':
          await processorService.unregisterUser(messageJSON)
          break
        default:
          throw new Error(`Invalid payload type: ${type}`)
      }
    } catch (err) {
      logger.logFullError(err)
    } finally {
      // Commit offset regardless of error
      consumer.commitOffset({ topic, partition, offset: m.offset })
    }
  })
}

// check if there is kafka connection alive
const check = () => {
  if (!consumer.client.initialBrokers && !consumer.client.initialBrokers.length) {
    return false
  }
  let connected = true
  consumer.client.initialBrokers.forEach(conn => {
    logger.debug(`url ${conn.server()} - connected=${conn.connected}`)
    connected = conn.connected & connected
  })
  return connected
}

// consume configured topics and setup healthcheck endpoint
consumer
  .init([{
    subscriptions: [config.RESOURCE_TOPIC, config.REGISTRATION_TOPIC],
    handler: dataHandler
  }])
  .then(() => {
    healthcheck.init([check])
    logger.debug('Consumer initialized successfully')
  }).catch(logger.logFullError)

if (process.env.NODE_ENV === 'test') {
  module.exports = {
    consumer
  }
}
