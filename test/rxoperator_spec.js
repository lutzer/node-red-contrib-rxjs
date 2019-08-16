const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const uuidv1 = require('uuid/v1');
const { fromEvent, zip, combineLatest } = require('rxjs');
const { skip } = require('rxjs/operators');

helper.init(require.resolve('node-red'));

describe('operator node', function () {

    const ofNode = require('./../src/rx-of');
    const operatorNode = require('./../src/rx-operator');
    const subscriberNode = require('./../src/rx-subscriber');

    beforeEach(function (done) {
        helper.startServer(done);
    });
  
    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should pipe an observable', function(done) {
        var flow = [
            { id: 'n1', type: 'rx of', wires:[["n2"]] },
            { id: 'n2', type: 'rx operator', operatorType: 'take', wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([ofNode, operatorNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            
            fromEvent(out,'input').subscribe( (msg) => {
                assert.equal(msg.topic, 'pipe')
                assert(_.isString(msg.payload.observable))
                done();
            })
            
        })

    })

    describe('bufferCount', function () {
        it('should test', () => {

        })
    })

    // it('should be able to manually subscribe to an observable and receive a message', function(done) {
    //     var flow = [
    //         { id: 'n1', type: 'rx of', wires:[["subscriber"]]},
    //         { id: 'subscriber', type: 'rx subscriber', auto_subscribe: false, wires:[['out']] },
    //         { id: 'out', type: 'helper' }
    //     ];


    //     helper.load([ofNode, subscriberNode], flow, function() {
    //         var out = helper.getNode("out");
    //         var subscriber = helper.getNode("subscriber");
            
    //         out.on('input', (msg) => {
    //             done();
    //         })

    //         setTimeout( () => {
    //             subscriber.receive({ topic: 'subscribe' });
    //         },50)
            
    //     })
    // });

    // it('should send a complete msg', function(done) {
    //     var flow = [
    //         { id: 'n1', type: 'rx of', wires:[["subscriber"]] },
    //         { id: 'subscriber', type: 'rx subscriber', auto_subscribe: true, wires:[ ['out'] ,['complete']] },
    //         { id: 'out', type: 'helper' },
    //         { id: 'complete', type: 'helper' }
    //     ];


    //     helper.load([ofNode, subscriberNode], flow, function() {
    //         var out = helper.getNode("out");
    //         var complete = helper.getNode("complete");
            
    //         zip(
    //             fromEvent(out, 'input'),
    //             fromEvent(complete, 'input'),
    //         ).pipe().subscribe( (vals) => {
    //             assert.equal(vals[1].topic, 'completed')
    //             done();
    //         });
            
    //     })
    // });
})