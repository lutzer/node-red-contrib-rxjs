const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const uuidv1 = require('uuid/v1');
const { fromEvent, zip } = require('rxjs');
const { skip } = require('rxjs/operators');

helper.init(require.resolve('node-red'));

describe('subscriber node', function () {

    const ofNode = require('./../src/rx-of');
    const subscriberNode = require('./../src/rx-subscriber');
    const timerNode = require('./../src/rx-timer');

    beforeEach(function (done) {
        helper.startServer(done);
    });
  
    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    
    it('should be able to auto subcribe to observable and receive the correct message', function(done) {

        const topic = uuidv1();
        const payload = uuidv1();

        var flow = [
            { id: 'n1', type: 'rx of', wires:[["n2"]], topic: topic, payload: payload },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([ofNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            
            fromEvent(out, 'input').subscribe( (msg) => {
                assert(msg.topic === topic)
                assert(msg.payload === payload)
                done();
             })
        })
    });

    it('should be able to manually subscribe to an observable and receive a message', function(done) {
        var flow = [
            { id: 'n1', type: 'rx of', wires:[["subscriber"]]},
            { id: 'subscriber', type: 'rx subscriber', auto_subscribe: false, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];


        helper.load([ofNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var subscriber = helper.getNode("subscriber");
            
            fromEvent(out, 'input').subscribe( (msg) => {
                done();
            })

            setTimeout( () => {
                subscriber.receive({ topic: 'subscribe' });
            },50)
            
        })
    });

    it('should send a complete msg', function(done) {
        var flow = [
            { id: 'n1', type: 'rx of', wires:[["subscriber"]] },
            { id: 'subscriber', type: 'rx subscriber', auto_subscribe: true, wires:[ ['out'] ,['complete']] },
            { id: 'out', type: 'helper' },
            { id: 'complete', type: 'helper' }
        ];


        helper.load([ofNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var complete = helper.getNode("complete");
            
            zip(
                fromEvent(out, 'input'),
                fromEvent(complete, 'input'),
            ).pipe().subscribe( (vals) => {
                assert.equal(vals[1].topic, 'completed')
                done();
            });
            
        })
    });

    it('should be able to manually complete observable', function(done) {
        var flow = [
            { id: 'n1', type: 'rx timer', wires:[["subscriber"]], period: 10, initialDelay: 0 },
            { id: 'subscriber', type: 'rx subscriber', auto_subscribe: true, wires:[ ['out'] ,['complete']] },
            { id: 'out', type: 'helper' },
            { id: 'complete', type: 'helper' }
        ];


        helper.load([timerNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var subscriber = helper.getNode("subscriber");
            var complete = helper.getNode("complete");
            
            zip(
                fromEvent(out, 'input'),
                fromEvent(complete, 'input'),
            ).pipe().subscribe( (vals) => {
                assert.equal(vals[1].topic, 'completed')
                done();
            });

            setTimeout( () => {
                subscriber.receive({ topic: "complete"})
            },100)
        })
    });

    it('should be able to re subscribe to an observable', function(done) {
        var flow = [
            { id: 'n1', type: 'rx of', wires:[["subscriber"]]},
            { id: 'subscriber', type: 'rx subscriber', auto_subscribe: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];


        helper.load([ofNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var subscriber = helper.getNode("subscriber");
            
            fromEvent(out, 'input').pipe( skip(1) ).subscribe( () => {
                done();
            })

            setTimeout( () => {
                subscriber.receive({ topic: 'subscribe' });
            },50)
            
        })
    });
})