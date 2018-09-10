var server = new(require('bluetooth-serial-port')).BluetoothSerialPortServer();
var pull = require('pull-stream');
var Pushable = require('pull-pushable');

// TODO: allow multiple incoming and outgoing connections. At the moment,
// only one incoming connection is supported
module.exports = function makeBluetoothManager() {

  var CHANNEL = 10;

  // The UUID of the scuttlebutt bluetooth service
  var UUID = 'b0b2e90d-0cda-4bb0-8e4b-fb165cd17d48';

  // Only one incoming connection for now
  var connection = null;

  function connect (address, cb) {
    // 1 incoming only for now for testing

    cb("Not supported yet", null);
  }

  function disconnect(address) {
    // todo later

    connection.source.end();
    connection = null;
  }

  function writeData(data) {

  //  console.log("I want to write... ");
  //  console.log(data.toString());

    server.write(data, function (err, bytesWritten) {
              if (err) {
                  console.log('Error! ' + err);
              } else {
              //    console.log('Send ' + bytesWritten + ' to the client!');
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
    }, {uuid: UUID, channel: CHANNEL} );
  }

  function stopServer() {
    // todo later
  }

  server.on('data', function(buffer) {
    // console.log("Received: " + buffer.toString());
      connection.source.push(buffer);
  });

  return {
    connect,
    disconnect,
    listenForIncomingConnections,
    stopServer
  }

}
