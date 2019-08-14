const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const uuidv1 = require('uuid/v1');

helper.init(require.resolve('node-red'));

describe('of Timer', function () {

    const timerNode = require('./../src/rx-timer');
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
            { id: 'n1', type: 'rx timer', wires:[["out"]] },
            { id: 'out', type: 'helper' }
        ];

        helper.load(timerNode, flow, function() {
            var out = helper.getNode("out");
            var global = out.context().global;
            
            out.on('input', (msg) => {
                assert(msg.topic === 'pipe');
                assert( _.isObject(global.get(msg.payload.observable)) );
                done();
            })
        })
    });

    it('should be able to subscribe to it and receive a message after delay', function(done) {

        const initialDelay = Math.random() * 500;

        var flow = [
            { id: 'n1', type: 'rx timer', wires:[["n2"]], initialDelay: initialDelay, period : 0 },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        var then = Date.now();

        helper.load([timerNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            
            out.on('input', (msg) => {
               assert(msg.topic === "timer")
               assert(msg.payload === 0)
               var deltaT = Date.now() - then;
               assert(deltaT > initialDelay)
               done();
            })
        })
    });

    it('should emit periodic messages and receive the first 5', function(done) {

        const initialDelay = 0;
        const period = 40;

        var flow = [
            { id: 'n1', type: 'rx timer', wires:[["n2"]], initialDelay: 0, period : period },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([timerNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var n2 = helper.getNode("n2");
            
            let i = 0;
            out.on('input', (msg) => {
                assert(msg.topic === "timer");
                assert(msg.payload === i);
                i++;
                if (i > 5)
                    done();
            })
        })
    });
})