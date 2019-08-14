const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const uuidv1 = require('uuid/v1');

helper.init(require.resolve('node-red'));

describe('of Node', function () {

    const ofNode = require('./../src/rx-of');
    const subscriberNode = require('./../src/rx-subscriber');

    beforeEach(function (done) {
        helper.startServer(done);
    });
  
    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    
    it('should send a pipe msg with observable', function(done) {
        var flow = [
            { id: 'n1', type: 'rx of', wires:[["out"]] },
            { id: 'out', type: 'helper' }
        ];

        helper.load(ofNode, flow, function() {
            var out = helper.getNode("out");
            var global = out.context().global;
            
            out.on('input', (msg) => {
                assert(msg.topic === 'pipe');
                assert( _.isObject(global.get(msg.payload.observable)) );
                done();
            })
        })
    });

    it('should be able to subscribe to it and receive a message', function(done) {

        const topic = uuidv1();
        const payload = uuidv1();

        var flow = [
            { id: 'n1', type: 'rx of', wires:[["n2"]], topic: topic, payload: payload },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([ofNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var n2 = helper.getNode("n2");
            
            out.on('input', (msg) => {
               assert(msg.topic === topic)
               assert(msg.payload === payload)
               done();
            })
        })
    });
})