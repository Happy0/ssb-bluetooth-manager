var bluetoothManager = require('../bluetooth-manager')();
var pull = require('pull-stream');

bluetoothManager.listenForIncomingConnections( (err, res) => {
  pull(res.source, pull.drain((data) => console.log ("Got from client: " + data)));
} );
