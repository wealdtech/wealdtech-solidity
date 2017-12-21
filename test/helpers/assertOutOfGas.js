module.exports = function(error) {
  if (error.message.search('out of gas') == -1) {
    assert.fail('Call expected to run out of gas; error was ' + error);
  }
}
