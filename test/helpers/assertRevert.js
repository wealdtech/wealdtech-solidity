module.exports = function(error, msg) {
  if (error.message.search('revert') == -1) {
console.log('********************************', error.message);
    assert.fail('Call expected to revert; error was ' + error);
  }
  if (msg) {
    if (error.message.search(msg) == -1) {
      const actual = error.message.replace('VM Exception while processing transaction: revert ', '');
      assert.equal(actual, msg);
    }
  }
}
