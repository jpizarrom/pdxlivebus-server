var app = require('express')();
var http = require('http').Server(app);
var request = require('request-promise');
var io = require('socket.io')(http);
var _ = require('lodash');

var cors = require('cors');

app.use(cors());

var config = {
  VEHICLE_URL: process.env.VEHICLE_URL,
  USERNAME: process.env.VEHICLE_URL_USERNAME,
  PASSWORD: process.env.VEHICLE_URL_PASSWORD,
  LOG_KEY: process.env.VEHICLE_LOG_KEY,
}

var vehicles = [];

io.set('origins', '*:*');

function getVehicles() {
  request(config.VEHICLE_URL, {
  auth: {
    user: config.USERNAME,
    pass: config.PASSWORD,
    sendImmediately: false
  }
  }).then(function(data) {
    var json = JSON.parse(data);
    console.log(json[config.LOG_KEY]);
    if (json && json.posiciones) {
      vehicles = _.map(json.posiciones, function(vehicle) {
        var arr = /^([^;]+[;]){0}([^;]+);([^;]+);([^;]+);([^;]+);([^;]+);([^;]+);([^;]+);([^;]+);([^;]+);([^;]+);([^;]+);([^;]+);/.exec(vehicle);
        return {
          routeNumber: arr[9],
          delay: 0,
          inCongestion: null,
          latitude: arr[4],
          longitude: arr[5],
          type: "bus",
          vehicleID: arr[3]
        }
      });

      io.emit('vehicles_update', vehicles);
    }
  });
}

getVehicles();
setInterval(getVehicles, 60000);

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
