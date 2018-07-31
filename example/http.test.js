
const conf = require('./config');
let http = require('http');

let post_data = {
  jsonrpc: '2.0',
  method: 'findAttachments',
  params: ['k1'],
  id: 1
};//这是需要提交的数据

let options = {
  hostname: conf.host,
  port: conf.port,
  path: '/' + conf.jsonPath,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
    'Dubbo-Attachments': 'k1=2a,k2=3w'
  }
};

let req = http.request(options, function (res) {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
    console.log('BODY: ' + chunk);
    //JSON.parse(chunk)
  });
});
console.log(req.write);
req.on('error', function (e) {
  console.log('problem with request: ' + e.message);
});

// write data to request body
req.write(JSON.stringify(post_data));

req.end();