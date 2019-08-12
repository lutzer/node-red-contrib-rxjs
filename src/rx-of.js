const _ = require('lodash');
const { of } = require('rxjs');
const { ON_LOADED_TIMEOUT, NodeRedObservable, convertNodeRedType } = require('./common.js');

module.exports = function (RED) {
	function RxNode (config) {
        RED.nodes.createNode(this, config);
        
        //convert properties
        config.from = _.toNumber(config.from)
        config.to = _.toNumber(config.to)

        var node = this;
        
        var observableWrapper = new NodeRedObservable(node);

        observableWrapper.on('tap', (msg) => {
            node.send([null, msg]);
        });

        var payload = convertNodeRedType(config.payload, config.payloadType)

        observableWrapper.register(
            of({ topic: config.topic, payload : payload })
        );

        function onLoaded() {
            node.send([observableWrapper.pipeMessage, null]);
        }

        setTimeout( () => onLoaded() ,ON_LOADED_TIMEOUT);

		node.on('close', function () {
			observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx of", RxNode);
};
