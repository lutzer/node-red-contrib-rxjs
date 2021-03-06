const _ = require('lodash');
const { range } = require('rxjs');
const { map } = require('rxjs/operators');
const { ON_LOADED_TIMEOUT, NodeRedObservable } = require('./common.js');

module.exports = function (RED) {
	function RxNode (config) {
        RED.nodes.createNode(this, config);
        
        //convert properties
        config.from = _.toNumber(config.from)
        config.to = _.toNumber(config.to)

        var node = this;
        
        var observableWrapper = new NodeRedObservable(node);

        observableWrapper.register(
            range(config.start, config.count).pipe( 
                map( (val) => {
                    return { topic: "range", payload: val }
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
	RED.nodes.registerType("rx range", RxNode);
};
