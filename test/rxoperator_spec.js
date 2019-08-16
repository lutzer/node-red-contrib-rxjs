const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const uuidv1 = require('uuid/v1');
const { fromEvent, throwError, of } = require('rxjs');
const { skip, first, scan } = require('rxjs/operators');

helper.init(require.resolve('node-red'));

describe('operator node', function () {

    const ofNode = require('./../src/rx-of');
    const rangeNode = require('./../src/rx-range');
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
            { id: 'n1', type: 'rx of', wires:[["op"]] },
            { id: 'op', type: 'rx operator', operatorType: 'take', wires:[['out']] },
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
        it('should buffer <bufferCount_bufferSize> msgs', (done) => {

            var bufferSize = Math.ceil(Math.random()*99);

            var flow = [
                { id: 'n1', type: 'rx range', wires:[["op"]], start: 0, count: 100  },
                { id: 'op', type: 'rx operator', operatorType: 'bufferCount', bufferCount_bufferSize: bufferSize, wires:[['sub']] },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([rangeNode, operatorNode, subscriberNode], flow, function() {
                var out = helper.getNode("out");
                
                fromEvent(out,'input').pipe( first() ).subscribe( (msg) => {
                    assert.equal(msg.payload.length, bufferSize)
                    done();
                })  
            });
        })

        it('should start buffer on <bufferCount_startEvery>', (done) => {

            var bufferSize = 10;
            var startEvery = 1 + Math.ceil((Math.random()*10));

            var flow = [
                { id: 'n1', type: 'rx range', wires:[["op"]], start: 0, count: 100  },
                { id: 'op', type: 'rx operator', operatorType: 'bufferCount', 
                    bufferCount_bufferSize: bufferSize, bufferCount_startEvery: startEvery, wires:[['sub']] },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([rangeNode, operatorNode, subscriberNode], flow, function() {
                var out = helper.getNode("out");
                
                fromEvent(out,'input').pipe( scan( (acc, msg) => {
                    assert(msg.payload[0] == acc);
                    return acc + startEvery;
                },0)).subscribe( (val) => {
                    if (val >= 100)
                        done();
                });
            });
        })
    })

    describe('catch', () => {

        it('should throw an error when catch funcion is wrong', (done) => {

            var errorString = uuidv1();

            var flow = [
                { id: 'op', type: 'rx operator', operatorType: 'catch', catch_func: 'return { topic : "error", payload: error', wires:[[]] },
            ];

            helper.load([rangeNode, operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                const global = op.context().global;

                var $observable = throwError(errorString);
                global.set('error', $observable); 

                op.receive({topic : 'pipe', payload : { observable : 'error'}})

                setTimeout( () => {
                    //console.log(op.error.called)
                    assert(op.error.called);
                    done();
                },100)

            });
        })

        it('should catch an error, supplying a ctahc function', (done) => {

            var errorString = uuidv1();

            var flow = [
                { id: 'op', type: 'rx operator', operatorType: 'catch', catch_func: 'return { topic : "error", payload: error }', wires:[['sub']] },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([rangeNode, operatorNode, subscriberNode], flow, function() {
                var out = helper.getNode("out");
                var op = helper.getNode('op');
                const global = op.context().global;

                var $observable = throwError(errorString);
                global.set('error', $observable);
                
                fromEvent(out,'input').pipe( ).subscribe( (msg) => {
                    assert.equal(msg.payload, errorString)
                    done();
                })  

                op.receive({topic : 'pipe', payload : { observable : 'error'}})

            });
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