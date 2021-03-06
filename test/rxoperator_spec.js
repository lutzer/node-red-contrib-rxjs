const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const uuidv1 = require('uuid/v1');
const { fromEvent, throwError, of, timer, range, combineLatest } = require('rxjs');
const { skip, first, scan, timeInterval, take, mapTo,
        takeUntil, reduce, mergeMap, filter, 
        timeout, pairwise, catchError, startWith } = require('rxjs/operators');

helper.init(require.resolve('node-red'));

function createRandomValue(type) {
    if (type === 'str')
        return uuidv1();
    else if (type === 'num')
        return Math.random() * 1000;
    else if (type === 'json')
        return {
            number : Math.random(),
            string : uuidv1(),
            array : [ uuidv1(), uuidv1() ]
        }
}

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
            { id: 'op', type: 'rx operator', operatorType: 'timeInterval', wires:[['out']] },
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

    it('should throw an error if there is no observable piped', function(done) {
        var flow = [
            { id: 'op', type: 'rx operator', operatorType: 'timeInterval', wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([ofNode, operatorNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
            var op = helper.getNode("op");

            op.receive({ topic: 'pipe', payload: null});

            setTimeout( () => {
                assert(op.error.called);
                done();
            },100)

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

    describe('delay', function() {
        it('should delay a message', (done) => {

            var delayTime = Math.random()*100;

            var flow = [
                { id: 'op', type: 'rx operator', operatorType: 'delay', delay: delayTime, wires:[['sub']] },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = of('test');
                global.set('observable', $observable); 

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})

                fromEvent(out,'input').pipe( timeInterval() ).subscribe( (msg) => {
                    assert(Math.abs(delayTime - msg.interval) < 10);
                    done();
                })
            });
        })

        it('should give an error when no delayTime is specified', (done) => {

            var flow = [
                { id: 'op', type: 'rx operator', operatorType: 'delay', wires:[['sub']] }
            ];

            helper.load([operatorNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = of('test');
                global.set('observable', $observable); 

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})

                setTimeout( () => {
                    assert(op.error.called);
                    done();
                },100)
            });
        })
    });

    describe('distinctUntilKeyChanged', function() {
        it('should not emit twice when msg is the same', (done) => {
            var string = uuidv1();

            var flow = [
                { id: 'op', type: 'rx operator', operatorType: 'distinctUntilKeyChanged', wires:[['sub']] },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                var sub = helper.getNode('sub');
                const global = op.context().global;

                var $observable = of(string, string);
                global.set('observable', $observable); 

                fromEvent(out,'input').pipe( 
                    takeUntil( timer(100) ),
                    reduce( (acc) => acc + 1, 0), 
                ).subscribe( (val) => {
                    assert.equal(val, 1);
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        })

        it('should not emit twice when selected property is the same', (done) => {
            var string = uuidv1();

            var flow = [
                { id: 'op', type: 'rx operator', operatorType: 'distinctUntilKeyChanged', distinct_key: 'x', wires:[['sub']] },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                var sub = helper.getNode('sub');
                const global = op.context().global;

                var $observable = of({x : 4, y: 3}, {x : 4, y: 2});
                global.set('observable', $observable); 

                fromEvent(out,'input').pipe( 
                    takeUntil( timer(100) ),
                    reduce( (acc) => acc + 1, 0), 
                ).subscribe( (val) => {
                    assert.equal(val, 1);
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        })

        it('should emit twice when selected property changed', (done) => {
            var string = uuidv1();

            var flow = [
                { id: 'op', type: 'rx operator', operatorType: 'distinctUntilKeyChanged', distinct_key: 'y', wires:[['sub']] },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                var sub = helper.getNode('sub');
                const global = op.context().global;

                var $observable = of({x : 4, y: 3}, {x : 4, y: 2});
                global.set('observable', $observable); 

                fromEvent(out,'input').pipe( 
                    takeUntil( timer(100) ),
                    reduce( (acc) => acc + 1, 0), 
                ).subscribe( (val) => {
                    assert.equal(val, 2);
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        })
    });

    describe('mapTo', function() {

        it('should map an observable to another msg with json payload', (done) => {

            var topic = uuidv1();
            var type = 'json';
            var payload = createRandomValue(type);

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'mapTo', 
                    mapTo_topic : topic,
                    mapTo_payload : payload,
                    mapTo_payloadType : type,
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = of('foo');
                global.set('observable', $observable); 

                fromEvent(out,'input').subscribe( (msg) => {
                    assert.equal(msg.topic, topic);
                    assert(_.isEqual(msg.payload, payload));
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        })

        it('should map an observable to another msg with str payload', (done) => {

            var topic = uuidv1();
            var type = 'str';
            var payload = createRandomValue(type);

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'mapTo', 
                    mapTo_topic : topic,
                    mapTo_payload : payload,
                    mapTo_payloadType : type,
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = of('foo');
                global.set('observable', $observable); 

                fromEvent(out,'input').subscribe( (msg) => {
                    assert.equal(msg.topic, topic);
                    assert(_.isEqual(msg.payload, payload));
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        });

        it('should map an observable to another msg with num payload', (done) => {

            var topic = uuidv1();
            var type = 'num';
            var payload = createRandomValue(type);

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'mapTo', 
                    mapTo_topic : topic,
                    mapTo_payload : payload,
                    mapTo_payloadType : type,
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = of('foo');
                global.set('observable', $observable); 

                fromEvent(out,'input').subscribe( (msg) => {
                    assert.equal(msg.topic, topic);
                    assert(_.isEqual(msg.payload, payload));
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        })
    });

    describe('repeat', function() {

        it('should repeat a msg several times', (done) => {

            var repeats = Math.ceil(Math.random()*100);

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'repeat', 
                    repeat_count : repeats,
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: false, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = of('test');
                global.set('observable', $observable); 

                fromEvent(out,'input').pipe( skip(repeats-1) ).subscribe( (msg) => {
                    //console.log(msg)
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        })

        it('should throw an error on <repeat_count> not a number', (done) => {

            var repeats = "test"

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'repeat', 
                    repeat_count : repeats,
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: false, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                const global = op.context().global;

                var $observable = of('test');
                global.set('observable', $observable); 

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})

                setTimeout( () => {
                    assert(op.error.called);
                    done();
                },100)
            });
        })
    });

    describe("retry", function() {

        it('should retry on error', (done) => {

            var retries = Math.ceil(Math.random()*100);

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'retry', 
                    retry_number : retries,
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = range(0, 2).pipe( mergeMap( (val) => {
                    return val > 0 ? throwError('err') : of('succeed');
                }));
                global.set('observable', $observable); 

                fromEvent(out,'input').pipe( scan( acc => acc + 1, 0), filter( val => val > retries)).subscribe( (val) => {
                    assert.equal(val, retries + 1);
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        })

        it('should throw error on negative number', (done) => {

            var retries = -Math.ceil(Math.random()*100);

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'retry', 
                    retry_number : retries,
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                const global = op.context().global;

                var $observable = of('test')
                global.set('observable', $observable); 

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})

                setTimeout( () => {
                    assert(op.error.called);
                    done();
                },100)
            });
        })
    })

    describe("take", function() {

        it('should take <take_count> values', (done) => {

            var count = Math.ceil(Math.random()*100);

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'take', 
                    take_count : count,
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: false, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = range(0, 100);
                global.set('observable', $observable); 

                fromEvent(out,'input').pipe(
                    timeout(10),
                    catchError( (err) => {
                        return of("timeout");
                    }),
                    pairwise()
                ).subscribe( (val) => {
                    if (val[1] === "timeout") {
                        assert.equal(val[0], count - 1);
                        done();
                    }
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        })

        it('should throw error on negative number', (done) => {

            var count = -Math.ceil(Math.random()*100);

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'take', 
                    take_count : count,
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                const global = op.context().global;

                var $observable = of('test')
                global.set('observable', $observable); 

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})

                setTimeout( () => {
                    assert(op.error.called);
                    done();
                },100)
            });
        })

    });

    describe("takeUntil", function() {

        it('should receive observables until argument is fired', (done) => {

            var time = 50 + Math.ceil(Math.random()*200);

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'takeUntil',
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true, wires:[['out'], ['complete']] },
                { id: 'out', type: 'helper' },
                { id: 'complete', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                var complete = helper.getNode('complete');
                const global = op.context().global;

                var $observable = timer(0, 10);
                global.set('observable', $observable); 

                var $stop = timer(time);
                global.set('until-observable', $stop); 

                combineLatest(fromEvent(out, 'input'), $stop, fromEvent(complete, 'input') ).subscribe( (val) => {
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
                op.receive({topic : 'until', payload : { observable : 'until-observable'}})
            });
        })

        it('should not pipe observable when until is not received', (done) => {

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'takeUntil',
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var sub = helper.getNode('sub');
                var complete = helper.getNode('complete');
                const global = op.context().global;

                var $observable = timer(0, 10);
                global.set('observable', $observable); 

                combineLatest( fromEvent(sub, 'input').pipe( startWith(null) ), timer(50).pipe( startWith(null) ), ).subscribe( (val) => {
                    assert.equal(val[0], null)
                    if (val[1] == 0)
                        done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        })

        it('should not pipe observable when pipe is not received', (done) => {

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'takeUntil',
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, bundle: true }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var sub = helper.getNode('sub');
                var complete = helper.getNode('complete');
                const global = op.context().global;

                var $observable = timer(0, 10);
                global.set('observable', $observable); 

                combineLatest( fromEvent(sub, 'input').pipe( startWith(null) ), timer(50).pipe( startWith(null) ), ).subscribe( (val) => {
                    assert.equal(val[0], null)
                    if (val[1] == 0)
                        done();
                })

                op.receive({topic : 'until', payload : { observable : 'observable'}})
            });
        })

    });

    describe("timeInterval", function() {
        it('should return the time interval between to calls', (done) => {

            var interval = Math.random() * 100;

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'timeInterval',
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, wires: [['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = timer(0, interval);
                global.set('observable', $observable); 

                fromEvent(out, 'input').pipe( skip(1), take(1) ).subscribe( (msg) => {
                    assert(Math.abs(msg.interval - interval) < 10);
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });

        });

        it('should return the original message', (done) => {

            var topic = uuidv1();
            var payload = uuidv1();

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'timeInterval',
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, wires: [['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = timer(0, 10).pipe( mapTo({ topic: topic, payload : payload }) )
                global.set('observable', $observable); 

                fromEvent(out, 'input').pipe( skip(1), take(1) ).subscribe( (msg) => {
                    assert.equal(msg.topic, topic);
                    assert.equal(msg.payload, payload);
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });

        });

    });

    describe("timeout", () => {
        it('should throw error on timeout', (done) => {

            var time = Math.random() * 100;

            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'timeout',
                    timeout: time,
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, wires: [['out'], [null], ["error"]] },
                { id: 'out', type: 'helper' },
                { id: 'error', type: 'helper' },
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var error = helper.getNode('error');
                const global = op.context().global;

                var $observable = timer(1000);
                global.set('observable', $observable); 

                fromEvent(error, 'input').subscribe( (msg) => {
                    assert.equal(msg.topic, "error");
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        });
    });

    describe("scan", () => {

        it('should accept a seed and scan function', (done) => {

            var type = _.sample(["str","num","json"]);
            var seed = createRandomValue(type);
        
            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'scan',
                    scan_seed: seed,
                    scan_seedType: type,
                    scan_func: "return acc + msg",
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, wires: [['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = range(0,10);
                global.set('observable', $observable); 

                fromEvent(out, 'input').pipe( skip(9) ).subscribe( (msg) => {
                    var result = _.range(0,10).reduce( (acc, val) => {
                        return acc + val;
                    }, seed)
                    assert(_.isEqual(result, msg.payload));
                    done();
                })

                op.receive({topic : 'pipe', payload : { observable : 'observable'}})
            });
        });
    });

    describe("map", () => {

        it('should accept a map function', (done) => {

            var type = _.sample(["str","num","json"]);
            var input = createRandomValue(type);
        
            var flow = [
                { 
                    id: 'op', 
                    type: 'rx operator', 
                    operatorType: 'map',
                    map_func: 'return msg.payload + 1',
                    wires:[['sub']] 
                },
                { id: 'sub', type: 'rx subscriber', auto_subscribe : true, wires: [['out']] },
                { id: 'out', type: 'helper' }
            ];

            helper.load([operatorNode, subscriberNode], flow, function() {
                var op = helper.getNode('op');
                var out = helper.getNode('out');
                const global = op.context().global;

                var $observable = of({ payload: input });
                global.set('observable', $observable); 

                fromEvent(out, 'input').subscribe( (msg) => {
                    assert(_.isEqual(input + 1, msg.payload));
                    done();
                })

                setTimeout(() => {
                    op.receive({topic : 'pipe', payload : { observable : 'observable'}})
                },10)
                
            });
        });
    });
})