const _ = require('lodash');
const { Observable } = require('rxjs');
const { ON_LOADED_TIMEOUT, NodeRedObservable, convertNodeRedType } = require('./common.js');

module.exports = function (RED) {
	function RxNode (config) {
        RED.nodes.createNode(this, config);
        
        //convert properties
        config.from = _.toNumber(config.from)
        config.to = _.toNumber(config.to)

        var node = this;
        
        var observableWrapper = new NodeRedObservable(node);

        var observer = null;
        var $observable = Observable.create( (obs) => {
            observer = obs;
            node.send([null, { topic: "subscribed" } ])
        })

        observableWrapper.register(
            $observable
        );

        node.on('input', function (msg) {
            if (msg.topic === 'error')
                observer.error(msg);
            else if (msg.topic === 'complete')
                observer.complete();
            else
			    observer.next(msg);
		});

        function onLoaded() {
            node.send([observableWrapper.pipeMessage, null]);
        }

        setTimeout( () => onLoaded() ,ON_LOADED_TIMEOUT);

		node.on('close', function () {
			observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx observer", RxNode);
};
