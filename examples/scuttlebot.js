const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

var bluetoothMultiserv = require('multiserver-bluetooth');
var ssbKeys = require('ssb-keys');
var manifest = require('./manifest');

var BluetoothManager = require('../bluetooth-manager');
const makeNoauthPlugin = require('multiserver/plugins/noauth');
const makeBluetoothPlugin = require('multiserver-bluetooth');

const writablePath = path.join(__dirname, '');
const ssbPath = path.resolve(writablePath, '.bluetooth-ssb-test');

if (!fs.existsSync(ssbPath)) {
  mkdirp.sync(ssbPath);
}

const keys = ssbKeys.loadOrCreateSync(path.join(ssbPath, '/secret'));

const config = require('ssb-config/inject')();
config.path = ssbPath;
config.keys = keys;
config.manifest = manifest;
config.friends.hops = 2;
config.connections = {
  incoming: {
    bluetooth: [{scope: 'public', transform: 'noauth'}]
  },
  outgoing: {
  },
};

function bluetoothTransportPlugin(stack) {

  const bluetoothManager = BluetoothManager();

  const plugin = {
    name: 'bluetooth',
    create: () => {
      return makeBluetoothPlugin({
        bluetoothManager: bluetoothManager
      })
    }
  }

  stack.multiserver.transport(plugin);
}

function noauthTransform(stack, cfg) {
  stack.multiserver.transform({
    name: 'noauth',
    create: () => {
      return makeNoauthPlugin({
        keys: {
          publicKey: Buffer.from(cfg.keys.public, 'base64'),
        },
      });
    },
  });
}

require('scuttlebot/index')
  .use(noauthTransform)
  .use(bluetoothTransportPlugin)
  .use(require('scuttlebot/plugins/plugins'))
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/replicate'))
  .call(null, config);
