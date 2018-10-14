const {Commander} = require('./commander');

module.exports = {
  parsing: require('./parsing'),
  trafficLight: require('./traffic-light'),
  physical: require('./physical'),
  devices: require('./devices'),
  selectors: require('./selectors'),
  Commander
};
