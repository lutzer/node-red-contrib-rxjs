const { take, tap } = require('rxjs/operators');
const { NodeRedObservable } = require('./common.js');

module.exports = function (RED) {
	function RxIntervalNode (config) {
		RED.nodes.createNode(this, config);

        var node = this;
        var globalContext = node.context().global;

        var observableWrapper = new NodeRedObservable(node);

        node.on('input', function (msg) {
			if (msg.topic === 'pipe') {
                var $observable = globalContext.get(msg.payload.observable)
                observableWrapper.register(
                    $observable.pipe(
                        take(config.count),
                        tap( (msg) => node.send([null, msg]))
                    )
                )
                node.send([observableWrapper.pipeMessage, null]);
            }
        });

		node.on('close', function () {
			observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx take", RxIntervalNode);
};
