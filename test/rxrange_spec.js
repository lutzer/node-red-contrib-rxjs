const _ = require('lodash');
const assert = require('assert');
const helper = require("node-red-node-test-helper");
const { of, fromEvent } = require('rxjs');
const { scan, timeout, catchError, pairwise } = require('rxjs/operators');

helper.init(require.resolve('node-red'));

describe('range node', function () {

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
            
            fromEvent(out, 'input').subscribe( (msg) => {
                assert(msg.topic === 'pipe');
                assert( _.isObject(global.get(msg.payload.observable)) );
                done();
            })
        })
    });

    it('should be able to send a msg sequence with correct payload and topic', function(done) {

        const start = Math.ceil(Math.random() * 100);
        const count = Math.ceil(Math.random() * 100);

        var flow = [
            { id: 'n1', type: 'rx range', wires:[["n2"]], start: start, count: count },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([rangeNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
    
            fromEvent(out,'input').pipe(
                scan( (acc, msg) => {
                    assert.equal(msg.topic,"range");
                    assert.equal(msg.payload, acc + start);
                    return acc + 1;
                },0)
            ).subscribe((val) => {
                if (val == count)
                    done();
            });
        })
    });

    it('should exactly send <count> messages', function(done) {

        const start = Math.ceil(Math.random() * 100);
        const count = Math.ceil(Math.random() * 100);

        var flow = [
            { id: 'n1', type: 'rx range', wires:[["n2"]], start: start, count: count },
            { id: 'n2', type: 'rx subscriber', auto_subscribe: true, wires:[['out']] },
            { id: 'out', type: 'helper' }
        ];

        helper.load([rangeNode, subscriberNode], flow, function() {
            var out = helper.getNode("out");
    
            fromEvent(out,'input').pipe(
                timeout(10),
                catchError( (err) => {
                    return of("timeout");
                }),
                pairwise()
            ).subscribe( (val) => {
                if (val[1] === "timeout") {
                    assert.equal(val[0].payload, start + count - 1);
                    done();
                }
            })
        })
    });
})