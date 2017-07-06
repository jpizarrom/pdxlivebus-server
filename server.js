var app = require('express')();
var http = require('http').Server(app);
var request = require('request-promise');
var io = require('socket.io')(http);
var _ = require('lodash');

var cors = require('cors');

var AWS = require('aws-sdk');
var util = require('util');
var Raven = require('raven');

if (process.env.SENTRY_DSN) {
  Raven.config(process.env.RAVEN_DSN, {
    captureUnhandledRejections: true
  }).install();
}

// configure AWS
AWS.config.update({
  'region': 'us-east-1'
});

var sqs = new AWS.SQS();

var receiveMessageParams = {
  QueueUrl: process.env.QUEUE_URL,
  MaxNumberOfMessages: 1
};

app.use(cors());

var config = {
  VEHICLE_URL: process.env.VEHICLE_URL,
  LOG_KEY: process.env.VEHICLE_LOG_KEY,
}

var objKey;
var vehicles = [];

io.set('origins', '*:*');

function getVehicles() {
  if (objKey){
    var url = config.VEHICLE_URL+objKey;
    console.log(url);
    request(url).then(function(data) {
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
            vehicleID: arr[3],
            dateDB:arr[13],
            dateTrans:arr[2]
          }
        });

        io.emit('vehicles_update', vehicles);
      }
    });}
}

// getVehicles();
setInterval(getVehicles, 60000);

function getMessages() {
  sqs.receiveMessage(receiveMessageParams, receiveMessageCallback);
}

function doSomethingCool(body, message){
  // console.log(body);
  // console.log(message);
  event = JSON.parse(body.Message);
  // console.log('Received event: ', JSON.stringify(event, null, 2));
  event.Records.forEach(function(record) {
    var bucket = record.s3.bucket.name;
    objKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    console.log(bucket, objKey);
  });

}

function receiveMessageCallback(err, data) {
  //console.log(data);
  if(err) console.log(err);

  if (data && data.Messages && data.Messages.length > 0) {

    for (var i=0; i < data.Messages.length; i++) {
      var message = data.Messages[i],
          body = JSON.parse(message.Body);
      // process.stdout.write(".");
      //console.log("do something with the message here...");
      doSomethingCool(body, message);
      //
      // Delete the message when we've successfully processed it
      var deleteMessageParams = {
        QueueUrl: process.env.QUEUE_URL,
        ReceiptHandle: data.Messages[i].ReceiptHandle
      };

      sqs.deleteMessage(deleteMessageParams, deleteMessageCallback);
    }

    getMessages();

  } else {
    // process.stdout.write("-");
    setTimeout(getMessages, 30000);
  }
}

function deleteMessageCallback(err, data) {
  if(err) console.log(err);
  //console.log("deleted message");
  //console.log(data);
}

// getMessages();
setTimeout(getMessages, 1000);

if (process.env.SENTRY_DSN) {
  app.use(Raven.requestHandler());
}

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
