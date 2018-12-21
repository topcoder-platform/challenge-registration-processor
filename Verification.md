# Topcoder - Challenge Resource Processor Verification

- start kafka server, start processor app
- start kafka-console-producer to write messages to `challenge.notification.events` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic challenge.notification.events`
- write message of `add resource`:
  `{ "topic": "challenge.notification.events", "originator": "some-originator", "timestamp": "2018-02-16T00:00:00", "mime-type": "application/json", "payload": { "type": "ADD_RESOURCE", "data": { "challengeId": 30075466, "request": { "roleId": 1, "resourceUserId": 10527204, "phaseId": 0, "addNotification": true, "addForumWatch": true, "checkTerm": false, "studio": false } } } }`
- the processor app console will show:

```bash
info: Successfully updated challenge details of id 30075466 in Elasticsearch.
```

- write message of `remove resource`:
  `{ "topic": "challenge.notification.events", "originator": "some-originator", "timestamp": "2018-02-16T00:00:00", "mime-type": "application/json", "payload": { "type": "REMOVE_RESOURCE", "data": { "challengeId": 30075466, "request": { "roleId": 1, "resourceUserId": 10527204, "studio": false } } } }`
- the processor app console will show:

```bash
info: Successfully updated challenge details of id 30075466 in Elasticsearch.
```

- start another kafka-console-producer to write messages to `notifications.kafka.queue.java.test` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic notifications.kafka.queue.java.test`
- write message of `user registration`:
  `{ "topic": "notifications.kafka.queue.java.test", "originator": "some-originator", "timestamp": "2018-02-16T00:00:00", "mime-type": "application/json", "payload": { "type": "USER_REGISTRATION", "data": { "challengeId": 30075466, "userId": 8547899 } } }`
- the processor app console will show:

```bash
info: Successfully updated challenge details of id 30075466 in Elasticsearch.
```

- write message of `user unregistration`:
  `{ "topic": "notifications.kafka.queue.java.test", "originator": "some-originator", "timestamp": "2018-02-16T00:00:00", "mime-type": "application/json", "payload": { "type": "USER_UNREGISTRATION", "detail": { "challengeId": 30075466, "userId": 40152905 } } }`
- the processor app console will show:

```bash
info: Successfully updated challenge details of id 30075466 in Elasticsearch.
```

- you may write invalid message like:
  `{ "topic": "notifications.kafka.queue.java.test", "originator": "some-originator", "timestamp": "2018-02-16T00:00:00", "mime-type": "application/json", "payload": { "type": "USER_UNREGISTRATION", "detail": { "invalid": 30075466, "userId": 40152905 } } }`
  `{ "topic": "notifications.kafka.queue.java.test", "originator": "some-originator", "timestamp": "2018-02-16T00:00:00", "mime-type": "application/json", "payload": { "type": "USER_REGISTRATION", "data": { "challengeId": ["invalid"], "userId": 8547899 } } }`
  `[ { - a b c`
- then in the app console, you will see error messages

