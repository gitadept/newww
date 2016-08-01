'use strict';

var bole = require('bole');
var feature = require('./feature-flags.js');
var utils = require('./utils.js');

exports.register = function(server, options, next) {

  server.ext('onPreResponse', function(request, reply) {

    var response = request.response;

    if (!response.isBoom) {
      return reply.continue();
    }

    var logger = bole(request.id);
    var statusCode = response.statusCode || response.output.statusCode || 500;
    response.correlationID = request.id;
    response.features = request.features;

    let view;
    if (statusCode === 404) {
      view = reply.view('errors/not-found', response);
    } else {
      logger.warn(response);

      // if reply(err) was used in handler (which is preferred) then response
      // is a Boom-wrapped Error object - build the "full" stack (with cause)
      // for npmo display (see templates/errors/internal.hbs)
      if (feature('npmo')) {
        response.npmoFullStack = utils.stackToString(response);
      }

      view = reply.view('errors/internal', response);
    }
    return view.code(statusCode).type('text/html').charset('utf-8');
  });

  next();

};

exports.register.attributes = {
  name: 'error-handler',
  version: '1.0.0'
};
