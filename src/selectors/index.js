/**
 * Traffic light selectors.
 * @namespace selectors
 */

const {
  PhysicalTrafficLightSelector
} = require('./physical-traffic-light-selector');
const {
  PhysicalMultiTrafficLightSelector
} = require('./physical-multi-traffic-light-selector');

module.exports = {
  PhysicalTrafficLightSelector,
  PhysicalMultiTrafficLightSelector
};
