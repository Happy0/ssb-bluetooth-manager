var server = new(require('bluetooth-serial-port')).BluetoothSerialPortServer();
var pull = require('pull-stream');
var Pushable = require('pull-pushable');

module.exports = function makeBluetoothManager() {

  var CHANNEL = 10;
  var UUID = 'b0b2e90d-0cda-4bb0-8e4b-fb165cd17d48';

  // Only one incoming connection for now
  var connection = null;

  function connect (address, cb) {
    // 1 incoming only for now for testing

    cb("Not supported yet", null);
  }

  function disconnect(address) {
    // todo later
  }

  function writeData(data) {
    server.write(new Buffer(data), function (err, bytesWritten) {
              if (err) {
                  console.log('Error! ' + err);
              } else {
                  console.log('Send ' + bytesWritten + ' to the client!');
              }
          })
  }

  function setDuplexStream() {
    var sink = pull.drain(writeData);
    var source = Pushable();

    connection = {
      source: source,
      sink: sink
    }
  }

  function listenForIncomingConnections(onConnection) {
    console.log("About to listen for incoming bluetooth connections.")
    server.listen(function (clientAddress) {

      if (connection != null) {
        throw new Error("Already established connection - only one allowed for testing.");
      }

      setDuplexStream();
      console.log("Calling back with connection from " + clientAddress);
      onConnection(null, connection);
    }, function(error){
    	onConnection(error, null);
    }, {uuid: UUID, channel: CHANNEL} );
  }

  function stopServer() {
    // todo later
  }

  server.on('data', function(buffer) {
      connection.source.push(buffer.toString());
  });

  return {
    connect,
    disconnect,
    listenForIncomingConnections,
    stopServer
  }

}
