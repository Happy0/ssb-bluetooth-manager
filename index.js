var server = new(require('bluetooth-serial-port')).BluetoothSerialPortServer();
var btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();

var pull = require('pull-stream');
var Pushable = require('pull-pushable');
var Abortable = require('pull-abortable');

// TODO: allow multiple incoming and outgoing connections. At the moment,
// only one incoming connection is supported
module.exports = function makeBluetoothManager() {

  var CHANNEL = 10;

  // The UUID of the scuttlebutt bluetooth service
  var UUID = 'b0b2e90d-0cda-4bb0-8e4b-fb165cd17d48';

  // Only one incoming connection for now
  var connection = null;

  var outgoingConnection = false;

  var listening = false;

  function write(device, msg, cb2, retries) {

    device.write( msg, (err, bytes) => {
      
      if (retries == 0 && err) {
        cb2(err, null);
      } else if (err || bytes !== msg.length) {

        // Could not send all the bytes. Retry the bytes that weren't sent.

        var bytesSuccessfullySent = bytes === -1 ? 0: bytes;
        var restOfBuffer = msg.slice(bytesSuccessfullySent, msg.length);

      //  console.log("[Success]: " + msg.slice(0, bytesSuccessfullySent).toString());
      //  console.log("[Retrying]", restOfBuffer.toString());

        // Wait 50 milliseconds before retrying
        setTimeout(() => write(device, restOfBuffer, cb2, retries - 1), 50);
      } else {
        //console.log("[" + bytes + "]" + " " + msg.toString());
        cb2(null, msg);
      }

    });

  }

  function makeSink(device, abortable) {
    return pull(
      abortable,
      pull.asyncMap((msg, cb2) => {
      write(device, msg, cb2, 100);
      
    }), pull.drain());
  }

  function connect (address, cb) {
    console.log("Attempt outgoing to bt" + address);

    if (outgoingConnection != false) {
      cb("Already established bluetooth connection - only one allowed for now.", null);
    }

    connection = true;

    var abortable = Abortable();

    var source = Pushable();
    var sink = makeSink(btSerial, abortable);

      btSerial.connect(address, 9, function() {
        console.log("connected to " + address);
  
        btSerial.on('data', function(buffer) {
      //    console.log("Receiving: " + buffer.toString());
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

      btSerial.on( 'failure', (err) => {
        
        console.log("Connection failed");
      });

      btSerial.on( 'closed', (err) => {
        abortable.abort();
        source.end();
        outgoingConnection = false;
      });

  }

  function disconnect(address) {
    // todo later

    connection.source.end();
    connection = null;
  }

  function setDuplexStream(abortable) {

    var sink = makeSink(server, abortable);

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

    listening = true;

    console.log("About to listen for incoming bluetooth connections.")

    var abortable = Abortable();

    server.listen(function (clientAddress) {

      if (connection != null) {
        console.log("Already established incoming bluetooth connection - only one allowed for now.");
        return;
      }

      setDuplexStream(abortable);
      console.log("Calling back with connection from " + clientAddress);
      onConnection(null, connection);
    }, function(error){
    }, {uuid: UUID, channel: CHANNEL} );

    server.on( 'closed', (err) => {
      abortable.abort();
      connection.source.end();
      connection = null;
    });
  }

  function stopServer() {
    // todo later
  }

  server.on('data', function(buffer) {
     //console.log("Received: " + buffer.toString());
      connection.source.push(buffer);
  });

  return {
    connect,
    disconnect,
    listenForIncomingConnections,
    stopServer
  }

}
