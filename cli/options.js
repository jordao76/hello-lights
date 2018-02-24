let USBswitchCmdOptions = {
  type: 'USBswitchCmd',
  path: '"C:\\Temp\\USBswitchCmd_E 5.0.0\\USBswitchCmd.exe"'
};

let ClewareControlOptions = {
  type: 'ClewareControl',
  path: 'clewarecontrol' // optional
};

let ChromiumOptions = {
  type: 'Chromium',
  headless: false // optional
};

module.exports = {
  USBswitchCmdOptions,
  ClewareControlOptions,
  ChromiumOptions
};
