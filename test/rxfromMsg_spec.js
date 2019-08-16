const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const uuidv1 = require('uuid/v1');
const { fromEvent } = require('rxjs');

helper.init(require.resolve('node-red'));

describe('fromMsg node', function () {

    const fromMsgNode = require('./../src/rx-fromMsg');
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
            { id: 'n1', type: 'rx fromMsg', wires:[["out"]] },
            { id: 'out', type: 'helper' }
        ];

        helper.load(fromMsgNode, flow, function() {
            var out = helper.getNode("out");
            var global = out.context().global;
            
            fromEvent(out, 'input').subscribe( (msg) => {
                assert(msg.topic === 'pipe');
                assert( _.isObject(global.get(msg.payload.observable)) );
                done();
            })
        })
    });

    it('should be able to subscribe to it and receive a message on input', function(done) {

        const topic = uuidv1();
        const payload = uuidv1();

        var flow = [
            { id: 'n1', type: 'rx fromMsg', wires:[["n2"]] },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([fromMsgNode, subscriberNode], flow, function() {
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
})