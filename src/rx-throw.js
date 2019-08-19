const _ = require('lodash');
const { Subject, throwError } = require('rxjs');
const { switchMap } = require('rxjs/operators');
const { ON_LOADED_TIMEOUT, NodeRedObservable, convertNodeRedType } = require('./common.js');

module.exports = function (RED) {
	function RxNode (config) {
        RED.nodes.createNode(this, config);
        
        //convert properties
        config.from = _.toNumber(config.from)
        config.to = _.toNumber(config.to)

        var node = this;
        
        var observableWrapper = new NodeRedObservable(node);

        var $subject = new Subject();

        
        observableWrapper.register(
            $subject.pipe( switchMap( (msg) => throwError(msg)))
        );

        node.on('input', (msg) => {
            $subject.next(msg);
        })

        function onLoaded() {
            node.send([observableWrapper.pipeMessage]);
        }

        setTimeout( () => onLoaded() ,ON_LOADED_TIMEOUT);

		node.on('close', function () {
			observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx throw", RxNode);
};
