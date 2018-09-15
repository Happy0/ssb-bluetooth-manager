var server = new(require('bluetooth-serial-port')).BluetoothSerialPortServer();
var btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();

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

  var outgoingConnection = false;

  var listening = true;

  function write(device, msg, cb2, retries) {
    device.write( msg, (err, bytes) => {
      
      if (retries == 0 && err) {
        cb2(err, null);
      } else if (err) {
        console.log("Retrying...");
        console.log(msg.toString())

        setTimeout(() => write(device, msg, cb2, retries - 1), 200);
      } else {
        cb2(null, msg);
      }

    });
  }

  function breakBuffer(buffer, bytesPerBuffer) {
    var bufferLength = buffer.length;

    var start = 0;
    var result = [];

    while (start < bufferLength) {
      result.push(buffer.slice(start, start += bytesPerBuffer));
    }

    return result;
  }

  function makeSink(device) {
    return pull(
      pull.map((buffer) => breakBuffer(buffer, 100)),
      pull.flatten(),
      pull.asyncMap((msg, cb2) => {
      write(device, msg, cb2, 10);
      
    }), pull.drain());
  }

  function connect (address, cb) {
    console.log("Attempt outgoing to bt" + address);

    if (outgoingConnection != false) {
      throw new Error("Already established connection - only one allowed for now.");
    }

    connection = true;

    var source = Pushable();
    var sink = makeSink(btSerial);

      btSerial.connect(address, 9, function() {
        console.log("connected to " + address);
  
        btSerial.on('data', function(buffer) {
       //   console.log("Receiving: " + buffer.toString());
          source.push(buffer);
        });

        var duplexConnection = {
          source: source,
          sink: sink
        }

        cb(null, duplexConnection);
      }, function () {
        cb ("Cannot connect to " + address, null);
        console.log('cannot connect');
      });

  }

  function disconnect(address) {
    // todo later

    connection.source.end();
    connection = null;
  }

  function setDuplexStream() {
    var sink = makeSink(server);

    var source = Pushable();

    connection = {
      source: source,
      sink: sink
    }
  }

  function listenForIncomingConnections(onConnection) {

    if (listening) {
      return;
    }

    console.log("About to listen for incoming bluetooth connections.")

    server.listen(function (clientAddress) {

      if (connection != null) {
        throw new Error("Already established connection - only one allowed for now.");
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
