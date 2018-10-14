/**
 * Traffic light base model.
 * @namespace trafficLight
 */

const {
  Light,
  TrafficLight
} = require('./traffic-light');
const {
  MultiLight,
  MultiTrafficLight,
  FlexMultiTrafficLight
} = require('./multi-traffic-light');

module.exports = {
  Light,
  TrafficLight,
  MultiLight,
  MultiTrafficLight,
  FlexMultiTrafficLight
};
