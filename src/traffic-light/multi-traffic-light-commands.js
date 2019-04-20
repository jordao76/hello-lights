//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

const {
  isGreaterThanZero,
  each
} = require('../parsing/validation');

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

function use({tl, ct}, [indexes]) {
  if (ct.isCancelled) return;
  if (tl.use) {
    tl.use(indexes.map(i => i - 1)); // from 1-based to 0-based
  }
}
use.meta = {
  name: 'use',
  params: [{ name: 'indexes', validate: isGreaterThanZero, isRest: true }],
  desc: `
    When using multiple traffic lights, uses the given numbered ones.
    @example
    (use 1 2)`
};
/** @deprecated */
use.transformation = args => [args];
use.paramNames = ['indexes'];
use.validation = [each(isGreaterThanZero)];
use.doc = {
  name: 'use',
  desc: 'When using multiple traffic lights, uses the given numbered ones:\n' +
        '(use 1 2)'
};

//////////////////////////////////////////////////////////////////////////////

function useNext({tl, ct}) {
  if (ct.isCancelled) return;
  if (tl.next) {
    tl.next();
  }
}
useNext.meta = {
  name: 'use-next',
  params: [],
  desc: `When using multiple traffic lights, chooses the next one or ones to use.`
};
/** @deprecated */
useNext.paramNames = [];
useNext.validation = [];
useNext.doc = {
  name: 'use-next',
  desc: 'When using multiple traffic lights, chooses the next one or ones to use.'
};

//////////////////////////////////////////////////////////////////////////////

function usePrevious({tl, ct}) {
  if (ct.isCancelled) return;
  if (tl.previous) {
    tl.previous();
  }
}
usePrevious.meta = {
  name: 'use-previous',
  params: [],
  desc: `When using multiple traffic lights, chooses the previous one or ones to use.`
};
/** @deprecated */
usePrevious.paramNames = [];
usePrevious.validation = [];
usePrevious.doc = {
  name: 'use-previous',
  desc: 'When using multiple traffic lights, chooses the previous one or ones to use.'
};

//////////////////////////////////////////////////////////////////////////////

function useLast({tl, ct}) {
  if (ct.isCancelled) return;
  if (tl.last) {
    tl.last();
  }
}
useLast.meta = {
  name: 'use-last',
  params: [],
  desc: `When using multiple traffic lights, chooses the last one to use.`
};
/** @deprecated */
useLast.paramNames = [];
useLast.validation = [];
useLast.doc = {
  name: 'use-last',
  desc: 'When using multiple traffic lights, chooses the last one to use.'
};

//////////////////////////////////////////////////////////////////////////////

function useNear({tl, ct}) {
  if (ct.isCancelled) return;
  if (tl.near) {
    tl.near();
  }
}
useNear.meta = {
  name: 'use-near',
  params: [],
  desc: `When using multiple traffic lights, chooses the nearest one to use.`
};
/** @deprecated */
useNear.paramNames = [];
useNear.validation = [];
useNear.doc = {
  name: 'use-near',
  desc: 'When using multiple traffic lights, chooses the nearest one to use.'
};

//////////////////////////////////////////////////////////////////////////////

function useAll({tl, ct}) {
  if (ct.isCancelled) return;
  if (tl.useAll) {
    tl.useAll();
  }
}
useAll.meta = {
  name: 'use-all',
  params: [],
  desc: `When using multiple traffic lights, chooses all of them to use.`
};
/** @deprecated */
useAll.paramNames = [];
useAll.validation = [];
useAll.doc = {
  name: 'use-all',
  desc: 'When using multiple traffic lights, chooses all of them to use.'
};

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

function defineCommands(cp) {
  // add multi commands
  cp.add('use', use);
  cp.add('use-next', useNext);
  cp.add('use-previous', usePrevious);
  cp.add('use-last', useLast);
  cp.add('use-near', useNear);
  cp.add('use-all', useAll);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  use,
  'use-next': useNext,
  'use-previous': usePrevious,
  'use-last': useLast,
  'use-near': useNear,
  'use-all': useAll,
  defineCommands
};
