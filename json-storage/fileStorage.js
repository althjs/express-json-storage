'use strict';

const utils = require('../utils');
const ecb = utils.errorCallback;


function parsePath(path) {
  let params = {
  },
    i,
    u = path.split('/'),
    len = u.length;

  for (i = 2; i < len; i++) {
    switch (i) {
      case 3:
        params['file'] = decodeURIComponent(u[i]);
        break;
      case 4:
        params['id'] = decodeURIComponent(u[i]);
        break;
    }
  }

  return params;
}

function parseConfig(req, config) {
  let path = req._parsedUrl.pathname;
  let params = parsePath(path);

  for (let key in config) {
    if (path.indexOf(key) > 0) {
      params.conf = config[key];
      break;
    }
  }
  return params;
}

async function handleGET(req, res, config) {
  let params = parseConfig(req, config);

  if (!params.conf) {
    res.send(ecb('NO DATA FILE'));
    return;
  }

  try {
    let data = JSON.parse(await utils.readFile(params.conf.file));

    if (!params.id) {
      res.send(data);
      return;
    }

    for (let i in data) {
      if (data[i].id == params.id) {
        res.send(data[i]);
      }
    }

    res.send(ecb(`NO DATA for id:${params.id}`));

  } catch (e) {
    res.send(ecb(e));
  }

}


async function handlePOST(req, res, config) {
  let params = parseConfig(req, config);
  let body = req.body;

  if (!body) {
    res.send(ecb('body is required'));
    return;
  }

  if (!params.id) {
    res.send(ecb(':id is required'));
    return;
  }

  if (!params.conf) {
    res.send(ecb('NO DATA FILE'));
    return;
  }

  try {
    let data = JSON.parse(await utils.readFile(params.conf.file));
    let isUpdate = false;

    for (let i in data) {
      if (data[i].id == params.id) {
        data[i] = body;
        isUpdate = true;
        break;
      }
    }

    if (!isUpdate) {
      data.push(body);
    }

    await utils.writeFile(params.conf.file, JSON.stringify(data, null, 2));
    res.send(data);

  } catch (e) {
    console.log(e);
    res.send(ecb(e.message));
  }

}




module.exports = {
  handleGET: handleGET,
  handlePOST: handlePOST
}