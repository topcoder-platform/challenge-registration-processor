/**
 * This module contains method to build Kafka options.
 */
const config = require('config')

module.exports = {
  /**
   * Get Kafka options from configuration file.
   * @return Kafka options from configuration file.
   */
  getKafkaOptions: () => {
    const options = { connectionString: config.KAFKA_URL, handlerConcurrency: 1, groupId: config.KAFKA_GROUP_ID }
    if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
      options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY }
    }
    return options
  }
}
