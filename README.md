# Topcoder - Challenge Registration Processor

## Dependencies

- nodejs https://nodejs.org/en/ (v8+)
- Kafka
- Docker, Docker Compose

## Configuration

Configuration for the notification server is at `config/default.js`.
The following parameters can be set in config files or in env variables:

- DISABLE_LOGGING: whether to disable logging, default is false
- LOG_LEVEL: the log level; default value: 'debug'
- KAFKA_URL: comma separated Kafka hosts; default value: 'localhost:9092'
- KAFKA_CLIENT_CERT: Kafka connection certificate, optional; default value is undefined;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to certificate file or certificate content
- KAFKA_CLIENT_CERT_KEY: Kafka connection private key, optional; default value is undefined;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to private key file or private key content
- RESOURCE_TOPIC: resource Kafka topic, default value is 'challenge.notification.events'
- REGISTRATION_TOPIC: registration Kafka topic, default value is 'notifications.kafka.queue.java.test'
- UPDATE_ES_CHALLENGE_DETAILS_URL: URL to update challenge details in Elasticsearch, default value is 'https://api.topcoder.com/v4/esfeeder/challenges'

Also note that there is a `/health` endpoint that checks for the health of the app. This sets up an expressjs server and listens on the environment variable `PORT`. It's not part of the configuration file and needs to be passed as an environment variable


## Local Kafka setup

- `http://kafka.apache.org/quickstart` contains details to setup and manage Kafka server,
  below provides details to setup Kafka server in Mac, Windows will use bat commands in bin/windows instead
- download kafka at `https://www.apache.org/dyn/closer.cgi?path=/kafka/1.1.0/kafka_2.11-1.1.0.tgz`
- extract out the doanlowded tgz file
- go to extracted directory kafka_2.11-0.11.0.1
- start ZooKeeper server:
  `bin/zookeeper-server-start.sh config/zookeeper.properties`
- use another terminal, go to same directory, start the Kafka server:
  `bin/kafka-server-start.sh config/server.properties`
- note that the zookeeper server is at localhost:2181, and Kafka server is at localhost:9092
- use another terminal, go to same directory, create some topics:
  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic challenge.notification.events`
  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic notifications.kafka.queue.java.test`
- verify that the topics are created:
  `bin/kafka-topics.sh --list --zookeeper localhost:2181`,
  it should list out the created topics


## Local deployment

- install dependencies `npm i`
- run code lint check `npm run lint`, running `npm run lint:fix` can fix some lint errors if any
- start processor app `npm start`


## Local Deployment with Docker

To run the processor using docker, follow the below steps

1. Navigate to the directory `docker`

2. Rename the file `sample.api.env` to `api.env`

3. Set parameters in the file `api.env`

4. Once that is done, run the following command

```
docker-compose up
```

5. When you are running the application for the first time, It will take some time initially to download the image and install the dependencies


## Notes

- when there is Kafka message of add resource/remove resource/user registration/user unregistration,
  the processor will call `PUT /v4/esfeeder/challenges` to update related challenge details in Elasticsearch,
  related code repository: `https://github.com/topcoder-platform/tc-elasticsearch-feeder-service`,
  related code: `https://github.com/topcoder-platform/tc-elasticsearch-feeder-service/blob/279700b3e70c33c558945aea1239ffcc0270870c/src/main/java/com/appirio/service/challengefeeder/manager/ChallengeDetailFeederManager.java#L95`

