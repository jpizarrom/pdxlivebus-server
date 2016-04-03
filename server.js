var app = require('express')();
var http = require('http').Server(app);
var request = require('request-promise');
var io = require('socket.io')(http);
var _ = require('lodash');

var cors = require('cors');

app.use(cors());

var config = {
  APPID: process.env.APPID
}

var VEHICLE_URL = 'http://developer.trimet.org/ws/v2/vehicles';

var vehicles = [];

io.set('origins', '*:*');

function getVehicles() {
  request(VEHICLE_URL, {
    qs: {
      'appID': config.APPID
    }
  }).then(function(data) {
    var json = JSON.parse(data);
    if (json && json.resultSet) {
      vehicles = _.map(json.resultSet.vehicle, function(vehicle) {
        return _.pick(vehicle, ['routeNumber', 'delay', 'inCongestion', 'latitude', 'longitude', 'type', 'vehicleID']);
      });

      io.emit('vehicles_update', vehicles);
    }
  });
}

setInterval(getVehicles, 5000);

app.get('/', function(req, res){
  res.send(vehicles);
});

io.on('connection', function(socket){

  socket.emit('vehicles_update', vehicles);

});

var IP = process.env.OPENSHIFT_NODEJS_PORT || 3001;
var SERVER = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

http.listen(IP, SERVER, function(){
  console.log('listening on ' + SERVER + ':' + IP);
});
