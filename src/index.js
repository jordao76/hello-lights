const {Commander} = require('./commander');

module.exports = {
  commands: require('./commands'),
  trafficLight: require('./traffic-light'),
  physical: require('./physical'),
  devices: require('./devices'),
  selectors: require('./selectors'),
  Commander
};
