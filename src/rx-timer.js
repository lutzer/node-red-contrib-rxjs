const { timer } = require('rxjs');
const { map } = require('rxjs/operators');
const { ON_LOADED_TIMEOUT, NodeRedObservable } = require('./common.js');
const _ = require('lodash');

module.exports = function (RED) {
	function RxNode (config) {
        RED.nodes.createNode(this, config);
        
        //convert properties
        config.period = _.toNumber(config.period)
        config.initialDelay = _.toNumber(config.initialDelay)

        var node = this;
        
        var observableWrapper = new NodeRedObservable(node);

        observableWrapper.register(
            timer(config.initialDelay, config.period > 0 ? config.period : undefined).pipe( 
                map( (val) => {
                    return { topic: "timer", payload: val }
                })
            )
        );

        function onLoaded() {
            node.send([observableWrapper.pipeMessage]);
        }

        setTimeout( () => onLoaded() ,ON_LOADED_TIMEOUT);

		node.on('close', function () {
			observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx timer", RxNode);
};
