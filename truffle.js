module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    private: {
      host: "localhost",
      port: 8555,
      network_id: "*" // Match any network id
    }
  }
};
