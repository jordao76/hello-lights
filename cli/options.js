let USBswitchCmdOptions = {
  type: 'USBswitchCmd',
  path: '"C:\\Temp\\USBswitchCmd_E 5.0.0\\USBswitchCmd.exe"',
  // ...maybe download if not found
  downloadUrl: 'http://www.cleware.info/downloads/english/USBswitchCmd_E%205.0.0.zip'
};

let ChromiumOptions = {
  type: 'Chromium',
  headless: false
};

module.exports = {
  USBswitchCmdOptions,
  ChromiumOptions
};
