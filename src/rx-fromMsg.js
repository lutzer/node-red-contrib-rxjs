const { Subject } = require('rxjs');
const { tap, map } = require('rxjs/operators');
const { ON_LOADED_TIMEOUT, NodeRedObservable } = require('./common.js');

module.exports = function (RED) {
	function RxNode (config) {
		RED.nodes.createNode(this, config);

        var node = this;
        
        var observableWrapper = new NodeRedObservable(node);

        var $subject = new Subject();

        observableWrapper.register(
            $subject.asObservable()
        );

        observableWrapper.on('tap', (msg) => {
            node.send([null, msg]);
        });

        node.on('input', (msg) => {
            if (msg.topic === 'error')
                $subject.error(msg);
            else    
                $subject.next(msg);
        })

        function onLoaded() {
            node.send([observableWrapper.pipeMessage, null]);
        }

        setTimeout( () => onLoaded() ,ON_LOADED_TIMEOUT);

		node.on('close', function () {
			observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx fromMsg", RxNode);
};
