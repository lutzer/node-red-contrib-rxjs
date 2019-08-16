const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const uuidv1 = require('uuid/v1');
const { fromEvent } = require('rxjs');
const { skip, scan } = require('rxjs/operators');

helper.init(require.resolve('node-red'));

describe('timer node', function () {

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
            
            fromEvent(out, 'input').subscribe( (msg) => {
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
            
            fromEvent(out, 'input').subscribe( (msg) => {
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
            
            fromEvent(out, 'input').pipe( scan( (acc, msg) => {
                assert.equal(msg.topic, "timer");
                assert.equal(msg.payload, acc);
                return acc + 1;
            }, 0), skip(5) ).subscribe( (val) => {
                done();
            })
        })
    });
})