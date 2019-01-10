/*
 * Test data to be used in tests
 */

const config = require('config')

const challengeId = 30075466
const noStatusChallengeId = 111111
const status100ChallengeId = 222222
const status404ChallengeId = 333333
const status500ChallengeId = 999999
const addResourceMessage = {
  topic: config.RESOURCE_TOPIC,
  originator: 'some-originator',
  timestamp: '2018-02-03T00:00:00',
  'mime-type': 'application/json',
  payload: {
    type: 'ADD_RESOURCE',
    data: {
      challengeId,
      request: {
        roleId: 1,
        resourceUserId: 10527204,
        phaseId: 0,
        addNotification: true,
        addForumWatch: true,
        checkTerm: false,
        studio: false
      }
    }
  }
}

const removeResourceMessage = {
  topic: config.RESOURCE_TOPIC,
  originator: 'some-originator',
  timestamp: '2018-02-03T00:00:00',
  'mime-type': 'application/json',
  payload: {
    type: 'REMOVE_RESOURCE',
    data: {
      challengeId,
      request: {
        roleId: 1,
        resourceUserId: 10527204,
        studio: false
      }
    }
  }
}

const registerUserMessage = {
  topic: config.REGISTRATION_TOPIC,
  originator: 'some-originator',
  timestamp: '2018-02-03T00:00:00',
  'mime-type': 'application/json',
  payload: {
    type: 'USER_REGISTRATION',
    data: {
      challengeId,
      userId: 8547899
    }
  }
}

const unregisterUserMessage = {
  topic: config.REGISTRATION_TOPIC,
  originator: 'some-originator',
  timestamp: '2018-02-03T00:00:00',
  'mime-type': 'application/json',
  payload: {
    type: 'USER_UNREGISTRATION',
    detail: {
      challengeId,
      userId: 8547899
    }
  }
}

/**
 * Build update es challenge response
 * @param status the response status
 */
const buildUpdateESChallengeResponse = (status) => ({
  result: {
    success: status >= 200 && status < 300,
    status
  }
})

const messageRequiredFields = ['topic', 'originator', 'timestamp', 'mime-type', 'payload.type']
const stringFields = ['topic', 'originator', 'mime-type', 'payload.type']
const resourcePayloadRequiredFields = ['payload.data.challengeId', 'payload.data.request.resourceUserId']
const resourceRequiredFields = [...messageRequiredFields, ...resourcePayloadRequiredFields]
const resourceIntegerFields = [...resourcePayloadRequiredFields, 'payload.data.request.roleId']
const registerUserIntegerFields = ['payload.data.challengeId', 'payload.data.userId']
const unregisterUserIntegerFields = ['payload.detail.challengeId', 'payload.detail.userId']
const testMethods = {
  'addResource': {
    requiredFields: resourceRequiredFields,
    integerFields: [...resourceIntegerFields, 'payload.data.request.phaseId'],
    booleanFields: ['addNotification', 'addForumWatch', 'checkTerm', 'studio'].map(name => `payload.data.request.${name}`),
    testMessage: addResourceMessage
  },
  'removeResource': {
    requiredFields: resourceRequiredFields,
    integerFields: resourceIntegerFields,
    booleanFields: ['payload.data.request.studio'],
    testMessage: removeResourceMessage
  },
  'registerUser': {
    requiredFields: [...messageRequiredFields, ...registerUserIntegerFields],
    integerFields: registerUserIntegerFields,
    testMessage: registerUserMessage
  },
  'unregisterUser': {
    requiredFields: [...messageRequiredFields, ...unregisterUserIntegerFields],
    integerFields: unregisterUserIntegerFields,
    testMessage: unregisterUserMessage
  }
}

const invalidChallenges = [{
  invalidChallengeId: noStatusChallengeId,
  invalidStatus: 'no status'
}, {
  invalidChallengeId: status100ChallengeId,
  invalidStatus: 'status 100'
}, {
  invalidChallengeId: status404ChallengeId,
  invalidStatus: 'status 404'
}]

module.exports = {
  challengeId,
  noStatusChallengeId,
  status100ChallengeId,
  status404ChallengeId,
  status500ChallengeId,
  addResourceMessage,
  removeResourceMessage,
  registerUserMessage,
  unregisterUserMessage,
  buildUpdateESChallengeResponse,
  stringFields,
  testMethods,
  invalidChallenges
}
