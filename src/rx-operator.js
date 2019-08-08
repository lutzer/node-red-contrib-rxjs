const { take, takeUntil, filter, tap } = require('rxjs/operators');
const { NodeRedObservable } = require('./common.js');

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

        if (config.operatorType === "none") 
            showState('no-operator');
        else
            showState("no-pipe");

        var observableWrapper = new NodeRedObservable(node);

        observableWrapper.on('tap', (msg) => {
            node.send([null, msg]);
        });

        node.on('input', function (msg) {
            switch (config.operatorType) {
                case "take":
                    if (msg.topic === 'pipe') {
                        var $observable = globalContext.get(msg.payload.observable)
                        observableWrapper.register(
                            $observable.pipe(
                                take(config.take_count)
                            )
                        )
                        node.send([observableWrapper.pipeMessage, null]);
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
                        node.send([observableWrapper.pipeMessage, null]);
                    }
                    break;
                case "filter":
                    if (msg.topic === 'pipe') {
                        var $observable = globalContext.get(msg.payload.observable)
                        observableWrapper.register(
                            $observable.pipe(
                                filter( (msg) => {
                                    var payload = msg.payload;
                                    var topic = msg.topic;
                                    try {
                                        return eval(config.filter_func)
                                    } catch (err) {
                                        node.error("Could not evaluate expression: " + err, msg);
                                        return false;
                                    }
                                })
                            )
                        )
                        node.send([observableWrapper.pipeMessage, null]);
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
