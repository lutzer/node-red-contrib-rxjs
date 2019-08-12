const _ = require('lodash');
const { interval, Subject } = require('rxjs');
const { takeUntil } = require('rxjs/operators');
const { unsubscribe } = require('./common.js');

module.exports = function (RED) {
	function RxNode (config) {
		RED.nodes.createNode(this, config);

		var node = this;
        var context = this.context();
        var global = context.global;

        var $completeSubject = new Subject()

        function showState(state) {
            switch (state) {
                case "init":
                    node.status({ fill: "red", shape: "ring", text: "not piped"});
                    break;
                case "piped":
                    node.status({ fill: "yellow", shape: "dot", text: "not subscribed"});
                    break;
                case "subscribed":
                    node.status({ fill: "green", shape: "dot", text: "subscribed"});
                    break;
                case "completed":
                    node.status({ fill: "blue", shape: "dot", text: "completed"});
                    break;
            }
        }

        function subscribe() {
            showState("subscribed");
            context.subscription = context.observable.pipe( takeUntil($completeSubject) ).subscribe({
                next : (msg) => {
                    if (_.isArray(msg) && config.bundle) {
                        var bundle = msg.map( (val) => val.payload );
                        node.send([{ topic: msg[0].topic, payload: bundle }])
                    } else {
                        node.send([msg, null])
                    }
                },
                complete : () => {
                    showState("completed");
                    node.send([null, { topic: "completed" }])
                },
                error : (err) => {
                    node.error(err.message, err);
                }

            });
        }

        showState("init");

        node.on('input', function (msg) {
			if (msg.topic === 'pipe') {
                unsubscribe(context.subscription);
                try {
                    context.observable = global.get(msg.payload.observable);
                } catch (err) {
                    node.error("Cannot read piped observable", err);
                    return;
                }
                showState("piped");
                // automatically subscribe if checked
                if (config.auto_subscribe)
                    subscribe();
            } else if (msg.topic === "subscribe") {
                if (!_.isObject(context.observable)) {
                    node.error("No observable has been piped yet", new Error("No observable has been piped yet"));
                    return;
                }
                unsubscribe(context.subscription);
                subscribe();
            } else if (msg.topic === "unsubscribe") {
                unsubscribe(context.subscription);
                if (_.isObject(context.observable))
                    showState("piped");
            } else if (msg.topic === "complete") {
                $completeSubject.next();
            }
        });

		node.on('close', function () {
			context.subscription.unsubscribe();
		});
	}
	RED.nodes.registerType("rx subscriber", RxNode);
};
