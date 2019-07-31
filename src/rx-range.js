const { range } = require('rxjs');
const { tap, map } = require('rxjs/operators');
const { ON_LOADED_TIMEOUT, NodeRedObservable } = require('./common.js');

module.exports = function (RED) {
	function RxIntervalNode (config) {
		RED.nodes.createNode(this, config);

        var node = this;
        
        var observableWrapper = new NodeRedObservable(node);

        observableWrapper.register(
            range(config.from, config.to).pipe( 
                map( (val) => {
                    return { topic: "range", payload: val }
                }), tap( (msg) => {
                    node.send([ null, msg ] ) 
                })
            )
        );

        function onLoaded() {
            node.send([observableWrapper.pipeMessage, null]);
        }

        setTimeout( () => onLoaded() ,ON_LOADED_TIMEOUT);

		node.on('close', function () {
			observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx range", RxIntervalNode);
};
