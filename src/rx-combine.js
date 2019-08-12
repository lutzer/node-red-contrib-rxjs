const { combineLatest, concat, merge, race, zip } = require('rxjs');
const { NodeRedObservable } = require('./common.js');
const _ = require('lodash');

module.exports = function (RED) {
	function RxNode (config) {
        RED.nodes.createNode(this, config);
        
        // convert argument types
        config.numberOfInputs = _.toNumber(config.numberOfInputs);

        function showState(state) {
            switch (state) {
                case "ready":
                    node.status({ fill: "green", shape: "dot", text: "ready"});
                    break;
                case "no-argument":
                    node.status({ fill: "yellow", shape: "ring", text: "missing arguments"});
                case "no-operator":
                    node.status({ fill: "red", shape: "ring", text: "missing operator"});
                    break;
            }
        }

        var node = this;
        var globalContext = node.context().global;

        var observableWrapper = new NodeRedObservable(node);

        observableWrapper.on('tap', (msg) => {
            node.send([null, msg]);
        });

        var inputObservables = _.fill(Array(config.numberOfInputs), null);

        showState("no-argument");

        node.on('input', function (msg) {
            if (msg.topic === 'pipe') {
                const part = _.toNumber(msg.part)
                if (!_.isNumber(part)) {
                    node.error("needs to receive a msg with the property part set to a number.", null);
                    return;
                }
                if (part < 0 || part >= config.numberOfInputs) {
                    node.error("part value must be between 0 and the number of inputs.", null);
                    return;
                }
                inputObservables[part] = globalContext.get(msg.payload.observable);

                //console.log(inputObservables.length, inputObservables)
                const isComplete = inputObservables.reduce( (acc, val) => {
                    return acc && _.isObject(val);
                }, true);

                if (isComplete) {
                    showState("ready");
                    switch (config.operatorType) {
                        case "combineLatest":
                            observableWrapper.register(
                                combineLatest(...inputObservables)
                            )
                            break;
                        case "concat":
                            observableWrapper.register(
                                concat(...inputObservables)
                            )
                            break;
                        case "merge":
                            observableWrapper.register(
                                merge(...inputObservables)
                            )
                            break;
                        case "race":
                            observableWrapper.register(
                                race(...inputObservables)
                            )
                            break;
                        case "zip":
                            observableWrapper.register(
                                zip(...inputObservables)
                            )
                            break;  
                        default:
                            showState("no-operator");
                    }
                    
                    node.send([observableWrapper.pipeMessage, null])
                } else {
                    showState("no-argument");
                } 
                
            }
        })

		node.on('close', function () {
			observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx combine", RxNode);
};
