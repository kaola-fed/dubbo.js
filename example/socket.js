const conf = require('./config');
let net = require('net');
let normalizedArgsSymbol = Symbol('normalizedArgs');
function isPipeName(s) {
  return typeof s === 'string' && toNumber(s) === false;
}
let post_data = {
  'jsonrpc': '2.0',
  'method': 'findAttachments',
  'params': ['k1'],
  'id': 1
};//这是需要提交的数据
function normalizeArgs(args) {
  let arr;

  if (args.length === 0) {
    arr = [{}, null];
    arr[normalizedArgsSymbol] = true;
    return arr;
  }

  const arg0 = args[0];
  let options = {};
  if (typeof arg0 === 'object' && arg0 !== null) {
  // (options[...][, cb])
    options = arg0;
  } else if (isPipeName(arg0)) {
  // (path[...][, cb])
    options.path = arg0;
  } else {
  // ([port][, host][...][, cb])
    options.port = arg0;
    if (args.length > 1 && typeof args[1] === 'string') {
      options.host = args[1];
    }
  }

  let cb = args[args.length - 1];
  if (typeof cb !== 'function') {
    arr = [options, null];
  } else {
    arr = [options, cb];
  }
  arr[normalizedArgsSymbol] = true;
  return arr;
}
const extraLength = chunk => {
  const arr = Array.prototype.slice.call(chunk.slice(0, 16));
  let i = 0;
  let extra = 0;

  while (i < 3) {
    extra += arr.pop() * Math.pow(256, i++);
  }

  return extra;
};
function getName(options) {
  let name = options.host || 'localhost';
  name += ':';
  if (options.port) {
    name += options.port;
  }
  name += ':';
  if (options.localAddress) {
    name += options.localAddress;
  }
  // Pacify parallel/test-http-agent-getname by only appending
  // the ':' when options.family is set.
  if (options.family === 4 || options.family === 6) {
    name += `:${options.family}`;
  }
  if (options.socketPath) {
    name += `:${options.socketPath}`;
  }
  return name;
}
let bufferLength = 0;
function connect(...args) {
  let normalized = normalizeArgs(args);
  let options = normalized[0];
  if (options.socketPath) {
    options.path = options.socketPath;
  }
  if (!options.servername) {
    options.servername = options.host + ':' + options.port;
  }
  let name = getName(options);
  options._agentKey = name;

  options.encoding = null;
  // let socket = net.createConnection({
  //   host: conf.host,
  //   port: conf.port
  // });
  let socket = new net.Socket();
  socket.connect({
    host: conf.host,
    port: conf.port
  }, 6000);
  socket.on('connect', () => {
    // Then remove error listener for reject
    console.log('--- connect to dubbo service ---');
  });
  //new net.Socket();
  if (options.timeout) {
    socket.setTimeout(options.timeout);
  }
  //socket.write(JSON.stringify(post_data));
  socket.on('error', (err) => {
    console.log(err);
  });
  return socket;
  //return net.Socket.prototype.connect.call(socket, options);
}
let start = 0;
let socket = connect();
const lenReg = /Content-Length: (\d+)\r\n/;

const isover = function(response) {
  try {
    let bodyLength = response.match(lenReg)[1];
    return response.split('\r\n\r\n')[1].length >= bodyLength;
  } catch (e) {
    return true;
  }
};

socket.on('end', () => {
  console.log('end');
});
socket.on('close', () => {
  console.log('close');
  console.log(Number(new Date()) - start);
});
socket.on('finish', () => {
  console.log('finish');
});
socket.on('data', chunk => {
  start = Number(new Date());
  const chunks = [];
  if (!chunks.length) {
    bufferLength += extraLength(chunk);
  }

  chunks.push(chunk);
  //console.log(111, chunk.toString());
  const heap = Buffer.concat(chunks);
  if (isover(heap.toString())) {
    console.log('dubbo request done');
    console.log(222, heap.toString());
  }

  if (heap.length >= bufferLength) {
    console.log('dubbo request done');
    console.log(111, heap.toString('base64'));
  }
});
socket.on('error', (err) => {
  console.log(err);
});
data = JSON.stringify(post_data);
socket.write(`POST /${conf.jsonPath} HTTP/1.1\r\nHOST: ${conf.host}:${conf.port}\r\nContent-Length: ${data.length}\r\nContent-Type: application/json;charset=utf-8\r\nDubbo-Attachments: k1=2a,k2=3w\r\n\r\n${data}\r\n\r\n`);