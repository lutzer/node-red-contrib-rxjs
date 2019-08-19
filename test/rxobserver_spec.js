const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const uuidv1 = require('uuid/v1');
const { fromEvent } = require('rxjs');

helper.init(require.resolve('node-red'));

describe('observer node', function () {

    const observerNode = require('./../src/rx-observer');
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
            { id: 'n1', type: 'rx observer', wires:[["out"]] },
            { id: 'out', type: 'helper' }
        ];

        helper.load(observerNode, flow, function() {
            var out = helper.getNode("out");
            var global = out.context().global;
            
            fromEvent(out, 'input').subscribe( (msg) => {
                assert(msg.topic === 'pipe');
                assert( _.isObject(global.get(msg.payload.observable)) );
                done();
            })
        })
    });

    it('should send a subscribe msg when subscribed to', function(done) {

        const topic = uuidv1();
        const payload = uuidv1();

        var flow = [
            { id: 'n1', type: 'rx observer', wires:[["sub"], ['out']] },
            { id: 'sub', type: 'rx subscriber', auto_subscribe: true, wires:[ ] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([observerNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var sub = helper.getNode("sub");
            var n1 = helper.getNode("n1");
            
            fromEvent(out, 'input').subscribe( (msg) => {
               assert(msg.topic === "subscribed")
               done();
            })

            setTimeout( () => {
                sub.receive({ topic: 'subscribe' })
            },50)
        })
    });

    it('should be able to subscribe to it and receive a message on input', function(done) {

        const topic = uuidv1();
        const payload = uuidv1();

        var flow = [
            { id: 'n1', type: 'rx observer', wires:[["n2"]] },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([observerNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var n1 = helper.getNode("n1");
            
            fromEvent(out, 'input').subscribe( (msg) => {
               assert(msg.topic === topic)
               assert(msg.payload === payload)
               done();
            })

            setTimeout( () => {
                n1.receive({ topic: topic, payload : payload })
            },50)
        })
    });

    it('should emit error when send msg with topic: error', function(done) {

        const errorString = uuidv1();

        var flow = [
            { id: 'n1', type: 'rx observer', wires:[["n2"]] },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[[],[],['out']] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([observerNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var n1 = helper.getNode("n1");
            
            fromEvent(out, 'input').subscribe( (msg) => {
                assert(msg.payload === errorString)
                done();
            })

            setTimeout( () => {
                n1.receive({ topic: 'error', payload : errorString })
            },50)
        })
    });

    it('should complete when send msg with topic: complete', function(done) {

        const errorString = uuidv1();

        var flow = [
            { id: 'n1', type: 'rx observer', wires:[["n2"]] },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[[],['out'],[]] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([observerNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var n1 = helper.getNode("n1");
            
            fromEvent(out, 'input').subscribe( (msg) => {
                assert(msg.topic === 'completed')
                done();
            })

            setTimeout( () => {
                n1.receive({ topic: 'complete' })
            },50)
        })
    });
})