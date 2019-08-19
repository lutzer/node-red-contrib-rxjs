const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const uuidv1 = require('uuid/v1');
const { fromEvent, zip, throwError } = require('rxjs');
const { skip } = require('rxjs/operators');

helper.init(require.resolve('node-red'));

describe('subscriber node', function () {

    const ofNode = require('./../src/rx-of');
    const operatorNode = require('./../src/rx-operator');
    const nodeRange = require('./../src/rx-range');
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

    it('should emit error when error thrown', function(done) {
        
        const errorString = uuidv1();
        
        var flow = [
            { id: 'subscriber', type: 'rx subscriber', auto_subscribe: true, wires:[ ['out'] ,['complete'], ['error'] ] },
            { id: 'out', type: 'helper' },
            { id: 'complete', type: 'helper' },
            { id: 'error', type: 'helper' }
        ];


        helper.load([timerNode, subscriberNode], flow, function() {
            var subscriber = helper.getNode("subscriber");
            var error = helper.getNode("error");
            const global = subscriber.context().global;

            var $observable = throwError(errorString);
            global.set('observable', $observable); 
            
            fromEvent(error, 'input').subscribe( (msg) => {
                assert.equal(msg.payload, errorString);
                done();
            });

            setTimeout( () => {
                subscriber.receive({ topic: "pipe", payload : { observable : 'observable' }})
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

    it('should combine values when <bundle> is true', function(done) {

        var flow = [
            { id: 'n1', type: 'rx range', start: 0, count: 10, wires:[["n2"]]},
            { id: 'n2', type: 'rx operator', operatorType: 'bufferCount', bufferCount_bufferSize: 10, wires:[["subscriber"]]},
            { id: 'subscriber', type: 'rx subscriber', auto_subscribe: true, bundle: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];


        helper.load([nodeRange, operatorNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var subscriber = helper.getNode("subscriber");
            
            fromEvent(out, 'input').pipe().subscribe( (msg) => {
                assert(_.isArray(msg.payload))
                done();
            })
        })
    });
})