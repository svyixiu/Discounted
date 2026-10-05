const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const storage = new Map();
const sessionStorage = { getItem: (k) => storage.get(k), setItem: (k,v) => storage.set(k,v), removeItem: (k) => storage.delete(k) };
const ctx = { window: {}, I18n: { t: () => '' }, matchMedia: () => ({ matches: false }),
  document: { addEventListener() {}, dispatchEvent() {} }, addEventListener() {}, Event,
  sessionStorage, setInterval() {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../common.js'),'utf8'),ctx);
const D = ctx.window.Discounted;
for (const age of ['', '17', '-1', '18.5', 'NaN', 'Infinity', '121', '1e2']) assert.equal(D.acceptableAge(age),false,age);
for (const age of ['18','19','120']) assert.equal(D.acceptableAge(age),true,age);
const adult = { adult_content: true };
assert.equal(D.canShow(adult),false);
assert.equal(D.dealCard(adult),''); // Block artwork even if a caller forgets to filter.
assert.equal(D.isAdult({content_descriptorids:[4]}),true);
assert.equal(D.isAdult({content_descriptorids:[3]}),true);
assert.equal(D.canShow({content_descriptorids:[1,2,5]}),true);
D.setAdultAllowed(true);
assert.equal(D.canShow(adult),true);
assert.equal(storage.get('discounted:adult-session'),'18+');
D.setAdultAllowed(false);
assert.equal(D.canShow(adult),false);
assert.equal(storage.size,0);
console.log('Adult content visibility and age validation passed.');
