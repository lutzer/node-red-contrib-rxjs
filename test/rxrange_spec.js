const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");

helper.init(require.resolve('node-red'));

describe('of Range', function () {

    const rangeNode = require('./../src/rx-range');
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
            { id: 'n1', type: 'rx range', wires:[["out"]] },
            { id: 'out', type: 'helper' }
        ];

        helper.load(rangeNode, flow, function() {
            var out = helper.getNode("out");
            var global = out.context().global;
            
            out.on('input', (msg) => {
                assert(msg.topic === 'pipe');
                assert( _.isObject(global.get(msg.payload.observable)) );
                done();
            })
        })
    });

    it('should be able to send a msg sequence', function(done) {

        const from = Math.ceil(Math.random() * 100);
        const to = from + Math.ceil(Math.random() * 100);

        var flow = [
            { id: 'n1', type: 'rx range', wires:[["n2"]], from: from, to: to },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        var then = Date.now();

        helper.load([rangeNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            
            var i = 0;
            out.on('input', (msg) => {
                assert(msg.topic === "range")
                assert(msg.payload === from + i);
                i++;
                if (i === to - from)
                    done();
            })
        })
    });
})