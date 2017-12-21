module.exports = function(error) {
  if (error.message.search('revert') == -1) {
    assert.fail('Call expected to revert; error was ' + error);
  }
}
