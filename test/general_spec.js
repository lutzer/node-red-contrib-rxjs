const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const { of } = require('rxjs');

helper.init(require.resolve('node-red'));

describe('Common functions', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });
  
    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    const { NodeRedObservable } = require('./../src/common');

    it('NodeRedObservable should create an observable in global space', function(done) {
        var flow = [
            { id: 'node', type: 'helper' }
        ];
        helper.load([], flow, function() {
            const node = helper.getNode("node");
            const global = node.context().global;
            
            const observableWrapper = new NodeRedObservable(node);
            observableWrapper.register( of('test') );

            const $observable = global.get(observableWrapper.observableName);
            assert(_.isObject($observable));
            done();
        })
    });
});