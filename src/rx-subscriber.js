const _ = require('lodash');
const { interval, Subject } = require('rxjs');
const { takeUntil } = require('rxjs/operators');
const { unsubscribe } = require('./common.js');

module.exports = function (RED) {
	function RxIntervalNode (config) {
		RED.nodes.createNode(this, config);

		var node = this;
        var context = this.context();
        var global = context.global;

        var $completeSubject = new Subject()

        node.on('input', function (msg) {
			if (msg.topic === 'pipe') {
                unsubscribe(context.subscription);
                try {
                    context.observable = global.get(msg.payload.observable);
                } catch (err) {
                    node.error("Cannot read piped observable", err);
                    return;
                }
            } else if (msg.topic === "subscribe") {
                if (!_.isObject(context.observable)) {
                    node.error("No observable has been piped yet", new Error("No observable has been piped yet"));
                    return;
                }
                unsubscribe(context.subscription);
                context.subscription = context.observable.pipe( takeUntil($completeSubject) ).subscribe({
                    next : (msg) => { 
                        node.send([msg, null]) 
                    },
                    complete : () => {
                        node.send([null, { topic: "completed" }]) 
                    },
                    error : (err) => {
                        node.error(err.message, err);
                    }

                });
            } else if (msg.topic === "unsubscribe") {
                unsubscribe(context.subscription);
            } else if (msg.topic === "complete") {
                $completeSubject.next();
            }
        });

		node.on('close', function () {
			context.subscription.unsubscribe();
		});
	}
	RED.nodes.registerType("rx subscriber", RxIntervalNode);
};
