function match(str, rx, cb) {
  if (!rx.global) {
    rx = RegExp(rx.source, 'g');
  }
  let res, ret = false;
  while ((res = rx.exec(str)) !== null) {
    res.shift();
    cb(...res);
    ret = true;
  }
  return ret;
}

module.exports = match;
