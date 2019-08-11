const { take, takeUntil, filter, scan, map, timeInterval } = require('rxjs/operators');
const { NodeRedObservable, evalFunc } = require('./common.js');
const _ = require('lodash');

module.exports = function (RED) {
	function RxNode (config) {
		RED.nodes.createNode(this, config);

        var node = this;
        var globalContext = node.context().global;

        function showState(state) {
            switch (state) {
                case "no-pipe":
                    node.status({ fill: "red", shape: "ring", text: "missing pipe"});
                    break;
                case "piped":
                    node.status({ fill: "green", shape: "dot", text: "piped"});
                    break;
                case "no-argument":
                    node.status({ fill: "yellow", shape: "ring", text: "missing argument"});
                case "no-operator":
                    node.status({ fill: "red", shape: "ring", text: "missing operator"});
                    break;
            }
        }

        var observableWrapper = new NodeRedObservable(node);

        observableWrapper.on('tap', (msg) => {
            node.send([null, msg]);
        });

        function sendPipeMessage() {
            node.send([observableWrapper.pipeMessage, null]);
        }

        if (config.operatorType === "none") 
            showState('no-operator');
        else
            showState("no-pipe");

        node.on('input', function (msg) {
            switch (config.operatorType) {
                case "take":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        observableWrapper.register(
                            $observable.pipe(
                                take(config.take_count)
                            )
                        )
                        sendPipeMessage();
                        showState("piped");
                    }
                    break;
                case "takeUntil":
                    if (msg.topic === 'pipe') {
                        node.$pipeObservable = globalContext.get(msg.payload.observable)
                        showState("no-argument");
                    } else if (msg.topic === 'until') {
                        node.$untilObservable = globalContext.get(msg.payload.observable)
                        showState("no-pipe");
                    }
                    if (node.$pipeObservable && node.$untilObservable) {
                        showState("piped");
                        observableWrapper.register(
                            node.$pipeObservable.pipe(
                                takeUntil(node.$untilObservable)
                            )
                        )
                        sendPipeMessage()
                    }
                    break;
                case "filter":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        const filterFunc = new Function('msg', config.filter_func);
                        observableWrapper.register(
                            $observable.pipe(
                                filter( (msg) => {
                                    return filterFunc(msg);
                                })
                            )
                        )
                        sendPipeMessage()
                        showState("piped");
                    }
                    break;
                case "scan":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        const scanFunc = new Function('acc', 'msg', config.scan_func);
                        const scanSeed = evalFunc(config.scan_seed);
                        observableWrapper.register(
                            $observable.pipe(
                                scan( (acc, msg) => {
                                    return scanFunc(acc, msg);
                                }, scanSeed),
                                map( (val) => {
                                    if (_.has(val, 'payload'))
                                        return val;
                                    else
                                        return { payload : val }
                                })
                            )
                        )
                        sendPipeMessage()
                        showState("piped");
                    }
                    break;
                case "timeInterval":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        observableWrapper.register(
                            $observable.pipe(
                                timeInterval(),
                                map( (val) => {
                                    const msg = val.value;
                                    msg.interval = val.interval;
                                    return msg;
                                })
                            )
                        )
                        sendPipeMessage()
                        showState("piped");
                    }
                    break;
                default:
                    showState("no-operator")
            }	
        });

		node.on('close', function () {
            observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx operator", RxNode);
};
