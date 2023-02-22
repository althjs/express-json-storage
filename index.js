'use strict';

const fileStorage = require('./json-storage/fileStorage');

let config = {};


async function fileHandler(req, res, next) {
  let isHandled = false;
  switch (req.method) {
    case 'GET':
      isHandled = await fileStorage.handleGET(req, res, config);
      break;
    case 'PUT':
    case 'POST':
      isHandled = await fileStorage.handlePOST(req, res, config);
  }

  if (!isHandled) {
    next();
  }
}

function jsonFileStorage(conf) {

  let c = {};
  for (let i in conf) {
    c[conf[i].path] = conf[i];
  }
  config = c;

  return fileHandler;
}

module.exports = {
  jsonFileStorage: jsonFileStorage
};