var P = require('bluebird');

var feature = require('../lib/feature-flags.js');
var PackageAgent = require('../agents/package');
var DownloadAgent = require('../agents/download');
var ExplicitInstalls = require("npm-explicit-installs")

var MINUTE = 60; // seconds
var MODIFIED_TTL = 1 * MINUTE;
var DEPENDENTS_TTL = 30 * MINUTE;

module.exports = function(request, reply) {
  var Package = new PackageAgent(request.loggedInUser);
  var Download = new DownloadAgent();
  var context = {};
  var actions = {};

  actions.modified = Package.list({
    sort: "modified",
    count: 12
  }, MODIFIED_TTL);
  actions.dependents = Package.list({
    sort: "dependents",
    count: 12
  }, DEPENDENTS_TTL);
  actions.explicit = ExplicitInstalls();

  if (!feature('npmo')) {
    actions.downloads = Download.getAll();
    actions.totalPackages = Package.count().catch(function(err) {
      request.logger.error(err);
      return null;
    });
  }

  P.props(actions).then(function(results) {
    context.explicit = results.explicit
    context.modified = results.modified;
    context.dependents = results.dependents;
    context.downloads = results.downloads;
    context.totalPackages = results.totalPackages;

    reply.view('homepage', context);
  }).catch(function(err) {
    request.logger.error(err);
    return reply(err);
  });
};
