const { Subject } = require('rxjs');
const { tap, map } = require('rxjs/operators');
const { ON_LOADED_TIMEOUT, NodeRedObservable } = require('./common.js');

module.exports = function (RED) {
	function RxNode (config) {
		RED.nodes.createNode(this, config);

        var node = this;
        
        var observableWrapper = new NodeRedObservable(node);

        var subject = new Subject();

        observableWrapper.register(
            subject.asObservable()
        );

        node.on('input', (msg) => {
            subject.next(msg);
        })

        function onLoaded() {
            node.send([observableWrapper.pipeMessage]);
        }

        setTimeout( () => onLoaded() ,ON_LOADED_TIMEOUT);

		node.on('close', function () {
			observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx fromMsg", RxNode);
};
