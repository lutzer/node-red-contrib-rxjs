const { takeUntil, tap } = require('rxjs/operators');
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
                case "no-argument":
                    node.status({ fill: "red", shape: "ring", text: "missing until"});
                    break;
                case "piped":
                    node.status({ fill: "green", shape: "dot", text: "piped"});
                    break;
            }
        }

        var observableWrapper = new NodeRedObservable(node);

        var $pipeObservable = null;
        var $untilObservable = null;

        showState("no-pipe");

        node.on('input', function (msg) {
			if (msg.topic === 'pipe') {
                $pipeObservable = globalContext.get(msg.payload.observable)
                showState("no-argument");
            } else if (msg.topic === 'until') {
                $untilObservable = globalContext.get(msg.payload.observable)
                showState("no-pipe");
            }
            if ($pipeObservable != null && $untilObservable != null) {
                showState("piped");
                observableWrapper.register(
                    $pipeObservable.pipe(
                        takeUntil($untilObservable),
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
	RED.nodes.registerType("rx takeUntil", RxNode);
};
