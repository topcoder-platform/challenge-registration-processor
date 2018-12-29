/**
 * Service for challenge resource processor.
 */
const _ = require('lodash')
const Joi = require('joi')
const logger = require('../common/logger')
const config = require('config')
const axios = require('axios')

/**
 * Update challenge details in Elasticsearch
 * @param {Number} challengeId the challenge id
 */
async function updateChallengeES (challengeId) {
  // update challenge details in ES by calling ES feeder service
  const result = await axios.put(config.UPDATE_ES_CHALLENGE_DETAILS_URL, { param: { challengeIds: [challengeId] } }, { validateStatus: () => true })
  const status = _.get(result.data || {}, 'result.status')
  if (!status || status < 200 || status >= 300) {
    logger.error(JSON.stringify(result.data, null, 4))
    throw new Error(`Failed to update challenge details of id ${challengeId} in Elasticsearch.`)
  }
  logger.info(`Successfully updated challenge details of id ${challengeId} in Elasticsearch.`)
}

/**
 * Handle Kafka message of 'add resource'.
 * @param {Object} message the message
 */
async function addResource (message) {
  // update challenge details in ES
  await updateChallengeES(message.payload.data.challengeId)
}

addResource.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      type: Joi.string().valid('ADD_RESOURCE').required(),
      data: Joi.object().keys({
        challengeId: Joi.number().integer().min(1).required(),
        request: Joi.object().keys({
          roleId: Joi.number().integer().min(1),
          resourceUserId: Joi.number().integer().min(1).required(),
          phaseId: Joi.number().integer().min(0),
          addNotification: Joi.boolean(),
          addForumWatch: Joi.boolean(),
          checkTerm: Joi.boolean(),
          studio: Joi.boolean()
        }).unknown(true).required()
      }).unknown(true).required()
    }).unknown(true).required()
  }).required()
}

/**
 * Handle Kafka message of 'remove resource'.
 * @param {Object} message the message
 */
async function removeResource (message) {
  // update challenge details in ES
  await updateChallengeES(message.payload.data.challengeId)
}

removeResource.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      type: Joi.string().valid('REMOVE_RESOURCE').required(),
      data: Joi.object().keys({
        challengeId: Joi.number().integer().min(1).required(),
        request: Joi.object().keys({
          roleId: Joi.number().integer().min(1),
          resourceUserId: Joi.number().integer().min(1).required(),
          studio: Joi.boolean()
        }).unknown(true).required()
      }).unknown(true).required()
    }).unknown(true).required()
  }).required()
}

/**
 * Handle Kafka message of 'user registration'.
 * @param {Object} message the message
 */
async function registerUser (message) {
  // update challenge details in ES
  await updateChallengeES(message.payload.data.challengeId)
}

registerUser.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      type: Joi.string().valid('USER_REGISTRATION').required(),
      data: Joi.object().keys({
        challengeId: Joi.number().integer().min(1).required(),
        userId: Joi.number().integer().min(1).required()
      }).unknown(true).required()
    }).unknown(true).required()
  }).required()
}

/**
 * Handle Kafka message of 'user unregistration'.
 * @param {Object} message the message
 */
async function unregisterUser (message) {
  // update challenge details in ES
  await updateChallengeES(message.payload.detail.challengeId)
}

unregisterUser.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      type: Joi.string().valid('USER_UNREGISTRATION').required(),
      detail: Joi.object().keys({
        challengeId: Joi.number().integer().min(1).required(),
        userId: Joi.number().integer().min(1).required()
      }).unknown(true).required()
    }).unknown(true).required()
  }).required()
}

// Exports
module.exports = {
  addResource,
  removeResource,
  registerUser,
  unregisterUser
}

logger.buildService(module.exports)
